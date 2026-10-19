"""
Characterization tests: pin down the behaviour of the ERP core that already
exists in production, so refactors/fixes can be proven not to regress it.
These must pass both BEFORE and AFTER the fixes.
"""
import pytest
from .helpers import signup, add_member, new_key


def paise(rupees):
    return int(rupees * 100)


# ── auth ─────────────────────────────────────────────────────────────────────

def test_signup_login_me_roundtrip(client):
    owner = signup(client)
    assert owner.role == "OWNER"
    r = client.post("/api/erp/auth/login", json={"email": owner.email, "password": owner.password})
    assert r.status_code == 200 and r.json()["org_id"] == owner.org_id
    me = owner.get("/api/erp/me")
    assert me.status_code == 200 and me.json()["email"] == owner.email


def test_duplicate_signup_email_rejected(client):
    owner = signup(client)
    r = client.post("/api/erp/auth/signup", json={
        "email": owner.email, "password": "Another#Pass1", "full_name": "Dup", "org_name": "Dup Org"})
    assert r.status_code == 400


def test_protected_routes_require_token(client):
    assert client.get("/api/erp/projects").status_code == 401
    assert client.get("/api/erp/me", headers={"Authorization": "Bearer garbage"}).status_code == 401


def test_wrong_password_is_401(client):
    owner = signup(client)
    r = client.post("/api/erp/auth/login", json={"email": owner.email, "password": "nope-nope-nope"})
    assert r.status_code == 401


# ── roles ────────────────────────────────────────────────────────────────────

def test_engineer_cannot_create_project_pm_can(client):
    owner = signup(client)
    eng = add_member(owner, "ENGINEER")
    pm = add_member(owner, "PM")
    assert eng.post("/api/erp/projects", {"code": "ENG1", "name": "Nope"}, idem=False).status_code == 403
    assert pm.post("/api/erp/projects", {"code": "PM01", "name": "Yes"}, idem=False).status_code == 200


def test_only_owner_can_invite(client):
    owner = signup(client)
    pm = add_member(owner, "PM")
    r = pm.post("/api/erp/users/invite", {
        "email": "x@example.com", "full_name": "X Y", "role": "VIEWER", "temp_password": "TempPass#1234"},
        idem=False)
    assert r.status_code == 403


# ── DPR ──────────────────────────────────────────────────────────────────────

def dpr_body(project_id, photos, date="2026-04-10", **extra):
    return {"project_id": project_id, "report_date": date, "work_narrative": "Slab casting done",
            "activity_tags": ["slab"], "photo_keys": photos, **extra}


def test_dpr_needs_two_photos(client):
    owner = signup(client)
    proj = owner.project()
    r = owner.post("/api/erp/dpr", dpr_body(proj["id"], [owner.upload()]))
    assert r.status_code == 422


def test_dpr_duplicate_per_project_date_user_rejected(client):
    owner = signup(client)
    proj = owner.project()
    photos = [owner.upload(), owner.upload()]
    assert owner.post("/api/erp/dpr", dpr_body(proj["id"], photos)).status_code == 200
    again = owner.post("/api/erp/dpr", dpr_body(proj["id"], photos))   # new idempotency key
    assert again.status_code == 400


def test_idempotency_key_replay_returns_same_record_once(client):
    owner = signup(client)
    proj = owner.project()
    photos = [owner.upload(), owner.upload()]
    key = new_key()
    a = owner.post("/api/erp/dpr", dpr_body(proj["id"], photos), key=key)
    b = owner.post("/api/erp/dpr", dpr_body(proj["id"], photos), key=key)
    assert a.status_code == b.status_code == 200
    assert a.json()["id"] == b.json()["id"]
    assert len(owner.get("/api/erp/dpr").json()) == 1


def test_writes_require_idempotency_key(client):
    owner = signup(client)
    proj = owner.project()
    r = owner.post("/api/erp/dpr", dpr_body(proj["id"], [owner.upload(), owner.upload()]), idem=False)
    assert r.status_code == 400


