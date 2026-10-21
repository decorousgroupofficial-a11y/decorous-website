"""
Decorous ERP — Vendor bills, vendor payments and what is owed (the supplier "khata").

Mounted under /api/erp/* (see erp_api.py).

  • Vendor bill     what a supplier/subcontractor invoiced us (gross, incl. GST). Maker-checker
                    (VENDOR_BILL: PM ≤ ₹50,000, Owner above; PIN ≥ ₹50,000). A bill can claim
                    approved goods receipts (GRNs) so the same goods are never costed twice.
  • Vendor payment  money we paid a vendor. Maker-checker (PAYMENT), PIN ≥ ₹50,000 -- except
                    payments entered by the Owner, which take effect immediately (self-approved).
  • Outstanding     DERIVED at read time: approved bills − approved payments. Payments are applied
                    to the oldest bill first (FIFO) to show which bills are still open.

GOVERNANCE (ADR-003): this is an OPERATIONAL view over captured, approved records. There are
no journals, accounts, periods or ageing buckets, and nothing is posted to a ledger — every
capture row carries the ledger-ready fields for the CA phase. Balances are labelled pre-ledger.
"""
from __future__ import annotations

from typing import Optional, List, Literal

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field

import erp_routes as core
import erp_inventory as inventory
from erp_routes import (
    AuthCtx, get_ctx, require_role, enforce_idempotency, log_audit, require_uploads,
    register_target, register_indexes, _db, _uid, _clean, _valid_date, _assert_not_future,
    _get_project_or_404, assert_project_open, _today_ist,
)

router = APIRouter(prefix="/api/erp")

col_bills = _db["erp_vendor_bills"]
col_vendor_payments = _db["erp_vendor_payments"]

PayMode = Literal["CASH", "UPI", "BANK", "CHEQUE"]
PRE_LEDGER_NOTE = "Operational balance from approved records — not an accounting ledger."


class VendorBillIn(BaseModel):
    vendor_id: str
    project_id: str
    bill_no: str = Field(min_length=1, max_length=60)
    bill_date: str = Field(pattern=core.DATE_RE)
    due_date: Optional[str] = Field(default=None, pattern=core.DATE_RE)
    amount_cents: int = Field(gt=0, le=100_000_000_000)             # gross, GST included
    gst_cents: int = Field(default=0, ge=0)
    description: Optional[str] = Field(default=None, max_length=300)
    photo_keys: List[str] = Field(min_length=1, max_length=6)
    grn_ids: List[str] = Field(default_factory=list, max_length=50)  # goods receipts this bill invoices


class VendorPaymentIn(BaseModel):
    vendor_id: str
    project_id: Optional[str] = None
    amount_cents: int = Field(gt=0, le=100_000_000_000)
    paid_on: str = Field(pattern=core.DATE_RE)
    mode: PayMode = "BANK"
    ref_no: Optional[str] = Field(default=None, max_length=60)      # UTR / cheque no.
    note: Optional[str] = Field(default=None, max_length=200)
    proof_photo_key: Optional[str] = None


def _row(doc: dict) -> dict:
    d = dict(doc)
    d["id"] = d.pop("_id")
    return _clean(d)


async def _vendor_or_404(ctx: AuthCtx, vendor_id: str) -> dict:
    v = await core.col_vendors.find_one({"_id": vendor_id, "org_id": ctx.org_id, "deleted_at": None})
    if not v:
        raise HTTPException(404, "Vendor not found")
    return v


# ── Vendor bills ─────────────────────────────────────────────────────────────

