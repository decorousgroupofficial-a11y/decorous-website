# Decorous Construction ERP

> ⚠️ **PHASE 0 — Non-ledger scaffolding only.**  
> No financial transactions, no journal entries, no balance logic.  
> `packages/ledger-core/` is **frozen** until the engaged CA signs off the governance design.  
> See `/app/docs/erp/09-cto-review-amendments.md` §1 for the governance design CA must approve.

Standalone Construction ERP on isolated subdomain **`app.decorous.in`**.  
Completely isolated from the marketing site (`/app/frontend` + `/app/backend`) — they never share code, DB, or deploys.

---

## Monorepo layout (Turborepo)

```
/app/erp/
├── apps/
│   ├── api/            NestJS 10 + TypeScript + Prisma (Postgres)
│   ├── web/            Next.js 14 App Router + TypeScript + Tailwind + shadcn
│   └── mobile/         Expo React Native   (scaffolded in Phase 4)
├── packages/
│   ├── types/          Shared TS types / DTOs / enums — imported by api + web + mobile
│   ├── ledger-core/    FROZEN — do not edit until CA sign-off
│   └── config/         Shared eslint, tsconfig, prettier
├── docs/
│   └── adr/            Architecture Decision Records
├── infra/
│   └── docker/         Local Postgres + Redis compose
├── package.json        pnpm workspace root
├── turbo.json
└── tsconfig.base.json
```

---

## Phase 0 scope (what's in this scaffold)

### ✅ Built
- Monorepo plumbing (Turborepo, pnpm workspaces, shared TS config)
- Prisma schema with **multi-tenant + ledger-ready** entities (no ledger tables yet)
- NestJS API skeleton with modules:
  - `auth` — JWT + refresh + RBAC guards
  - `orgs` — multi-tenant root
  - `users` — user + membership management
  - `projects` — full CRUD (reference implementation)
  - `vendors` — master data
  - `materials` — master data
  - `dpr` — daily progress report (CTO Rule 4 priority)
  - `expenses` — capture-only, **no ledger write** (CTO Rule 1)
  - `approvals` — generic maker-checker workflow (CTO Rule 3)
  - `audit-log` — every mutation recorded
- Next.js web shell with auth + protected dashboard layout
- Shared `@decorous/types` package (enums, DTOs) — type-safety across api/web/mobile
- First 4 ADRs documenting binding decisions

### ❌ Deliberately NOT built (locked)
- Journal entries, chart of accounts, trial balance, P&L — **ledger freeze until CA**
- Offline sync, outbox, event bus — **deferred to Phase 7** (Doc 09 §2)
- Mobile app — scaffold in Phase 4 once Phase 1 APIs stabilize
- Notifications, reports, analytics — later phases

---

## Getting started (on a dev machine — not this preview)

> **This repo does NOT run inside the Emergent Kubernetes preview.** Postgres + Node services must run on the developer's machine or on staging (Vercel + Railway). Marketing site (`/app/frontend`, `/app/backend`) continues to run here untouched.

```bash
# one-time
cd /app/erp
corepack enable
pnpm install

# local Postgres + Redis
docker compose -f infra/docker/compose.dev.yml up -d

# generate Prisma client + run migrations
pnpm --filter @decorous/api prisma:migrate

# start everything
pnpm dev
```

Apps:
- API on http://localhost:4000
- Web on http://localhost:3100

---

## Key conventions (read before contributing)

1. **Every entity is multi-tenant.** `org_id` is always the first filter. Enforced by `TenantGuard` in NestJS + Prisma middleware.
2. **Every mutation is audited.** Write goes through `AuditLogInterceptor`.
3. **Approvals before writes.** Expenses, bills, material receipts flow through `approvals` module — no direct commits that skip the workflow.
4. **Types live in `@decorous/types`.** If you add an enum or DTO, put it there so web + mobile get it for free.
5. **No ledger imports in ANY module until further notice.** The `packages/ledger-core/` folder is guarded by `.npmrc` + CI check.
6. **DPR is sacred.** Target: end-to-end entry in ≤ 10 seconds on the field. Benchmark every PR.

---

## Ledger readiness (why non-ledger modules still matter)

Every entity we build now has these fields so that Phase 2 ledger integration is a **mapping**, not a rewrite:

| Field | Purpose |
|---|---|
| `source_type` | `"expense" \| "material_receipt" \| "vendor_bill" \| "payment"` |
| `source_ref` | The primary key of the source row |
| `approval_status` | `"draft" \| "pending" \| "approved" \| "rejected" \| "void"` |
| `approved_by` | User id who approved (null until approved) |
| `approved_at` | Timestamp of approval |
| `org_id` | Multi-tenant scope |
| `created_by` | Who captured the record |
| `amount_cents` | Integer paise (never float) |
| `currency` | ISO-4217, default INR |
| `ledger_posted` | Boolean, default false (Phase 2 flips to true) |
| `ledger_entry_id` | FK to future `journal_entry` (nullable) |

When the CA signs off and Phase 2 begins, posting to the ledger becomes a single service call per entity type. Today's expenses, receipts, and bills become tomorrow's journal entries without a schema migration.

---

## Ownership & status

- **Owner:** Decorous
- **Status:** Phase 0 scaffolding — pre-implementation
- **Next gate:** CA engaged → COA workshop → Phase 2 ledger work begins
- **Documentation:** `/app/docs/erp/01`..`09*.md`
