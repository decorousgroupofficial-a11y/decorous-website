"""
Regression tests for defects found in the ERP audit. Each one FAILED against the
code as audited (see ERP audit notes) and must pass after the fixes.
"""
import datetime as dt

import pytest
from .helpers import signup, add_member, new_key, run
from .test_core_existing import dpr_body, make_expense, submit


# ── B1/B6: a project could never leave PLANNED, so "Active projects" was always 0

def test_project_status_can_be_changed_and_drives_overview(client):
    owner = signup(client)
    p = owner.project("ACT-1")
    assert owner.get("/api/erp/overview").json()["active_projects"] == 0
    r = owner.patch(f"/api/erp/projects/{p['id']}", {"status": "ACTIVE"})
    assert r.status_code == 200 and r.json()["status"] == "ACTIVE"
    assert owner.get("/api/erp/overview").json()["active_projects"] == 1


def test_illegal_status_transition_rejected(client):
    owner = signup(client)
    p = owner.project()
    assert owner.patch(f"/api/erp/projects/{p['id']}", {"status": "COMPLETED"}).status_code == 400  # PLANNED→COMPLETED
    assert owner.patch(f"/api/erp/projects/{p['id']}", {"status": "ARCHIVED"}).status_code == 200
    assert owner.patch(f"/api/erp/projects/{p['id']}", {"status": "ACTIVE"}).status_code == 400      # archived is terminal


def test_engineer_cannot_edit_project(client):
    owner = signup(client)
    eng = add_member(owner, "ENGINEER")
    p = owner.project()
    assert eng.patch(f"/api/erp/projects/{p['id']}", {"status": "ACTIVE"}).status_code == 403


def test_cannot_edit_other_orgs_project(client):
    a, b = signup(client, "Org A"), signup(client, "Org B")
    p = a.project()
    # the owner CAN edit it (so a 404 below means tenancy, not a missing route)...
    assert a.patch(f"/api/erp/projects/{p['id']}", {"name": "Renamed by owner"}).status_code == 200
    # ...but another organisation cannot even see it
    assert b.patch(f"/api/erp/projects/{p['id']}", {"status": "ACTIVE"}).status_code == 404
    assert b.get(f"/api/erp/projects/{p['id']}").status_code == 404


# ── B2/B3: uniqueness guards were dead code (no indexes existed)

def test_duplicate_project_code_rejected(client):
    owner = signup(client)
    assert owner.post("/api/erp/projects", {"code": "DUP-1", "name": "First"}, idem=False).status_code == 200
    again = owner.post("/api/erp/projects", {"code": "dup-1", "name": "Second"}, idem=False)
    assert again.status_code == 400
    assert len(owner.get("/api/erp/projects").json()) == 1


def test_same_project_code_allowed_in_different_orgs(client):
    a, b = signup(client, "Org A"), signup(client, "Org B")
    assert a.post("/api/erp/projects", {"code": "SHARED", "name": "x1"}, idem=False).status_code == 200
    assert b.post("/api/erp/projects", {"code": "SHARED", "name": "x2"}, idem=False).status_code == 200


def test_duplicate_material_sku_rejected(client):
    owner = signup(client)
    body = {"sku": "CEM-43", "name": "Cement 43 grade", "category": "CEMENT", "uom": "bag"}
    assert owner.post("/api/erp/materials", body, idem=False).status_code == 200
    assert owner.post("/api/erp/materials", {**body, "sku": "cem-43"}, idem=False).status_code == 400


def test_indexes_exist_after_startup(client):
    import erp_routes
    async def names(col):
        return set((await col.index_information()).keys())
    assert any("code" in n for n in run(names(erp_routes.col_projects)))
    assert any("sku" in n for n in run(names(erp_routes.col_materials)))
    assert any("email" in n for n in run(names(erp_routes.col_users)))
    assert any("key" in n for n in run(names(erp_routes.col_idempotency)))


# ── B4: bill/photo proof was never verified to exist ─────────────────────────

