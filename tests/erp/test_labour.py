"""Labour & attendance: wage maths, muster lifecycle, double-booking, wages/advances, khata."""
import pytest
from fastapi import HTTPException

from .helpers import signup, add_member

TODAY = "2026-04-10"


def worker(actor, name="Ramesh Kumar", wage=70000, **extra):
    r = actor.post("/api/erp/workers", {"name": name, "daily_wage_cents": wage, "trade": "MASON",
                                         "skill_level": "SKILLED", **extra}, idem=False)
    assert r.status_code == 200, r.text
    return r.json()


def sheet(actor, project_id, entries, day=TODAY):
    return actor.put("/api/erp/attendance", {"project_id": project_id, "date": day, "entries": entries})


def entry(worker_id, status="PRESENT", ot=0):
    return {"worker_id": worker_id, "status": status, "ot_hours": ot}


def decide(actor, target_id, action="APPROVE", **kw):
    ap = next(a for a in actor.get("/api/erp/approvals/pending").json() if a["target_id"] == target_id)
    return actor.post(f"/api/erp/approvals/{ap['id']}/decide", {"action": action, **kw}, idem=False)


def approved_sheet(owner, pm, eng, project_id, entries, day=TODAY):
    s = sheet(eng, project_id, entries, day).json()
    assert eng.post(f"/api/erp/attendance/{s['id']}/submit").status_code == 200
    assert decide(pm, s["id"]).status_code == 200
    return s


# ── pure wage maths ──────────────────────────────────────────────────────────

def test_wage_maths_is_exact_integer_paise():
    from erp_labour import entry_amounts
    assert entry_amounts("PRESENT", 0, 70000, None) == (2, 0, 70000)
    assert entry_amounts("HALF", 0, 70000, None) == (1, 0, 35000)
    assert entry_amounts("HALF", 0, 70001, None)[2] == 35000          # floor, never a fraction of a paisa
    assert entry_amounts("ABSENT", 0, 70000, None) == (0, 0, 0)
    # default OT rate = daily/8 per hour: 80000/8 = 10000; 1.5h = 15000
    assert entry_amounts("PRESENT", 1.5, 80000, None) == (2, 3, 95000)
    # explicit OT rate wins
    assert entry_amounts("PRESENT", 2, 80000, 15000)[2] == 80000 + 30000
    assert entry_amounts("HALF", 1, 80000, 15000)[2] == 40000 + 15000


@pytest.mark.parametrize("status,ot", [("ABSENT", 1), ("PRESENT", 0.25), ("PRESENT", 0.75)])
def test_wage_maths_rejects_bad_overtime(status, ot):
    from erp_labour import entry_amounts
    with pytest.raises(HTTPException) as e:
        entry_amounts(status, ot, 70000, None)
    assert e.value.status_code == 422


# ── workers ──────────────────────────────────────────────────────────────────

def test_worker_crud_and_roles(client):
    owner = signup(client)
    eng = add_member(owner, "ENGINEER")
    pm = add_member(owner, "PM")
    assert eng.post("/api/erp/workers", {"name": "No Access", "daily_wage_cents": 50000}, idem=False).status_code == 403
    w = worker(pm, "Suresh", 65000)
    assert w["balance_cents"] == 0 and w["days_worked"] == 0
    assert pm.patch(f"/api/erp/workers/{w['id']}", {"daily_wage_cents": 72000}).json()["daily_wage_cents"] == 72000
    assert eng.patch(f"/api/erp/workers/{w['id']}", {"daily_wage_cents": 1}).status_code == 403
    assert [x["name"] for x in eng.get("/api/erp/workers").json()] == ["Suresh"]


@pytest.mark.parametrize("wage", [0, -5])
def test_worker_wage_must_be_positive(client, wage):
    owner = signup(client)
    assert owner.post("/api/erp/workers", {"name": "Bad Wage", "daily_wage_cents": wage}, idem=False).status_code == 422


