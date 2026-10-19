"""Project dashboards: the cost model must never double count and must ignore unapproved money."""
import datetime as dt

from .helpers import signup, add_member
from .test_core_existing import make_expense, submit, dpr_body
from .test_labour import worker, sheet, entry, decide
from .test_inventory import material, grn, line, approved_grn
from .test_finance import vendor, bill, approved_bill

TODAY = "2026-04-10"


def ist_today():
    return dt.datetime.now(dt.timezone(dt.timedelta(hours=5, minutes=30))).date().isoformat()


def dash(actor, project_id):
    r = actor.get(f"/api/erp/dashboard/projects/{project_id}")
    assert r.status_code == 200, r.text
    return r.json()


def test_cost_adds_the_four_sources_without_double_counting(client):
    owner = signup(client)
    pm, eng, acc, sk = (add_member(owner, r) for r in ("PM", "ENGINEER", "ACCOUNTANT", "STOREKEEPER"))
    p = owner.project("COST-1", budget_cents=100_000_000)
    v = vendor(owner)
    cem = material(owner)

    e = make_expense(eng, p["id"], 3_000)                                     # ₹3,000 petty cash (auto-approved)
    submit(eng, e["id"])

    w = worker(owner, wage=70000)                                             # ₹700 wages
    s = sheet(eng, p["id"], [entry(w["id"])]).json()
    eng.post(f"/api/erp/attendance/{s['id']}/submit")
    decide(pm, s["id"])

    # ₹3,600 of cement received, then BILLED (claimed) -> counted once, via the bill
    g1 = approved_grn(owner, pm, sk, p["id"], [line(cem["id"], 10, 36000)], vendor_id=v["id"], vendor_name=None, challan_no="C1")
    approved_bill(owner, pm, acc, v["id"], p["id"], no="INV-1", amount=400_000, grn_ids=[g1["id"]])      # ₹4,000 invoice
    # ₹1,800 received but not billed yet -> counted at receipt value
    approved_grn(owner, pm, sk, p["id"], [line(cem["id"], 5, 36000)], vendor_id=v["id"], vendor_name=None, challan_no="C2")

    c = dash(owner, p["id"])["cost"]
    assert c["expenses_cents"] == 300_000
    assert c["labour_cents"] == 70_000
    assert c["bills_cents"] == 400_000
    assert c["unbilled_receipts_cents"] == 180_000                            # g1 NOT included (it's in the bill)
    assert c["total_cost_cents"] == 300_000 + 70_000 + 400_000 + 180_000


def test_unapproved_and_rejected_money_is_not_cost_but_pending_is_reported(client):
    owner = signup(client)
    pm, eng, acc = add_member(owner, "PM"), add_member(owner, "ENGINEER"), add_member(owner, "ACCOUNTANT")
    p = owner.project()
    v = vendor(owner)
    pending_e = make_expense(eng, p["id"], 10_000)
    submit(eng, pending_e["id"])
    rejected_e = make_expense(eng, p["id"], 12_000)
    submit(eng, rejected_e["id"])
    decide(owner, rejected_e["id"], "REJECT", rejection_reason="No bill")
    make_expense(eng, p["id"], 7_000)                                          # draft
    bill(acc, v["id"], p["id"], "P-1", 500_000)                                # pending bill

    c = dash(owner, p["id"])["cost"]
    assert c["total_cost_cents"] == 0
    assert c["pending_breakdown"]["expenses"] == {"cents": 1_000_000, "count": 1}
    assert c["pending_breakdown"]["bills"] == {"cents": 500_000, "count": 1}
    assert c["pending_cents"] == 1_500_000 and c["pending_count"] == 2


