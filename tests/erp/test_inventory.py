"""Inventory: GRN maker-checker, stock maths, issue/return limits, challan duplicate guard."""
import pytest

from .helpers import signup, add_member, new_key
from .test_labour import decide

TODAY = "2026-04-10"


def material(actor, sku="CEM-43", name="Cement 43 grade", uom="bag", **extra):
    r = actor.post("/api/erp/materials", {"sku": sku, "name": name, "category": "CEMENT", "uom": uom, **extra}, idem=False)
    assert r.status_code == 200, r.text
    return r.json()


def grn(actor, project_id, lines, vendor_name="Shree Cements", **extra):
    body = {"project_id": project_id, "vendor_name": vendor_name, "received_on": TODAY,
            "lines": lines, "photo_keys": [actor.upload("grn")], **extra}
    return actor.post("/api/erp/grns", body)


def line(material_id, qty, rate):
    return {"material_id": material_id, "qty": qty, "rate_cents": rate}


def approved_grn(owner, pm, eng, project_id, lines, **extra):
    r = grn(eng, project_id, lines, **extra)
    assert r.status_code == 200, r.text
    g = r.json()
    assert decide(pm, g["id"]).status_code == 200
    return g


def stock(actor, project_id=None):
    return actor.get("/api/erp/stock", params={"project_id": project_id} if project_id else None).json()


# ── amounts ──────────────────────────────────────────────────────────────────

def test_line_amount_rounds_half_up_in_integers():
    from erp_inventory import line_amount_cents, to_milli
    from decimal import Decimal
    assert line_amount_cents(36000, 12500) == 450000          # 12.5 × ₹360
    assert line_amount_cents(1, 500) == 1                     # 0.5 paisa rounds up
    assert line_amount_cents(1, 499) == 0
    assert to_milli(Decimal("3.250")) == 3250 and to_milli(Decimal("0.001")) == 1


def test_grn_totals_and_milli_storage(client):
    owner = signup(client)
    eng = add_member(owner, "STOREKEEPER")
    p = owner.project()
    cem, ste = material(owner), material(owner, "STL-12", "TMT 12mm", "kg")
    g = grn(eng, p["id"], [line(cem["id"], 100, 36000), line(ste["id"], "250.5", 6200)]).json()
    assert [l["qty_milli"] for l in g["lines"]] == [100000, 250500]
    assert [l["amount_cents"] for l in g["lines"]] == [3_600_000, 1_553_100]
    assert g["total_cents"] == 5_153_100 and g["approval_status"] == "PENDING"


# ── approval gates stock ─────────────────────────────────────────────────────

def test_only_approved_receipts_count_as_stock(client):
    owner = signup(client)
    pm, sk = add_member(owner, "PM"), add_member(owner, "STOREKEEPER")
    p = owner.project()
    cem = material(owner)
    g = grn(sk, p["id"], [line(cem["id"], 50, 36000)]).json()
    row = stock(owner, p["id"])[0]
    assert row["balance_milli"] == 0 and row["incoming_milli"] == 50000          # pending ≠ on hand
    assert decide(pm, g["id"]).status_code == 200
    row = stock(owner, p["id"])[0]
    assert row["balance_milli"] == 50000 and row["incoming_milli"] == 0 and row["received_milli"] == 50000


def test_rejected_receipt_never_becomes_stock(client):
    owner = signup(client)
    pm, sk = add_member(owner, "PM"), add_member(owner, "STOREKEEPER")
    p = owner.project()
    cem = material(owner)
    g = grn(sk, p["id"], [line(cem["id"], 50, 36000)]).json()
    assert decide(pm, g["id"], "REJECT", rejection_reason="Short delivery").status_code == 200
    assert stock(owner, p["id"]) == []
    assert owner.get(f"/api/erp/grns/{g['id']}").json()["approval_status"] == "REJECTED"


def test_storekeeper_cannot_approve_own_receipt_and_approver_sees_context(client):
    owner = signup(client)
    pm, sk = add_member(owner, "PM"), add_member(owner, "STOREKEEPER")
    p = owner.project("GRN-1")
    cem = material(owner)
    g = grn(sk, p["id"], [line(cem["id"], 10, 36000)], challan_no="CH-77").json()
    ap = next(a for a in pm.get("/api/erp/approvals/pending").json() if a["target_id"] == g["id"])
    assert ap["target"]["project_code"] == "GRN-1" and "Cement 43 grade" in ap["target"]["title"]
    assert ap["target"]["challan_no"] == "CH-77" and ap["target"]["bill_photo_key"]
    assert decide(sk, g["id"]).status_code == 403


# ── issue / return ───────────────────────────────────────────────────────────

