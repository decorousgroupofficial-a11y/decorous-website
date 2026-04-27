"""
Decorous ERP — FastAPI routes (MongoDB-backed).

Mounted under /api/erp/* by server.py.

Design principles (kept from the NestJS reference — /app/erp/):
  • Multi-tenant: every domain document has org_id. Services filter by request.user.org_id.
  • Soft delete: deleted_at + deleted_by_id on every document; queries exclude deleted.
  • Money: INTEGER paise (amount_cents). NEVER float.
  • UTC everywhere: datetime.now(timezone.utc). Clients convert for display.
  • Idempotency: writes require Idempotency-Key header; cached in idempotency_keys.
  • Approvals: maker-checker — maker != checker; PIN required ≥ ₹50,000; reason required for reject.
  • SLA: 24h (PM) / 48h (OWNER). Escalation sweep is called on each /approvals/pending read.
  • Ledger: FROZEN. Capture tables carry source_type + ledger_posted=false. No journal writes.
"""
from __future__ import annotations

import os
import secrets
from datetime import datetime, timezone, timedelta, date
from typing import Optional, List, Literal, Any
import uuid

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Depends, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

from pathlib import Path
load_dotenv(Path(__file__).parent / '.env')


# ── Config ───────────────────────────────────────────────────────────────────

JWT_SECRET = os.environ.get("ERP_JWT_SECRET", "change-me-in-production-min-32-chars")
JWT_ALGO = "HS256"
JWT_EXPIRES_MIN = 60 * 24  # 24h — long for convenience; refresh token pattern deferred

_mongo = AsyncIOMotorClient(os.environ["MONGO_URL"])
_db = _mongo[os.environ["DB_NAME"]]

# Collections
col_users = _db["erp_users"]
col_orgs = _db["erp_orgs"]
col_memberships = _db["erp_memberships"]
col_projects = _db["erp_projects"]
col_vendors = _db["erp_vendors"]
col_materials = _db["erp_materials"]
col_dprs = _db["erp_dprs"]
col_expenses = _db["erp_expenses"]
col_approvals = _db["erp_approvals"]
col_approval_events = _db["erp_approval_events"]
col_audit_log = _db["erp_audit_log"]
col_idempotency = _db["erp_idempotency"]


# ── Router ───────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/api/erp")
security = HTTPBearer(auto_error=False)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uid() -> str:
    return str(uuid.uuid4())


def _clean(doc: dict | None) -> dict | None:
    """Strip MongoDB _id from documents before returning to clients."""
    if not doc:
        return doc
    doc.pop("_id", None)
    return doc


