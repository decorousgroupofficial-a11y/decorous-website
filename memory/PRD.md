# Decorous — Product Requirements (PRD)

## Original problem statement
Build a **Construction ERP** for Decorous (India), modelled on Rdash / Powerplay / Onsite,
hosted natively inside the Emergent React + FastAPI + MongoDB app so it deploys in one click.

Mandated pivot (user message):
> "forget GitHub and supabase. do it on emergent. no need of next.js"

The Next.js/NestJS codebase under `/app/erp/` is **parked** and used only as reference.
Active ERP lives at:
- Backend: `/app/backend/erp_routes.py` (mounted under `/api/erp/*`)
- Frontend: `/app/frontend/src/pages/erp/*`

## Users
- **Owner** — founder / head builder
- **PM** — project manager; approves DPR, mid-value expenses
- **Engineer / Site supervisor** — submits DPRs
- **Accountant** — captures bills, vendor master
- **Storekeeper** — materials inward / GRN
- **Viewer** — read-only stakeholders

## Core requirements
1. Multi-tenant (org_id on every document)
2. Money in integer paise. UTC timestamps everywhere.
3. Soft-delete + idempotency on every write.
4. Maker-checker approvals with SLA escalation (24h PM → 48h Owner).
5. PIN gate for any approval ≥ ₹50,000.
6. DPR — 3-step mobile-first entry, min 2 photos, activity tags, labour counts.
7. Photos stored inline (base64 in Mongo `erp_uploads`) until S3 is wired.
8. Ledger FROZEN — capture only; CA sign-off gates Phase 2.
9. UI must match Rdash/Powerplay/Onsite aesthetics — dark branded sidebar,
   orange accents, high-contrast KPIs, clean tables.

## Implemented (as of Apr 2026)
- Marketing site (React/FastAPI/Mongo) — ✅ live
- **SEO Phase 1** (Apr 2026):
  - Comprehensive JSON-LD in index.html: LocalBusiness/GeneralContractor (full NAP), WebSite, ItemList of 4 Services, FAQPage with 5 questions
  - Static crawler-visible body content (h1, NAP, services, FAQs, social links) — fixes Bing/AI engines/social unfurls
  - `robots.txt` with explicit allow for GPTBot, PerplexityBot, ClaudeBot, Bingbot
  - Self-hosted `/og-image.jpg` (1200×630)
  - Canonical, robots, geo, ICBM meta tags
- **SEO Phase 2** (Apr 2026):
  - `react-helmet-async` integrated via `<Seo>` component (`/app/frontend/src/components/Seo.jsx`)
  - Per-route unique title + description + canonical + OG + Twitter on all 11 public pages
  - Per-page JSON-LD on dynamic pages (Service, City, BlogPost) — Service schema, FAQPage from DB, Article schema
  - Real NAP on /contact: Plot N3/370 Nayapalli, +91 7008863329, Mon-Sat 10AM-6PM, Plus Code map link
  - Hardcoded `https://decorous.in` removed from `server.py` sitemap (now reads `APP_URL` env)
  - `.gitignore` no longer blocks `.env` (was blocking Emergent deploy)
- ERP backend (FastAPI on Mongo) — ✅ auth, orgs, projects, vendors, materials, DPR, expenses, approvals, PIN, inline uploads
- ERP frontend shell — ✅ dark sidebar, Overview with KPIs & quick tiles
- **Projects page** — ✅ professional: mini-stats, search, filter pills, table with hover & status pills
- **DPR list page** — ✅ professional: mini-stats, search, filter pills, cards with real photo thumbnails
- **DPR new (3-step, mobile)** — ✅ base64 photo upload + client-side resize, orange brand, weather icons
- Test credentials — see `/app/memory/test_credentials.md`

## ERP v2 — Onsite / RDash-style operations (Oct 2026)  ✅ implemented & tested
Backend modules (all under `/api/erp/*`, wired through `backend/erp_api.py`):
- `erp_routes.py` (core) — auth, members, projects, vendors, materials, DPR, expenses, approvals engine.
- `erp_labour.py` — workers, daily **attendance muster** (wages in integer paise, wage snapshot per day,
  no double-booking across sites), wage/advance payments, per-worker earned-vs-paid statement.
- `erp_inventory.py` — **goods receipt (GRN)** with maker-checker, stock issue/return (cannot overdraw),
  stock on hand per site (qty in integer milli-units, weighted-average value, reorder alerts).
- `erp_finance.py` — **vendor bills** (duplicate-bill refusal, can claim goods receipts), vendor payments,
  outstanding per vendor + statement (payments clear oldest bill first; overdue flag).
- `erp_dashboard.py` — **project dashboard**: budget vs cost, cost breakdown, activity feed.
Frontend: responsive shell (sidebar ≥1024px, bottom tabs + slide-over menu on phones), rebuilt Overview,
Projects (budget bars), Project detail, Attendance, Workers & Wages, Stock & Materials, Vendors & Bills,
Expenses, Approvals (full decision context + history), Settings (role / deactivate members).