def test_expense_rejects_dangling_bill_key(client):
    owner = signup(client)
    proj = owner.project()
    r = owner.post("/api/erp/expenses", {
        "project_id": proj["id"], "purpose": "Diesel", "category": "Fuel", "amount_cents": 100000,
        "bill_photo_key": f"{owner.org_id}/expense-bill/does-not-exist", "occurred_on": "2026-04-10"})
    assert r.status_code == 400


def test_expense_rejects_other_orgs_upload(client):
    a, b = signup(client, "Org A"), signup(client, "Org B")
    stolen = a.upload()
    proj = b.project()
    r = b.post("/api/erp/expenses", {
        "project_id": proj["id"], "purpose": "Diesel", "category": "Fuel", "amount_cents": 100000,
        "bill_photo_key": stolen, "occurred_on": "2026-04-10"})
    assert r.status_code == 400


def test_dpr_rejects_dangling_photo_keys(client):
    owner = signup(client)
    proj = owner.project()
    r = owner.post("/api/erp/dpr", dpr_body(proj["id"], [owner.upload(), "nope/nope/nope"]))
    assert r.status_code == 400


def test_discarding_stub_upload_endpoints_are_gone(client):
    owner = signup(client)
    r = owner.post("/api/erp/uploads/presign", {"kind": "expense-bill", "size_bytes": 10}, idem=False)
    assert r.status_code in (404, 405, 410)
    r2 = owner.put("/api/erp/uploads/stub/anything")
    assert r2.status_code in (404, 405, 410)


# ── B5: approvers approved blind ─────────────────────────────────────────────

def test_pending_approval_carries_decision_context(client):
    owner = signup(client)
    eng = add_member(owner, "ENGINEER", "Esha Engineer")
    proj = owner.project("CTX-1", name="Villa Context")
    e = make_expense(eng, proj["id"], 10_000, purpose="Scaffolding rent", vendor_name="Shree Scaffolds")
    submit(eng, e["id"])
    ap = owner.get("/api/erp/approvals/pending").json()[0]
    ctx = ap["target"]
    assert ctx["project_code"] == "CTX-1" and ctx["project_name"] == "Villa Context"
    assert ctx["title"] == "Scaffolding rent" and ctx["vendor_name"] == "Shree Scaffolds"
    assert ctx["bill_photo_key"] == e["bill_photo_key"]
    assert ap["requested_by_name"] == "Esha Engineer"


def test_pending_dpr_approval_carries_context(client):
    owner = signup(client)
    eng = add_member(owner, "ENGINEER", "Esha Engineer")
    proj = owner.project("CTX-2")
    d = eng.post("/api/erp/dpr", dpr_body(proj["id"], [eng.upload(), eng.upload()],
                                         work_narrative="Columns poured on 2nd floor")).json()
    eng.post(f"/api/erp/dpr/{d['id']}/submit")
    ap = owner.get("/api/erp/approvals/pending").json()[0]
    assert ap["target"]["project_code"] == "CTX-2"
    assert "Columns poured" in ap["target"]["title"]
    assert len(ap["target"]["photo_keys"]) == 2


def test_approval_history_lists_decided_items(client):
    owner = signup(client)
    eng = add_member(owner, "ENGINEER")
    proj = owner.project()
    e = make_expense(eng, proj["id"], 10_000)
    submit(eng, e["id"])
    ap = owner.get("/api/erp/approvals/pending").json()[0]
    owner.post(f"/api/erp/approvals/{ap['id']}/decide", {"action": "APPROVE", "comment": "ok"}, idem=False)
    hist = owner.get("/api/erp/approvals/history").json()
    assert [h["id"] for h in hist] == [ap["id"]] and hist[0]["status"] == "APPROVED"
    assert owner.get("/api/erp/approvals/pending").json() == []


# ── B7: "today" must be the Indian date, not the server's UTC date ───────────

