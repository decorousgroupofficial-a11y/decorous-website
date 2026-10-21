"""Vendor bills, vendor payments, outstanding balances and GRN claiming."""
import datetime as dt

import pytest

from .helpers import signup, add_member, new_key
from .test_labour import decide
from .test_inventory import material, grn, line, approved_grn

TODAY = "2026-04-10"
PAST = "2026-03-01"


def vendor(actor, name="Shree Steels", **extra):
    r = actor.post("/api/erp/vendors", {"name": name, **extra}, idem=False)
    assert r.status_code == 200, r.text
    return r.json()


def bill(actor, vendor_id, project_id, no="INV-1", amount=1_000_000, date=TODAY, **extra):
    body = {"vendor_id": vendor_id, "project_id": project_id, "bill_no": no, "bill_date": date,
            "amount_cents": amount, "photo_keys": [actor.upload("bill")], **extra}
    return actor.post("/api/erp/vendor-bills", body)


def pay(actor, vendor_id, amount, date=TODAY, **extra):
    return actor.post("/api/erp/vendor-payments", {"vendor_id": vendor_id, "amount_cents": amount, "paid_on": date, **extra})


def approved_bill(owner, pm, acc, vendor_id, project_id, **kw):
    r = bill(acc, vendor_id, project_id, **kw)
    assert r.status_code == 200, r.text
    assert decide(pm, r.json()["id"]).status_code == 200
    return r.json()


def approved_payment(pm, acc, vendor_id, amount, **kw):
    r = pay(acc, vendor_id, amount, **kw)
    assert r.status_code == 200, r.text
    assert decide(pm, r.json()["id"]).status_code == 200
    return r.json()


@pytest.fixture
def org(client):
    owner = signup(client)
    pm, acc = add_member(owner, "PM"), add_member(owner, "ACCOUNTANT")
    return owner, pm, acc, owner.project("FIN-1"), vendor(owner)


# ── vendor master ────────────────────────────────────────────────────────────

def test_vendor_gstin_and_duplicate_name_validation(client):
    owner = signup(client)
    assert owner.post("/api/erp/vendors", {"name": "Bad GST Co", "gstin": "NOTAGSTIN"}, idem=False).status_code == 422
    ok = owner.post("/api/erp/vendors", {"name": "Good GST Co", "gstin": "21abcde1234f1z5"}, idem=False)
    assert ok.status_code == 200 and ok.json()["gstin"] == "21ABCDE1234F1Z5"
    assert owner.post("/api/erp/vendors", {"name": "  good   gst co "}, idem=False).status_code == 400   # same vendor, different spacing/case
    other = signup(client, "Org B")
    assert other.post("/api/erp/vendors", {"name": "Good GST Co"}, idem=False).status_code == 200          # but fine in another org


def test_vendor_can_be_edited_and_deactivated(client):
    owner = signup(client)
    v = vendor(owner, "Old Name")
    assert owner.patch(f"/api/erp/vendors/{v['id']}", {"name": "New Name", "phone": "9876543210"}).json()["name"] == "New Name"
    assert owner.patch(f"/api/erp/vendors/{v['id']}", {"is_active": False}).status_code == 200
    assert owner.get("/api/erp/vendors").json() == []
    assert len(owner.get("/api/erp/vendors", params={"include_inactive": True}).json()) == 1
    vendor(owner, "Second")
    assert owner.patch(f"/api/erp/vendors/{v['id']}", {"name": "second"}).status_code == 400            # rename into a duplicate


# ── bills ────────────────────────────────────────────────────────────────────

def test_bill_creation_submits_for_approval_with_context(org):
    owner, pm, acc, p, v = org
    r = bill(acc, v["id"], p["id"], "INV-77", 2_500_000, due_date="2026-05-01")
    assert r.status_code == 200 and r.json()["approval_status"] == "PENDING"
    ap = next(a for a in pm.get("/api/erp/approvals/pending").json() if a["target_id"] == r.json()["id"])
    assert ap["required_role"] == "PM" and ap["amount_cents"] == 2_500_000
    assert ap["target"]["project_code"] == "FIN-1" and "INV-77" in ap["target"]["title"] and ap["target"]["bill_photo_key"]


def test_duplicate_bill_number_refused_per_vendor(org):
    owner, pm, acc, p, v = org
    assert bill(acc, v["id"], p["id"], "INV-1").status_code == 200
    dup = bill(acc, v["id"], p["id"], " inv-1 ")
    assert dup.status_code == 400 and "already entered" in dup.json()["detail"]
    other = vendor(owner, "Other Vendor")
    assert bill(acc, other["id"], p["id"], "INV-1").status_code == 200


