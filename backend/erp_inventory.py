"""
Decorous ERP — Inventory: goods receipt (GRN), issue/return, and stock on hand.

Mounted under /api/erp/* (see erp_api.py).

  • GRN (material receipt) — the storekeeper records what arrived, with the challan
    photo. It goes through maker-checker (target MATERIAL_RECEIPT) and ONLY APPROVED
    receipts add to stock; pending ones show as "incoming".
  • Issue / return — material leaving the store for site use (or coming back).
    Immediate, audited, and refused if it would take stock below zero.
  • Stock — derived at read time from approved receipts − issues + returns.

Quantities are INTEGER milli-units (12.5 tonnes = 12500) and money is INTEGER paise,
so nothing here ever uses a float. A line amount is qty × rate rounded half-up:
    amount = (rate_cents × qty_milli + 500) // 1000
"""
from __future__ import annotations

from decimal import Decimal
from typing import Optional, List, Literal

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field

import erp_routes as core
from erp_routes import (
    AuthCtx, get_ctx, require_role, enforce_idempotency, log_audit, require_uploads,
    register_target, register_indexes, _db, _uid, _clean, _valid_date, _assert_not_future,
    _get_project_or_404, assert_project_open,
)

router = APIRouter(prefix="/api/erp")

col_grns = _db["erp_grns"]
col_issues = _db["erp_stock_issues"]

IssueKind = Literal["ISSUE", "RETURN"]


def to_milli(qty: Decimal) -> int:
    """Exact Decimal → integer milli-units (validated to ≤ 3 decimal places by pydantic)."""
    return int(qty * 1000)


def line_amount_cents(rate_cents: int, qty_milli: int) -> int:
    """qty × rate, rounded half-up, in integer arithmetic."""
    return (rate_cents * qty_milli + 500) // 1000


# ── Models ───────────────────────────────────────────────────────────────────

class GrnLineIn(BaseModel):
    material_id: str
    qty: Decimal = Field(gt=0, max_digits=12, decimal_places=3)
    rate_cents: int = Field(ge=0, le=1_000_000_000)          # per unit of the material's UoM


class GrnIn(BaseModel):
    project_id: str
    vendor_id: Optional[str] = None
    vendor_name: Optional[str] = Field(default=None, max_length=120)   # for one-off suppliers
    challan_no: Optional[str] = Field(default=None, max_length=60)
    received_on: str = Field(pattern=core.DATE_RE)
    lines: List[GrnLineIn] = Field(min_length=1, max_length=60)
    photo_keys: List[str] = Field(min_length=1, max_length=6)          # delivery challan / material photos
    note: Optional[str] = Field(default=None, max_length=300)


class IssueIn(BaseModel):
    project_id: str
    material_id: str
    qty: Decimal = Field(gt=0, max_digits=12, decimal_places=3)
    kind: IssueKind = "ISSUE"
    issued_on: str = Field(pattern=core.DATE_RE)
    purpose: Optional[str] = Field(default=None, max_length=200)       # e.g. "Slab casting – 2nd floor"


# ── Stock maths ──────────────────────────────────────────────────────────────

async def _receipt_totals(org_id: str, status: str, project_id: Optional[str] = None) -> dict:
    match: dict = {"org_id": org_id, "approval_status": status, "deleted_at": None}
    if project_id:
        match["project_id"] = project_id
    rows = await col_grns.aggregate([
        {"$match": match},
        {"$unwind": "$lines"},
        {"$group": {"_id": {"p": "$project_id", "m": "$lines.material_id"},
                    "qty": {"$sum": "$lines.qty_milli"}, "amount": {"$sum": "$lines.amount_cents"}}},
    ]).to_list(20000)
    return {(r["_id"]["p"], r["_id"]["m"]): (r["qty"], r["amount"]) for r in rows}


async def _issue_totals(org_id: str, project_id: Optional[str] = None) -> dict:
    match: dict = {"org_id": org_id}
    if project_id:
        match["project_id"] = project_id
    rows = await col_issues.aggregate([
        {"$match": match},
        {"$group": {"_id": {"p": "$project_id", "m": "$material_id", "k": "$kind"}, "qty": {"$sum": "$qty_milli"}}},
    ]).to_list(20000)
    out: dict = {}
    for r in rows:
        out.setdefault((r["_id"]["p"], r["_id"]["m"]), {})[r["_id"]["k"]] = r["qty"]
    return out