def test_overview_today_uses_ist(client, monkeypatch):
    import erp_routes
    owner = signup(client)
    proj = owner.project()
    # 2026-03-31 20:00 UTC == 2026-04-01 01:30 IST
    fake_now = dt.datetime(2026, 3, 31, 20, 0, tzinfo=dt.timezone.utc)
    monkeypatch.setattr(erp_routes, "_now", lambda: fake_now)
    r = owner.post("/api/erp/dpr", dpr_body(proj["id"], [owner.upload(), owner.upload()], date="2026-04-01"))
    assert r.status_code == 200, r.text
    assert owner.get("/api/erp/overview").json()["dprs_today"] == 1


def test_overview_month_spend_uses_ist_month(client, monkeypatch):
    import erp_routes
    owner = signup(client)
    proj = owner.project()
    e = make_expense(owner, proj["id"], 1_000, occurred_on="2026-04-01")
    submit(owner, e["id"])                                               # ≤ ₹5,000 → auto-approved
    fake_now = dt.datetime(2026, 3, 31, 20, 0, tzinfo=dt.timezone.utc)   # already April in India
    monkeypatch.setattr(erp_routes, "_now", lambda: fake_now)
    assert owner.get("/api/erp/overview").json()["month_spend_cents"] == 100_000


def test_month_spend_counts_only_approved_money(client):
    """A rejected / pending / draft expense was never spent and must not inflate the KPI."""
    owner = signup(client)
    eng = add_member(owner, "ENGINEER")
    proj = owner.project()
    today = dt.datetime.now(dt.timezone(dt.timedelta(hours=5, minutes=30))).date().isoformat()

    approved = make_expense(eng, proj["id"], 2_000, occurred_on=today)
    submit(eng, approved["id"])                                          # auto-approved
    rejected = make_expense(eng, proj["id"], 10_000, occurred_on=today)
    submit(eng, rejected["id"])
    pending = make_expense(eng, proj["id"], 12_000, occurred_on=today)
    submit(eng, pending["id"])
    make_expense(eng, proj["id"], 7_000, occurred_on=today)              # stays DRAFT

    for ap in owner.get("/api/erp/approvals/pending").json():
        if ap["target_id"] == rejected["id"]:
            owner.post(f"/api/erp/approvals/{ap['id']}/decide",
                       {"action": "REJECT", "rejection_reason": "No bill"}, idem=False)

    ov = owner.get("/api/erp/overview").json()
    assert ov["month_spend_cents"] == 200_000            # only the ₹2,000 approved one
    assert ov["month_spend_pending_cents"] == 1_200_000  # the ₹12,000 awaiting approval


# ── B8: idempotency must be safe under races / key misuse ────────────────────

def test_idempotency_key_reused_for_different_endpoint_is_rejected(client):
    owner = signup(client)
    proj = owner.project()
    key = new_key()
    assert owner.post("/api/erp/dpr", dpr_body(proj["id"], [owner.upload(), owner.upload()]), key=key).status_code == 200
    e = {"project_id": proj["id"], "purpose": "Diesel", "category": "Fuel", "amount_cents": 1000,
         "bill_photo_key": owner.upload(), "occurred_on": "2026-04-10"}
    assert owner.post("/api/erp/expenses", e, key=key).status_code == 409


def test_concurrent_duplicate_request_is_refused_not_double_processed(client):
    import erp_routes
    owner = signup(client)
    proj = owner.project()
    key = new_key()
    # Simulate a first request that has claimed the key but not finished.
    run(erp_routes.col_idempotency.insert_one({
        "_id": "claim-1", "org_id": owner.org_id, "key": key, "user_id": owner.user_id,
        "method": "POST", "path": "/api/erp/dpr", "state": "IN_PROGRESS",
        "created_at": dt.datetime.now(dt.timezone.utc)}))
    r = owner.post("/api/erp/dpr", dpr_body(proj["id"], [owner.upload(), owner.upload()]), key=key)
    assert r.status_code == 409
    assert owner.get("/api/erp/dpr").json() == []