@router.get("/vendor-bills")
async def list_bills(
    vendor_id: Optional[str] = None, project_id: Optional[str] = None, status: Optional[str] = None,
    limit: int = 100, ctx: AuthCtx = Depends(get_ctx),
):
    q: dict = {"org_id": ctx.org_id, "deleted_at": None}
    if vendor_id:
        q["vendor_id"] = vendor_id
    if project_id:
        q["project_id"] = project_id
    if status:
        q["approval_status"] = status.upper()
    rows = await col_bills.find(q).sort("bill_date", -1).limit(min(max(limit, 1), 500)).to_list(500)
    projs = {p["_id"]: p["code"] async for p in core.col_projects.find({"_id": {"$in": list({r["project_id"] for r in rows})}}, {"code": 1})}
    out = []
    for b in rows:
        r = _row(b)
        r["project_code"] = projs.get(b["project_id"])
        out.append(r)
    return out


@router.post("/vendor-bills", dependencies=[Depends(require_role("OWNER", "ACCOUNTANT", "PM"))])
async def create_bill(dto: VendorBillIn, request: Request, ctx: AuthCtx = Depends(get_ctx)):
    """Record a supplier invoice and submit it for approval in one idempotent call."""
    async def handler():
        vendor = await _vendor_or_404(ctx, dto.vendor_id)
        assert_project_open(await _get_project_or_404(ctx, dto.project_id))
        _valid_date(dto.bill_date)
        _assert_not_future(dto.bill_date, "Bill date")
        if dto.due_date and _valid_date(dto.due_date) < dto.bill_date:
            raise HTTPException(422, "Due date cannot be before the bill date")
        if dto.gst_cents > dto.amount_cents:
            raise HTTPException(422, "GST cannot exceed the bill amount")
        await require_uploads(ctx, dto.photo_keys, "bill photo")

        bill_key = dto.bill_no.strip().lower()
        dup = await col_bills.find_one({
            "org_id": ctx.org_id, "vendor_id": dto.vendor_id, "bill_key": bill_key,
            "deleted_at": None, "approval_status": {"$ne": "REJECTED"},
        })
        if dup:
            raise HTTPException(400, f"Bill {dto.bill_no.strip()} from {vendor['name']} was already entered — paying it twice is the classic mistake this prevents")

        bid = _uid()
        grn_ids = list(dict.fromkeys(dto.grn_ids))
        if grn_ids:
            grns = {g["_id"]: g async for g in inventory.col_grns.find({"_id": {"$in": grn_ids}, "org_id": ctx.org_id, "deleted_at": None})}
            if len(grns) != len(grn_ids):
                raise HTTPException(404, "One or more goods receipts were not found")
            for g in grns.values():
                if g.get("vendor_id") != dto.vendor_id:
                    raise HTTPException(400, f"Receipt {g.get('challan_no') or g['_id'][:8]} belongs to a different vendor")
                if g["approval_status"] != "APPROVED":
                    raise HTTPException(400, "Only approved goods receipts can be billed")
            claimed = await inventory.col_grns.update_many(
                {"_id": {"$in": grn_ids}, "org_id": ctx.org_id, "billed_by_bill_id": None},
                {"$set": {"billed_by_bill_id": bid}},
            )
            if claimed.modified_count != len(grn_ids):
                await inventory.col_grns.update_many({"billed_by_bill_id": bid}, {"$set": {"billed_by_bill_id": None}})
                raise HTTPException(400, "One or more of those goods receipts are already covered by another bill")

        doc = {
            "_id": bid, "org_id": ctx.org_id, "vendor_id": dto.vendor_id, "vendor_name": vendor["name"],
            "project_id": dto.project_id, "bill_no": dto.bill_no.strip(), "bill_key": bill_key,
            "bill_date": dto.bill_date, "due_date": dto.due_date, "amount_cents": dto.amount_cents,
            "gst_cents": dto.gst_cents, "currency": "INR", "description": dto.description,
            "photo_keys": dto.photo_keys, "grn_ids": grn_ids,
            "approval_status": "DRAFT", "approval_id": None,
            "source_type": "VENDOR_BILL", "ledger_posted": False, "ledger_entry_id": None,
            "captured_by_id": ctx.user_id, "created_at": core._now(), "deleted_at": None,
        }
        try:
            await col_bills.insert_one(doc)
            ap = await core._request_approval(ctx, "VENDOR_BILL", bid, dto.amount_cents)
        except BaseException:
            if grn_ids:                                           # never leave receipts claimed by a bill that failed
                await inventory.col_grns.update_many({"billed_by_bill_id": bid}, {"$set": {"billed_by_bill_id": None}})
            await col_bills.delete_one({"_id": bid})
            raise
        await col_bills.update_one({"_id": bid}, {"$set": {"approval_status": "PENDING", "approval_id": ap["_id"]}})
        await log_audit(ctx, "vendor_bill.created", "vendor_bill", bid, {"amount_cents": dto.amount_cents, "bill_no": doc["bill_no"]})
        doc.update(approval_status="PENDING", approval_id=ap["_id"])
        return _row(doc)
    return await enforce_idempotency(request, ctx, handler)