def test_rejected_bill_can_be_corrected_and_reentered(org):
    owner, pm, acc, p, v = org
    b = bill(acc, v["id"], p["id"], "INV-1", 1_000_000).json()
    decide(pm, b["id"], "REJECT", rejection_reason="Wrong amount")
    assert bill(acc, v["id"], p["id"], "INV-1", 900_000).status_code == 200


@pytest.mark.parametrize("extra,code", [
    ({"gst_cents": 2_000_000}, 422), ({"due_date": "2026-03-01"}, 422), ({"amount": 0}, 422),
    ({"date": "2999-01-01"}, 422), ({"photo_keys": []}, 422), ({"photo_keys": ["nope/nope/nope"]}, 400),
])
def test_bill_validation(org, extra, code):
    owner, pm, acc, p, v = org
    kw = {k: val for k, val in extra.items() if k in ("amount", "date")}
    body = {"vendor_id": v["id"], "project_id": p["id"], "bill_no": "V-1", "bill_date": kw.get("date", TODAY),
            "amount_cents": kw.get("amount", 1_000_000), "photo_keys": [acc.upload()]}
    body.update({k: val for k, val in extra.items() if k not in ("amount", "date")})
    assert acc.post("/api/erp/vendor-bills", body).status_code == code


def test_bill_references_and_permissions(org):
    owner, pm, acc, p, v = org
    eng = add_member(owner, "ENGINEER")
    assert bill(eng, v["id"], p["id"]).status_code == 403
    assert bill(acc, "ghost", p["id"]).status_code == 404
    assert bill(acc, v["id"], "ghost").status_code == 404
    owner.patch(f"/api/erp/projects/{p['id']}", {"status": "ARCHIVED"})
    assert bill(acc, v["id"], p["id"]).status_code == 400


def test_big_bill_needs_owner_and_pin(org):
    owner, pm, acc, p, v = org
    b = bill(acc, v["id"], p["id"], "BIG-1", 6_000_000).json()                 # ₹60,000
    ap = next(a for a in owner.get("/api/erp/approvals/pending").json() if a["target_id"] == b["id"])
    assert ap["required_role"] == "OWNER"
    assert decide(pm, b["id"]).status_code == 403                               # PM can't
    assert decide(owner, b["id"]).status_code == 400                            # PIN required
    owner.post("/api/erp/users/pin", {"pin": "2468"}, idem=False)
    assert decide(owner, b["id"], pin="2468").status_code == 200


def test_bill_creation_is_idempotent(org):
    owner, pm, acc, p, v = org
    body = {"vendor_id": v["id"], "project_id": p["id"], "bill_no": "IDEM-1", "bill_date": TODAY,
            "amount_cents": 100000, "photo_keys": [acc.upload()]}
    k = new_key()
    a, b = acc.post("/api/erp/vendor-bills", body, key=k), acc.post("/api/erp/vendor-bills", body, key=k)
    assert a.json()["id"] == b.json()["id"] and len(owner.get("/api/erp/vendor-bills").json()) == 1


# ── outstanding ──────────────────────────────────────────────────────────────

def test_outstanding_counts_only_approved_records(org):
    owner, pm, acc, p, v = org
    approved_bill(owner, pm, acc, v["id"], p["id"], no="A", amount=1_000_000)
    bill(acc, v["id"], p["id"], "B-pending", 500_000)                          # pending: excluded
    approved_payment(pm, acc, v["id"], 300_000)
    pay(acc, v["id"], 100_000)                                                  # pending: excluded
    bal = owner.get("/api/erp/vendors/balances").json()
    row = bal["vendors"][0]
    assert (row["billed_cents"], row["paid_cents"], row["outstanding_cents"]) == (1_000_000, 300_000, 700_000)
    assert (row["pending_bills_cents"], row["pending_payments_cents"]) == (500_000, 100_000)
    assert bal["total_outstanding_cents"] == 700_000 and "not an accounting ledger" in bal["note"]


def test_overpayment_shows_as_advance_not_negative_debt(org):
    owner, pm, acc, p, v = org
    approved_bill(owner, pm, acc, v["id"], p["id"], amount=1_000_000)
    approved_payment(pm, acc, v["id"], 1_400_000)
    bal = owner.get("/api/erp/vendors/balances").json()
    assert bal["vendors"][0]["outstanding_cents"] == -400_000
    assert bal["total_outstanding_cents"] == 0 and bal["total_advances_cents"] == 400_000
    assert owner.get(f"/api/erp/vendors/{v['id']}/statement").json()["advance_cents"] == 400_000