def test_abandoned_idempotency_claim_does_not_block_the_key_forever(client):
    """A claim left by a crashed request (older than the stale window) must be taken over."""
    import erp_routes
    owner = signup(client)
    proj = owner.project()
    key = new_key()
    run(erp_routes.col_idempotency.insert_one({
        "_id": "orphan-1", "org_id": owner.org_id, "key": key, "user_id": owner.user_id,
        "method": "POST", "path": "/api/erp/dpr", "state": "IN_PROGRESS",
        "created_at": dt.datetime.now(dt.timezone.utc) - dt.timedelta(minutes=10)}))
    r = owner.post("/api/erp/dpr", dpr_body(proj["id"], [owner.upload(), owner.upload()]), key=key)
    assert r.status_code == 200, r.text
    again = owner.post("/api/erp/dpr", dpr_body(proj["id"], [owner.upload(), owner.upload()]), key=key)
    assert again.status_code == 200 and again.json()["id"] == r.json()["id"]      # and it now replays normally


def test_failed_request_does_not_poison_its_idempotency_key(client):
    owner = signup(client)
    proj = owner.project()
    key = new_key()
    bad = dpr_body(proj["id"], [owner.upload(), "bogus/key/1"])
    assert owner.post("/api/erp/dpr", bad, key=key).status_code == 400
    good = dpr_body(proj["id"], [owner.upload(), owner.upload()])
    assert owner.post("/api/erp/dpr", good, key=key).status_code == 200      # same key, corrected payload


# ── B9: lockout used to crash with a naive/aware datetime comparison ─────────

def test_lockout_returns_401_not_500(client):
    owner = signup(client)
    for _ in range(5):
        assert client.post("/api/erp/auth/login", json={"email": owner.email, "password": "wrong-wrong-1"}).status_code == 401
    # 6th attempt (even with the right password) hits the locked-account branch
    r = client.post("/api/erp/auth/login", json={"email": owner.email, "password": owner.password})
    assert r.status_code == 401 and "locked" in r.json()["detail"].lower()


def test_lock_expiry_resets_failed_counter(client):
    import erp_routes
    owner = signup(client)
    for _ in range(5):
        client.post("/api/erp/auth/login", json={"email": owner.email, "password": "wrong-wrong-1"})
    past = dt.datetime.now(dt.timezone.utc) - dt.timedelta(minutes=1)
    run(erp_routes.col_users.update_one({"_id": owner.user_id}, {"$set": {"locked_until": past}}))
    # lock has expired: ONE wrong guess must not instantly re-lock the account
    assert client.post("/api/erp/auth/login", json={"email": owner.email, "password": "wrong-wrong-1"}).status_code == 401
    ok = client.post("/api/erp/auth/login", json={"email": owner.email, "password": owner.password})
    assert ok.status_code == 200


# ── B10: access control is re-checked live, not trusted from a 24h token ─────

def test_deactivated_member_loses_access_immediately(client):
    owner = signup(client)
    eng = add_member(owner, "ENGINEER")
    assert eng.get("/api/erp/projects").status_code == 200
    members = owner.get("/api/erp/users").json()
    mid = next(m["id"] for m in members if m["user"]["email"] == eng.email)
    assert owner.patch(f"/api/erp/users/{mid}", {"active": False}).status_code == 200
    assert eng.get("/api/erp/projects").status_code in (401, 403)


def test_role_change_takes_effect_immediately(client):
    owner = signup(client)
    eng = add_member(owner, "ENGINEER")
    assert eng.post("/api/erp/projects", {"code": "RC-1", "name": "x1"}, idem=False).status_code == 403
    mid = next(m["id"] for m in owner.get("/api/erp/users").json() if m["user"]["email"] == eng.email)
    assert owner.patch(f"/api/erp/users/{mid}", {"role": "PM"}).status_code == 200
    assert eng.post("/api/erp/projects", {"code": "RC-1", "name": "x1"}, idem=False).status_code == 200


def test_cannot_remove_or_demote_last_owner(client):
    owner = signup(client)
    mid = next(m["id"] for m in owner.get("/api/erp/users").json() if m["user"]["email"] == owner.email)
    assert owner.patch(f"/api/erp/users/{mid}", {"role": "PM"}).status_code == 400
    assert owner.patch(f"/api/erp/users/{mid}", {"active": False}).status_code == 400