def test_dpr_submit_then_pm_approves(client):
    owner = signup(client)
    pm = add_member(owner, "PM")
    eng = add_member(owner, "ENGINEER")
    proj = owner.project()
    d = eng.post("/api/erp/dpr", dpr_body(proj["id"], [eng.upload(), eng.upload()])).json()
    s = eng.post(f"/api/erp/dpr/{d['id']}/submit")
    assert s.status_code == 200 and s.json()["approval_status"] == "PENDING"
    pending = pm.get("/api/erp/approvals/pending").json()
    ap = next(a for a in pending if a["target_id"] == d["id"])
    assert ap["required_role"] == "PM"
    assert eng.post(f"/api/erp/approvals/{ap['id']}/decide", {"action": "APPROVE"}, idem=False).status_code == 403
    assert pm.post(f"/api/erp/approvals/{ap['id']}/decide", {"action": "APPROVE"}, idem=False).status_code == 200
    listed = pm.get("/api/erp/dpr").json()
    assert next(x for x in listed if x["id"] == d["id"])["approval_status"] == "APPROVED"


# ── expenses & approval matrix ───────────────────────────────────────────────

def make_expense(actor, project_id, rupees, **extra):
    body = {"project_id": project_id, "purpose": "Diesel", "category": "Fuel",
            "amount_cents": paise(rupees), "bill_photo_key": actor.upload("expense-bill"),
            "occurred_on": "2026-04-10", **extra}
    r = actor.post("/api/erp/expenses", body)
    assert r.status_code == 200, r.text
    return r.json()


def submit(actor, expense_id):
    r = actor.post(f"/api/erp/expenses/{expense_id}/submit")
    assert r.status_code == 200, r.text
    return r.json()


def test_small_expense_auto_approves(client):
    owner = signup(client)
    eng = add_member(owner, "ENGINEER")
    proj = owner.project()
    e = make_expense(eng, proj["id"], 4_000)
    assert submit(eng, e["id"])["approval_status"] == "APPROVED"
    assert owner.get("/api/erp/approvals/pending").json() == []


@pytest.mark.parametrize("rupees,required", [(5_001, "PM"), (25_000, "PM"), (25_001, "OWNER")])
def test_expense_routing_matrix(client, rupees, required):
    owner = signup(client)
    eng = add_member(owner, "ENGINEER")
    proj = owner.project()
    e = make_expense(eng, proj["id"], rupees)
    assert submit(eng, e["id"])["approval_status"] == "PENDING"
    ap = owner.get("/api/erp/approvals/pending").json()[0]
    assert ap["required_role"] == required


def test_pm_cannot_decide_owner_level_expense(client):
    owner = signup(client)
    pm = add_member(owner, "PM")
    eng = add_member(owner, "ENGINEER")
    proj = owner.project()
    e = make_expense(eng, proj["id"], 30_000)
    submit(eng, e["id"])
    ap = pm.get("/api/erp/approvals/pending").json()[0]
    assert pm.post(f"/api/erp/approvals/{ap['id']}/decide", {"action": "APPROVE"}, idem=False).status_code == 403
    assert owner.post(f"/api/erp/approvals/{ap['id']}/decide", {"action": "APPROVE"}, idem=False).status_code == 200


def test_pin_required_at_or_above_50k(client):
    owner = signup(client)
    eng = add_member(owner, "ENGINEER")
    proj = owner.project()
    e = make_expense(eng, proj["id"], 60_000)
    submit(eng, e["id"])
    ap = owner.get("/api/erp/approvals/pending").json()[0]
    decide = lambda body: owner.post(f"/api/erp/approvals/{ap['id']}/decide", body, idem=False)
    assert decide({"action": "APPROVE"}).status_code == 400                     # PIN required
    assert decide({"action": "APPROVE", "pin": "1234"}).status_code == 400      # PIN not set yet
    assert owner.post("/api/erp/users/pin", {"pin": "4821"}, idem=False).status_code == 200
    assert decide({"action": "APPROVE", "pin": "0000"}).status_code == 403      # wrong PIN
    assert decide({"action": "APPROVE", "pin": "4821"}).status_code == 200
    ex = owner.get("/api/erp/expenses").json()[0]
    assert ex["approval_status"] == "APPROVED"