def test_statement_fifo_clears_oldest_bill_first_and_flags_overdue(org):
    owner, pm, acc, p, v = org
    approved_bill(owner, pm, acc, v["id"], p["id"], no="OLD", amount=1_000_000, date="2026-03-01", due_date="2026-03-15")
    approved_bill(owner, pm, acc, v["id"], p["id"], no="NEW", amount=2_000_000, date="2026-04-05", due_date="2026-04-08")
    approved_payment(pm, acc, v["id"], 1_500_000, date="2026-04-06")
    st = owner.get(f"/api/erp/vendors/{v['id']}/statement").json()
    by = {b["bill_no"]: b for b in st["bills"]}
    assert (by["OLD"]["status"], by["OLD"]["outstanding_cents"], by["OLD"]["overdue"]) == ("PAID", 0, False)
    assert (by["NEW"]["status"], by["NEW"]["paid_cents"], by["NEW"]["outstanding_cents"]) == ("PARTIAL", 500_000, 1_500_000)
    assert by["NEW"]["overdue"] is True                                         # due 2026-04-08, still owed
    assert [l["balance_cents"] for l in st["lines"]] == [1_000_000, 3_000_000, 1_500_000]
    assert st["outstanding_cents"] == 1_500_000 and st["billed_cents"] == 3_000_000


def test_vendor_payment_routing_pin_and_maker_checker(org):
    owner, pm, acc, p, v = org
    small = pay(acc, v["id"], 4_000_000).json()                                 # ₹40,000 → PM
    assert decide(acc, small["id"]).status_code == 403                          # maker
    assert decide(pm, small["id"]).status_code == 200
    big = pay(acc, v["id"], 6_000_000).json()                                   # ₹60,000 → Owner + PIN
    assert decide(pm, big["id"]).status_code == 403
    assert decide(owner, big["id"]).status_code == 400
    owner.post("/api/erp/users/pin", {"pin": "1357"}, idem=False)
    assert decide(owner, big["id"], pin="1357").status_code == 200


def test_vendor_payment_validation(org):
    owner, pm, acc, p, v = org
    assert pay(acc, "ghost", 1000).status_code == 404
    assert pay(acc, v["id"], 0).status_code == 422
    assert pay(acc, v["id"], 1000, date="2999-01-01").status_code == 422
    assert pay(acc, v["id"], 1000, proof_photo_key="nope/nope/nope").status_code == 400
    assert pay(acc, v["id"], 1000, project_id="ghost").status_code == 404
    assert pay(add_member(owner, "ENGINEER"), v["id"], 1000).status_code == 403


# ── goods receipt claiming ───────────────────────────────────────────────────

@pytest.fixture
def stocked(org):
    owner, pm, acc, p, v = org
    sk = add_member(owner, "STOREKEEPER")
    cem = material(owner)
    g = approved_grn(owner, pm, sk, p["id"], [line(cem["id"], 10, 36000)], vendor_id=v["id"], vendor_name=None, challan_no="C1")
    return owner, pm, acc, sk, p, v, cem, g


def test_bill_claims_goods_receipt_and_it_cannot_be_billed_twice(stocked):
    owner, pm, acc, sk, p, v, cem, g = stocked
    unbilled = lambda: [x["id"] for x in owner.get("/api/erp/grns", params={"unbilled": True}).json()]
    assert unbilled() == [g["id"]]
    assert bill(acc, v["id"], p["id"], "INV-A", 400_000, grn_ids=[g["id"]]).status_code == 200
    assert unbilled() == []
    again = bill(acc, v["id"], p["id"], "INV-B", 400_000, grn_ids=[g["id"]])
    assert again.status_code == 400 and "already covered" in again.json()["detail"]


def test_rejected_bill_releases_its_goods_receipts(stocked):
    owner, pm, acc, sk, p, v, cem, g = stocked
    b = bill(acc, v["id"], p["id"], "INV-A", 400_000, grn_ids=[g["id"]]).json()
    decide(pm, b["id"], "REJECT", rejection_reason="Rate mismatch")
    assert [x["id"] for x in owner.get("/api/erp/grns", params={"unbilled": True}).json()] == [g["id"]]
    assert bill(acc, v["id"], p["id"], "INV-A2", 360_000, grn_ids=[g["id"]]).status_code == 200