def test_workers_are_tenant_isolated(client):
    a, b = signup(client, "Org A"), signup(client, "Org B")
    w = worker(a)
    assert b.get("/api/erp/workers").json() == []
    assert b.patch(f"/api/erp/workers/{w['id']}", {"name": "Hijack"}).status_code == 404
    assert b.get(f"/api/erp/workers/{w['id']}/statement").status_code == 404


def test_labour_contractor_must_exist(client):
    owner = signup(client)
    r = owner.post("/api/erp/workers", {"name": "Contract Guy", "daily_wage_cents": 50000,
                                         "contractor_id": "nope"}, idem=False)
    assert r.status_code == 404


# ── attendance sheet ─────────────────────────────────────────────────────────

def test_sheet_totals_and_resave_replaces(client):
    owner = signup(client)
    eng = add_member(owner, "ENGINEER")
    p = owner.project()
    w1, w2, w3 = worker(owner, "A One", 70000), worker(owner, "B Two", 60000), worker(owner, "C Three", 50000)
    r = sheet(eng, p["id"], [entry(w1["id"], "PRESENT", 2), entry(w2["id"], "HALF"), entry(w3["id"], "ABSENT")])
    assert r.status_code == 200, r.text
    s = r.json()
    # w1: 70000 + 2h * (70000/8=8750) = 87500 ; w2: 30000 ; w3: 0
    assert [e["amount_cents"] for e in s["entries"]] == [87500, 30000, 0]
    assert s["total_cents"] == 117500 and s["approval_status"] == "DRAFT"
    again = sheet(eng, p["id"], [entry(w1["id"], "PRESENT")]).json()
    assert again["id"] == s["id"] and again["total_cents"] == 70000 and len(again["entries"]) == 1
    assert len(owner.get("/api/erp/attendance").json()) == 1


def test_wage_is_snapshotted_so_rate_changes_do_not_rewrite_history(client):
    owner = signup(client)
    p = owner.project()
    w = worker(owner, wage=70000)
    s = sheet(owner, p["id"], [entry(w["id"])]).json()
    owner.patch(f"/api/erp/workers/{w['id']}", {"daily_wage_cents": 99000})
    saved = owner.get(f"/api/erp/attendance/{s['id']}").json()
    assert saved["entries"][0]["amount_cents"] == 70000 and saved["entries"][0]["daily_wage_cents"] == 70000


def test_sheet_validation(client):
    owner = signup(client)
    p = owner.project()
    w = worker(owner)
    assert sheet(owner, p["id"], [entry(w["id"]), entry(w["id"], "HALF")]).status_code == 422    # duplicate worker
    assert sheet(owner, p["id"], [entry("ghost")]).status_code == 404
    assert sheet(owner, "ghost", [entry(w["id"])]).status_code == 404
    assert sheet(owner, p["id"], [entry(w["id"], "ABSENT", 1)]).status_code == 422               # OT while absent
    assert sheet(owner, p["id"], [entry(w["id"])], day="2026-02-31").status_code == 422          # not a date
    assert sheet(owner, p["id"], [entry(w["id"])], day="2999-01-01").status_code == 422          # future
    owner.patch(f"/api/erp/workers/{w['id']}", {"is_active": False})
    assert sheet(owner, p["id"], [entry(w["id"])]).status_code == 400                             # inactive worker


def test_cannot_mark_attendance_on_archived_project(client):
    owner = signup(client)
    p = owner.project()
    w = worker(owner)
    owner.patch(f"/api/erp/projects/{p['id']}", {"status": "ARCHIVED"})
    assert sheet(owner, p["id"], [entry(w["id"])]).status_code == 400


def test_viewer_and_storekeeper_cannot_mark_attendance(client):
    owner = signup(client)
    p = owner.project()
    w = worker(owner)
    for role in ("VIEWER", "STOREKEEPER", "ACCOUNTANT"):
        assert sheet(add_member(owner, role), p["id"], [entry(w["id"])]).status_code == 403