def test_budget_utilisation_and_over_budget_flag(client):
    owner = signup(client)
    eng = add_member(owner, "ENGINEER")
    p = owner.project(budget_cents=400_000)                                    # ₹4,000 budget
    e = make_expense(eng, p["id"], 3_000)
    submit(eng, e["id"])
    b = dash(owner, p["id"])["budget"]
    assert (b["utilization_pct"], b["remaining_cents"], b["over_budget"]) == (75.0, 100_000, False)
    e2 = make_expense(eng, p["id"], 2_000)
    submit(eng, e2["id"])
    b = dash(owner, p["id"])["budget"]
    assert b["utilization_pct"] == 125.0 and b["over_budget"] is True and b["remaining_cents"] == -100_000


def test_project_without_budget_has_no_percentage(client):
    owner = signup(client)
    p = owner.project()
    b = dash(owner, p["id"])["budget"]
    assert b["utilization_pct"] is None and b["over_budget"] is False


def test_projects_summary_lists_every_project_with_costs(client):
    owner = signup(client)
    eng = add_member(owner, "ENGINEER")
    busy, quiet = owner.project("BUSY", budget_cents=1_000_000), owner.project("QUIET")
    e = make_expense(eng, busy["id"], 1_000)
    submit(eng, e["id"])
    rows = {r["code"]: r for r in owner.get("/api/erp/dashboard/projects").json()["projects"]}
    assert set(rows) == {"BUSY", "QUIET"}
    assert rows["BUSY"]["total_cost_cents"] == 100_000 and rows["BUSY"]["utilization_pct"] == 10.0
    assert rows["QUIET"]["total_cost_cents"] == 0 and rows["QUIET"]["pending_count"] == 0


def test_dashboard_detail_shows_dprs_workforce_and_stock_alerts(client):
    owner = signup(client)
    pm, eng, sk = add_member(owner, "PM"), add_member(owner, "ENGINEER"), add_member(owner, "STOREKEEPER")
    p = owner.project("DET-1")
    d = eng.post("/api/erp/dpr", dpr_body(p["id"], [eng.upload(), eng.upload()], work_narrative="Footing excavation complete",
                                          labour_counts={"mason": {"skilled": 3, "helper": 5}})).json()
    w = worker(owner, wage=70000)
    s = sheet(eng, p["id"], [entry(w["id"], "PRESENT"), entry(worker(owner, "Half Day", 50000)["id"], "HALF")], day=ist_today()).json()
    cem = material(owner, min_stock_milli=50_000)
    approved_grn(owner, pm, sk, p["id"], [line(cem["id"], 20, 36000)])

    out = dash(owner, p["id"])
    assert out["dpr"]["total"] == 1 and out["dpr"]["recent"][0]["title"].startswith("Footing")
    assert out["dpr"]["recent"][0]["labour_total"] == 8
    assert (out["workforce_today"]["present"], out["workforce_today"]["half"]) == (1, 1)
    assert out["workforce_today"]["sheet_status"] == "DRAFT" and out["workforce_today"]["wages_cents"] == 70000 + 25000
    assert [x["material_name"] for x in out["stock"]["low_stock"]] == ["Cement 43 grade"]
    assert out["stock"]["value_cents"] == 20 * 36000 and "not an accounting ledger" in out["note"]


def test_dashboards_are_tenant_isolated(client):
    a, b = signup(client, "Org A"), signup(client, "Org B")
    pa = a.project()
    assert b.get(f"/api/erp/dashboard/projects/{pa['id']}").status_code == 404
    assert b.get("/api/erp/dashboard/projects").json()["projects"] == []


def test_activity_feed_names_the_actor_and_humanises_the_action(client):
    owner = signup(client)
    eng = add_member(owner, "ENGINEER", "Esha Engineer")
    p = owner.project("ACT-9")
    e = make_expense(eng, p["id"], 1_000)
    submit(eng, e["id"])
    feed = owner.get("/api/erp/dashboard/activity").json()
    labels = {(f["actor_name"], f["label"]) for f in feed}
    assert ("Esha Engineer", "submitted an expense") in labels and ("Olivia Owner", "created project") in labels
    assert feed == sorted(feed, key=lambda f: f["at"], reverse=True)
    assert owner.get("/api/erp/dashboard/activity", params={"limit": 1}).json().__len__() == 1