def test_cannot_claim_foreign_unknown_or_unapproved_receipts(stocked):
    owner, pm, acc, sk, p, v, cem, g = stocked
    other = vendor(owner, "Different Vendor")
    assert bill(acc, other["id"], p["id"], "X1", 100_000, grn_ids=[g["id"]]).status_code == 400    # belongs to another vendor
    assert bill(acc, v["id"], p["id"], "X2", 100_000, grn_ids=["ghost"]).status_code == 404
    pending = grn(sk, p["id"], [line(cem["id"], 1, 100)], vendor_id=v["id"], vendor_name=None, challan_no="C2").json()
    assert bill(acc, v["id"], p["id"], "X3", 100_000, grn_ids=[pending["id"]]).status_code == 400   # not approved yet


def test_failed_bill_does_not_leave_receipts_claimed(stocked):
    owner, pm, acc, sk, p, v, cem, g = stocked
    r = acc.post("/api/erp/vendor-bills", {"vendor_id": v["id"], "project_id": p["id"], "bill_no": "Z", "bill_date": TODAY,
                                           "amount_cents": 100_000, "photo_keys": ["nope/nope/nope"], "grn_ids": [g["id"]]})
    assert r.status_code == 400
    assert [x["id"] for x in owner.get("/api/erp/grns", params={"unbilled": True}).json()] == [g["id"]]


# ── tenancy ──────────────────────────────────────────────────────────────────

def test_finance_is_tenant_isolated(org, client):
    owner, pm, acc, p, v = org
    b = bill(acc, v["id"], p["id"]).json()
    other = signup(client, "Org B")
    assert other.get("/api/erp/vendor-bills").json() == [] and other.get(f"/api/erp/vendor-bills/{b['id']}").status_code == 404
    assert other.get(f"/api/erp/vendors/{v['id']}/statement").status_code == 404
    assert other.get("/api/erp/vendors/balances").json()["vendors"] == []
    assert other.post("/api/erp/vendor-payments", {"vendor_id": v["id"], "amount_cents": 1000, "paid_on": TODAY}).status_code == 404


# ── Owner-entered payments need no approval ──────────────────────────────────

def test_owner_vendor_payment_takes_effect_immediately_even_above_50k(org):
    owner, pm, acc, p, v = org
    approved_bill(owner, pm, acc, v["id"], p["id"], no="OWN-1", amount=4_500_000)       # two ₹45,000 bills (PM-approvable)
    approved_bill(owner, pm, acc, v["id"], p["id"], no="OWN-2", amount=4_500_000)       # = ₹90,000 owed
    r = pay(owner, v["id"], 6_000_000)                                                    # ₹60,000, no PIN set at all
    assert r.status_code == 200 and r.json()["approval_status"] == "APPROVED"
    assert owner.get("/api/erp/approvals/pending").json() == []                           # nothing waiting for anyone
    row = owner.get("/api/erp/vendors/balances").json()["vendors"][0]
    assert (row["paid_cents"], row["outstanding_cents"], row["pending_payments_cents"]) == (6_000_000, 3_000_000, 0)
    hist = owner.get("/api/erp/approvals/history").json()
    assert hist[0]["target_type"] == "PAYMENT" and hist[0]["self_approved"] is True       # still auditable
    assert hist[0]["requested_by_id"] == hist[0]["approver_id"] == owner.user_id


def test_other_roles_vendor_payments_still_need_approval(org):
    owner, pm, acc, p, v = org
    for who in (pm, acc):
        r = pay(who, v["id"], 100_000)
        assert r.status_code == 200 and r.json()["approval_status"] == "PENDING"
    assert len(owner.get("/api/erp/approvals/pending").json()) == 2


def test_owner_worker_payment_is_immediate_but_owner_expense_still_needs_approval(client):
    from .test_labour import worker
    from .test_core_existing import make_expense, submit
    owner = signup(client)
    p = owner.project()
    w = worker(owner)
    r = owner.post("/api/erp/worker-payments", {"worker_id": w["id"], "amount_cents": 3_000_000, "paid_on": TODAY})
    assert r.json()["approval_status"] == "APPROVED"                                      # ₹30,000: normally Owner-level
    assert owner.get("/api/erp/workers").json()[0]["paid_cents"] == 3_000_000
    e = make_expense(owner, p["id"], 30_000)
    assert submit(owner, e["id"])["approval_status"] == "PENDING"                         # the rule is payments only