@router.get("/vendor-bills/{bill_id}")
async def get_bill(bill_id: str, ctx: AuthCtx = Depends(get_ctx)):
    b = await col_bills.find_one({"_id": bill_id, "org_id": ctx.org_id, "deleted_at": None})
    if not b:
        raise HTTPException(404, "Bill not found")
    return _row(b)


# ── Vendor payments ──────────────────────────────────────────────────────────

@router.get("/vendor-payments")
async def list_vendor_payments(vendor_id: Optional[str] = None, limit: int = 100, ctx: AuthCtx = Depends(get_ctx)):
    q: dict = {"org_id": ctx.org_id, "deleted_at": None}
    if vendor_id:
        q["vendor_id"] = vendor_id
    rows = await col_vendor_payments.find(q).sort("paid_on", -1).limit(min(max(limit, 1), 500)).to_list(500)
    return [_row(r) for r in rows]


@router.post("/vendor-payments", dependencies=[Depends(require_role("OWNER", "ACCOUNTANT", "PM"))])
async def create_vendor_payment(dto: VendorPaymentIn, request: Request, ctx: AuthCtx = Depends(get_ctx)):
    async def handler():
        vendor = await _vendor_or_404(ctx, dto.vendor_id)
        if dto.project_id:
            assert_project_open(await _get_project_or_404(ctx, dto.project_id))
        _assert_not_future(_valid_date(dto.paid_on), "Payment date")
        if dto.proof_photo_key:
            await require_uploads(ctx, [dto.proof_photo_key], "proof photo")
        pid = _uid()
        doc = {
            "_id": pid, "org_id": ctx.org_id, **dto.model_dump(), "vendor_name": vendor["name"], "currency": "INR",
            "approval_status": "DRAFT", "approval_id": None,
            "source_type": "PAYMENT", "ledger_posted": False, "ledger_entry_id": None,
            "captured_by_id": ctx.user_id, "created_at": core._now(), "deleted_at": None,
        }
        await col_vendor_payments.insert_one(doc)
        ap = await core._request_approval(ctx, "PAYMENT", pid, dto.amount_cents)
        status = "APPROVED" if ap["status"] == "APPROVED" else "PENDING"      # Owner entries are effective at once
        await col_vendor_payments.update_one({"_id": pid}, {"$set": {"approval_status": status, "approval_id": ap["_id"]}})
        await log_audit(ctx, "vendor_payment.created", "vendor_payment", pid, {"amount_cents": dto.amount_cents})
        doc.update(approval_status=status, approval_id=ap["_id"])
        return _row(doc)
    return await enforce_idempotency(request, ctx, handler)


# ── Outstanding & statements ─────────────────────────────────────────────────

