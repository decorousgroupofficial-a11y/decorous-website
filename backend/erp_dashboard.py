"""
Decorous ERP — Project dashboards (budget vs actual) and the activity feed.

Mounted under /api/erp/dashboard/* (see erp_api.py). Read-only: every figure is derived
from approved capture records at request time, nothing is stored or posted.

COST MODEL — what counts as the cost of a project, without double counting:

    total cost = approved petty-cash expenses
               + approved wages (attendance sheets)
               + approved vendor bills (gross, GST included)
               + approved goods receipts that NO vendor bill has claimed yet

A goods receipt that a bill has claimed is represented by the bill, so it is not counted
a second time. That is why bills are asked to link their receipts. Payments (to vendors or
workers) are cash movements, not cost, and are deliberately excluded.

This is an operational view, not accounting: no journals, accounts or periods (ADR-003).
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Depends

import erp_routes as core
import erp_labour as labour
import erp_inventory as inventory
import erp_finance as finance
from erp_routes import AuthCtx, get_ctx, _get_project_or_404, _today_ist

router = APIRouter(prefix="/api/erp/dashboard")

PRE_LEDGER_NOTE = "Operational view of approved records — not an accounting ledger."


async def _grouped(collection, org_id: str, amount_field: str, extra_match: Optional[dict] = None,
                   status_field: str = "approval_status") -> dict:
    """(project_id, status) → (sum, count) for one capture collection."""
    match = {"org_id": org_id, "deleted_at": None, **(extra_match or {})}
    rows = await collection.aggregate([
        {"$match": match},
        {"$group": {"_id": {"p": "$project_id", "s": f"${status_field}"},
                    "total": {"$sum": f"${amount_field}"}, "n": {"$sum": 1}}},
    ]).to_list(20000)
    return {(r["_id"]["p"], r["_id"]["s"]): (r["total"], r["n"]) for r in rows}


async def project_costs(org_id: str) -> dict:
    """project_id → cost breakdown (paise) for every project that has any activity."""
    expenses = await _grouped(core.col_expenses, org_id, "amount_cents")
    sheets = await _grouped(labour.col_attendance, org_id, "total_cents")
    bills = await _grouped(finance.col_bills, org_id, "amount_cents")
    receipts = await _grouped(inventory.col_grns, org_id, "total_cents", {"billed_by_bill_id": None})

    pids = {k[0] for src in (expenses, sheets, bills, receipts) for k in src}
    out = {}
    for pid in pids:
        def approved(src):
            return src.get((pid, "APPROVED"), (0, 0))[0]

        def pending(src):
            return src.get((pid, "PENDING"), (0, 0))
        parts = {
            "expenses_cents": approved(expenses), "labour_cents": approved(sheets),
            "bills_cents": approved(bills), "unbilled_receipts_cents": approved(receipts),
        }
        pend = {"expenses": pending(expenses), "labour": pending(sheets), "bills": pending(bills), "receipts": pending(receipts)}
        out[pid] = {
            **parts,
            "total_cost_cents": sum(parts.values()),
            "pending_cents": sum(v[0] for v in pend.values()),
            "pending_count": sum(v[1] for v in pend.values()),
            "pending_breakdown": {k: {"cents": v[0], "count": v[1]} for k, v in pend.items()},
        }
    return out


_EMPTY = {
    "expenses_cents": 0, "labour_cents": 0, "bills_cents": 0, "unbilled_receipts_cents": 0,
    "total_cost_cents": 0, "pending_cents": 0, "pending_count": 0,
    "pending_breakdown": {k: {"cents": 0, "count": 0} for k in ("expenses", "labour", "bills", "receipts")},
}


def _utilization(budget: Optional[int], cost: int) -> dict:
    if not budget:
        return {"budget_cents": budget, "utilization_pct": None, "remaining_cents": None, "over_budget": False}
    return {
        "budget_cents": budget,
        "utilization_pct": round(cost * 100 / budget, 1),
        "remaining_cents": budget - cost,
        "over_budget": cost > budget,
    }


@router.get("/projects")
async def projects_summary(ctx: AuthCtx = Depends(get_ctx)):
    """Every project with cost-to-date and budget utilisation (drives the Projects list)."""
    projects = await core.col_projects.find({"org_id": ctx.org_id, "deleted_at": None}).sort("created_at", -1).to_list(1000)
    costs = await project_costs(ctx.org_id)
    out = []
    for p in projects:
        c = costs.get(p["_id"], _EMPTY)
        row = {k: p.get(k) for k in ("code", "name", "client_name", "location", "status", "start_date", "end_date")}
        row["id"] = p["_id"]
        row.update(c)
        row.update(_utilization(p.get("budget_cents"), c["total_cost_cents"]))
        out.append(row)
    return {"projects": out, "note": PRE_LEDGER_NOTE}


@router.get("/projects/{project_id}")
async def project_dashboard(project_id: str, ctx: AuthCtx = Depends(get_ctx)):
    p = await _get_project_or_404(ctx, project_id)
    c = (await project_costs(ctx.org_id)).get(project_id, _EMPTY)

    dprs = await core.col_dprs.find({"org_id": ctx.org_id, "project_id": project_id, "deleted_at": None}) \
        .sort("report_date", -1).limit(5).to_list(5)
    dpr_total = await core.col_dprs.count_documents({"org_id": ctx.org_id, "project_id": project_id, "deleted_at": None})

    today = _today_ist().isoformat()
    sheet = await labour.col_attendance.find_one({"org_id": ctx.org_id, "project_id": project_id, "date": today})
    stock = await inventory.stock_on_hand(project_id=project_id, ctx=ctx)

    return {
        "project": {**{k: p.get(k) for k in ("code", "name", "client_name", "location", "status", "start_date", "end_date", "created_at")}, "id": p["_id"]},
        "cost": c,
        "budget": _utilization(p.get("budget_cents"), c["total_cost_cents"]),
        "dpr": {
            "total": dpr_total,
            "last_report_date": dprs[0]["report_date"] if dprs else None,
            "recent": [{
                "id": d["_id"], "report_date": d["report_date"], "title": (d.get("work_narrative") or "")[:140],
                "approval_status": d.get("approval_status"), "photo_key": (d.get("photo_keys") or [None])[0],
                "labour_total": core._labour_total(d.get("labour_counts")),
            } for d in dprs],
        },
        "workforce_today": {
            "date": today,
            "sheet_status": sheet["approval_status"] if sheet else None,
            "present": sum(1 for e in sheet["entries"] if e["status"] == "PRESENT") if sheet else 0,
            "half": sum(1 for e in sheet["entries"] if e["status"] == "HALF") if sheet else 0,
            "wages_cents": sheet["total_cents"] if sheet else 0,
        },
        "stock": {
            "items": len(stock),
            "low_stock": [s for s in stock if s["low_stock"]][:10],
            "value_cents": sum(s["value_cents"] for s in stock),
        },
        "note": PRE_LEDGER_NOTE,
    }


# ── Activity feed ────────────────────────────────────────────────────────────

ACTION_LABELS = {
    "project.created": "created project", "project.updated": "updated project",
    "vendor.created": "added vendor", "material.created": "added material",
    "worker.created": "added worker", "attendance.submitted": "submitted attendance",
    "worker_payment.created": "recorded a worker payment", "grn.created": "recorded a goods receipt",
    "stock.issue": "issued material", "stock.return": "returned material to store",
    "vendor_bill.created": "entered a vendor bill", "vendor_payment.created": "recorded a vendor payment",
    "dpr.submitted": "submitted a daily report", "expense.submitted": "submitted an expense",
    "approval.approved": "approved a request", "approval.rejected": "rejected a request",
    "member.updated": "updated a team member",
}


@router.get("/activity")
async def activity_feed(limit: int = 25, ctx: AuthCtx = Depends(get_ctx)):
    """Latest audited actions across the organisation, newest first."""
    rows = await core.col_audit_log.find({"org_id": ctx.org_id}).sort("created_at", -1).limit(min(max(limit, 1), 100)).to_list(100)
    names = {u["_id"]: u.get("full_name") async for u in core.col_users.find({"_id": {"$in": list({r["actor_id"] for r in rows})}}, {"full_name": 1})}
    return [{
        "id": r["_id"], "at": r["created_at"], "actor_name": names.get(r["actor_id"], "Someone"),
        "action": r["action"], "label": ACTION_LABELS.get(r["action"], r["action"].replace(".", " ").replace("_", " ")),
        "entity_type": r["entity_type"], "entity_id": r["entity_id"],
    } for r in rows]
