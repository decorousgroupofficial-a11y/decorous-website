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
- ERP backend (FastAPI on Mongo) — ✅ auth, orgs, projects, vendors, materials, DPR, expenses, approvals, PIN, inline uploads
- ERP frontend shell — ✅ dark sidebar, Overview with KPIs & quick tiles
- **Projects page** — ✅ professional: mini-stats, search, filter pills, table with hover & status pills
- **DPR list page** — ✅ professional: mini-stats, search, filter pills, cards with real photo thumbnails
- **DPR new (3-step, mobile)** — ✅ base64 photo upload + client-side resize, orange brand, weather icons
- Test credentials — see `/app/memory/test_credentials.md`

## In progress / Next (P0)
- Professionalize remaining ERP pages: **Vendors, Materials, Expenses, Approvals, Settings**
- Frontend testing agent pass on Projects + DPR flow

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