async def _vendor_totals(org_id: str) -> dict:
    """vendor_id → billed/paid/pending (paise). Only APPROVED records move the balance."""
    out: dict = {}

    def slot(vid):
        return out.setdefault(vid, {"billed_cents": 0, "paid_cents": 0, "pending_bills_cents": 0, "pending_payments_cents": 0})

    for r in await col_bills.aggregate([
        {"$match": {"org_id": org_id, "deleted_at": None}},
        {"$group": {"_id": {"v": "$vendor_id", "s": "$approval_status"}, "t": {"$sum": "$amount_cents"}}},
    ]).to_list(10000):
        key = {"APPROVED": "billed_cents", "PENDING": "pending_bills_cents"}.get(r["_id"]["s"])
        if key:
            slot(r["_id"]["v"])[key] += r["t"]
    for r in await col_vendor_payments.aggregate([
        {"$match": {"org_id": org_id, "deleted_at": None}},
        {"$group": {"_id": {"v": "$vendor_id", "s": "$approval_status"}, "t": {"$sum": "$amount_cents"}}},
    ]).to_list(10000):
        key = {"APPROVED": "paid_cents", "PENDING": "pending_payments_cents"}.get(r["_id"]["s"])
        if key:
            slot(r["_id"]["v"])[key] += r["t"]
    for s in out.values():
        s["outstanding_cents"] = s["billed_cents"] - s["paid_cents"]    # negative = we have paid in advance
    return out


@router.get("/vendors/balances")
async def vendor_balances(ctx: AuthCtx = Depends(get_ctx)):
    """Outstanding per vendor, largest first. Vendors with no activity are omitted."""
    totals = await _vendor_totals(ctx.org_id)
    vendors = {v["_id"]: v async for v in core.col_vendors.find({"_id": {"$in": list(totals)}, "org_id": ctx.org_id})}
    rows = [{"vendor_id": vid, "vendor_name": vendors[vid]["name"], "kind": vendors[vid].get("kind", "SUPPLIER"), **t}
            for vid, t in totals.items() if vid in vendors]
    rows.sort(key=lambda r: -r["outstanding_cents"])
    return {
        "vendors": rows,
        "total_outstanding_cents": sum(max(r["outstanding_cents"], 0) for r in rows),
        "total_advances_cents": sum(-r["outstanding_cents"] for r in rows if r["outstanding_cents"] < 0),
        "note": PRE_LEDGER_NOTE,
    }


@router.get("/vendors/{vendor_id}/statement")
async def vendor_statement(vendor_id: str, ctx: AuthCtx = Depends(get_ctx)):
    """Bills and payments in date order with a running balance, plus which bills are still open."""
    v = await _vendor_or_404(ctx, vendor_id)
    bills = await col_bills.find({"org_id": ctx.org_id, "vendor_id": vendor_id, "deleted_at": None, "approval_status": "APPROVED"}).to_list(5000)
    pays = await col_vendor_payments.find({"org_id": ctx.org_id, "vendor_id": vendor_id, "deleted_at": None, "approval_status": "APPROVED"}).to_list(5000)
    pending_b = await col_bills.find({"org_id": ctx.org_id, "vendor_id": vendor_id, "deleted_at": None, "approval_status": "PENDING"}).to_list(200)
    pending_p = await col_vendor_payments.find({"org_id": ctx.org_id, "vendor_id": vendor_id, "deleted_at": None, "approval_status": "PENDING"}).to_list(200)
    projs = {p["_id"]: p["code"] async for p in core.col_projects.find({"_id": {"$in": list({b["project_id"] for b in bills})}}, {"code": 1})}

    lines = [{"date": b["bill_date"], "type": "BILL", "ref": b["bill_no"], "project_code": projs.get(b["project_id"]),
              "billed_cents": b["amount_cents"], "paid_cents": 0} for b in bills]
    lines += [{"date": p["paid_on"], "type": "PAYMENT", "ref": p.get("ref_no") or p["mode"], "project_code": None,
               "billed_cents": 0, "paid_cents": p["amount_cents"]} for p in pays]
    lines.sort(key=lambda l: (l["date"], l["type"] != "BILL"))
    running = 0
    for l in lines:
        running += l["billed_cents"] - l["paid_cents"]
        l["balance_cents"] = running

    # FIFO: payments clear the oldest bills first → which bills remain open
    remaining_paid = sum(p["amount_cents"] for p in pays)
    today = _today_ist().isoformat()
    open_bills = []
    for b in sorted(bills, key=lambda b: (b["bill_date"], b["created_at"])):
        applied = min(remaining_paid, b["amount_cents"])
        remaining_paid -= applied
        outstanding = b["amount_cents"] - applied
        open_bills.append({
            "id": b["_id"], "bill_no": b["bill_no"], "bill_date": b["bill_date"], "due_date": b.get("due_date"),
            "project_code": projs.get(b["project_id"]), "amount_cents": b["amount_cents"],
            "paid_cents": applied, "outstanding_cents": outstanding,
            "status": "PAID" if outstanding == 0 else ("PARTIAL" if applied else "UNPAID"),
            "overdue": bool(outstanding and b.get("due_date") and b["due_date"] < today),
        })
    billed = sum(b["amount_cents"] for b in bills)
    paid = sum(p["amount_cents"] for p in pays)
    return {
        "vendor": _row(v), "billed_cents": billed, "paid_cents": paid,
        "outstanding_cents": billed - paid, "advance_cents": max(0, paid - billed),
        "pending_bills_cents": sum(b["amount_cents"] for b in pending_b),
        "pending_payments_cents": sum(p["amount_cents"] for p in pending_p),
        "lines": lines, "bills": open_bills, "note": PRE_LEDGER_NOTE,
    }


