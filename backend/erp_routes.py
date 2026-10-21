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

import base64
import io
import logging
import os
import re
import secrets
from datetime import datetime, timezone, timedelta, date
from typing import Optional, List, Literal, Any, Callable, Awaitable
import uuid

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Depends, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from PIL import Image
from pydantic import BaseModel, Field, EmailStr
from pymongo.errors import DuplicateKeyError, PyMongoError

from pathlib import Path
load_dotenv(Path(__file__).parent / '.env')

logger = logging.getLogger("decorous.erp")


# ── Config ───────────────────────────────────────────────────────────────────

# JWT secret is mandatory — fail fast if missing or trivially short. Falling
# back to a known default would let anyone forge ERP tokens in production.
JWT_SECRET = os.environ.get("ERP_JWT_SECRET")
if not JWT_SECRET or len(JWT_SECRET) < 32:
    raise RuntimeError(
        "ERP_JWT_SECRET environment variable is required and must be at least "
        "32 characters. Refusing to boot ERP routes with a missing or weak secret."
    )
JWT_ALGO = "HS256"
JWT_EXPIRES_MIN = 60 * 24  # 24h — long for convenience; refresh token pattern deferred

# tz_aware=True: Mongo stores UTC instants but, by default, hands them back as
# *naive* datetimes. Comparing those with our aware `_now()` raises TypeError
# (this crashed the "account locked" branch of login) and serialises to ISO
# strings with no offset, which browsers then misread as local time.
_mongo = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
_db = _mongo[os.environ["DB_NAME"]]

# Open self-service signup creates a brand-new organisation. Fine while the
# first org is being set up; set ERP_ALLOW_SIGNUP=false afterwards so strangers
# cannot create orgs on a public URL.
ALLOW_SIGNUP = os.environ.get("ERP_ALLOW_SIGNUP", "true").strip().lower() not in ("0", "false", "no", "off")

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
col_uploads = _db["erp_uploads"]


# ── Router ───────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/api/erp")
security = HTTPBearer(auto_error=False)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)


# India has no DST, so a fixed +05:30 offset is exactly Asia/Kolkata and avoids
# depending on a tz database being present on the host.
IST = timezone(timedelta(hours=5, minutes=30))


def _today_ist() -> date:
    """The current calendar date in India — what a site engineer means by "today"."""
    return _now().astimezone(IST).date()


def _aware(dt: Optional[datetime]) -> Optional[datetime]:
    """Treat naive datetimes from Mongo as UTC so comparisons never raise."""
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


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

    # The token only proves *who* the caller is. Role and access are re-read from
    # the database on every request so that deactivating a member or changing
    # their role takes effect at once instead of when a 24h token expires.
    membership = await col_memberships.find_one({
        "org_id": payload["org_id"], "user_id": payload["sub"],
        "deleted_at": None, "accepted_at": {"$ne": None},
        "is_active": {"$ne": False},
    })
    if not membership:
        raise HTTPException(401, "Access to this organisation has been revoked")
    user = await col_users.find_one({"_id": payload["sub"], "deleted_at": None}, {"is_active": 1})
    if not user or user.get("is_active") is False:
        raise HTTPException(401, "Account is deactivated")
    return AuthCtx(
        user_id=payload["sub"],
        org_id=payload["org_id"],
        role=membership["role"],
        email=payload["email"],
    )


def require_role(*roles: str):
    async def guard(ctx: AuthCtx = Depends(get_ctx)) -> AuthCtx:
        if ctx.role not in roles and ctx.role != "OWNER":
            raise HTTPException(403, f"Role {ctx.role} not permitted; need {roles}")
        return ctx
    return guard


STALE_CLAIM_SECONDS = 120   # no ERP write takes anywhere near this long


async def enforce_idempotency(
    request: Request, ctx: AuthCtx, handler,
) -> Any:
    """
    Wraps a write handler with idempotency protection.

    The client sends an Idempotency-Key header. The key is *claimed* atomically
    (unique index on org_id+key) before the handler runs, so two concurrent
    requests with the same key cannot both execute:
      • finished earlier        → replay the stored response
      • still running elsewhere → 409 (client should retry shortly)
      • used for another route  → 409 (a key identifies exactly one request)
    If the handler fails, the claim is released so the client can fix the
    payload and retry with the same key.
    """
    key = request.headers.get("idempotency-key") or request.headers.get("Idempotency-Key")
    if not key or len(key) < 8 or len(key) > 128:
        raise HTTPException(400, "Missing or invalid Idempotency-Key header")

    method, path = request.method, request.url.path
    claim_id = _uid()
    for attempt in (1, 2):
        try:
            await col_idempotency.insert_one({
                "_id": claim_id, "org_id": ctx.org_id, "key": key, "user_id": ctx.user_id,
                "method": method, "path": path, "state": "IN_PROGRESS",
                "response": None, "created_at": _now(),
            })
            break
        except DuplicateKeyError:
            existing = await col_idempotency.find_one({"org_id": ctx.org_id, "key": key})
            if existing is None:                   # claim was released between our two calls
                if attempt == 1:
                    continue
                raise HTTPException(409, "Please retry the request")
            # Records written before state/method/path existed are treated as finished.
            if existing.get("path") and (existing.get("method"), existing["path"]) != (method, path):
                raise HTTPException(409, "This Idempotency-Key was already used for a different request")
            if existing.get("state", "DONE") == "DONE":
                return existing["response"]
            # Still IN_PROGRESS. A claim left behind by a crashed/killed request (e.g. a
            # free-tier instance recycled mid-request) would otherwise block this key for the
            # whole TTL, so a claim older than STALE_CLAIM_SECONDS is treated as abandoned.
            age = (_now() - (_aware(existing.get("created_at")) or _now())).total_seconds()
            if attempt == 1 and age > STALE_CLAIM_SECONDS:
                await col_idempotency.delete_one({"_id": existing["_id"], "state": "IN_PROGRESS"})
                continue
            raise HTTPException(409, "A request with this Idempotency-Key is still being processed")

    try:
        result = await handler()
    except BaseException:
        await col_idempotency.delete_one({"_id": claim_id})
        raise
    await col_idempotency.update_one(
        {"_id": claim_id}, {"$set": {"state": "DONE", "response": result}},
    )
    return result