def test_just_under_50k_needs_no_pin(client):
    owner = signup(client)
    eng = add_member(owner, "ENGINEER")
    proj = owner.project()
    e = make_expense(eng, proj["id"], 49_999)
    submit(eng, e["id"])
    ap = owner.get("/api/erp/approvals/pending").json()[0]
    assert owner.post(f"/api/erp/approvals/{ap['id']}/decide", {"action": "APPROVE"}, idem=False).status_code == 200


def test_maker_cannot_approve_own_request(client):
    owner = signup(client)
    pm = add_member(owner, "PM")
    proj = owner.project()
    e = make_expense(pm, proj["id"], 10_000)
    submit(pm, e["id"])
    ap = pm.get("/api/erp/approvals/pending").json()[0]
    assert pm.post(f"/api/erp/approvals/{ap['id']}/decide", {"action": "APPROVE"}, idem=False).status_code == 403


def test_reject_requires_reason_and_updates_target(client):
    owner = signup(client)
    eng = add_member(owner, "ENGINEER")
    proj = owner.project()
    e = make_expense(eng, proj["id"], 10_000)
    submit(eng, e["id"])
    ap = owner.get("/api/erp/approvals/pending").json()[0]
    assert owner.post(f"/api/erp/approvals/{ap['id']}/decide", {"action": "REJECT"}, idem=False).status_code == 400
    ok = owner.post(f"/api/erp/approvals/{ap['id']}/decide",
                    {"action": "REJECT", "rejection_reason": "Bill unclear"}, idem=False)
    assert ok.status_code == 200
    assert owner.get("/api/erp/expenses").json()[0]["approval_status"] == "REJECTED"


def test_cannot_decide_twice(client):
    owner = signup(client)
    eng = add_member(owner, "ENGINEER")
    proj = owner.project()
    e = make_expense(eng, proj["id"], 10_000)
    submit(eng, e["id"])
    ap = owner.get("/api/erp/approvals/pending").json()[0]
    assert owner.post(f"/api/erp/approvals/{ap['id']}/decide", {"action": "APPROVE"}, idem=False).status_code == 200
    assert owner.post(f"/api/erp/approvals/{ap['id']}/decide", {"action": "APPROVE"}, idem=False).status_code == 400


def test_expense_amount_must_be_positive(client):
    owner = signup(client)
    proj = owner.project()
    r = owner.post("/api/erp/expenses", {
        "project_id": proj["id"], "purpose": "x1", "category": "Fuel", "amount_cents": 0,
        "bill_photo_key": owner.upload(), "occurred_on": "2026-04-10"})
    assert r.status_code == 422


# ── tenancy ──────────────────────────────────────────────────────────────────

def test_orgs_are_isolated(client):
    a, b = signup(client, "Org A"), signup(client, "Org B")
    pa = a.project("ISO-A")
    assert b.get("/api/erp/projects").json() == []
    # B cannot attach work to A's project
    r = b.post("/api/erp/dpr", dpr_body(pa["id"], [b.upload(), b.upload()]))
    assert r.status_code == 404
    # B cannot read A's uploads
    key = a.upload()
    assert b.get(f"/api/erp/uploads/{key}").status_code == 404
    assert a.get(f"/api/erp/uploads/{key}").status_code == 200


def test_cross_org_approval_is_invisible(client):
    a, b = signup(client, "Org A"), signup(client, "Org B")
    eng = add_member(a, "ENGINEER")
    proj = a.project()
    e = make_expense(eng, proj["id"], 10_000)
    submit(eng, e["id"])
    ap = a.get("/api/erp/approvals/pending").json()[0]
    assert b.get("/api/erp/approvals/pending").json() == []
    assert b.post(f"/api/erp/approvals/{ap['id']}/decide", {"action": "APPROVE"}, idem=False).status_code == 404


# ── uploads ──────────────────────────────────────────────────────────────────

def test_inline_upload_is_reencoded_to_webp(client):
    owner = signup(client)
    key = owner.upload()
    got = owner.get(f"/api/erp/uploads/{key}").json()
    assert got["content_type"] == "image/webp"
    assert got["data_url"].startswith("data:image/webp;base64,")


def test_non_image_garbage_upload_rejected(client):
    owner = signup(client)
    r = owner.client.post("/api/erp/uploads/inline", headers=owner.headers(), json={
        "kind": "x", "content_type": "image/png", "data_base64": "bm90LWFuLWltYWdl"})
    assert r.status_code == 400