async def stock_balance_milli(org_id: str, project_id: str, material_id: str) -> int:
    rec = (await _receipt_totals(org_id, "APPROVED", project_id)).get((project_id, material_id), (0, 0))[0]
    iss = (await _issue_totals(org_id, project_id)).get((project_id, material_id), {})
    return rec - iss.get("ISSUE", 0) + iss.get("RETURN", 0)


@router.get("/stock")
async def stock_on_hand(project_id: Optional[str] = None, include_zero: bool = False, ctx: AuthCtx = Depends(get_ctx)):
    """Per project × material: received, issued, returned, balance, incoming and book value."""
    received = await _receipt_totals(ctx.org_id, "APPROVED", project_id)
    incoming = await _receipt_totals(ctx.org_id, "PENDING", project_id)
    issues = await _issue_totals(ctx.org_id, project_id)
    keys = set(received) | set(incoming) | set(issues)

    mats = {m["_id"]: m async for m in core.col_materials.find({"_id": {"$in": list({k[1] for k in keys})}, "org_id": ctx.org_id})}
    projs = {p["_id"]: p async for p in core.col_projects.find({"_id": {"$in": list({k[0] for k in keys})}, "org_id": ctx.org_id}, {"code": 1, "name": 1})}

    rows = []
    for (pid, mid) in sorted(keys, key=lambda k: ((projs.get(k[0]) or {}).get("code", ""), (mats.get(k[1]) or {}).get("name", ""))):
        m, p = mats.get(mid), projs.get(pid)
        if not m or not p:
            continue
        rec_q, rec_amt = received.get((pid, mid), (0, 0))
        iss = issues.get((pid, mid), {})
        balance = rec_q - iss.get("ISSUE", 0) + iss.get("RETURN", 0)
        avg_rate = (rec_amt * 1000 // rec_q) if rec_q else 0              # paise per unit (weighted average)
        min_stock = m.get("min_stock_milli")
        row = {
            "project_id": pid, "project_code": p["code"], "project_name": p["name"],
            "material_id": mid, "material_name": m["name"], "sku": m["sku"], "uom": m["uom"], "category": m["category"],
            "received_milli": rec_q, "issued_milli": iss.get("ISSUE", 0), "returned_milli": iss.get("RETURN", 0),
            "balance_milli": balance, "incoming_milli": incoming.get((pid, mid), (0, 0))[0],
            "avg_rate_cents": avg_rate, "value_cents": (balance * avg_rate) // 1000 if balance > 0 else 0,
            "min_stock_milli": min_stock,
            "low_stock": min_stock is not None and balance <= min_stock,
        }
        # Fully-consumed items are hidden to cut noise — except those with a reorder
        # level: "out of stock" is exactly the alert the store needs to see.
        if include_zero or balance != 0 or row["incoming_milli"] or row["low_stock"]:
            rows.append(row)
    return rows


# ── GRN ──────────────────────────────────────────────────────────────────────

def _grn_row(g: dict) -> dict:
    g = dict(g)
    g["id"] = g.pop("_id")
    return _clean(g)


@router.get("/grns")
async def list_grns(
    project_id: Optional[str] = None, vendor_id: Optional[str] = None, status: Optional[str] = None,
    unbilled: bool = False, limit: int = 100, ctx: AuthCtx = Depends(get_ctx),
):
    q: dict = {"org_id": ctx.org_id, "deleted_at": None}
    if project_id:
        q["project_id"] = project_id
    if vendor_id:
        q["vendor_id"] = vendor_id
    if status:
        q["approval_status"] = status.upper()
    if unbilled:
        q["billed_by_bill_id"] = None
        q["approval_status"] = "APPROVED"
    rows = await col_grns.find(q).sort("received_on", -1).limit(min(max(limit, 1), 500)).to_list(500)
    projs = {p["_id"]: p["code"] async for p in core.col_projects.find({"_id": {"$in": list({r["project_id"] for r in rows})}}, {"code": 1})}
    out = []
    for g in rows:
        r = _grn_row(g)
        r["project_code"] = projs.get(g["project_id"])
        out.append(r)
    return out


@router.get("/grns/{grn_id}")
async def get_grn(grn_id: str, ctx: AuthCtx = Depends(get_ctx)):
    g = await col_grns.find_one({"_id": grn_id, "org_id": ctx.org_id, "deleted_at": None})
    if not g:
        raise HTTPException(404, "Goods receipt not found")
    return _grn_row(g)


@router.post("/grns", dependencies=[Depends(require_role("OWNER", "PM", "STOREKEEPER", "ENGINEER"))])
async def create_grn(dto: GrnIn, request: Request, ctx: AuthCtx = Depends(get_ctx)):
    """Record a delivery and submit it for approval in one idempotent call."""
    async def handler():
        project = await _get_project_or_404(ctx, dto.project_id)
        assert_project_open(project)
        _assert_not_future(_valid_date(dto.received_on), "Receipt date")
        await require_uploads(ctx, dto.photo_keys, "photo")

        vendor_name = (dto.vendor_name or "").strip() or None
        if dto.vendor_id:
            v = await core.col_vendors.find_one({"_id": dto.vendor_id, "org_id": ctx.org_id, "deleted_at": None})
            if not v:
                raise HTTPException(404, "Vendor not found")
            vendor_name = v["name"]
        if not vendor_name:
            raise HTTPException(422, "Choose a vendor or type the supplier's name")

        challan = (dto.challan_no or "").strip() or None
        if challan:
            dup = await col_grns.find_one({
                "org_id": ctx.org_id, "deleted_at": None, "challan_key": challan.lower(),
                "vendor_key": (dto.vendor_id or vendor_name.lower()), "approval_status": {"$ne": "REJECTED"},
            })
            if dup:
                raise HTTPException(400, f"Challan {challan} from {vendor_name} was already recorded")

        mat_ids = [l.material_id for l in dto.lines]
        if len(set(mat_ids)) != len(mat_ids):
            raise HTTPException(422, "Each material can appear only once per receipt — combine the quantities")
        mats = {m["_id"]: m async for m in core.col_materials.find({"_id": {"$in": mat_ids}, "org_id": ctx.org_id, "deleted_at": None})}
        if len(mats) != len(mat_ids):
            raise HTTPException(404, "One or more materials were not found")

        lines, total = [], 0
        for l in dto.lines:
            m = mats[l.material_id]
            if not m.get("is_active", True):
                raise HTTPException(400, f"{m['name']} is inactive")
            qty_milli = to_milli(l.qty)
            amount = line_amount_cents(l.rate_cents, qty_milli)
            lines.append({
                "material_id": l.material_id, "material_name": m["name"], "sku": m["sku"], "uom": m["uom"],
                "qty_milli": qty_milli, "rate_cents": l.rate_cents, "amount_cents": amount,
            })
            total += amount

        gid = _uid()
        doc = {
            "_id": gid, "org_id": ctx.org_id, "project_id": dto.project_id,
            "vendor_id": dto.vendor_id, "vendor_name": vendor_name,
            "vendor_key": dto.vendor_id or vendor_name.lower(),
            "challan_no": challan, "challan_key": challan.lower() if challan else None,
            "received_on": dto.received_on, "lines": lines, "total_cents": total, "currency": "INR",
            "photo_keys": dto.photo_keys, "note": dto.note,
            "billed_by_bill_id": None,                         # set when a vendor bill claims this receipt
            "approval_status": "DRAFT", "approval_id": None,
            "source_type": "MATERIAL_RECEIPT", "ledger_posted": False, "ledger_entry_id": None,
            "received_by_id": ctx.user_id, "created_at": core._now(), "deleted_at": None,
        }
        await col_grns.insert_one(doc)
        ap = await core._request_approval(ctx, "MATERIAL_RECEIPT", gid, total)
        await col_grns.update_one({"_id": gid}, {"$set": {"approval_status": "PENDING", "approval_id": ap["_id"]}})
        await log_audit(ctx, "grn.created", "grn", gid, {"total_cents": total, "lines": len(lines)})
        doc.update(approval_status="PENDING", approval_id=ap["_id"])
        return _grn_row(doc)
    return await enforce_idempotency(request, ctx, handler)


# ── Issue / return ───────────────────────────────────────────────────────────

@router.get("/stock/issues")
async def list_issues(project_id: Optional[str] = None, material_id: Optional[str] = None, limit: int = 100, ctx: AuthCtx = Depends(get_ctx)):
    q: dict = {"org_id": ctx.org_id}
    if project_id:
        q["project_id"] = project_id
    if material_id:
        q["material_id"] = material_id
    rows = await col_issues.find(q).sort("issued_on", -1).limit(min(max(limit, 1), 500)).to_list(500)
    out = []
    for r in rows:
        r = dict(r)
        r["id"] = r.pop("_id")
        out.append(_clean(r))
    return out


@router.post("/stock/issues", dependencies=[Depends(require_role("OWNER", "PM", "ENGINEER", "STOREKEEPER"))])
async def create_issue(dto: IssueIn, request: Request, ctx: AuthCtx = Depends(get_ctx)):
    async def handler():
        project = await _get_project_or_404(ctx, dto.project_id)
        assert_project_open(project)
        _assert_not_future(_valid_date(dto.issued_on), "Issue date")
        m = await core.col_materials.find_one({"_id": dto.material_id, "org_id": ctx.org_id, "deleted_at": None})
        if not m:
            raise HTTPException(404, "Material not found")
        qty_milli = to_milli(dto.qty)

        rec = (await _receipt_totals(ctx.org_id, "APPROVED", dto.project_id)).get((dto.project_id, dto.material_id), (0, 0))[0]
        iss = (await _issue_totals(ctx.org_id, dto.project_id)).get((dto.project_id, dto.material_id), {})
        on_hand = rec - iss.get("ISSUE", 0) + iss.get("RETURN", 0)
        if dto.kind == "ISSUE" and qty_milli > on_hand:
            raise HTTPException(400, f"Only {on_hand / 1000:g} {m['uom']} of {m['name']} in stock at this site — cannot issue {qty_milli / 1000:g}")
        if dto.kind == "RETURN" and qty_milli > iss.get("ISSUE", 0) - iss.get("RETURN", 0):
            raise HTTPException(400, "Cannot return more than has been issued from this site")

        iid = _uid()
        doc = {
            "_id": iid, "org_id": ctx.org_id, "project_id": dto.project_id, "material_id": dto.material_id,
            "material_name": m["name"], "uom": m["uom"], "qty_milli": qty_milli, "kind": dto.kind,
            "issued_on": dto.issued_on, "purpose": dto.purpose, "issued_by_id": ctx.user_id, "created_at": core._now(),
        }
        await col_issues.insert_one(doc)
        await log_audit(ctx, f"stock.{dto.kind.lower()}", "stock_issue", iid, {"qty_milli": qty_milli, "material_id": dto.material_id})
        doc["id"] = doc.pop("_id")
        return _clean(doc)
    return await enforce_idempotency(request, ctx, handler)


# ── Approval engine hooks / indexes ──────────────────────────────────────────

def _summ_grn(g: dict) -> dict:
    items = ", ".join(f"{l['material_name']} ×{l['qty_milli'] / 1000:g} {l['uom']}" for l in g.get("lines", [])[:3])
    more = len(g.get("lines", [])) - 3
    return {
        "kind": "MATERIAL_RECEIPT",
        "title": f"{g.get('vendor_name')} — {items}" + (f" +{more} more" if more > 0 else ""),
        "occurred_on": g.get("received_on"), "photo_keys": g.get("photo_keys", []),
        "bill_photo_key": (g.get("photo_keys") or [None])[0], "note": g.get("note"),
        "challan_no": g.get("challan_no"),
    }


register_target("MATERIAL_RECEIPT", col_grns, _summ_grn)

register_indexes(col_grns, [("org_id", 1), ("project_id", 1), ("received_on", -1)], name="ix_org_project_date")
register_indexes(col_grns, [("org_id", 1), ("vendor_key", 1), ("challan_key", 1)], name="ix_org_vendor_challan")
register_indexes(col_grns, [("org_id", 1), ("approval_status", 1)], name="ix_org_status")
register_indexes(col_issues, [("org_id", 1), ("project_id", 1), ("material_id", 1)], name="ix_org_project_material")


async def received_value_by_project(org_id: str) -> dict:
    """project_id → value of approved receipts that no vendor bill has claimed yet (paise)."""
    rows = await col_grns.aggregate([
        {"$match": {"org_id": org_id, "approval_status": "APPROVED", "deleted_at": None, "billed_by_bill_id": None}},
        {"$group": {"_id": "$project_id", "total": {"$sum": "$total_cents"}}},
    ]).to_list(2000)
    return {r["_id"]: r["total"] for r in rows}