async def require_uploads(ctx: AuthCtx, keys: List[str], what: str = "file") -> None:
    """
    Every referenced upload must exist, belong to *this* organisation, and be
    distinct. Without this an expense could "attach" a bill that was never
    stored (or another tenant's file) and the approver would be shown nothing.
    """
    keys = [k for k in keys if k]
    if len(set(keys)) != len(keys):
        raise HTTPException(400, f"Each {what} must be a different file")
    if not keys:
        return
    found = await col_uploads.count_documents({"_id": {"$in": keys}, "org_id": ctx.org_id})
    if found != len(keys):
        raise HTTPException(
            400, f"A {what} was not uploaded or does not belong to this organisation. Re-attach it and try again.",
        )


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
SourceType = Literal[
    "EXPENSE", "MATERIAL_RECEIPT", "VENDOR_BILL", "PAYMENT", "DPR",
    "ATTENDANCE", "WORKER_PAYMENT",
]
ProjectStatus = Literal["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]

# Allowed project lifecycle moves. ARCHIVED is terminal (and keeps its code
# reserved, which is why project codes can never be reused).
PROJECT_TRANSITIONS = {
    "PLANNED": {"ACTIVE", "ON_HOLD", "ARCHIVED"},
    "ACTIVE": {"ON_HOLD", "COMPLETED"},
    "ON_HOLD": {"ACTIVE", "COMPLETED", "ARCHIVED"},
    "COMPLETED": {"ACTIVE", "ARCHIVED"},
    "ARCHIVED": set(),
}

DATE_RE = r"^\d{4}-\d{2}-\d{2}$"
GSTIN_RE = re.compile(r"^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$")


Weather = Literal["SUNNY", "CLOUDY", "RAINY", "STORMY"]
MaterialCategory = Literal[
    "CEMENT", "STEEL", "AGGREGATE", "SAND", "BRICK", "ELECTRICAL",
    "PLUMBING", "PAINT", "WOOD", "TILES", "HARDWARE", "CONSUMABLE", "OTHER",
]


def _assert_not_future(value: Optional[str], label: str = "Date") -> None:
    """Allow today and tomorrow (IST) — late-night entries — but not further ahead."""
    if value and date.fromisoformat(value) > _today_ist() + timedelta(days=1):
        raise HTTPException(422, f"{label} cannot be in the future")


def _valid_date(value: Optional[str]) -> Optional[str]:
    """YYYY-MM-DD that is also a real calendar date (rejects 2026-02-31)."""
    if value in (None, ""):
        return None
    try:
        date.fromisoformat(value)
    except ValueError:
        raise HTTPException(422, f"'{value}' is not a valid date (use YYYY-MM-DD)")
    return value


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
    start_date: Optional[str] = Field(default=None, pattern=DATE_RE)
    end_date: Optional[str] = Field(default=None, pattern=DATE_RE)   # planned handover


class ProjectPatch(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2)
    client_name: Optional[str] = None
    location: Optional[str] = None
    budget_cents: Optional[int] = Field(default=None, ge=0)
    start_date: Optional[str] = Field(default=None, pattern=DATE_RE)
    end_date: Optional[str] = Field(default=None, pattern=DATE_RE)
    status: Optional[ProjectStatus] = None


VendorKind = Literal["SUPPLIER", "SUBCONTRACTOR", "LABOUR_CONTRACTOR", "OTHER"]


class VendorIn(BaseModel):
    name: str = Field(min_length=2)
    kind: VendorKind = "SUPPLIER"
    contact_person: Optional[str] = None
    gstin: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None


class VendorPatch(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2)
    kind: Optional[VendorKind] = None
    contact_person: Optional[str] = None
    gstin: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    is_active: Optional[bool] = None


class MaterialIn(BaseModel):
    sku: str = Field(min_length=2)
    name: str = Field(min_length=2)
    category: MaterialCategory
    uom: str
    hsn_code: Optional[str] = None
    # Reorder level in milli-units (1 bag = 1000). Stock at/below this is flagged.
    min_stock_milli: Optional[int] = Field(default=None, ge=0)


class MaterialPatch(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2)
    category: Optional[MaterialCategory] = None
    uom: Optional[str] = None
    hsn_code: Optional[str] = None
    min_stock_milli: Optional[int] = Field(default=None, ge=0)
    is_active: Optional[bool] = None


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


class MemberPatch(BaseModel):
    role: Optional[Role] = None
    active: Optional[bool] = None


class SetPinIn(BaseModel):
    pin: str = Field(min_length=4, max_length=4)


# ── Approval engine ──────────────────────────────────────────────────────────

# Payment records that take effect immediately when the Owner enters them.
OWNER_DIRECT_TYPES = {"PAYMENT", "WORKER_PAYMENT"}

PIN_THRESHOLD_CENTS = 5_000_000  # ₹50,000
SLA_HOURS = {"PM": 24, "OWNER": 48, "ACCOUNTANT": 24}


def _required_role(target_type: SourceType, amount_cents: Optional[int]) -> str:
    amt = amount_cents or 0
    # Petty-cash style outflows: ≤ ₹5,000 auto-approves, ≤ ₹25,000 PM, above that Owner.
    if target_type in ("EXPENSE", "WORKER_PAYMENT"):
        if amt <= 500_000:
            return "AUTO"
        if amt <= 2_500_000:
            return "PM"
        return "OWNER"
    # Operational records that a PM signs off regardless of size.
    if target_type in ("MATERIAL_RECEIPT", "DPR", "ATTENDANCE"):
        return "PM"
    # Money owed to / paid to suppliers: PM up to ₹50,000, Owner above.
    if target_type in ("VENDOR_BILL", "PAYMENT"):
        return "PM" if amt <= 5_000_000 else "OWNER"
    return "OWNER"


# ── Approval target registry ─────────────────────────────────────────────────
# Each module that produces approvable records registers itself here. The engine
# then knows (a) which collection to flip approval_status on and (b) how to
# summarise a record for the approver, without importing the module.

class ApprovalTarget:
    def __init__(
        self, collection, summarize: Callable[[dict], dict],
        on_decided: Optional[Callable[[dict, str], Awaitable[None]]] = None,
    ):
        self.collection = collection
        self.summarize = summarize
        # Optional side effect once a decision is recorded: on_decided(approval, new_status).
        self.on_decided = on_decided


TARGETS: dict[str, ApprovalTarget] = {}


def register_target(
    target_type: str, collection, summarize: Callable[[dict], dict],
    on_decided: Optional[Callable[[dict, str], Awaitable[None]]] = None,
) -> None:
    TARGETS[target_type] = ApprovalTarget(collection, summarize, on_decided)


async def _request_approval(
    ctx: AuthCtx,
    target_type: SourceType,
    target_id: str,
    amount_cents: Optional[int],
) -> dict:
    required = _required_role(target_type, amount_cents)
    # Business rule: a payment the Owner records themselves needs no approval - there is
    # nobody above the Owner to approve it. It is still written to the approval log
    # (flagged self_approved) so it shows up in History and the audit trail.
    owner_direct = ctx.role == "OWNER" and target_type in OWNER_DIRECT_TYPES

    if required == "AUTO" or owner_direct:
        approval = {
            "_id": _uid(),
            "org_id": ctx.org_id,
            "target_type": target_type,
            "target_id": target_id,
            "amount_cents": amount_cents,
            "currency": "INR",
            "status": "APPROVED",
            "auto": not owner_direct,
            "self_approved": owner_direct,
            "required_role": "OWNER" if owner_direct else "ENGINEER",
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
            "action": "OWNER_ENTRY" if owner_direct else "AUTO_APPROVED",
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
        "auto": False,
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
    if not ALLOW_SIGNUP:
        raise HTTPException(403, "Self-service signup is disabled. Ask your organisation owner for an invite.")
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

    now = _now()
    locked_until = _aware(user.get("locked_until"))
    failed_before = user.get("failed_logins", 0)
    if locked_until and locked_until > now:
        raise HTTPException(401, "Account temporarily locked. Try again in a few minutes.")
    if locked_until:
        # The lock has lapsed: start counting afresh, otherwise a single typo
        # right after the lock expires would lock the account again.
        failed_before = 0

    if not _verify_password(dto.password, user["password_hash"]):
        failed = failed_before + 1
        update = {"failed_logins": failed, "locked_until": None}
        if failed >= 5:
            update["locked_until"] = now + timedelta(minutes=15)
        await col_users.update_one({"_id": user["_id"]}, {"$set": update})
        raise HTTPException(401, "Invalid credentials")

    membership = await col_memberships.find_one({
        "user_id": user["_id"], "accepted_at": {"$ne": None}, "deleted_at": None,
        "is_active": {"$ne": False},
    })
    if not membership:
        raise HTTPException(401, "No active organisation membership")

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
    users = {
        u["_id"]: u async for u in col_users.find(
            {"_id": {"$in": [m["user_id"] for m in members]}},
        )
    }
    out = []
    for m in members:
        user = users.get(m["user_id"])
        if user:
            out.append({
                "id": m["_id"],
                "role": m["role"],
                "is_active": m.get("is_active", True) is not False,
                "accepted_at": m.get("accepted_at"),
                "user": {
                    "id": user["_id"],
                    "email": user["email"],
                    "full_name": user["full_name"],
                    "is_active": user.get("is_active", True),
                },
            })
    return out


@router.patch("/users/{membership_id}", dependencies=[Depends(require_role("OWNER"))])
async def update_member(membership_id: str, dto: MemberPatch, ctx: AuthCtx = Depends(get_ctx)):
    """Owner-only: change a member's role, or deactivate / reactivate them."""
    m = await col_memberships.find_one({"_id": membership_id, "org_id": ctx.org_id, "deleted_at": None})
    if not m:
        raise HTTPException(404, "Member not found")

    changes: dict = {}
    if dto.role is not None and dto.role != m["role"]:
        changes["role"] = dto.role
    if dto.active is not None and dto.active != (m.get("is_active", True) is not False):
        changes["is_active"] = dto.active
    if not changes:
        return {"id": membership_id, "role": m["role"], "is_active": m.get("is_active", True) is not False}

    # An organisation must always keep at least one active Owner.
    still_owner = changes.get("role", m["role"]) == "OWNER" and changes.get("is_active", m.get("is_active", True) is not False)
    if m["role"] == "OWNER" and not still_owner:
        other_owners = await col_memberships.count_documents({
            "org_id": ctx.org_id, "role": "OWNER", "deleted_at": None,
            "is_active": {"$ne": False}, "_id": {"$ne": membership_id},
        })
        if other_owners == 0:
            raise HTTPException(400, "This is the last active Owner. Promote another member to Owner first.")

    await col_memberships.update_one({"_id": membership_id}, {"$set": changes})
    await log_audit(ctx, "member.updated", "membership", membership_id, changes)
    return {"id": membership_id, "role": changes.get("role", m["role"]),
            "is_active": changes.get("is_active", m.get("is_active", True) is not False)}


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
    start, end = _valid_date(dto.start_date), _valid_date(dto.end_date)
    if start and end and end < start:
        raise HTTPException(422, "End date cannot be before start date")
    doc = {
        "_id": pid,
        "org_id": ctx.org_id,
        "code": dto.code.strip().upper(),
        "name": dto.name,
        "client_name": dto.client_name,
        "location": dto.location,
        "status": "PLANNED",
        "budget_cents": dto.budget_cents,
        "start_date": start,
        "end_date": end,
        "currency": "INR",
        "created_by_id": ctx.user_id,
        "created_at": _now(),
        "deleted_at": None,
    }
    try:
        await col_projects.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(400, f"Project code {doc['code']} already exists")
    await log_audit(ctx, "project.created", "project", pid, {"code": doc["code"]})
    doc["id"] = doc.pop("_id")
    return _clean(doc)


async def _get_project_or_404(ctx: AuthCtx, project_id: str) -> dict:
    p = await col_projects.find_one({"_id": project_id, "org_id": ctx.org_id, "deleted_at": None})
    if not p:
        raise HTTPException(404, "Project not found")
    return p


def assert_project_open(project: dict) -> None:
    """No new site records against an archived (closed-out) project."""
    if project.get("status") == "ARCHIVED":
        raise HTTPException(400, f"Project {project.get('code')} is archived and no longer accepts new records")


@router.get("/projects/{project_id}")
async def get_project(project_id: str, ctx: AuthCtx = Depends(get_ctx)):
    p = await _get_project_or_404(ctx, project_id)
    p["id"] = p.pop("_id")
    return _clean(p)


@router.patch("/projects/{project_id}", dependencies=[Depends(require_role("OWNER", "PM"))])
async def update_project(project_id: str, dto: ProjectPatch, ctx: AuthCtx = Depends(get_ctx)):
    p = await _get_project_or_404(ctx, project_id)
    changes = dto.model_dump(exclude_unset=True)
    if not changes:
        p["id"] = p.pop("_id")
        return _clean(p)

    # Budget is a financial commitment: only an Owner may change it.
    if "budget_cents" in changes and ctx.role != "OWNER":
        raise HTTPException(403, "Only an Owner can change the project budget")

    if "status" in changes and changes["status"] != p["status"]:
        if changes["status"] not in PROJECT_TRANSITIONS[p["status"]]:
            allowed = ", ".join(sorted(PROJECT_TRANSITIONS[p["status"]])) or "none (terminal)"
            raise HTTPException(400, f"Cannot move a {p['status']} project to {changes['status']}. Allowed: {allowed}")
    else:
        changes.pop("status", None)

    for f in ("start_date", "end_date"):
        if f in changes:
            changes[f] = _valid_date(changes[f])
    start = changes.get("start_date", p.get("start_date"))
    end = changes.get("end_date", p.get("end_date"))
    if start and end and end < start:
        raise HTTPException(422, "End date cannot be before start date")

    if not changes:
        p["id"] = p.pop("_id")
        return _clean(p)
    changes["updated_at"] = _now()
    await col_projects.update_one({"_id": project_id, "org_id": ctx.org_id}, {"$set": changes})
    await log_audit(ctx, "project.updated", "project", project_id, {k: v for k, v in changes.items() if k != "updated_at"})
    p.update(changes)
    p["id"] = p.pop("_id")
    return _clean(p)


# ── Vendors ──────────────────────────────────────────────────────────────────

def _name_key(name: str) -> str:
    """Case/spacing-insensitive identity so 'Shree  Cement' == 'shree cement'."""
    return " ".join(name.lower().split())


def _clean_gstin(value: Optional[str]) -> Optional[str]:
    if not value or not value.strip():
        return None
    g = value.strip().upper()
    if not GSTIN_RE.match(g):
        raise HTTPException(422, "GSTIN must be 15 characters in the standard format, e.g. 21ABCDE1234F1Z5")
    return g


@router.get("/vendors")
async def list_vendors(include_inactive: bool = False, ctx: AuthCtx = Depends(get_ctx)):
    q: dict = {"org_id": ctx.org_id, "deleted_at": None}
    if not include_inactive:
        q["is_active"] = True
    vendors = await col_vendors.find(q).sort("name", 1).to_list(1000)
    for v in vendors:
        v["id"] = v.pop("_id")
    return [_clean(v) for v in vendors]


@router.post("/vendors", dependencies=[Depends(require_role("OWNER", "ACCOUNTANT", "PM"))])
async def create_vendor(dto: VendorIn, ctx: AuthCtx = Depends(get_ctx)):
    vid = _uid()
    doc = {
        "_id": vid, "org_id": ctx.org_id, **dto.model_dump(),
        "name": dto.name.strip(), "name_key": _name_key(dto.name),
        "gstin": _clean_gstin(dto.gstin),
        "is_active": True, "created_at": _now(), "deleted_at": None,
    }
    try:
        await col_vendors.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(400, f"A vendor named '{doc['name']}' already exists")
    await log_audit(ctx, "vendor.created", "vendor", vid)
    doc["id"] = doc.pop("_id")
    return _clean(doc)


@router.patch("/vendors/{vendor_id}", dependencies=[Depends(require_role("OWNER", "ACCOUNTANT", "PM"))])
async def update_vendor(vendor_id: str, dto: VendorPatch, ctx: AuthCtx = Depends(get_ctx)):
    v = await col_vendors.find_one({"_id": vendor_id, "org_id": ctx.org_id, "deleted_at": None})
    if not v:
        raise HTTPException(404, "Vendor not found")
    changes = dto.model_dump(exclude_unset=True)
    if "gstin" in changes:
        changes["gstin"] = _clean_gstin(changes["gstin"])
    if "name" in changes and changes["name"]:
        changes["name"] = changes["name"].strip()
        changes["name_key"] = _name_key(changes["name"])
    if changes:
        changes["updated_at"] = _now()
        try:
            await col_vendors.update_one({"_id": vendor_id, "org_id": ctx.org_id}, {"$set": changes})
        except DuplicateKeyError:
            raise HTTPException(400, f"A vendor named '{changes.get('name')}' already exists")
        await log_audit(ctx, "vendor.updated", "vendor", vendor_id, {k: v for k, v in changes.items() if k != "updated_at"})
        v.update(changes)
    v["id"] = v.pop("_id")
    return _clean(v)


# ── Materials ────────────────────────────────────────────────────────────────

@router.get("/materials")
async def list_materials(include_inactive: bool = False, ctx: AuthCtx = Depends(get_ctx)):
    q: dict = {"org_id": ctx.org_id, "deleted_at": None}
    if not include_inactive:
        q["is_active"] = True
    mats = await col_materials.find(q).sort("name", 1).to_list(2000)
    for m in mats:
        m["id"] = m.pop("_id")
    return [_clean(m) for m in mats]


@router.post("/materials", dependencies=[Depends(require_role("OWNER", "ACCOUNTANT", "PM", "STOREKEEPER"))])
async def create_material(dto: MaterialIn, ctx: AuthCtx = Depends(get_ctx)):
    mid = _uid()
    doc = {
        "_id": mid, "org_id": ctx.org_id, **dto.model_dump(),
        "sku": dto.sku.strip().upper(), "is_active": True,
        "created_at": _now(), "deleted_at": None,
    }
    try:
        await col_materials.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(400, f"SKU {doc['sku']} already exists")
    await log_audit(ctx, "material.created", "material", mid)
    doc["id"] = doc.pop("_id")
    return _clean(doc)


@router.patch("/materials/{material_id}", dependencies=[Depends(require_role("OWNER", "ACCOUNTANT", "PM", "STOREKEEPER"))])
async def update_material(material_id: str, dto: MaterialPatch, ctx: AuthCtx = Depends(get_ctx)):
    m = await col_materials.find_one({"_id": material_id, "org_id": ctx.org_id, "deleted_at": None})
    if not m:
        raise HTTPException(404, "Material not found")
    changes = dto.model_dump(exclude_unset=True)
    if changes:
        changes["updated_at"] = _now()
        await col_materials.update_one({"_id": material_id, "org_id": ctx.org_id}, {"$set": changes})
        await log_audit(ctx, "material.updated", "material", material_id, {k: v for k, v in changes.items() if k != "updated_at"})
        m.update(changes)
    m["id"] = m.pop("_id")
    return _clean(m)


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
        assert_project_open(project)
        _assert_not_future(_valid_date(dto.report_date), "Report date")
        await require_uploads(ctx, dto.photo_keys, "photo")

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
        assert_project_open(project)
        _assert_not_future(_valid_date(dto.occurred_on), "Expense date")
        await require_uploads(ctx, [dto.bill_photo_key], "bill photo")

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

def _labour_total(counts: Any) -> int:
    """Total headcount from a DPR's labour_counts, tolerant of shape ({trade: {skill: n}} or {trade: n})."""
    total = 0
    if isinstance(counts, dict):
        for v in counts.values():
            if isinstance(v, dict):
                total += sum(int(x or 0) for x in v.values() if isinstance(x, (int, float)))
            elif isinstance(v, (int, float)):
                total += int(v)
    return total


def _summ_expense(e: dict) -> dict:
    return {
        "kind": "EXPENSE", "title": e.get("purpose"), "category": e.get("category"),
        "vendor_name": e.get("vendor_name"), "bill_photo_key": e.get("bill_photo_key"),
        "occurred_on": e.get("occurred_on"),
    }


def _summ_dpr(d: dict) -> dict:
    return {
        "kind": "DPR", "title": (d.get("work_narrative") or "")[:140],
        "report_date": d.get("report_date"), "photo_keys": d.get("photo_keys", []),
        "weather": d.get("weather"), "blockers": d.get("blockers"),
        "labour_total": _labour_total(d.get("labour_counts")),
    }


register_target("EXPENSE", col_expenses, _summ_expense)
register_target("DPR", col_dprs, _summ_dpr)


def _decision_gate(a: dict, ctx: AuthCtx) -> Optional[tuple[int, str]]:
    """Why `ctx` may NOT decide approval `a` — (http_status, message) — or None if allowed."""
    if a["status"] != "PENDING":
        return 400, f"Already {a['status']}"
    if a["requested_by_id"] == ctx.user_id:
        return 403, "Maker cannot approve own request"
    if a["required_role"] != ctx.role and ctx.role != "OWNER":
        return 403, f"Role {ctx.role} cannot decide; need {a['required_role']}"
    return None


async def _enrich_approvals(ctx: AuthCtx, approvals: list[dict]) -> list[dict]:
    """
    Attach what an approver actually needs to see: the project, the record being
    approved (purpose / narrative / bill photo …), who raised it, and whether the
    caller is allowed to decide it. Batched, so the cost is a handful of queries
    regardless of how many approvals are listed.
    """
    ids_by_type: dict[str, list[str]] = {}
    for a in approvals:
        ids_by_type.setdefault(a["target_type"], []).append(a["target_id"])

    targets: dict[tuple[str, str], dict] = {}
    for ttype, ids in ids_by_type.items():
        spec = TARGETS.get(ttype)
        if spec:
            async for doc in spec.collection.find({"_id": {"$in": ids}, "org_id": ctx.org_id}):
                targets[(ttype, doc["_id"])] = doc

    project_ids = list({d["project_id"] for d in targets.values() if d.get("project_id")})
    projects = {
        p["_id"]: p async for p in col_projects.find(
            {"_id": {"$in": project_ids}, "org_id": ctx.org_id}, {"code": 1, "name": 1},
        )
    }
    user_ids = list({a["requested_by_id"] for a in approvals} | {a["approver_id"] for a in approvals if a.get("approver_id")})
    users = {u["_id"]: u.get("full_name") async for u in col_users.find({"_id": {"$in": user_ids}}, {"full_name": 1})}

    out = []
    for a in approvals:
        row = dict(a)
        row["id"] = row.pop("_id")
        spec = TARGETS.get(a["target_type"])
        doc = targets.get((a["target_type"], a["target_id"]))
        target = spec.summarize(doc) if (spec and doc) else {"kind": a["target_type"], "title": None}
        if doc:
            proj = projects.get(doc.get("project_id"))
            target["project_id"] = doc.get("project_id")
            target["project_code"] = proj["code"] if proj else None
            target["project_name"] = proj["name"] if proj else None
        row["target"] = target
        row["requested_by_name"] = users.get(a["requested_by_id"])
        row["approver_name"] = users.get(a.get("approver_id")) if a.get("approver_id") else None
        blocked = _decision_gate(a, ctx)
        row["can_decide"] = blocked is None
        row["blocked_reason"] = blocked[1] if blocked else None
        out.append(row)
    return out


@router.get("/approvals/pending")
async def list_pending(mine: bool = False, ctx: AuthCtx = Depends(get_ctx)):
    """Open approvals, oldest first. `mine=true` keeps only those the caller may decide."""
    await _escalation_sweep(ctx.org_id)
    aps = await col_approvals.find({
        "org_id": ctx.org_id, "status": "PENDING",
    }).sort("created_at", 1).to_list(500)
    rows = await _enrich_approvals(ctx, aps)
    return [r for r in rows if r["can_decide"]] if mine else rows


@router.get("/approvals/history")
async def approval_history(
    limit: int = 50, skip: int = 0, status: Optional[str] = None, include_auto: bool = False,
    ctx: AuthCtx = Depends(get_ctx),
):
    """Decided approvals, newest first (auto-approved petty cash is hidden unless asked for)."""
    q: dict = {"org_id": ctx.org_id, "status": {"$ne": "PENDING"}}
    if status:
        q["status"] = status.upper()
    if not include_auto:
        q["auto"] = {"$ne": True}
    aps = await col_approvals.find(q).sort("decided_at", -1).skip(max(skip, 0)).limit(min(max(limit, 1), 200)).to_list(200)
    return await _enrich_approvals(ctx, aps)


@router.post("/approvals/{approval_id}/decide")
async def decide_approval(approval_id: str, dto: DecideIn, ctx: AuthCtx = Depends(get_ctx)):
    a = await col_approvals.find_one({"_id": approval_id, "org_id": ctx.org_id})
    if not a:
        raise HTTPException(404, "Approval not found")

    blocked = _decision_gate(a, ctx)
    if blocked:
        raise HTTPException(*blocked)

    # Rejection requires reason
    if dto.action == "REJECT" and not (dto.rejection_reason or "").strip():
        raise HTTPException(400, "Rejection reason required")

    # PIN for ≥ ₹50,000 on APPROVE — with brute-force throttling (4 digits is only 10,000 guesses)
    pin_verified = False
    if dto.action == "APPROVE" and (a.get("amount_cents") or 0) >= PIN_THRESHOLD_CENTS:
        if not dto.pin:
            raise HTTPException(400, "PIN required")
        user = await col_users.find_one({"_id": ctx.user_id})
        if not user or not user.get("pin_hash"):
            raise HTTPException(400, "PIN not set; go to Settings → Set PIN")
        now = _now()
        pin_locked_until = _aware(user.get("pin_locked_until"))
        if pin_locked_until and pin_locked_until > now:
            raise HTTPException(429, "Too many wrong PINs. Approvals needing a PIN are locked for a few minutes.")
        pin_failed = 0 if pin_locked_until else user.get("pin_failed", 0)   # lock lapsed → fresh count
        if not _verify_password(dto.pin, user["pin_hash"]):
            pin_failed += 1
            update = {"pin_failed": pin_failed, "pin_locked_until": None}
            if pin_failed >= 5:
                update["pin_locked_until"] = now + timedelta(minutes=15)
            await col_users.update_one({"_id": ctx.user_id}, {"$set": update})
            raise HTTPException(403, "Invalid PIN")
        if user.get("pin_failed") or pin_locked_until:
            await col_users.update_one({"_id": ctx.user_id}, {"$set": {"pin_failed": 0, "pin_locked_until": None}})
        pin_verified = True

    new_status = "APPROVED" if dto.action == "APPROVE" else "REJECTED"
    # Atomic claim: if two approvers click at once only one update matches PENDING.
    claimed = await col_approvals.update_one(
        {"_id": approval_id, "org_id": ctx.org_id, "status": "PENDING"},
        {"$set": {
            "status": new_status, "approver_id": ctx.user_id, "decided_at": _now(),
            "comment": dto.comment, "rejection_reason": (dto.rejection_reason or "").strip() or None,
        }},
    )
    if claimed.modified_count != 1:
        raise HTTPException(400, "This request was just decided by someone else")

    await col_approval_events.insert_one({
        "_id": _uid(), "approval_id": approval_id,
        "action": new_status, "actor_id": ctx.user_id, "actor_role": ctx.role,
        "pin_verified": pin_verified, "comment": dto.comment or (dto.rejection_reason or None),
        "created_at": _now(),
    })

    # Propagate to the record that was approved
    spec = TARGETS.get(a["target_type"])
    if spec:
        await spec.collection.update_one(
            {"_id": a["target_id"], "org_id": ctx.org_id}, {"$set": {"approval_status": new_status}},
        )
        if spec.on_decided:
            await spec.on_decided(a, new_status)

    await log_audit(ctx, f"approval.{new_status.lower()}", "approval", approval_id)
    return {"id": approval_id, "status": new_status}


@router.get("/approvals/{approval_id}")
async def get_approval(approval_id: str, ctx: AuthCtx = Depends(get_ctx)):
    """One approval with its full event timeline (requested / escalated / decided …)."""
    a = await col_approvals.find_one({"_id": approval_id, "org_id": ctx.org_id})
    if not a:
        raise HTTPException(404, "Approval not found")
    row = (await _enrich_approvals(ctx, [a]))[0]
    events = await col_approval_events.find({"approval_id": approval_id}).sort("created_at", 1).to_list(200)
    actor_ids = [e["actor_id"] for e in events if e.get("actor_id") and e["actor_id"] != "system"]
    names = {u["_id"]: u.get("full_name") async for u in col_users.find({"_id": {"$in": actor_ids}}, {"full_name": 1})}
    row["events"] = [{
        "action": e["action"], "actor_role": e.get("actor_role"), "comment": e.get("comment"),
        "actor_name": "System" if e.get("actor_id") == "system" else names.get(e.get("actor_id")),
        "pin_verified": e.get("pin_verified", False), "created_at": e["created_at"],
    } for e in events]
    return row


# ── Inline uploads (base64 stored in Mongo; Phase 1.5 will move to S3) ───────

class InlineUploadIn(BaseModel):
    kind: str = Field(default="generic", max_length=40)
    content_type: str = Field(default="image/jpeg")
    data_base64: str  # base64 without the data: prefix


# ~900 KB cap per image post-compression; generous headroom for client-side
# resizing that typically lands around 120-250 KB.
INLINE_MAX_BYTES = 900_000

# Upper bound on the *raw* upload before we even attempt to decode/re-encode
# it — rejects absurd payloads early instead of handing them to Pillow.
INLINE_RAW_MAX_BYTES = 15 * 1024 * 1024

# Server-side optimization is authoritative: every image gets re-encoded to
# WebP here regardless of what the client sent, so a bypassed/absent
# client-side compression step (a different caller, a buggy build, etc.)
# never results in an oversized or non-optimized image being stored.
IMAGE_MAX_DIM = 1600
IMAGE_WEBP_QUALITY = 80


def _optimize_image(raw: bytes) -> tuple[bytes, str]:
    """Resize + re-encode an image to WebP. Raises ValueError if unparseable."""
    try:
        img = Image.open(io.BytesIO(raw))
        img.load()
    except Exception as exc:
        raise ValueError(f"Not a valid image: {exc}") from exc

    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA" if "A" in img.mode or img.mode == "P" else "RGB")

    ratio = min(1.0, IMAGE_MAX_DIM / max(img.width, img.height))
    if ratio < 1.0:
        img = img.resize((round(img.width * ratio), round(img.height * ratio)), Image.LANCZOS)

    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=IMAGE_WEBP_QUALITY, method=6)
    return buf.getvalue(), "image/webp"


@router.post("/uploads/inline")
async def inline_upload(dto: InlineUploadIn, ctx: AuthCtx = Depends(get_ctx)):
    # rough size estimate from base64 length, checked before touching Pillow
    approx_raw_bytes = (len(dto.data_base64) * 3) // 4
    if approx_raw_bytes > INLINE_RAW_MAX_BYTES:
        raise HTTPException(400, f"Upload too large (>{INLINE_RAW_MAX_BYTES // (1024*1024)} MB).")

    raw = base64.b64decode(dto.data_base64)
    content_type = dto.content_type
    if content_type.startswith("image/"):
        try:
            raw, content_type = _optimize_image(raw)
        except ValueError as exc:
            raise HTTPException(400, str(exc)) from exc

    final_bytes = len(raw)
    if final_bytes > INLINE_MAX_BYTES:
        raise HTTPException(400, f"Image too large (>{INLINE_MAX_BYTES // 1000} KB) even after optimization.")

    data_base64 = base64.b64encode(raw).decode("ascii")
    key = f"{ctx.org_id}/{dto.kind}/{_uid()}"
    await col_uploads.insert_one({
        "_id": key,
        "org_id": ctx.org_id,
        "kind": dto.kind,
        "content_type": content_type,
        "data_base64": data_base64,
        "bytes": final_bytes,
        "uploaded_by_id": ctx.user_id,
        "created_at": _now(),
    })
    return {"object_key": key, "bytes": final_bytes, "content_type": content_type}


@router.get("/uploads/{object_key:path}")
async def get_inline_upload(object_key: str, ctx: AuthCtx = Depends(get_ctx)):
    doc = await col_uploads.find_one({"_id": object_key, "org_id": ctx.org_id})
    if not doc:
        raise HTTPException(404, "Upload not found")
    return {
        "object_key": object_key,
        "content_type": doc["content_type"],
        "data_url": f"data:{doc['content_type']};base64,{doc['data_base64']}",
    }


# ── Overview KPI ─────────────────────────────────────────────────────────────

@router.get("/overview")
async def overview(ctx: AuthCtx = Depends(get_ctx)):
    await _escalation_sweep(ctx.org_id)
    today = _today_ist()                       # India's calendar day, not the server's
    month_start = today.replace(day=1)
    next_month = (month_start + timedelta(days=32)).replace(day=1)

    active_projects = await col_projects.count_documents({
        "org_id": ctx.org_id, "status": "ACTIVE", "deleted_at": None,
    })

    pending = await col_approvals.find(
        {"org_id": ctx.org_id, "status": "PENDING"},
        {"amount_cents": 1, "requested_by_id": 1, "required_role": 1, "status": 1},
    ).to_list(1000)
    pending_amount = sum(a.get("amount_cents") or 0 for a in pending)
    awaiting_me = sum(1 for a in pending if _decision_gate(a, ctx) is None)

    dprs_today = await col_dprs.count_documents({
        "org_id": ctx.org_id, "report_date": today.isoformat(), "deleted_at": None,
    })

    # Only money that has actually been approved counts as spend. Draft, pending and
    # rejected expenses are reported separately (a rejected bill was never spent).
    by_status = {
        r["_id"]: r["total"] for r in await col_expenses.aggregate([
            {"$match": {
                "org_id": ctx.org_id, "deleted_at": None,
                "occurred_on": {"$gte": month_start.isoformat(), "$lt": next_month.isoformat()},
            }},
            {"$group": {"_id": "$approval_status", "total": {"$sum": "$amount_cents"}}},
        ]).to_list(20)
    }

    return {
        "today": today.isoformat(),
        "active_projects": active_projects,
        "pending_approvals": len(pending),
        "awaiting_my_decision": awaiting_me,
        "pending_amount_cents": pending_amount,
        "dprs_today": dprs_today,
        "month_spend_cents": by_status.get("APPROVED", 0),
        "month_spend_pending_cents": by_status.get("PENDING", 0),
    }


# ── Indexes ──────────────────────────────────────────────────────────────────
# Before this existed, no index was ever created, so every "already exists" guard
# in this file was dead code. Modules register their indexes here at import time;
# `ensure_indexes` runs once at application startup.

_INDEX_REGISTRY: list[tuple[Any, list, dict]] = []


def register_indexes(collection, keys: list, **opts) -> None:
    _INDEX_REGISTRY.append((collection, keys, opts))


IDEMPOTENCY_TTL_SECONDS = 7 * 24 * 3600

register_indexes(col_users, [("email", 1)], unique=True, name="uq_email")
register_indexes(col_memberships, [("org_id", 1), ("user_id", 1)], unique=True, name="uq_org_user")
register_indexes(col_memberships, [("user_id", 1)], name="ix_user")
register_indexes(col_projects, [("org_id", 1), ("code", 1)], unique=True, name="uq_org_code")
register_indexes(col_projects, [("org_id", 1), ("status", 1)], name="ix_org_status")
register_indexes(col_vendors, [("org_id", 1), ("name_key", 1)], unique=True, name="uq_org_name_key")
register_indexes(col_materials, [("org_id", 1), ("sku", 1)], unique=True, name="uq_org_sku")
register_indexes(col_dprs, [("org_id", 1), ("project_id", 1), ("report_date", -1)], name="ix_org_project_date")
register_indexes(
    col_dprs, [("org_id", 1), ("project_id", 1), ("report_date", 1), ("captured_by_id", 1)],
    unique=True, name="uq_dpr_project_date_user",
)
register_indexes(col_expenses, [("org_id", 1), ("project_id", 1), ("occurred_on", -1)], name="ix_org_project_date")
register_indexes(col_expenses, [("org_id", 1), ("occurred_on", 1)], name="ix_org_date")
register_indexes(col_approvals, [("org_id", 1), ("status", 1), ("created_at", 1)], name="ix_org_status_created")
register_indexes(col_approvals, [("org_id", 1), ("target_type", 1), ("target_id", 1)], name="ix_org_target")
register_indexes(col_approval_events, [("approval_id", 1), ("created_at", 1)], name="ix_approval")
register_indexes(col_audit_log, [("org_id", 1), ("created_at", -1)], name="ix_org_created")
register_indexes(col_uploads, [("org_id", 1)], name="ix_org")
register_indexes(col_idempotency, [("org_id", 1), ("key", 1)], unique=True, name="uq_org_key")
register_indexes(col_idempotency, [("created_at", 1)], expireAfterSeconds=IDEMPOTENCY_TTL_SECONDS, name="ttl_created")


async def _backfill_vendor_keys() -> None:
    """Vendors created before name_key existed get one, so the unique index can be built."""
    async for v in col_vendors.find({"name_key": {"$exists": False}}, {"name": 1}):
        await col_vendors.update_one({"_id": v["_id"]}, {"$set": {"name_key": _name_key(v.get("name") or "")}})


async def ensure_indexes() -> None:
    """
    Create every registered index. Never raises: a failure to build a UNIQUE index
    (typically because production already holds duplicates from the unguarded
    era) is logged at ERROR, a plain index is created in its place so queries stay
    fast, and the app still boots. Fix the duplicates and restart to enforce uniqueness.
    """
    try:
        await _backfill_vendor_keys()
    except PyMongoError:
        logger.exception("ERP: vendor name_key backfill failed")
    for collection, keys, opts in _INDEX_REGISTRY:
        try:
            await collection.create_index(keys, **opts)
        except PyMongoError as exc:
            if opts.get("unique"):
                logger.error(
                    "ERP: could not build UNIQUE index %s on %s — existing duplicate data? (%s). "
                    "Falling back to a non-unique index; uniqueness is NOT enforced until this is fixed.",
                    opts.get("name"), collection.name, exc,
                )
                fallback = {k: v for k, v in opts.items() if k != "unique"}
                fallback["name"] = f"{opts.get('name', 'ix')}_nonunique"
                try:
                    await collection.create_index(keys, **fallback)
                except PyMongoError:
                    logger.exception("ERP: fallback index also failed on %s", collection.name)
            else:
                logger.exception("ERP: could not build index %s on %s", opts.get("name"), collection.name)


router.add_event_handler("startup", ensure_indexes)