def test_roster_returns_workers_and_existing_sheet(client):
    owner = signup(client)
    p = owner.project()
    w = worker(owner)
    r = owner.get("/api/erp/attendance/roster", params={"project_id": p["id"], "date": TODAY}).json()
    assert [x["id"] for x in r["workers"]] == [w["id"]] and r["sheet"] is None
    sheet(owner, p["id"], [entry(w["id"])])
    r = owner.get("/api/erp/attendance/roster", params={"project_id": p["id"], "date": TODAY}).json()
    assert r["sheet"]["total_cents"] == 70000


# ── double booking ───────────────────────────────────────────────────────────

def test_worker_cannot_be_paid_a_full_day_on_two_sites(client):
    owner = signup(client)
    p1, p2 = owner.project(), owner.project()
    w = worker(owner)
    assert sheet(owner, p1["id"], [entry(w["id"], "PRESENT")]).status_code == 200
    r = sheet(owner, p2["id"], [entry(w["id"], "PRESENT")])
    assert r.status_code == 400 and "another site" in r.json()["detail"]
    assert sheet(owner, p2["id"], [entry(w["id"], "HALF")]).status_code == 400     # 2 + 1 halves > 2


def test_two_half_days_on_two_sites_is_fine(client):
    owner = signup(client)
    p1, p2 = owner.project(), owner.project()
    w = worker(owner)
    assert sheet(owner, p1["id"], [entry(w["id"], "HALF")]).status_code == 200
    assert sheet(owner, p2["id"], [entry(w["id"], "HALF")]).status_code == 200


def test_rejected_sheet_releases_the_worker(client):
    owner = signup(client)
    pm, eng = add_member(owner, "PM"), add_member(owner, "ENGINEER")
    p1, p2 = owner.project(), owner.project()
    w = worker(owner)
    s = sheet(eng, p1["id"], [entry(w["id"])]).json()
    eng.post(f"/api/erp/attendance/{s['id']}/submit")
    assert decide(pm, s["id"], "REJECT", rejection_reason="Wrong site").status_code == 200
    assert sheet(eng, p2["id"], [entry(w["id"])]).status_code == 200


# ── lifecycle & locking ──────────────────────────────────────────────────────

def test_submitted_sheet_is_locked_but_rejected_one_is_editable(client):
    owner = signup(client)
    pm, eng = add_member(owner, "PM"), add_member(owner, "ENGINEER")
    p = owner.project()
    w1, w2 = worker(owner, "A One"), worker(owner, "B Two")
    s = sheet(eng, p["id"], [entry(w1["id"])]).json()
    assert eng.post(f"/api/erp/attendance/{s['id']}/submit").status_code == 200
    assert sheet(eng, p["id"], [entry(w1["id"]), entry(w2["id"])]).status_code == 400          # locked while PENDING
    assert eng.post(f"/api/erp/attendance/{s['id']}/submit").status_code == 400                # can't resubmit
    decide(pm, s["id"], "REJECT", rejection_reason="Missing a worker")
    fixed = sheet(eng, p["id"], [entry(w1["id"]), entry(w2["id"])])
    assert fixed.status_code == 200 and fixed.json()["approval_status"] == "DRAFT" and fixed.json()["approval_id"] is None
    assert eng.post(f"/api/erp/attendance/{s['id']}/submit").status_code == 200                # resubmit after fixing


def test_engineer_cannot_approve_own_sheet_and_approval_shows_context(client):
    owner = signup(client)
    pm, eng = add_member(owner, "PM"), add_member(owner, "ENGINEER")
    p = owner.project("MUSTER-1")
    w = worker(owner)
    s = sheet(eng, p["id"], [entry(w["id"])]).json()
    eng.post(f"/api/erp/attendance/{s['id']}/submit")
    ap = next(a for a in pm.get("/api/erp/approvals/pending").json() if a["target_id"] == s["id"])
    assert ap["required_role"] == "PM" and ap["target"]["project_code"] == "MUSTER-1"
    assert "1 present" in ap["target"]["title"] and ap["amount_cents"] == 70000
    assert decide(eng, s["id"]).status_code == 403