def test_issue_reduces_stock_and_cannot_overdraw(client):
    owner = signup(client)
    pm, sk = add_member(owner, "PM"), add_member(owner, "STOREKEEPER")
    p = owner.project()
    cem = material(owner)
    approved_grn(owner, pm, sk, p["id"], [line(cem["id"], 100, 36000)])
    ok = sk.post("/api/erp/stock/issues", {"project_id": p["id"], "material_id": cem["id"], "qty": 30,
                                           "issued_on": TODAY, "purpose": "Slab"})
    assert ok.status_code == 200
    row = stock(owner, p["id"])[0]
    assert row["balance_milli"] == 70000 and row["issued_milli"] == 30000
    over = sk.post("/api/erp/stock/issues", {"project_id": p["id"], "material_id": cem["id"], "qty": 70.001, "issued_on": TODAY})
    assert over.status_code == 400 and "in stock" in over.json()["detail"]
    exact = sk.post("/api/erp/stock/issues", {"project_id": p["id"], "material_id": cem["id"], "qty": 70, "issued_on": TODAY})
    assert exact.status_code == 200
    assert stock(owner, p["id"]) == []                                           # fully used → hidden by default...
    everything = owner.get("/api/erp/stock", params={"project_id": p["id"], "include_zero": True}).json()
    assert everything[0]["balance_milli"] == 0                                   # ...but still there on request


def test_out_of_stock_item_with_reorder_level_stays_visible_and_flagged(client):
    owner = signup(client)
    pm, sk = add_member(owner, "PM"), add_member(owner, "STOREKEEPER")
    p = owner.project()
    cem = material(owner, min_stock_milli=10000)
    approved_grn(owner, pm, sk, p["id"], [line(cem["id"], 20, 36000)])
    sk.post("/api/erp/stock/issues", {"project_id": p["id"], "material_id": cem["id"], "qty": 20, "issued_on": TODAY})
    row = stock(owner, p["id"])[0]
    assert row["balance_milli"] == 0 and row["low_stock"] is True


def test_cannot_issue_stock_that_is_only_pending_or_at_another_site(client):
    owner = signup(client)
    pm, sk = add_member(owner, "PM"), add_member(owner, "STOREKEEPER")
    p1, p2 = owner.project(), owner.project()
    cem = material(owner)
    grn(sk, p1["id"], [line(cem["id"], 100, 36000)])                       # still PENDING
    body = {"project_id": p1["id"], "material_id": cem["id"], "qty": 1, "issued_on": TODAY}
    assert sk.post("/api/erp/stock/issues", body).status_code == 400
    approved_grn(owner, pm, sk, p1["id"], [line(cem["id"], 100, 36000)], challan_no="OTHER")
    assert sk.post("/api/erp/stock/issues", {**body, "project_id": p2["id"]}).status_code == 400   # stock is per-site


def test_return_is_capped_at_net_issued(client):
    owner = signup(client)
    pm, sk = add_member(owner, "PM"), add_member(owner, "STOREKEEPER")
    p = owner.project()
    cem = material(owner)
    approved_grn(owner, pm, sk, p["id"], [line(cem["id"], 100, 36000)])
    base = {"project_id": p["id"], "material_id": cem["id"], "issued_on": TODAY}
    sk.post("/api/erp/stock/issues", {**base, "qty": 40})
    assert sk.post("/api/erp/stock/issues", {**base, "qty": 41, "kind": "RETURN"}).status_code == 400
    assert sk.post("/api/erp/stock/issues", {**base, "qty": 15, "kind": "RETURN"}).status_code == 200
    row = stock(owner, p["id"])[0]
    assert (row["issued_milli"], row["returned_milli"], row["balance_milli"]) == (40000, 15000, 75000)


def test_quantity_validation(client):
    owner = signup(client)
    p = owner.project()
    cem = material(owner)
    base = {"project_id": p["id"], "material_id": cem["id"], "issued_on": TODAY}
    for bad in (0, -1, 1.2345):
        assert owner.post("/api/erp/stock/issues", {**base, "qty": bad}).status_code == 422
    assert grn(owner, p["id"], [line(cem["id"], 0, 100)]).status_code == 422


# ── valuation & alerts ───────────────────────────────────────────────────────