# ── Approval engine hooks / indexes ──────────────────────────────────────────

def _summ_bill(b: dict) -> dict:
    return {
        "kind": "VENDOR_BILL", "title": f"{b.get('vendor_name')} — bill {b.get('bill_no')}",
        "vendor_name": b.get("vendor_name"), "occurred_on": b.get("bill_date"), "due_date": b.get("due_date"),
        "photo_keys": b.get("photo_keys", []), "bill_photo_key": (b.get("photo_keys") or [None])[0],
        "note": b.get("description"), "grn_count": len(b.get("grn_ids", [])),
    }


def _summ_vendor_payment(p: dict) -> dict:
    return {
        "kind": "PAYMENT", "title": f"Payment to {p.get('vendor_name')}", "vendor_name": p.get("vendor_name"),
        "category": p.get("mode"), "occurred_on": p.get("paid_on"), "bill_photo_key": p.get("proof_photo_key"),
        "note": " · ".join(x for x in (p.get("ref_no"), p.get("note")) if x) or None,
    }


async def _bill_decided(approval: dict, new_status: str) -> None:
    """A rejected bill releases the goods receipts it had claimed, so they can be billed again."""
    if new_status == "REJECTED":
        await inventory.col_grns.update_many(
            {"org_id": approval["org_id"], "billed_by_bill_id": approval["target_id"]},
            {"$set": {"billed_by_bill_id": None}},
        )


register_target("VENDOR_BILL", col_bills, _summ_bill, on_decided=_bill_decided)
register_target("PAYMENT", col_vendor_payments, _summ_vendor_payment)

register_indexes(col_bills, [("org_id", 1), ("vendor_id", 1), ("bill_key", 1)], name="ix_org_vendor_billkey")
register_indexes(col_bills, [("org_id", 1), ("project_id", 1), ("bill_date", -1)], name="ix_org_project_date")
register_indexes(col_bills, [("org_id", 1), ("approval_status", 1)], name="ix_org_status")
register_indexes(col_vendor_payments, [("org_id", 1), ("vendor_id", 1), ("paid_on", -1)], name="ix_org_vendor_date")


async def bills_by_project(org_id: str) -> dict:
    """project_id → approved vendor bills (paise, gross)."""
    rows = await col_bills.aggregate([
        {"$match": {"org_id": org_id, "approval_status": "APPROVED", "deleted_at": None}},
        {"$group": {"_id": "$project_id", "total": {"$sum": "$amount_cents"}}},
    ]).to_list(2000)
    return {r["_id"]: r["total"] for r in rows}