def test_large_muster_needs_pin_like_any_other_50k_approval(client):
    owner = signup(client)
    pm, eng = add_member(owner, "PM"), add_member(owner, "ENGINEER")
    p = owner.project()
    ws = [worker(owner, f"Worker {i:02d}", 100000) for i in range(6)]            # 6 × ₹1,000 = ₹6,000 ... scale up
    ws += [worker(owner, f"Big {i:02d}", 1_000_000) for i in range(6)]           # 6 × ₹10,000 → total ₹66,000
    s = sheet(eng, p["id"], [entry(w["id"]) for w in ws]).json()
    assert s["total_cents"] == 6 * 100000 + 6 * 1_000_000
    eng.post(f"/api/erp/attendance/{s['id']}/submit")
    assert decide(pm, s["id"]).status_code == 400                                 # PIN required (≥ ₹50,000)


# ── wages, advances and the khata ────────────────────────────────────────────

def test_earned_days_and_overtime_roll_up_per_worker(client):
    owner = signup(client)
    pm, eng = add_member(owner, "PM"), add_member(owner, "ENGINEER")
    p = owner.project("KHATA-1")
    w = worker(owner, wage=70000)
    approved_sheet(owner, pm, eng, p["id"], [entry(w["id"], "PRESENT", 2)], "2026-04-08")   # 70000 + 2h * 8750
    approved_sheet(owner, pm, eng, p["id"], [entry(w["id"], "HALF")], "2026-04-09")         # 35000
    row = owner.get("/api/erp/workers").json()[0]
    assert (row["earned_cents"], row["paid_cents"], row["balance_cents"]) == (122500, 0, 122500)
    assert row["days_worked"] == 1.5


def test_small_worker_payment_auto_approves_and_reduces_balance(client):
    owner = signup(client)
    pm, eng = add_member(owner, "PM"), add_member(owner, "ENGINEER")
    p = owner.project()
    w = worker(owner, wage=70000)
    approved_sheet(owner, pm, eng, p["id"], [entry(w["id"])], "2026-04-08")
    pay = owner.post("/api/erp/worker-payments", {"worker_id": w["id"], "amount_cents": 30000, "paid_on": TODAY})
    assert pay.status_code == 200 and pay.json()["approval_status"] == "APPROVED"
    row = owner.get("/api/erp/workers").json()[0]
    assert (row["earned_cents"], row["paid_cents"], row["balance_cents"]) == (70000, 30000, 40000)


def test_pending_payment_is_not_counted_as_paid_yet(client):
    owner = signup(client)
    pm, eng = add_member(owner, "PM"), add_member(owner, "ENGINEER")
    p = owner.project()
    w = worker(owner, wage=900000)
    approved_sheet(owner, pm, eng, p["id"], [entry(w["id"])], "2026-04-08")                 # ₹9,000 earned
    pay = pm.post("/api/erp/worker-payments", {"worker_id": w["id"], "amount_cents": 800000, "paid_on": TODAY})
    assert pay.json()["approval_status"] == "PENDING"                                        # ₹8,000 → needs PM/Owner
    row = owner.get("/api/erp/workers").json()[0]
    assert row["paid_cents"] == 0 and row["pending_paid_cents"] == 800000 and row["balance_cents"] == 900000
    assert decide(owner, pay.json()["id"]).status_code == 200
    row = owner.get("/api/erp/workers").json()[0]
    assert row["paid_cents"] == 800000 and row["pending_paid_cents"] == 0 and row["balance_cents"] == 100000


