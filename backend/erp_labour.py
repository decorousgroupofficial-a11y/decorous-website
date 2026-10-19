"""
Decorous ERP — Labour & attendance (the Onsite-style muster / khata).

Mounted under /api/erp/* (see erp_api.py).

Model
  • Worker          master record: trade, skill level, daily wage, optional OT rate.
  • Attendance      ONE sheet per (project, date) — a "muster". Each entry snapshots the
                    worker's wage at marking time, so later rate changes never rewrite
                    history. Sheets go through maker-checker (target ATTENDANCE).
  • WorkerPayment   wages / advances paid out. Maker-checker (target WORKER_PAYMENT),
                    PIN ≥ ₹50,000 like every other money-out.

Money is INTEGER paise. Day fractions are integer "halves" (PRESENT=2, HALF=1) and
overtime is integer half-hours, so no float ever touches an amount.

Operational balances (earned − paid) are DERIVED from approved records at read time.
Nothing is posted to a ledger (ADR-003); every capture row carries the ledger-ready
fields so the CA phase is a mapping, not a migration.
"""
from __future__ import annotations

from datetime import date
from typing import Optional, List, Literal

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from pymongo.errors import DuplicateKeyError

import erp_routes as core
from erp_routes import (
    AuthCtx, get_ctx, require_role, enforce_idempotency, log_audit, require_uploads,
    register_target, register_indexes, _db, _uid, _clean, _valid_date, _assert_not_future,
    _get_project_or_404, assert_project_open,
)

router = APIRouter(prefix="/api/erp")

col_workers = _db["erp_workers"]
col_attendance = _db["erp_attendance"]
col_worker_payments = _db["erp_worker_payments"]

Trade = Literal[
    "MASON", "CARPENTER", "BAR_BENDER", "ELECTRICIAN", "PLUMBER", "PAINTER",
    "TILER", "WELDER", "HELPER", "SUPERVISOR", "DRIVER", "OTHER",
]
SkillLevel = Literal["SKILLED", "SEMI_SKILLED", "HELPER"]
AttendanceStatus = Literal["PRESENT", "HALF", "ABSENT"]
PayKind = Literal["WAGE", "ADVANCE"]
PayMode = Literal["CASH", "UPI", "BANK"]

DAY_HALVES = {"PRESENT": 2, "HALF": 1, "ABSENT": 0}
MAX_OT_HALF_HOURS = 24          # 12 hours of overtime in a day is the hard ceiling


# ── Models ───────────────────────────────────────────────────────────────────

class WorkerIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    phone: Optional[str] = Field(default=None, max_length=20)
    trade: Trade = "HELPER"
    skill_level: SkillLevel = "HELPER"
    daily_wage_cents: int = Field(gt=0, le=10_000_000)            # ≤ ₹1,00,000 / day sanity cap
    ot_rate_cents: Optional[int] = Field(default=None, ge=0, le=10_000_000)   # per hour
    contractor_id: Optional[str] = None                           # a LABOUR_CONTRACTOR vendor
    joined_on: Optional[str] = Field(default=None, pattern=core.DATE_RE)


class WorkerPatch(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=80)
    phone: Optional[str] = Field(default=None, max_length=20)
    trade: Optional[Trade] = None
    skill_level: Optional[SkillLevel] = None
    daily_wage_cents: Optional[int] = Field(default=None, gt=0, le=10_000_000)
    ot_rate_cents: Optional[int] = Field(default=None, ge=0, le=10_000_000)
    contractor_id: Optional[str] = None
    is_active: Optional[bool] = None


class EntryIn(BaseModel):
    worker_id: str
    status: AttendanceStatus
    ot_hours: float = Field(default=0, ge=0, le=12)
    note: Optional[str] = Field(default=None, max_length=200)


class AttendanceIn(BaseModel):
    project_id: str
    date: str = Field(pattern=core.DATE_RE)
    entries: List[EntryIn] = Field(min_length=1, max_length=500)


class WorkerPaymentIn(BaseModel):
    worker_id: str
    project_id: Optional[str] = None
    kind: PayKind = "WAGE"
    amount_cents: int = Field(gt=0, le=100_000_000)
    paid_on: str = Field(pattern=core.DATE_RE)
    mode: PayMode = "CASH"
    ref_no: Optional[str] = Field(default=None, max_length=60)
    note: Optional[str] = Field(default=None, max_length=200)
    proof_photo_key: Optional[str] = None