def _hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def _verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def _issue_token(user_id: str, org_id: str, role: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "org_id": org_id,
        "role": role,
        "email": email,
        "exp": _now() + timedelta(minutes=JWT_EXPIRES_MIN),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


class AuthCtx(BaseModel):
    user_id: str
    org_id: str
    role: str
    email: str


async def get_ctx(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> AuthCtx:
    if not credentials:
        raise HTTPException(401, "Missing token")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    return AuthCtx(
        user_id=payload["sub"],
        org_id=payload["org_id"],
        role=payload["role"],
        email=payload["email"],
    )


def require_role(*roles: str):
    async def guard(ctx: AuthCtx = Depends(get_ctx)) -> AuthCtx:
        if ctx.role not in roles and ctx.role != "OWNER":
            raise HTTPException(403, f"Role {ctx.role} not permitted; need {roles}")
        return ctx
    return guard


async def enforce_idempotency(
    request: Request, ctx: AuthCtx, handler,
) -> Any:
    """
    Wraps a write handler with idempotency protection.
    Client sends Idempotency-Key header; duplicates return cached response.
    """
    key = request.headers.get("idempotency-key") or request.headers.get("Idempotency-Key")
    if not key or len(key) < 8:
        raise HTTPException(400, "Missing or invalid Idempotency-Key header")

    existing = await col_idempotency.find_one({"org_id": ctx.org_id, "key": key})
    if existing:
        return existing["response"]

    result = await handler()

    await col_idempotency.insert_one({
        "_id": _uid(),
        "org_id": ctx.org_id,
        "key": key,
        "user_id": ctx.user_id,
        "response": result,
        "created_at": _now(),
    })
    return result


async def log_audit(ctx: AuthCtx, action: str, entity_type: str, entity_id: str, after: dict | None = None):
    await col_audit_log.insert_one({
        "_id": _uid(),
        "org_id": ctx.org_id,
        "actor_id": ctx.user_id,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "after": after,
        "created_at": _now(),
    })


# ── Models (Pydantic) ────────────────────────────────────────────────────────

Role = Literal["OWNER", "ACCOUNTANT", "PM", "ENGINEER", "STOREKEEPER", "VIEWER"]
ApprovalStatus = Literal["DRAFT", "PENDING", "APPROVED", "REJECTED", "VOID"]
SourceType = Literal["EXPENSE", "MATERIAL_RECEIPT", "VENDOR_BILL", "PAYMENT", "DPR"]
ProjectStatus = Literal["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]
Weather = Literal["SUNNY", "CLOUDY", "RAINY", "STORMY"]
MaterialCategory = Literal[
    "CEMENT", "STEEL", "AGGREGATE", "SAND", "BRICK", "ELECTRICAL",
    "PLUMBING", "PAINT", "WOOD", "TILES", "HARDWARE", "CONSUMABLE", "OTHER",
]


class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=2)
    org_name: str = Field(min_length=2)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class AuthOut(BaseModel):
    access_token: str
    user_id: str
    org_id: str
    role: Role
    email: str
    full_name: str


class OrgOut(BaseModel):
    id: str
    name: str
    slug: str
    currency: str
    timezone: str


class ProjectIn(BaseModel):
    code: str = Field(min_length=2, max_length=32)
    name: str = Field(min_length=2)
    client_name: Optional[str] = None
    location: Optional[str] = None
    budget_cents: Optional[int] = Field(default=None, ge=0)


class VendorIn(BaseModel):
    name: str = Field(min_length=2)
    gstin: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None


class MaterialIn(BaseModel):
    sku: str = Field(min_length=2)
    name: str = Field(min_length=2)
    category: MaterialCategory
    uom: str
    hsn_code: Optional[str] = None


class DprIn(BaseModel):
    project_id: str
    report_date: str  # YYYY-MM-DD
    work_narrative: str = Field(min_length=3)
    activity_tags: List[str] = []
    weather: Optional[Weather] = None
    blockers: Optional[str] = None
    labour_counts: dict = {}  # { "mason": {"skilled": 5, "helper": 8}, ... }
    photo_keys: List[str] = Field(min_length=2)  # min 2 photos
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None


class ExpenseIn(BaseModel):
    project_id: str
    purpose: str = Field(min_length=2)
    category: str
    amount_cents: int = Field(gt=0)
    vendor_name: Optional[str] = None
    bill_photo_key: str  # required
    occurred_on: str  # YYYY-MM-DD


class DecideIn(BaseModel):
    action: Literal["APPROVE", "REJECT"]
    pin: Optional[str] = None
    comment: Optional[str] = None
    rejection_reason: Optional[str] = None


class InviteIn(BaseModel):
    email: EmailStr
    full_name: str
    role: Role
    temp_password: str = Field(min_length=8)


class SetPinIn(BaseModel):
    pin: str = Field(min_length=4, max_length=4)


# ── Approval engine ──────────────────────────────────────────────────────────

PIN_THRESHOLD_CENTS = 5_000_000  # ₹50,000
SLA_HOURS = {"PM": 24, "OWNER": 48, "ACCOUNTANT": 24}


def _required_role(target_type: SourceType, amount_cents: Optional[int]) -> str:
    amt = amount_cents or 0
    if target_type == "EXPENSE":
        if amt <= 500_000:
            return "AUTO"
        if amt <= 2_500_000:
            return "PM"
        return "OWNER"
    if target_type in ("MATERIAL_RECEIPT", "DPR"):
        return "PM"
    if target_type in ("VENDOR_BILL", "PAYMENT"):
        return "PM" if amt <= 5_000_000 else "OWNER"
    return "OWNER"


async def _request_approval(
    ctx: AuthCtx,
    target_type: SourceType,
    target_id: str,
    amount_cents: Optional[int],
) -> dict:
    required = _required_role(target_type, amount_cents)

    if required == "AUTO":
        approval = {
            "_id": _uid(),
            "org_id": ctx.org_id,
            "target_type": target_type,
            "target_id": target_id,
            "amount_cents": amount_cents,
            "currency": "INR",
            "status": "APPROVED",
            "required_role": "ENGINEER",
            "requested_by_id": ctx.user_id,
            "approver_id": ctx.user_id,
            "decided_at": _now(),
            "sla_due_at": None,
            "escalated_at": None,
            "escalated_to_role": None,
            "comment": None,
            "rejection_reason": None,
            "created_at": _now(),
        }
        await col_approvals.insert_one(approval)
        await col_approval_events.insert_one({
            "_id": _uid(),
            "approval_id": approval["_id"],
            "action": "AUTO_APPROVED",
            "actor_id": ctx.user_id,
            "actor_role": ctx.role,
            "pin_verified": False,
            "created_at": _now(),
        })
        return approval

    hours = SLA_HOURS.get(required, 24)
    approval = {
        "_id": _uid(),
        "org_id": ctx.org_id,
        "target_type": target_type,
        "target_id": target_id,
        "amount_cents": amount_cents,
        "currency": "INR",
        "status": "PENDING",
        "required_role": required,
        "requested_by_id": ctx.user_id,
        "approver_id": None,
        "decided_at": None,
        "sla_due_at": _now() + timedelta(hours=hours),
        "escalated_at": None,
        "escalated_to_role": None,
        "comment": None,
        "rejection_reason": None,
        "created_at": _now(),
    }
    await col_approvals.insert_one(approval)
    await col_approval_events.insert_one({
        "_id": _uid(),
        "approval_id": approval["_id"],
        "action": "REQUESTED",
        "actor_id": ctx.user_id,
        "actor_role": ctx.role,
        "pin_verified": False,
        "created_at": _now(),
    })
    return approval


async def _escalation_sweep(org_id: str):
    """Called opportunistically on /approvals/pending reads. Cheap."""
    now = _now()
    cursor = col_approvals.find({
        "org_id": org_id,
        "status": "PENDING",
        "sla_due_at": {"$lt": now},
        "escalated_at": None,
    }).limit(50)
    chain = {"ENGINEER": "PM", "PM": "OWNER"}
    async for a in cursor:
        nxt = chain.get(a["required_role"])
        if not nxt:
            continue
        await col_approvals.update_one({"_id": a["_id"]}, {"$set": {
            "required_role": nxt,
            "escalated_at": now,
            "escalated_to_role": nxt,
            "sla_due_at": now + timedelta(hours=SLA_HOURS.get(nxt, 24)),
        }})
        await col_approval_events.insert_one({
            "_id": _uid(),
            "approval_id": a["_id"],
            "action": "ESCALATED",
            "actor_id": "system",
            "actor_role": nxt,
            "pin_verified": False,
            "comment": f"Escalated from {a['required_role']} to {nxt} after SLA breach",
            "created_at": now,
        })


# ── Auth ─────────────────────────────────────────────────────────────────────

@router.post("/auth/signup", response_model=AuthOut)
async def signup(dto: SignupIn):
    if await col_users.find_one({"email": dto.email}):
        raise HTTPException(400, "Email already registered")

    user_id = _uid()
    org_id = _uid()
    slug_base = "".join(c if c.isalnum() else "-" for c in dto.org_name.lower()).strip("-")
    slug = f"{slug_base}-{secrets.token_hex(3)}"

    await col_orgs.insert_one({
        "_id": org_id,
        "name": dto.org_name,
        "slug": slug,
        "currency": "INR",
        "timezone": "Asia/Kolkata",
        "created_at": _now(),
        "deleted_at": None,
    })
    await col_users.insert_one({
        "_id": user_id,
        "email": dto.email,
        "full_name": dto.full_name,
        "password_hash": _hash_password(dto.password),
        "pin_hash": None,
        "is_active": True,
        "failed_logins": 0,
        "locked_until": None,
        "created_at": _now(),
        "deleted_at": None,
    })
    await col_memberships.insert_one({
        "_id": _uid(),
        "org_id": org_id,
        "user_id": user_id,
        "role": "OWNER",
        "accepted_at": _now(),
        "deleted_at": None,
    })

    token = _issue_token(user_id, org_id, "OWNER", dto.email)
    return AuthOut(
        access_token=token, user_id=user_id, org_id=org_id,
        role="OWNER", email=dto.email, full_name=dto.full_name,
    )


@router.post("/auth/login", response_model=AuthOut)
async def login(dto: LoginIn):
    user = await col_users.find_one({"email": dto.email, "deleted_at": None})
    if not user or not user.get("is_active"):
        raise HTTPException(401, "Invalid credentials")

    if user.get("locked_until") and user["locked_until"] > _now():
        raise HTTPException(401, "Account temporarily locked")

    if not _verify_password(dto.password, user["password_hash"]):
        failed = user.get("failed_logins", 0) + 1
        update = {"failed_logins": failed}
        if failed >= 5:
            update["locked_until"] = _now() + timedelta(minutes=15)
        await col_users.update_one({"_id": user["_id"]}, {"$set": update})
        raise HTTPException(401, "Invalid credentials")

    membership = await col_memberships.find_one({
        "user_id": user["_id"], "accepted_at": {"$ne": None}, "deleted_at": None,
    })
    if not membership:
        raise HTTPException(401, "No org membership")

    await col_users.update_one({"_id": user["_id"]}, {"$set": {
        "failed_logins": 0, "locked_until": None, "last_login_at": _now(),
    }})

    token = _issue_token(user["_id"], membership["org_id"], membership["role"], user["email"])
    return AuthOut(
        access_token=token, user_id=user["_id"], org_id=membership["org_id"],
        role=membership["role"], email=user["email"], full_name=user["full_name"],
    )


@router.get("/me", response_model=AuthOut)
async def me(ctx: AuthCtx = Depends(get_ctx)):
    user = await col_users.find_one({"_id": ctx.user_id})
    if not user:
        raise HTTPException(404, "User not found")
    return AuthOut(
        access_token="", user_id=ctx.user_id, org_id=ctx.org_id,
        role=ctx.role, email=ctx.email, full_name=user["full_name"],
    )


# ── Orgs ─────────────────────────────────────────────────────────────────────

@router.get("/orgs/me")
async def get_my_org(ctx: AuthCtx = Depends(get_ctx)):
    org = await col_orgs.find_one({"_id": ctx.org_id})
    if not org:
        raise HTTPException(404)
    org["id"] = org.pop("_id")
    return _clean(org)


# ── Users / Members ──────────────────────────────────────────────────────────

@router.get("/users")
async def list_members(ctx: AuthCtx = Depends(get_ctx)):
    members = await col_memberships.find(
        {"org_id": ctx.org_id, "deleted_at": None},
    ).to_list(500)
    out = []
    for m in members:
        user = await col_users.find_one({"_id": m["user_id"]})
        if user:
            out.append({
                "id": m["_id"],
                "role": m["role"],
                "accepted_at": m.get("accepted_at"),
                "user": {
                    "id": user["_id"],
                    "email": user["email"],
                    "full_name": user["full_name"],
                    "is_active": user.get("is_active", True),
                },
            })
    return out


@router.post("/users/invite", dependencies=[Depends(require_role("OWNER"))])
async def invite_user(dto: InviteIn, ctx: AuthCtx = Depends(get_ctx)):
    existing = await col_users.find_one({"email": dto.email})
    if existing:
        ex_member = await col_memberships.find_one({"org_id": ctx.org_id, "user_id": existing["_id"]})
        if ex_member:
            raise HTTPException(400, "Already a member")
        m_id = _uid()
        await col_memberships.insert_one({
            "_id": m_id, "org_id": ctx.org_id, "user_id": existing["_id"],
            "role": dto.role, "accepted_at": _now(), "deleted_at": None,
        })
        return {"id": m_id, "reused_user": True}

    user_id = _uid()
    await col_users.insert_one({
        "_id": user_id, "email": dto.email, "full_name": dto.full_name,
        "password_hash": _hash_password(dto.temp_password),
        "pin_hash": None, "is_active": True,
        "failed_logins": 0, "locked_until": None,
        "created_at": _now(), "deleted_at": None,
    })
    m_id = _uid()
    await col_memberships.insert_one({
        "_id": m_id, "org_id": ctx.org_id, "user_id": user_id,
        "role": dto.role, "accepted_at": _now(), "deleted_at": None,
    })
    return {"id": m_id, "user_id": user_id}


@router.post("/users/pin")
async def set_pin(dto: SetPinIn, ctx: AuthCtx = Depends(get_ctx)):
    if not dto.pin.isdigit():
        raise HTTPException(400, "PIN must be digits")
    await col_users.update_one(
        {"_id": ctx.user_id}, {"$set": {"pin_hash": _hash_password(dto.pin)}},
    )
    return {"ok": True}


# ── Projects ─────────────────────────────────────────────────────────────────

@router.get("/projects")
async def list_projects(ctx: AuthCtx = Depends(get_ctx)):
    projects = await col_projects.find(
        {"org_id": ctx.org_id, "deleted_at": None},
    ).sort("created_at", -1).to_list(500)
    for p in projects:
        p["id"] = p.pop("_id")
    return [_clean(p) for p in projects]


@router.post("/projects", dependencies=[Depends(require_role("OWNER", "PM"))])
async def create_project(dto: ProjectIn, ctx: AuthCtx = Depends(get_ctx)):
    pid = _uid()
    doc = {
        "_id": pid,
        "org_id": ctx.org_id,
        "code": dto.code.upper(),
        "name": dto.name,
        "client_name": dto.client_name,
        "location": dto.location,
        "status": "PLANNED",
        "budget_cents": dto.budget_cents,
        "currency": "INR",
        "created_by_id": ctx.user_id,
        "created_at": _now(),
        "deleted_at": None,
    }
    try:
        await col_projects.insert_one(doc)
    except Exception:
        raise HTTPException(400, "Project code already exists in org")
    await log_audit(ctx, "project.created", "project", pid, {"code": dto.code})
    doc["id"] = doc.pop("_id")
    return _clean(doc)


# ── Vendors ──────────────────────────────────────────────────────────────────

@router.get("/vendors")
async def list_vendors(ctx: AuthCtx = Depends(get_ctx)):
    vendors = await col_vendors.find(
        {"org_id": ctx.org_id, "is_active": True, "deleted_at": None},
    ).sort("name", 1).to_list(500)
    for v in vendors:
        v["id"] = v.pop("_id")
    return [_clean(v) for v in vendors]


@router.post("/vendors", dependencies=[Depends(require_role("OWNER", "ACCOUNTANT", "PM"))])
async def create_vendor(dto: VendorIn, ctx: AuthCtx = Depends(get_ctx)):
    vid = _uid()
    doc = {
        "_id": vid, "org_id": ctx.org_id, **dto.model_dump(),
        "is_active": True, "created_at": _now(), "deleted_at": None,
    }
    await col_vendors.insert_one(doc)
    await log_audit(ctx, "vendor.created", "vendor", vid)
    doc["id"] = doc.pop("_id")
    return _clean(doc)


# ── Materials ────────────────────────────────────────────────────────────────

@router.get("/materials")
async def list_materials(ctx: AuthCtx = Depends(get_ctx)):
    mats = await col_materials.find(
        {"org_id": ctx.org_id, "is_active": True, "deleted_at": None},
    ).sort("name", 1).to_list(500)
    for m in mats:
        m["id"] = m.pop("_id")
    return [_clean(m) for m in mats]


@router.post("/materials", dependencies=[Depends(require_role("OWNER", "ACCOUNTANT", "PM", "STOREKEEPER"))])
async def create_material(dto: MaterialIn, ctx: AuthCtx = Depends(get_ctx)):
    mid = _uid()
    doc = {
        "_id": mid, "org_id": ctx.org_id, **dto.model_dump(),
        "sku": dto.sku.upper(), "is_active": True,
        "created_at": _now(), "deleted_at": None,
    }
    try:
        await col_materials.insert_one(doc)
    except Exception:
        raise HTTPException(400, "SKU already exists in org")
    await log_audit(ctx, "material.created", "material", mid)
    doc["id"] = doc.pop("_id")
    return _clean(doc)


# ── DPR (sacred — CTO Rule 4) ────────────────────────────────────────────────

@router.get("/dpr")
async def list_dpr(
    project_id: Optional[str] = None,
    ctx: AuthCtx = Depends(get_ctx),
):
    q: dict = {"org_id": ctx.org_id, "deleted_at": None}
    if project_id:
        q["project_id"] = project_id
    dprs = await col_dprs.find(q).sort("report_date", -1).limit(200).to_list(200)
    for d in dprs:
        d["id"] = d.pop("_id")
    return [_clean(d) for d in dprs]


@router.post("/dpr")
async def create_dpr(dto: DprIn, request: Request, ctx: AuthCtx = Depends(get_ctx)):
    async def handler():
        project = await col_projects.find_one({
            "_id": dto.project_id, "org_id": ctx.org_id, "deleted_at": None,
        })
        if not project:
            raise HTTPException(404, "Project not found")

        # Unique per (project, date, user)
        dup = await col_dprs.find_one({
            "org_id": ctx.org_id, "project_id": dto.project_id,
            "report_date": dto.report_date, "captured_by_id": ctx.user_id,
        })
        if dup:
            raise HTTPException(400, "DPR already exists for this project+date")

        did = _uid()
        doc = {
            "_id": did, "org_id": ctx.org_id, "project_id": dto.project_id,
            "report_date": dto.report_date,
            "work_narrative": dto.work_narrative,
            "activity_tags": dto.activity_tags,
            "weather": dto.weather,
            "blockers": dto.blockers,
            "labour_counts": dto.labour_counts,
            "photo_keys": dto.photo_keys,
            "gps_lat": dto.gps_lat,
            "gps_lng": dto.gps_lng,
            "approval_status": "DRAFT",
            "approval_id": None,
            "source_type": "DPR",
            "captured_by_id": ctx.user_id,
            "created_at": _now(),
            "deleted_at": None,
        }
        await col_dprs.insert_one(doc)
        doc["id"] = doc.pop("_id")
        return _clean(doc)

    return await enforce_idempotency(request, ctx, handler)


@router.post("/dpr/{dpr_id}/submit")
async def submit_dpr(dpr_id: str, request: Request, ctx: AuthCtx = Depends(get_ctx)):
    async def handler():
        d = await col_dprs.find_one({
            "_id": dpr_id, "org_id": ctx.org_id, "deleted_at": None,
        })
        if not d:
            raise HTTPException(404)
        if d["approval_status"] != "DRAFT":
            raise HTTPException(400, f"DPR already {d['approval_status']}")
        ap = await _request_approval(ctx, "DPR", dpr_id, None)
        await col_dprs.update_one({"_id": dpr_id}, {"$set": {
            "approval_status": "PENDING", "approval_id": ap["_id"],
        }})
        await log_audit(ctx, "dpr.submitted", "dpr", dpr_id)
        return {"id": dpr_id, "approval_id": ap["_id"], "approval_status": "PENDING"}

    return await enforce_idempotency(request, ctx, handler)


# ── Expenses ─────────────────────────────────────────────────────────────────

@router.get("/expenses")
async def list_expenses(
    project_id: Optional[str] = None,
    ctx: AuthCtx = Depends(get_ctx),
):
    q: dict = {"org_id": ctx.org_id, "deleted_at": None}
    if project_id:
        q["project_id"] = project_id
    exps = await col_expenses.find(q).sort("occurred_on", -1).limit(500).to_list(500)
    for e in exps:
        e["id"] = e.pop("_id")
        # amount_cents is plain int in Mongo — safe as-is
    return [_clean(e) for e in exps]


@router.post("/expenses")
async def create_expense(dto: ExpenseIn, request: Request, ctx: AuthCtx = Depends(get_ctx)):
    async def handler():
        project = await col_projects.find_one({
            "_id": dto.project_id, "org_id": ctx.org_id, "deleted_at": None,
        })
        if not project:
            raise HTTPException(404, "Project not found")

        eid = _uid()
        doc = {
            "_id": eid, "org_id": ctx.org_id, "project_id": dto.project_id,
            "captured_by_id": ctx.user_id,
            "purpose": dto.purpose,
            "category": dto.category,
            "amount_cents": dto.amount_cents,
            "currency": "INR",
            "vendor_name": dto.vendor_name,
            "bill_photo_key": dto.bill_photo_key,
            "occurred_on": dto.occurred_on,
            "approval_status": "DRAFT",
            "approval_id": None,
            "source_type": "EXPENSE",
            "ledger_posted": False,
            "ledger_entry_id": None,
            "created_at": _now(),
            "deleted_at": None,
        }
        await col_expenses.insert_one(doc)
        doc["id"] = doc.pop("_id")
        return _clean(doc)

    return await enforce_idempotency(request, ctx, handler)


@router.post("/expenses/{expense_id}/submit")
async def submit_expense(expense_id: str, request: Request, ctx: AuthCtx = Depends(get_ctx)):
    async def handler():
        e = await col_expenses.find_one({
            "_id": expense_id, "org_id": ctx.org_id, "deleted_at": None,
        })
        if not e:
            raise HTTPException(404)
        if e["approval_status"] != "DRAFT":
            raise HTTPException(400, f"Expense already {e['approval_status']}")
        ap = await _request_approval(ctx, "EXPENSE", expense_id, e["amount_cents"])
        await col_expenses.update_one({"_id": expense_id}, {"$set": {
            "approval_status": "APPROVED" if ap["status"] == "APPROVED" else "PENDING",
            "approval_id": ap["_id"],
        }})
        await log_audit(ctx, "expense.submitted", "expense", expense_id)
        return {"id": expense_id, "approval_id": ap["_id"], "approval_status": ap["status"]}

    return await enforce_idempotency(request, ctx, handler)


# ── Approvals ────────────────────────────────────────────────────────────────

@router.get("/approvals/pending")
async def list_pending(ctx: AuthCtx = Depends(get_ctx)):
    await _escalation_sweep(ctx.org_id)
    aps = await col_approvals.find({
        "org_id": ctx.org_id, "status": "PENDING",
    }).sort("created_at", 1).to_list(500)
    for a in aps:
        a["id"] = a.pop("_id")
    return [_clean(a) for a in aps]


@router.post("/approvals/{approval_id}/decide")
async def decide_approval(approval_id: str, dto: DecideIn, ctx: AuthCtx = Depends(get_ctx)):
    a = await col_approvals.find_one({"_id": approval_id, "org_id": ctx.org_id})
    if not a:
        raise HTTPException(404)
    if a["status"] != "PENDING":
        raise HTTPException(400, f"Already {a['status']}")

    # Maker ≠ Checker
    if a["requested_by_id"] == ctx.user_id:
        raise HTTPException(403, "Maker cannot approve own request")

    # Role gate (OWNER can always decide)
    if a["required_role"] != ctx.role and ctx.role != "OWNER":
        raise HTTPException(403, f"Role {ctx.role} cannot decide; need {a['required_role']}")

    # Rejection requires reason
    if dto.action == "REJECT" and not dto.rejection_reason:
        raise HTTPException(400, "Rejection reason required")

    # PIN for ≥ ₹50,000 on APPROVE
    pin_verified = False
    if dto.action == "APPROVE" and (a.get("amount_cents") or 0) >= PIN_THRESHOLD_CENTS:
        if not dto.pin:
            raise HTTPException(400, "PIN required")
        user = await col_users.find_one({"_id": ctx.user_id})
        if not user or not user.get("pin_hash"):
            raise HTTPException(400, "PIN not set; go to Settings → Set PIN")
        if not _verify_password(dto.pin, user["pin_hash"]):
            raise HTTPException(403, "Invalid PIN")
        pin_verified = True

    new_status = "APPROVED" if dto.action == "APPROVE" else "REJECTED"
    await col_approvals.update_one({"_id": approval_id}, {"$set": {
        "status": new_status, "approver_id": ctx.user_id, "decided_at": _now(),
        "comment": dto.comment, "rejection_reason": dto.rejection_reason,
    }})
    await col_approval_events.insert_one({
        "_id": _uid(), "approval_id": approval_id,
        "action": new_status, "actor_id": ctx.user_id, "actor_role": ctx.role,
        "pin_verified": pin_verified, "comment": dto.comment,
        "created_at": _now(),
    })

    # Propagate to target
    coll_map = {"EXPENSE": col_expenses, "DPR": col_dprs, "MATERIAL_RECEIPT": None}
    coll = coll_map.get(a["target_type"])
    if coll is not None:
        await coll.update_one(
            {"_id": a["target_id"]}, {"$set": {"approval_status": new_status}},
        )

    await log_audit(ctx, f"approval.{new_status.lower()}", "approval", approval_id)

    return {"id": approval_id, "status": new_status}


# ── Uploads (stub — same shape as /app/erp/apps/api) ─────────────────────────

@router.post("/uploads/presign")
async def presign_upload(
    body: dict,
    ctx: AuthCtx = Depends(get_ctx),
):
    """
    MVP stub: returns an object_key we use as a reference. Real S3 signing is
    wired in Phase 1.5 — until then the UI stores the key and shows a
    thumbnail placeholder. See /app/erp/apps/api/src/modules/uploads/ for the
    production signing pattern.
    """
    kind = body.get("kind", "generic")
    content_type = body.get("content_type", "image/jpeg")
    size_bytes = int(body.get("size_bytes", 0))
    if size_bytes > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 10 MB)")
    object_key = f"{ctx.org_id}/{kind}/{_uid()}"
    return {
        "object_key": object_key,
        "url": f"/api/erp/uploads/stub/{object_key}",  # no-op PUT target
        "method": "PUT",
        "headers": {"Content-Type": content_type},
    }


@router.put("/uploads/stub/{rest:path}")
async def upload_stub(rest: str):
    """Accepts the file and discards it. Real S3 replaces this."""
    return {"ok": True, "key": rest}


# ── Overview KPI ─────────────────────────────────────────────────────────────

@router.get("/overview")
async def overview(ctx: AuthCtx = Depends(get_ctx)):
    active_projects = await col_projects.count_documents({
        "org_id": ctx.org_id, "status": "ACTIVE", "deleted_at": None,
    })
    pending_approvals = await col_approvals.count_documents({
        "org_id": ctx.org_id, "status": "PENDING",
    })
    pending_amount_cursor = col_approvals.find({
        "org_id": ctx.org_id, "status": "PENDING",
    }, {"amount_cents": 1})
    pending_amount = 0
    async for a in pending_amount_cursor:
        pending_amount += a.get("amount_cents") or 0

    today = date.today().isoformat()
    dprs_today = await col_dprs.count_documents({
        "org_id": ctx.org_id, "report_date": today, "deleted_at": None,
    })

    month_prefix = today[:7]
    month_exps = col_expenses.find({
        "org_id": ctx.org_id, "deleted_at": None,
        "occurred_on": {"$regex": f"^{month_prefix}"},
    }, {"amount_cents": 1})
    month_spend = 0
    async for e in month_exps:
        month_spend += e.get("amount_cents") or 0

    return {
        "active_projects": active_projects,
        "pending_approvals": pending_approvals,
        "pending_amount_cents": pending_amount,
        "dprs_today": dprs_today,
        "month_spend_cents": month_spend,
    }