Approval engine now has a **target registry** (`register_target`): any module plugs into maker-checker,
supplies how to summarise a record for the approver, and may react when it is decided.
Routing: EXPENSE & WORKER_PAYMENT ≤₹5k auto / ≤₹25k PM / Owner · MATERIAL_RECEIPT, DPR, ATTENDANCE → PM ·
VENDOR_BILL & PAYMENT ≤₹50k PM / Owner · any approval ≥₹50k needs the approver's PIN (5 wrong → 15-min lock).
**Owner-entered payments (vendor payments and worker wage/advance payments) need no approval** and take effect
immediately (`OWNER_DIRECT_TYPES` in `erp_routes.py`); they are still logged in Approvals → History as self-approved.
Owner-entered expenses, bills, receipts and attendance still go through maker-checker.

**Project cost model** (no double counting): approved expenses + approved wages + approved vendor bills +
approved goods receipts *not yet claimed by a bill*. Payments are cash movements, not cost.

**Governance note (ADR-003):** all balances/costs are *derived at read time from approved capture records*
and labelled "operational — not an accounting ledger". No journals, accounts, periods, ageing buckets or P&L
were added; every capture row keeps `source_type` / `ledger_posted=false` for the CA phase.

Defects fixed in this pass (each has a regression test in `tests/erp/test_core_bugs.py`):
projects could never become ACTIVE (KPI always 0) · no DB indexes existed (duplicate project codes/SKUs
accepted) · expense bill photos went to a stub that discarded them · approvers saw only an amount ·
6th failed login returned HTTP 500 (naive/aware datetime) · "today"/"month" used UTC not IST ·
month spend counted rejected expenses · idempotency keys were not atomic and were regenerated per call ·
role changes / deactivation only took effect after the 24h token expired · transparent dialogs/buttons
(CSS variable clash in `index.css`) · UTC date stamped on DPRs filed after midnight IST.

## Running the ERP tests
    pip install -r backend/requirements-dev.txt
    pytest tests/erp -q          # ~5s, in-memory Mongo, never touches a real database

## Next (P0)
- Run against a real MongoDB once (index creation, aggregation pipelines) — the suite uses an in-memory mock.
- Tasks / snag list, documents & drawings, subcontractor work orders & RA bills, BOQ, reports export (PDF/CSV).

## Backlog (P1)
- Expense capture — bill proof inline upload + PIN gate UI for ≥ ₹50k
- Approvals inbox — SLA countdown, maker-checker UI, PIN entry modal
- Settings — org details + user invite + PIN setup flow
- S3 migration for uploads (replace inline-base64 store)
- Background cron for SLA escalation (currently opportunistic on reads)
- Dynamic image management for marketing site admin

## Backlog (P2, blocked)
- Financial Ledger — requires construction-experienced CA sign-off
- Project P&L, vendor ageing, period lock

## Key API endpoints (ERP)
- `POST /api/erp/auth/signup` · `POST /api/erp/auth/login` · `GET /api/erp/me`
- `GET|POST /api/erp/projects`
- `GET|POST /api/erp/vendors` · `GET|POST /api/erp/materials`
- `GET|POST /api/erp/dpr` · `POST /api/erp/dpr/{id}/submit`
- `GET|POST /api/erp/expenses` · `POST /api/erp/expenses/{id}/submit`
- `GET /api/erp/approvals/pending` · `POST /api/erp/approvals/{id}/decide`
- `POST /api/erp/uploads/inline` · `GET /api/erp/uploads/{key}`
- `GET /api/erp/overview`

## Architecture snapshot
```
/app/
├── backend/
│   ├── server.py
│   └── erp_routes.py            # multi-tenant ERP, soft-delete, idempotency,
│                                  maker-checker, inline uploads (base64 → Mongo)
├── frontend/src/
│   ├── lib/erp-api.js           # axios client + fileToCompressedBase64
│   └── pages/erp/
│       ├── ErpLayout.jsx        # dark sidebar shell
│       ├── _shared.jsx          # ErpPageHeader, ErpEmptyState, ErpMiniStat,
│                                  ErpStatusPill, ErpPhoto (async inline loader)
│       ├── ErpOverviewPage.jsx  # KPIs + quick tiles
│       ├── ErpProjectsPage.jsx  # PROFESSIONAL v2
│       ├── ErpDprListPage.jsx   # PROFESSIONAL v2
│       ├── ErpDprNewPage.jsx    # PROFESSIONAL v2 + inline photo upload
│       ├── ErpExpensesPage.jsx  # (next to polish)
│       ├── ErpApprovalsPage.jsx # (next to polish)
│       ├── ErpVendorsPage.jsx   # (next to polish)
│       ├── ErpMaterialsPage.jsx # (next to polish)
│       └── ErpSettingsPage.jsx  # (next to polish)
└── erp/                         # PARKED Next.js/NestJS reference
```