def test_advance_before_work_shows_negative_balance_then_recovers(client):
    owner = signup(client)
    pm, eng = add_member(owner, "PM"), add_member(owner, "ENGINEER")
    p = owner.project()
    w = worker(owner, wage=70000)
    owner.post("/api/erp/worker-payments", {"worker_id": w["id"], "amount_cents": 200000, "paid_on": TODAY, "kind": "ADVANCE"})
    assert owner.get("/api/erp/workers").json()[0]["balance_cents"] == -200000        # unrecovered advance
    approved_sheet(owner, pm, eng, p["id"], [entry(w["id"])], "2026-04-08")
    assert owner.get("/api/erp/workers").json()[0]["balance_cents"] == -130000


def test_statement_has_running_balance_in_date_order(client):
    owner = signup(client)
    pm, eng = add_member(owner, "PM"), add_member(owner, "ENGINEER")
    p = owner.project("ST-1")
    w = worker(owner, wage=70000)
    approved_sheet(owner, pm, eng, p["id"], [entry(w["id"])], "2026-04-07")
    approved_sheet(owner, pm, eng, p["id"], [entry(w["id"], "HALF")], "2026-04-08")
    owner.post("/api/erp/worker-payments", {"worker_id": w["id"], "amount_cents": 50000, "paid_on": "2026-04-08", "ref_no": "UTR1", "mode": "UPI"})
    st = owner.get(f"/api/erp/workers/{w['id']}/statement").json()
    assert [(l["date"], l["type"]) for l in st["lines"]] == [
        ("2026-04-07", "ATTENDANCE"), ("2026-04-08", "ATTENDANCE"), ("2026-04-08", "WAGE")]
    assert [l["balance_cents"] for l in st["lines"]] == [70000, 105000, 55000]
    assert st["earned_cents"] == 105000 and st["paid_cents"] == 50000 and st["balance_cents"] == 55000
    assert st["lines"][0]["project_code"] == "ST-1"
    ranged = owner.get(f"/api/erp/workers/{w['id']}/statement", params={"date_from": "2026-04-08"}).json()
    assert len(ranged["lines"]) == 2 and ranged["lines"][0]["balance_cents"] == 105000   # history-true balance


def test_unapproved_attendance_does_not_count_as_earned(client):
    owner = signup(client)
    eng = add_member(owner, "ENGINEER")
    p = owner.project()
    w = worker(owner)
    s = sheet(eng, p["id"], [entry(w["id"])]).json()
    eng.post(f"/api/erp/attendance/{s['id']}/submit")                      # pending, not approved
    assert owner.get("/api/erp/workers").json()[0]["earned_cents"] == 0


def test_worker_payment_validation_and_permissions(client):
    owner = signup(client)
    eng = add_member(owner, "ENGINEER")
    w = worker(owner)
    base = {"worker_id": w["id"], "amount_cents": 10000, "paid_on": TODAY}
    assert eng.post("/api/erp/worker-payments", base).status_code == 403
    assert owner.post("/api/erp/worker-payments", {**base, "amount_cents": 0}).status_code == 422
    assert owner.post("/api/erp/worker-payments", {**base, "worker_id": "ghost"}).status_code == 404
    assert owner.post("/api/erp/worker-payments", {**base, "paid_on": "2999-01-01"}).status_code == 422
    assert owner.post("/api/erp/worker-payments", {**base, "proof_photo_key": "nope/nope/nope"}).status_code == 400
    assert owner.post("/api/erp/worker-payments", {**base, "proof_photo_key": owner.upload()}).status_code == 200


def test_worker_payment_is_idempotent(client):
    owner = signup(client)
    w = worker(owner)
    body = {"worker_id": w["id"], "amount_cents": 10000, "paid_on": TODAY}
    from .helpers import new_key
    k = new_key()
    a = owner.post("/api/erp/worker-payments", body, key=k)
    b = owner.post("/api/erp/worker-payments", body, key=k)
    assert a.json()["id"] == b.json()["id"]
    assert len(owner.get("/api/erp/worker-payments").json()) == 1
    assert owner.get("/api/erp/workers").json()[0]["paid_cents"] == 10000