def test_weighted_average_value_and_low_stock_flag(client):
    owner = signup(client)
    pm, sk = add_member(owner, "PM"), add_member(owner, "STOREKEEPER")
    p = owner.project()
    cem = material(owner, min_stock_milli=30000)
    approved_grn(owner, pm, sk, p["id"], [line(cem["id"], 100, 30000)], challan_no="A")     # 100 @ ₹300
    approved_grn(owner, pm, sk, p["id"], [line(cem["id"], 100, 40000)], challan_no="B")     # 100 @ ₹400
    row = stock(owner, p["id"])[0]
    assert row["avg_rate_cents"] == 35000 and row["value_cents"] == 200 * 35000 and not row["low_stock"]
    sk.post("/api/erp/stock/issues", {"project_id": p["id"], "material_id": cem["id"], "qty": 175, "issued_on": TODAY})
    row = stock(owner, p["id"])[0]
    assert row["balance_milli"] == 25000 and row["low_stock"] is True
    assert row["value_cents"] == 25 * 35000


# ── guards ───────────────────────────────────────────────────────────────────

def test_same_challan_from_same_vendor_is_refused(client):
    owner = signup(client)
    sk = add_member(owner, "STOREKEEPER")
    p = owner.project()
    cem = material(owner)
    assert grn(sk, p["id"], [line(cem["id"], 10, 100)], challan_no="CH-1").status_code == 200
    dup = grn(sk, p["id"], [line(cem["id"], 10, 100)], challan_no="ch-1")
    assert dup.status_code == 400 and "already recorded" in dup.json()["detail"]
    assert grn(sk, p["id"], [line(cem["id"], 10, 100)], challan_no="CH-1", vendor_name="Other Supplier").status_code == 200


def test_rejected_challan_can_be_re_recorded(client):
    owner = signup(client)
    pm, sk = add_member(owner, "PM"), add_member(owner, "STOREKEEPER")
    p = owner.project()
    cem = material(owner)
    g = grn(sk, p["id"], [line(cem["id"], 10, 100)], challan_no="CH-9").json()
    decide(pm, g["id"], "REJECT", rejection_reason="Wrong quantity")
    assert grn(sk, p["id"], [line(cem["id"], 12, 100)], challan_no="CH-9").status_code == 200


def test_grn_validation_and_permissions(client):
    owner = signup(client)
    viewer, sk = add_member(owner, "VIEWER"), add_member(owner, "STOREKEEPER")
    p = owner.project()
    cem = material(owner)
    L = [line(cem["id"], 5, 100)]
    assert grn(viewer, p["id"], L).status_code == 403
    assert grn(sk, p["id"], [line(cem["id"], 5, 100), line(cem["id"], 1, 100)]).status_code == 422   # duplicate material
    assert grn(sk, p["id"], [line("ghost", 5, 100)]).status_code == 404
    assert grn(sk, "ghost", L).status_code == 404
    assert sk.post("/api/erp/grns", {"project_id": p["id"], "received_on": TODAY, "lines": L, "vendor_name": "X Co",
                                     "photo_keys": ["nope/nope/nope"]}).status_code == 400            # photo must exist
    assert sk.post("/api/erp/grns", {"project_id": p["id"], "received_on": TODAY, "lines": L,
                                     "photo_keys": [sk.upload()]}).status_code == 422                 # no vendor at all
    assert grn(sk, p["id"], L, vendor_id="ghost").status_code == 404


def test_grn_is_idempotent(client):
    owner = signup(client)
    sk = add_member(owner, "STOREKEEPER")
    p = owner.project()
    cem = material(owner)
    body = {"project_id": p["id"], "vendor_name": "Shree", "received_on": TODAY, "lines": [line(cem["id"], 5, 100)],
            "photo_keys": [sk.upload()]}
    k = new_key()
    a, b = sk.post("/api/erp/grns", body, key=k), sk.post("/api/erp/grns", body, key=k)
    assert a.json()["id"] == b.json()["id"] and len(owner.get("/api/erp/grns").json()) == 1


def test_inventory_is_tenant_isolated(client):
    a, b = signup(client, "Org A"), signup(client, "Org B")
    sk = add_member(a, "STOREKEEPER")
    pa = a.project()
    cem = material(a)
    g = grn(sk, pa["id"], [line(cem["id"], 5, 100)]).json()
    assert b.get("/api/erp/grns").json() == [] and b.get(f"/api/erp/grns/{g['id']}").status_code == 404
    assert stock(b) == []
    pb = b.project()
    assert b.post("/api/erp/stock/issues", {"project_id": pb["id"], "material_id": cem["id"], "qty": 1, "issued_on": TODAY}).status_code == 404


def test_archived_project_rejects_receipts_and_issues(client):
    owner = signup(client)
    p = owner.project()
    cem = material(owner)
    owner.patch(f"/api/erp/projects/{p['id']}", {"status": "ARCHIVED"})
    assert grn(owner, p["id"], [line(cem["id"], 5, 100)]).status_code == 400
    assert owner.post("/api/erp/stock/issues", {"project_id": p["id"], "material_id": cem["id"], "qty": 1, "issued_on": TODAY}).status_code == 400