# ── Money maths (integers only) ──────────────────────────────────────────────

def entry_amounts(status: str, ot_hours: float, daily_wage_cents: int, ot_rate_cents: Optional[int]) -> tuple[int, int, int]:
    """
    Returns (day_halves, ot_half_hours, amount_cents).
      PRESENT = full wage, HALF = floor(wage / 2), ABSENT = 0.
      Overtime: ot_rate_cents per hour; if the worker has no explicit OT rate it is
      paid at the plain hourly rate (daily wage / 8). Overtime only on a worked day.
    """
    halves = DAY_HALVES[status]
    twice = ot_hours * 2
    if twice != int(twice):
        raise HTTPException(422, "Overtime must be in whole or half hours (e.g. 1, 1.5, 2)")
    ot_half = int(twice)
    if ot_half and halves == 0:
        raise HTTPException(422, "Overtime cannot be recorded for an absent worker")
    rate = ot_rate_cents if ot_rate_cents is not None else daily_wage_cents // 8
    base = daily_wage_cents if halves == 2 else (daily_wage_cents // 2 if halves == 1 else 0)
    return halves, ot_half, base + (ot_half * rate) // 2


# ── Workers ──────────────────────────────────────────────────────────────────

async def _balances(org_id: str, worker_ids: Optional[list] = None) -> dict:
    """worker_id → {earned_cents, paid_cents, pending_paid_cents, days_halves}. Approved records only."""
    match: dict = {"org_id": org_id, "approval_status": "APPROVED"}
    earned = await col_attendance.aggregate([
        {"$match": match},
        {"$unwind": "$entries"},
        {"$group": {"_id": "$entries.worker_id",
                    "earned": {"$sum": "$entries.amount_cents"},
                    "halves": {"$sum": "$entries.day_halves"}}},
    ]).to_list(5000)
    pay = await col_worker_payments.aggregate([
        {"$match": {"org_id": org_id, "deleted_at": None}},
        {"$group": {"_id": {"w": "$worker_id", "s": "$approval_status"}, "total": {"$sum": "$amount_cents"}}},
    ]).to_list(5000)
    out: dict = {}
    for r in earned:
        out.setdefault(r["_id"], {})["earned_cents"] = r["earned"]
        out[r["_id"]]["day_halves"] = r["halves"]
    for r in pay:
        w, s = r["_id"]["w"], r["_id"]["s"]
        slot = out.setdefault(w, {})
        if s == "APPROVED":
            slot["paid_cents"] = slot.get("paid_cents", 0) + r["total"]
        elif s == "PENDING":
            slot["pending_paid_cents"] = slot.get("pending_paid_cents", 0) + r["total"]
    for slot in out.values():
        slot.setdefault("earned_cents", 0)
        slot.setdefault("paid_cents", 0)
        slot.setdefault("pending_paid_cents", 0)
        slot.setdefault("day_halves", 0)
        slot["balance_cents"] = slot["earned_cents"] - slot["paid_cents"]
    return out


def _worker_row(w: dict, bal: Optional[dict] = None) -> dict:
    w = dict(w)
    w["id"] = w.pop("_id")
    b = bal or {}
    w["earned_cents"] = b.get("earned_cents", 0)
    w["paid_cents"] = b.get("paid_cents", 0)
    w["pending_paid_cents"] = b.get("pending_paid_cents", 0)
    w["balance_cents"] = b.get("balance_cents", 0)       # + = we owe the worker, − = unrecovered advance
    w["days_worked"] = b.get("day_halves", 0) / 2
    return _clean(w)


@router.get("/workers")
async def list_workers(include_inactive: bool = False, ctx: AuthCtx = Depends(get_ctx)):
    q: dict = {"org_id": ctx.org_id, "deleted_at": None}
    if not include_inactive:
        q["is_active"] = True
    workers = await col_workers.find(q).sort("name", 1).to_list(2000)
    bal = await _balances(ctx.org_id)
    return [_worker_row(w, bal.get(w["_id"])) for w in workers]


@router.post("/workers", dependencies=[Depends(require_role("OWNER", "PM", "ACCOUNTANT"))])
async def create_worker(dto: WorkerIn, ctx: AuthCtx = Depends(get_ctx)):
    if dto.contractor_id:
        v = await core.col_vendors.find_one({"_id": dto.contractor_id, "org_id": ctx.org_id, "deleted_at": None})
        if not v:
            raise HTTPException(404, "Labour contractor not found")
    wid = _uid()
    doc = {
        "_id": wid, "org_id": ctx.org_id, **dto.model_dump(),
        "name": dto.name.strip(), "joined_on": _valid_date(dto.joined_on),
        "is_active": True, "created_by_id": ctx.user_id,
        "created_at": core._now(), "deleted_at": None,
    }
    await col_workers.insert_one(doc)
    await log_audit(ctx, "worker.created", "worker", wid, {"name": doc["name"], "daily_wage_cents": dto.daily_wage_cents})
    return _worker_row(doc)


async def _worker_or_404(ctx: AuthCtx, worker_id: str) -> dict:
    w = await col_workers.find_one({"_id": worker_id, "org_id": ctx.org_id, "deleted_at": None})
    if not w:
        raise HTTPException(404, "Worker not found")
    return w


@router.patch("/workers/{worker_id}", dependencies=[Depends(require_role("OWNER", "PM", "ACCOUNTANT"))])
async def update_worker(worker_id: str, dto: WorkerPatch, ctx: AuthCtx = Depends(get_ctx)):
    w = await _worker_or_404(ctx, worker_id)
    changes = dto.model_dump(exclude_unset=True)
    if changes:
        changes["updated_at"] = core._now()
        await col_workers.update_one({"_id": worker_id, "org_id": ctx.org_id}, {"$set": changes})
        # NB: past attendance keeps the rate it was marked at — only future sheets use the new wage.
        await log_audit(ctx, "worker.updated", "worker", worker_id, {k: v for k, v in changes.items() if k != "updated_at"})
        w.update(changes)
    return _worker_row(w, (await _balances(ctx.org_id)).get(worker_id))


@router.get("/workers/{worker_id}/statement")
async def worker_statement(
    worker_id: str, date_from: Optional[str] = None, date_to: Optional[str] = None,
    ctx: AuthCtx = Depends(get_ctx),
):
    """Chronological earned-vs-paid statement with a running balance (approved records only)."""
    w = await _worker_or_404(ctx, worker_id)
    lines: list[dict] = []

    sheets = await col_attendance.find({
        "org_id": ctx.org_id, "approval_status": "APPROVED", "entries.worker_id": worker_id,
    }).to_list(5000)
    proj_ids = list({s["project_id"] for s in sheets})
    projects = {p["_id"]: p["code"] async for p in core.col_projects.find({"_id": {"$in": proj_ids}}, {"code": 1})}
    for s in sheets:
        for e in s["entries"]:
            if e["worker_id"] == worker_id and e["day_halves"] > 0:
                lines.append({
                    "date": s["date"], "type": "ATTENDANCE", "project_code": projects.get(s["project_id"]),
                    "description": e["status"] + (f" + {e['ot_hours']}h OT" if e.get("ot_hours") else ""),
                    "earned_cents": e["amount_cents"], "paid_cents": 0,
                })
    pays = await col_worker_payments.find({
        "org_id": ctx.org_id, "worker_id": worker_id, "deleted_at": None, "approval_status": "APPROVED",
    }).to_list(5000)
    for p in pays:
        lines.append({
            "date": p["paid_on"], "type": p["kind"], "project_code": None,
            "description": f"{p['kind'].title()} · {p['mode']}" + (f" · {p['ref_no']}" if p.get("ref_no") else ""),
            "earned_cents": 0, "paid_cents": p["amount_cents"],
        })
    pending = await col_worker_payments.find({
        "org_id": ctx.org_id, "worker_id": worker_id, "deleted_at": None, "approval_status": "PENDING",
    }).to_list(200)

    lines.sort(key=lambda l: (l["date"], l["type"] != "ATTENDANCE"))
    running = 0
    for l in lines:
        running += l["earned_cents"] - l["paid_cents"]
        l["balance_cents"] = running
    # Range filter applies to what is *shown*; the running balance stays true to history.
    if date_from:
        lines = [l for l in lines if l["date"] >= date_from]
    if date_to:
        lines = [l for l in lines if l["date"] <= date_to]

    bal = (await _balances(ctx.org_id, [worker_id])).get(worker_id, {})
    return {
        "worker": _worker_row(w, bal),
        "earned_cents": bal.get("earned_cents", 0), "paid_cents": bal.get("paid_cents", 0),
        "balance_cents": bal.get("balance_cents", 0),
        "pending_payments": [{"id": p["_id"], "amount_cents": p["amount_cents"], "kind": p["kind"], "paid_on": p["paid_on"]} for p in pending],
        "lines": lines,
        "note": "Operational balance from approved records — not an accounting ledger.",
    }


# ── Attendance ───────────────────────────────────────────────────────────────

def _sheet_row(s: dict) -> dict:
    s = dict(s)
    s["id"] = s.pop("_id")
    return _clean(s)


async def _other_site_halves(ctx: AuthCtx, project_id: str, day: str) -> dict:
    """worker_id → day-halves already claimed on OTHER sites that day (rejected sheets don't count)."""
    claimed: dict = {}
    async for s in col_attendance.find({
        "org_id": ctx.org_id, "date": day, "project_id": {"$ne": project_id},
        "approval_status": {"$ne": "REJECTED"},
    }):
        for e in s["entries"]:
            claimed[e["worker_id"]] = claimed.get(e["worker_id"], 0) + e["day_halves"]
    return claimed


@router.get("/attendance/roster")
async def attendance_roster(project_id: str, date: str, ctx: AuthCtx = Depends(get_ctx)):
    """Everything the muster screen needs: active workers + any existing sheet for the day."""
    _valid_date(date)
    await _get_project_or_404(ctx, project_id)
    workers = await col_workers.find({"org_id": ctx.org_id, "deleted_at": None, "is_active": True}).sort("name", 1).to_list(2000)
    sheet = await col_attendance.find_one({"org_id": ctx.org_id, "project_id": project_id, "date": date})
    elsewhere = await _other_site_halves(ctx, project_id, date)
    return {
        "workers": [{
            "id": w["_id"], "name": w["name"], "trade": w["trade"], "skill_level": w["skill_level"],
            "daily_wage_cents": w["daily_wage_cents"], "ot_rate_cents": w.get("ot_rate_cents"),
            "halves_on_other_sites": elsewhere.get(w["_id"], 0),
        } for w in workers],
        "sheet": _sheet_row(sheet) if sheet else None,
    }


@router.get("/attendance")
async def list_attendance(
    project_id: Optional[str] = None, date_from: Optional[str] = None, date_to: Optional[str] = None,
    limit: int = 60, ctx: AuthCtx = Depends(get_ctx),
):
    q: dict = {"org_id": ctx.org_id}
    if project_id:
        q["project_id"] = project_id
    rng: dict = {}
    if date_from:
        rng["$gte"] = date_from
    if date_to:
        rng["$lte"] = date_to
    if rng:
        q["date"] = rng
    sheets = await col_attendance.find(q).sort("date", -1).limit(min(max(limit, 1), 366)).to_list(366)
    pids = list({s["project_id"] for s in sheets})
    projects = {p["_id"]: p async for p in core.col_projects.find({"_id": {"$in": pids}}, {"code": 1, "name": 1})}
    out = []
    for s in sheets:
        row = _sheet_row(s)
        row["project_code"] = projects.get(s["project_id"], {}).get("code")
        row["present"] = sum(1 for e in s["entries"] if e["status"] == "PRESENT")
        row["half"] = sum(1 for e in s["entries"] if e["status"] == "HALF")
        row["absent"] = sum(1 for e in s["entries"] if e["status"] == "ABSENT")
        out.append(row)
    return out


@router.put("/attendance", dependencies=[Depends(require_role("OWNER", "PM", "ENGINEER"))])
async def save_attendance(dto: AttendanceIn, ctx: AuthCtx = Depends(get_ctx)):
    """Create or replace the DRAFT muster for (project, date). Locked once submitted."""
    project = await _get_project_or_404(ctx, dto.project_id)
    assert_project_open(project)
    _assert_not_future(_valid_date(dto.date), "Attendance date")

    seen = [e.worker_id for e in dto.entries]
    if len(set(seen)) != len(seen):
        raise HTTPException(422, "A worker appears more than once on this sheet")
    workers = {
        w["_id"]: w async for w in col_workers.find({"_id": {"$in": seen}, "org_id": ctx.org_id, "deleted_at": None})
    }
    missing = [i for i in seen if i not in workers]
    if missing:
        raise HTTPException(404, "One or more workers were not found")

    existing = await col_attendance.find_one({"org_id": ctx.org_id, "project_id": dto.project_id, "date": dto.date})
    if existing and existing["approval_status"] in ("PENDING", "APPROVED"):
        raise HTTPException(400, f"This sheet is already {existing['approval_status'].lower()} and can no longer be edited")

    elsewhere = await _other_site_halves(ctx, dto.project_id, dto.date)
    entries, total = [], 0
    for e in dto.entries:
        w = workers[e.worker_id]
        if not w.get("is_active", True):
            raise HTTPException(400, f"{w['name']} is inactive")
        halves, ot_half, amount = entry_amounts(e.status, e.ot_hours, w["daily_wage_cents"], w.get("ot_rate_cents"))
        if halves + elsewhere.get(e.worker_id, 0) > 2:
            raise HTTPException(
                400, f"{w['name']} is already marked present on another site that day — a worker can't be paid for more than one day",
            )
        entries.append({
            "worker_id": e.worker_id, "worker_name": w["name"], "trade": w["trade"],
            "status": e.status, "day_halves": halves, "ot_hours": ot_half / 2, "note": e.note,
            "daily_wage_cents": w["daily_wage_cents"],                       # snapshot
            "ot_rate_cents": w.get("ot_rate_cents") if w.get("ot_rate_cents") is not None else w["daily_wage_cents"] // 8,
            "amount_cents": amount,
        })
        total += amount

    now = core._now()
    fields = {
        "entries": entries, "total_cents": total, "approval_status": "DRAFT", "approval_id": None,
        "updated_at": now, "updated_by_id": ctx.user_id,
    }
    if existing:
        await col_attendance.update_one({"_id": existing["_id"]}, {"$set": fields})
        sid = existing["_id"]
    else:
        sid = _uid()
        try:
            await col_attendance.insert_one({
                "_id": sid, "org_id": ctx.org_id, "project_id": dto.project_id, "date": dto.date,
                "source_type": "ATTENDANCE", "ledger_posted": False, "ledger_entry_id": None,
                "captured_by_id": ctx.user_id, "created_at": now, "deleted_at": None, **fields,
            })
        except DuplicateKeyError:
            raise HTTPException(409, "Someone else just started this sheet — reload and try again")
    await log_audit(ctx, "attendance.saved", "attendance", sid, {"date": dto.date, "total_cents": total})
    return _sheet_row(await col_attendance.find_one({"_id": sid}))


@router.get("/attendance/{sheet_id}")
async def get_attendance(sheet_id: str, ctx: AuthCtx = Depends(get_ctx)):
    s = await col_attendance.find_one({"_id": sheet_id, "org_id": ctx.org_id})
    if not s:
        raise HTTPException(404, "Attendance sheet not found")
    return _sheet_row(s)


@router.post("/attendance/{sheet_id}/submit", dependencies=[Depends(require_role("OWNER", "PM", "ENGINEER"))])
async def submit_attendance(sheet_id: str, request: Request, ctx: AuthCtx = Depends(get_ctx)):
    async def handler():
        s = await col_attendance.find_one({"_id": sheet_id, "org_id": ctx.org_id})
        if not s:
            raise HTTPException(404, "Attendance sheet not found")
        if s["approval_status"] != "DRAFT":
            raise HTTPException(400, f"Sheet already {s['approval_status'].lower()}")
        ap = await core._request_approval(ctx, "ATTENDANCE", sheet_id, s["total_cents"])
        await col_attendance.update_one({"_id": sheet_id}, {"$set": {"approval_status": "PENDING", "approval_id": ap["_id"]}})
        await log_audit(ctx, "attendance.submitted", "attendance", sheet_id)
        return {"id": sheet_id, "approval_id": ap["_id"], "approval_status": "PENDING"}
    return await enforce_idempotency(request, ctx, handler)


# ── Worker payments (wages / advances) ───────────────────────────────────────

@router.get("/worker-payments")
async def list_worker_payments(worker_id: Optional[str] = None, limit: int = 100, ctx: AuthCtx = Depends(get_ctx)):
    q: dict = {"org_id": ctx.org_id, "deleted_at": None}
    if worker_id:
        q["worker_id"] = worker_id
    rows = await col_worker_payments.find(q).sort("paid_on", -1).limit(min(max(limit, 1), 500)).to_list(500)
    names = {w["_id"]: w["name"] async for w in col_workers.find({"_id": {"$in": list({r["worker_id"] for r in rows})}}, {"name": 1})}
    out = []
    for r in rows:
        r = dict(r)
        r["id"] = r.pop("_id")
        r["worker_name"] = names.get(r["worker_id"])
        out.append(_clean(r))
    return out


@router.post("/worker-payments", dependencies=[Depends(require_role("OWNER", "PM", "ACCOUNTANT"))])
async def create_worker_payment(dto: WorkerPaymentIn, request: Request, ctx: AuthCtx = Depends(get_ctx)):
    """Record a wage/advance payment and submit it for approval in one idempotent call."""
    async def handler():
        w = await _worker_or_404(ctx, dto.worker_id)
        if dto.project_id:
            assert_project_open(await _get_project_or_404(ctx, dto.project_id))
        _assert_not_future(_valid_date(dto.paid_on), "Payment date")
        if dto.proof_photo_key:
            await require_uploads(ctx, [dto.proof_photo_key], "proof photo")
        pid = _uid()
        doc = {
            "_id": pid, "org_id": ctx.org_id, **dto.model_dump(),
            "worker_name": w["name"], "currency": "INR",
            "approval_status": "DRAFT", "approval_id": None,
            "source_type": "WORKER_PAYMENT", "ledger_posted": False, "ledger_entry_id": None,
            "captured_by_id": ctx.user_id, "created_at": core._now(), "deleted_at": None,
        }
        await col_worker_payments.insert_one(doc)
        ap = await core._request_approval(ctx, "WORKER_PAYMENT", pid, dto.amount_cents)
        status = "APPROVED" if ap["status"] == "APPROVED" else "PENDING"
        await col_worker_payments.update_one({"_id": pid}, {"$set": {"approval_status": status, "approval_id": ap["_id"]}})
        await log_audit(ctx, "worker_payment.created", "worker_payment", pid, {"amount_cents": dto.amount_cents, "kind": dto.kind})
        doc.update(approval_status=status, approval_id=ap["_id"])
        doc["id"] = doc.pop("_id")
        return _clean(doc)
    return await enforce_idempotency(request, ctx, handler)


# ── Approval engine hooks ────────────────────────────────────────────────────

def _summ_attendance(s: dict) -> dict:
    present = sum(1 for e in s.get("entries", []) if e["status"] == "PRESENT")
    half = sum(1 for e in s.get("entries", []) if e["status"] == "HALF")
    return {
        "kind": "ATTENDANCE", "title": f"Attendance {s.get('date')}: {present} present, {half} half-day",
        "report_date": s.get("date"), "labour_total": present + half,
        "total_cents": s.get("total_cents"),
    }


def _summ_worker_payment(p: dict) -> dict:
    return {
        "kind": "WORKER_PAYMENT", "title": f"{p.get('kind', 'WAGE').title()} to {p.get('worker_name')}",
        "category": p.get("mode"), "occurred_on": p.get("paid_on"),
        "bill_photo_key": p.get("proof_photo_key"), "note": p.get("note"),
    }


register_target("ATTENDANCE", col_attendance, _summ_attendance)
register_target("WORKER_PAYMENT", col_worker_payments, _summ_worker_payment)

register_indexes(col_workers, [("org_id", 1), ("is_active", 1), ("name", 1)], name="ix_org_active_name")
register_indexes(col_attendance, [("org_id", 1), ("project_id", 1), ("date", 1)], unique=True, name="uq_org_project_date")
register_indexes(col_attendance, [("org_id", 1), ("date", 1)], name="ix_org_date")
register_indexes(col_attendance, [("org_id", 1), ("approval_status", 1)], name="ix_org_status")
register_indexes(col_worker_payments, [("org_id", 1), ("worker_id", 1), ("paid_on", -1)], name="ix_org_worker_date")


# ── Aggregates reused by the project dashboard ───────────────────────────────

async def labour_cost_by_project(org_id: str) -> dict:
    """project_id → approved wages earned (paise)."""
    rows = await col_attendance.aggregate([
        {"$match": {"org_id": org_id, "approval_status": "APPROVED"}},
        {"$group": {"_id": "$project_id", "total": {"$sum": "$total_cents"}}},
    ]).to_list(2000)
    return {r["_id"]: r["total"] for r in rows}
