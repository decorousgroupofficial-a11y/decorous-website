# Decorous Construction ERP — Technology Justification & Risk Analysis

## Purpose of This Document

Before writing a single line of code, we must answer two uncomfortable questions:

1. **Is this stack the right choice, or are we following fashion?**
2. **What will break, and what's our plan when it does?**

This doc is deliberately skeptical. It challenges our own decisions so we ship something that survives.

---

# PART A — TECHNOLOGY JUSTIFICATION

## A1. Stack Summary

```
┌────────────────────────────────────────────────────────────────┐
│                   THE CHOSEN STACK                             │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Frontend (Web)     : Next.js 14 (App Router) + TypeScript    │
│  Frontend (Mobile)  : React Native (Expo SDK 51+)             │
│  Backend            : NestJS 10 + TypeScript                  │
│  Primary DB         : PostgreSQL 16                           │
│  Cache / Queue      : Redis 7 (BullMQ)                        │
│  Object Storage     : AWS S3 (Mumbai region)                  │
│  File Uploads       : tus.io resumable protocol               │
│  ORM                : Prisma                                  │
│  UI Components      : shadcn/ui (Radix + Tailwind)            │
│  Mobile State       : WatermelonDB (SQLite) + Zustand         │
│  Monorepo           : Turborepo                               │
│  Auth               : JWT + refresh + device tokens           │
│  Observability      : Sentry + BetterStack + Grafana          │
│  CI/CD              : GitHub Actions → Vercel + Railway       │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## A2. Why NestJS (and not FastAPI / Django / Express)

### What we need from the backend

- **Structural discipline** — financial code cannot be "quick & clever"
- **Type safety end-to-end** — shared types between frontend + backend
- **Testability** — ledger code must be unit-testable in isolation
- **Scalable modularity** — we'll add approval, reports, notifications over time
- **Team hiring** — we need engineers we can onboard quickly

### Evaluation matrix

| Criterion | NestJS | FastAPI | Django | Express | Rails |
|---|---|---|---|---|---|
| Type safety e2e | ✅ TS | ⚠ Python + pydantic | ⚠ Python | ❌ | ❌ |
| Modular architecture (DI, decorators) | ✅✅ | ⚠ manual | ✅ apps | ❌ | ⚠ |
| Share types with Next.js frontend | ✅✅ | ❌ | ❌ | ✅ | ❌ |
| Share types with React Native | ✅✅ | ❌ | ❌ | ✅ | ❌ |
| Testing ergonomics | ✅ | ✅ | ✅ | ⚠ | ✅ |
| India hiring pool (2026) | ⚠ growing | ✅ huge | ✅ huge | ✅ huge | ❌ niche |
| Long-term maintenance | ✅ opinionated | ⚠ depends on team | ✅ | ❌ | ✅ |
| Performance (financial workload) | ✅ | ✅ | ⚠ | ✅ | ⚠ |
| Official LTS backing | ✅ | ⚠ community | ✅ | — | ✅ |

### Why NestJS wins for us

1. **TypeScript everywhere.** The same `JournalEntry` type flows from Postgres → Prisma → NestJS → Next.js → React Native. A schema change triggers compiler errors in all four places. For a financial system, this is **worth more than framework beauty.**
2. **Opinionated structure.** Modules, providers, guards, interceptors, pipes — the framework *forces* clean boundaries. A junior dev cannot scatter business logic across controllers.
3. **Scales with team size.** Unlike Express (freedom kills consistency) or FastAPI (Python dynamic typing rots in large codebases), NestJS *rewards* long-lived teams.
4. **Ecosystem fit.** BullMQ, Prisma, Passport, Swagger, class-validator — all first-class NestJS integrations.

### What we're giving up

- A smaller Indian hiring pool today (NestJS < Django < Express) — mitigated by TS being universal
- Slight learning curve for engineers coming from Express
- Heavier boilerplate than FastAPI for trivial CRUD — acceptable price for discipline

**Decision:** NestJS for the next 3+ years. Not revisiting unless TS itself is replaced.

---

## A3. Why PostgreSQL (not Mongo / MySQL / CockroachDB)

### Non-negotiable requirements

- **ACID transactions** across multiple rows (journal entries span many accounts)
- **Strict relational integrity** (foreign keys, constraints, triggers)
- **Complex reports** (P&L by project × period × vendor — joins everywhere)
- **Partial indexes** (only open bills, only this-FY entries)
- **Materialized views** (account balances, budget rollups)
- **Row-level locking** (period close, re-open)

### Why Mongo fails for us

A double-entry ledger is the textbook example of relational data:
- An entry has N lines
- Each line references an account
- Each account participates in thousands of entries
- Balance = SUM(debits) - SUM(credits), atomically
- Multiple entries must commit or all fail

Mongo's "transactions" exist, but:
- Performance is substantially worse than Postgres for multi-doc writes
- No foreign keys → junior devs will introduce orphaned rows
- Schema drift is inevitable → 3 years later, "some entries have `amount`, some have `value`"
- Financial code is mostly joins and aggregates — Mongo's sweet spot (nested docs) is irrelevant

> **Bottom line:** Mongo was great for the marketing site (content documents). It is the **wrong choice** for the ERP. Mixing paradigms is fine when the boundaries are clear — that's why the ERP uses Postgres.

### Why not MySQL

- Weaker JSON support (we use jsonb for event payloads)
- Weaker partial indexes
- Historically weaker concurrency story (InnoDB is better now, but Postgres has a ~5 year lead on enterprise features)
- PostGIS (for optional GPS geofencing) is best-in-class

### Why not CockroachDB / PlanetScale / etc.

- Not needed at our scale (< 1M transactions/year for first 3 years)
- Adds operational complexity for no benefit
- Cloud managed Postgres (DO, RDS, Supabase, Neon) is more than enough

**Decision:** PostgreSQL 16, managed (DigitalOcean or Supabase initially).

---

## A4. Why Next.js (and not plain React + Vite / Remix)

- **App Router + Server Components** give us free performance (no client JS for static content)
- **Built-in API routes** — we can stub mocks before NestJS is ready
- **Image optimization, font optimization, `next/link` prefetching** — all out of the box
- **Vercel deployment** — zero-config, preview URLs on every PR
- **Strong TypeScript story** — full type safety across route boundaries
- **Biggest React ecosystem share** — easier hiring than Remix

**Trade-off:** Next.js adds complexity (App Router has edges). We accept this — the features save more engineering time than they cost.

---

## A5. Why React Native (Expo) — not Flutter / PWA / Native

| Criterion | React Native (Expo) | Flutter | PWA | Native (2 apps) |
|---|---|---|---|---|
| Code sharing with web | ✅ (types, logic) | ❌ | ✅ | ❌ |
| Offline-first ecosystem | ✅ (WatermelonDB, etc.) | ✅ (Drift) | ⚠ limited | ✅ |
| Team skill overlap | ✅ (JS/TS devs) | ❌ (Dart) | ✅ | ❌ |
| OTA updates | ✅ (EAS Update) | ⚠ manual | ✅ | ❌ |
| Native camera / GPS / file access | ✅ | ✅ | ⚠ flaky | ✅ |
| Build / release tooling | ✅ (EAS) | ✅ | N/A | ⚠ |
| Performance for our workload | ✅ enough | ✅ slightly better | ⚠ | ✅ best |

**Deciding factor:** the field app is **not** animation-heavy or GPU-bound. It's forms, lists, photos, offline queue. RN + Expo wins because **our devs already know it**.

PWA is tempting (lower friction) but rejected because:
- Camera + offline + background uploads are still uneven on Android WebViews
- Installing a PWA on a site supervisor's phone is more confusing than Play Store install

---

## A6. Why PostgreSQL-backed outbox + BullMQ (not Kafka / RabbitMQ / SNS-SQS)

Our event volume for Year 1: **< 100k events/day**, burst tolerant.

| Option | Fit for our scale | Ops cost | Team knowledge |
|---|---|---|---|
| Kafka | ❌ overkill | High | Low |
| RabbitMQ | ⚠ okay | Medium | Medium |
| AWS SNS+SQS | ✅ okay | Low | Medium |
| Postgres outbox + BullMQ | ✅✅ perfect | Low | High |

BullMQ + Redis + transactional outbox = simplest thing that works. Upgrade path to Kafka exists if we ever need it.

---

## A7. Why Prisma (not TypeORM / Drizzle / Knex)

- Schema-first, migrations are excellent
- Type-safe queries — huge win for financial code
- Introspection + migrations are mature
- Works with Postgres advanced features (partial indexes, generated columns)

Drizzle is newer and leaner but Prisma's migration story is more battle-tested for financial schemas.

---

## A8. Design Choices We Are Deliberately NOT Making

- **No GraphQL.** REST with OpenAPI contracts. GraphQL complexity isn't justified for 1 client (NestJS serves web + mobile with the same REST endpoints).
- **No microservices.** One NestJS monolith for MVP. Module boundaries inside. We'll extract services only when they independently scale.
- **No event sourcing.** Outbox pattern only. Event sourcing is a rabbit hole; we can migrate later if ever needed.
- **No Kubernetes.** Railway / DO App Platform is enough for < 5 services. K8s is ops debt we don't need.
- **No custom SSO / OIDC provider.** JWT + refresh + optional Google login. Enterprise SSO lives in Phase 7.
- **No real-time WebSockets.** Long-poll / SSE for notifications. WebSockets lived great for marketing site but over-spec for ERP MVP.

Every "no" above saves us weeks.

---

# PART B — RISK ANALYSIS & MITIGATION

We enumerate risks by **category**, score each 1-5 on **likelihood × impact**, and define mitigations.

## Risk Scoring

- Likelihood: 1 (rare) → 5 (almost certain)
- Impact: 1 (annoying) → 5 (project-killing)
- Score = L × I (red ≥ 15, amber 8-14, green < 8)

---

## B1. Financial & Ledger Risks

### B1.1 Double-entry invariant violated

- **What:** A posted journal entry where `SUM(debits) != SUM(credits)` — even by 1 paise.
- **Impact:** Entire accounting system loses credibility. Trust destroyed.
- **Likelihood:** 3 · **Impact:** 5 · **Score:** 🟥 15

**Mitigation:**
- DB-level check constraint on journal_entry: trigger enforces sum(lines.debit) = sum(lines.credit) on commit
- Application-level validation in NestJS service (fail early)
- Unit test: property-based testing (fast-check) — generate random entries, assert invariant holds
- CI: run 10,000 random entries before deploy; any imbalance fails the build
- Monthly CA audit for first 6 months

### B1.2 Race condition in concurrent postings

- **What:** Two users post journals to same account at the same time → balance reads stale → overdraft missed.
- **Likelihood:** 3 · **Impact:** 4 · **Score:** 🟥 12

**Mitigation:**
- `SELECT ... FOR UPDATE` on account_balance row inside transaction
- Optimistic locking on `version` column for period headers
- Integration test with concurrent writers (k6 / Artillery)

### B1.3 Edited / backdated journal entries

- **What:** Someone changes a posted entry retroactively → hides fraud / errors.
- **Likelihood:** 4 · **Impact:** 5 · **Score:** 🟥 20

**Mitigation:**
- Posted entries are **immutable.** No UPDATE allowed. Schema enforces via trigger: after `status='posted'`, no mutations.
- Corrections = reversing journal + new entry (standard accounting practice).
- Audit log of every attempt + user + IP + timestamp.
- Admin dashboard page: "reversals this month" — visible to owner.

### B1.4 Tax / GST logic incorrect

- **What:** Bills missing GST input, wrong HSN code, wrong rate.
- **Likelihood:** 3 · **Impact:** 4 · **Score:** 🟥 12

**Mitigation:**
- CA-designed COA with GST segregation (SGST, CGST, IGST input/output)
- GST validation library (pin to official rates by HSN)
- Export to GSTR-ready CSV for CA review (we don't file returns in MVP)
- Explicitly document: "MVP does not auto-file. CA reviews exports."

---

## B2. Sync & Data-Loss Risks

### B2.1 Lost DPR from device crash

- **What:** Engineer finishes DPR offline, app crashes, data lost.
- **Likelihood:** 3 · **Impact:** 4 · **Score:** 🟥 12

**Mitigation:**
- Every form save writes to SQLite immediately (atomic write)
- Save-on-blur + save-on-step-change (not just save-on-submit)
- Autosave every 10s while user is editing
- Chaos test: kill app mid-entry 10 times; reopen — data present

### B2.2 Duplicate events after retries

- **What:** Same DPR created 3 times because of buggy retry.
- **Likelihood:** 4 · **Impact:** 3 · **Score:** 🟥 12

**Mitigation:**
- Idempotency key (ULID) + DB UNIQUE constraint (per doc 06)
- Server returns same response for duplicate event_id
- Tested: loop POST same event 100 times → exactly one DB row

### B2.3 Sync queue overflow

- **What:** Device offline for 2 weeks, accumulates 10k events, can't sync.
- **Likelihood:** 2 · **Impact:** 3 · **Score:** 🟨 6

**Mitigation:**
- Chunked sync (50 events per request)
- Server stream processes in priority order (Tier A first)
- Client UI shows progress bar during large syncs
- Warning at queue size > 1000: "You've been offline a long time — please go online to sync"

### B2.4 Photo upload fills device storage

- **What:** 5000 photos × 3 MB = 15 GB, device runs out of space.
- **Likelihood:** 3 · **Impact:** 2 · **Score:** 🟨 6

**Mitigation:**
- Auto-compress client-side (1920 px, q=80) → ~400 KB each
- Delete local copy 7 days after successful upload
- UI warning when device storage < 500 MB

---

## B3. Security Risks

### B3.1 Stolen device with signed JWTs

- **What:** Site supervisor's phone stolen — attacker can submit DPRs, cash requests.
- **Likelihood:** 3 · **Impact:** 3 · **Score:** 🟨 9

**Mitigation:**
- Short JWT expiry (30 min) + refresh token (7 days)
- Device enrollment — admin can revoke instantly
- PIN required for any approval > ₹50k
- Biometric unlock option (fingerprint/face) on app launch
- Server-side rate limits per device

### B3.2 Password re-use from compromised services

- **What:** User uses same password everywhere, breach leaks it, attacker logs in.
- **Likelihood:** 4 · **Impact:** 4 · **Score:** 🟥 16

**Mitigation:**
- Password strength meter (zxcvbn) at signup
- HIBP API check on signup + password change
- Mandatory MFA for owner + accountant roles
- Optional MFA for other roles
- 5 failed login attempts → 15 min lockout

### B3.3 SQL injection / ORM misuse

- **What:** Dev writes raw SQL with string concatenation → injection.
- **Likelihood:** 2 · **Impact:** 5 · **Score:** 🟨 10

**Mitigation:**
- Prisma everywhere — no raw SQL without code review
- Linter rule: disallow `$queryRawUnsafe` (only allow `$queryRaw` tagged template)
- CI runs semgrep with SQL-injection rules
- Quarterly pen test

### B3.4 Tenant data leak

- **What:** Org A's data returned to Org B via a missing where-clause.
- **Likelihood:** 2 · **Impact:** 5 · **Score:** 🟨 10

**Mitigation:**
- Row-level security (Postgres RLS) on all tenant-scoped tables
- NestJS guard automatically injects `org_id` filter in every query
- Integration tests: 2 orgs, verify no cross-leak (even with malformed requests)
- Audit log catches any query without `org_id` filter

### B3.5 Insecure file uploads (malware, huge files)

- **Likelihood:** 3 · **Impact:** 3 · **Score:** 🟨 9

**Mitigation:**
- Signed upload URLs (S3 presigned POST) — client never has S3 keys
- Max file size enforced server-side (bill PDFs ≤ 10 MB, photos ≤ 5 MB)
- MIME sniff on upload + reject executables
- ClamAV scan on sensitive file types (Phase 5+)

---

## B4. Operational Risks

### B4.1 Database goes down

- **What:** Postgres instance crashes, site offline for hours.
- **Likelihood:** 2 · **Impact:** 5 · **Score:** 🟨 10

**Mitigation:**
- Managed Postgres with automatic failover (DO / Supabase / AWS RDS)
- Point-in-time recovery (PITR) — 7 day retention
- Monthly restore drill — literal: restore to staging, verify data
- Backup health alert: no new backup in 26 h → page

### B4.2 Vercel or Railway outage

- **What:** Third-party host has a bad day.
- **Likelihood:** 3 · **Impact:** 3 · **Score:** 🟨 9

**Mitigation:**
- Status page with incident comms
- Stateless backend — can re-deploy on alternative (Render, Fly.io) in 2 h
- DNS TTL 60s — can swap providers quickly
- Field app keeps working offline during backend outage (sync resumes later)

### B4.3 Accidental data deletion by admin

- **Likelihood:** 2 · **Impact:** 5 · **Score:** 🟨 10

**Mitigation:**
- Soft delete everywhere (`deleted_at` column) + row-level visibility
- Hard-delete only through a separate admin script, 7-day cooling period
- Audit log + undo capability for 30 days
- Confirmation dialog with typed-entity-name for destructive actions

### B4.4 Third-party API change (Resend, Stripe, S3 pricing)

- **Likelihood:** 3 · **Impact:** 2 · **Score:** 🟨 6

**Mitigation:**
- Thin adapter layer for every third-party call (swap in 1 day)
- Monitor vendor changelog + email alerts
- Financial runbook: monthly SaaS cost review

---

## B5. People & Process Risks

### B5.1 Key developer leaves mid-project

- **Likelihood:** 4 · **Impact:** 4 · **Score:** 🟥 **16** *(upgraded per Doc 09 §5 — CTO review)*

**Mitigation:**
- No solo-author modules; every critical path touched by ≥ 2 engineers
- Detailed Architecture Decision Records (ADRs) in `/app/erp/docs/adr/`
- Pair programming for ledger + sync code
- Quarterly knowledge-share sessions recorded
- **Ledger Playbook** — living doc authored in Phase 2 explaining every trigger, invariant, reversal path (required reading week-1 for every new engineer)
- **Inline comments** enforced by linter on `packages/ledger-core/` and `apps/api/src/modules/ledger/`
- **Ledger code review** requires ≥ 2 approvals, ≥ 1 from a 3-month+ module veteran
- **Shadow-engineer rule** — no single engineer can be the only one shipping to the ledger module in any 6-week window

### B5.2 Scope creep from stakeholders

- **Likelihood:** 5 · **Impact:** 4 · **Score:** 🟥 20 (the biggest risk!)

**Mitigation:**
- Signed scope lock after Phase 1
- "Out of MVP" list (Doc 07 §2) posted publicly in all planning channels
- Every new request routed through tech lead; quantified cost impact before approval
- Phase demo pattern forces stakeholder alignment every 2 weeks

### B5.3 Dev team builds for imagined users, not real site engineers

- **Likelihood:** 4 · **Impact:** 4 · **Score:** 🟥 16

**Mitigation:**
- Mandatory shadowing: every backend dev spends 1 day on a real site in Phase 0
- Field usability testing starts Phase 4 — not Phase 5
- Engineer-users invited to sprint demos starting Phase 2

---

## B6. Product / Market Risks

### B6.1 Users reject because "Excel is good enough"

- **Likelihood:** 4 · **Impact:** 4 · **Score:** 🟥 16

**Mitigation:**
- MVP scope focused on jobs Excel does badly: real-time, multi-user, mobile, audit
- Concrete metric: if Decorous team uses it daily for 3 months, adoption is proven
- Import tool for existing Excel (first-run wizard)
- Side-by-side export always available (users don't feel trapped)

### B6.2 Contractor market has regional / regulatory nuances we miss

- **Likelihood:** 3 · **Impact:** 3 · **Score:** 🟨 9

**Mitigation:**
- MVP is India-only, single state focus (Delhi NCR) first
- CA consultant reviews regional compliance
- Phase 7+: multi-state rollout with legal review

### B6.3 A competitor (BuilderTrend / CoConstruct / Contruo) ships better faster

- **Likelihood:** 2 · **Impact:** 3 · **Score:** 🟨 6

**Mitigation:**
- Our edge: India-specific GST/COA + offline-first for bad connectivity + deep DPR workflow
- MVP ships in 6 months — competitive window is real
- Pricing undercut strategy if/when we open SaaS tier
- Don't try to beat global products on feature breadth — win on fit

---

## B7. Risk Heatmap (summary)

```
 IMPACT  ↑
   5     |       🟥B1.1  🟥B1.3            🟥 (15+): IMMEDIATE MITIGATION
         |       🟨B3.3  🟨B3.4
         |       🟨B4.1  🟨B4.3
   4     |       🟥B1.2  🟥B1.4  🟥B5.1    🟨 (8-14): PLAN MITIGATION
         |       🟥B3.2  🟥B5.2  🟥B5.3
         |       🟥B6.1  🟥B2.1  🟥B2.2
   3     |       🟨B3.1  🟨B3.5  🟨B4.2    🟩 (< 8): ACCEPT + MONITOR
         |       🟨B6.2
   2     |       🟨B2.3  🟨B2.4  🟨B4.4
         |       🟨B6.3
   1     |
         +─────────────────────────────────→ LIKELIHOOD
             1    2    3    4    5
```

### Top 5 Risks (every sprint retro must review these)

1. 🟥 **B5.2 — Scope creep** (20)
2. 🟥 **B1.3 — Edited journal entries** (20)
3. 🟥 **B5.3 — Building for wrong user** (16)
4. 🟥 **B6.1 — Users prefer Excel** (16)
5. 🟥 **B3.2 — Password re-use** (16)

---

## B8. Go / No-Go Gates per Phase

| Phase | Gate (if fails → stop / re-plan) |
|---|---|
| Phase 1 | Internal team uses as user directory for 1 week — 0 auth bugs |
| Phase 2 | **CA signs off ledger model** (mandatory) |
| Phase 3 | Real bills (30+) from last month posted, reports match Excel |
| Phase 4 | 7 days field usage, 0 data loss, < 1% conflict rate |
| Phase 5 | Zero P0/P1 open + security audit passed |
| Phase 6 | 2 external pilot customers retain 30 days |

Any red gate = we stop and fix. We do not "ship and iterate" on ledger correctness.

---

## B9. Disaster Recovery (RPO / RTO)

| Incident | RPO | RTO | Plan |
|---|---|---|---|
| Backend crash (single instance) | 0 | < 2 min | Auto-restart, load balancer |
| DB instance failure | < 15 min | < 30 min | Managed failover replica |
| Region outage (ap-south-1) | < 1 hr | < 4 hr | Hot spare in Singapore (Phase 6+) |
| Accidental data delete | 0 (soft) / < 24 h (hard) | < 2 hr | Soft-delete + PITR |
| Full provider compromise | < 24 h | < 24 h | Daily off-site backup (S3 → B2 cross-cloud) |

---

## B10. What We'll Monitor Daily (SRE golden signals)

- **Latency** — p50, p95, p99 per endpoint class (auth, ledger read, ledger write, sync)
- **Traffic** — requests per minute; event rate per org
- **Errors** — 5xx rate, 4xx rate, sync failure rate
- **Saturation** — DB connections, Redis queue length, disk %

Dashboards on a TV in the engineering room. Weekly review.

---

## B11. Ethical & Legal Risks (brief)

- **Data residency:** Indian customer data stays in India (ap-south-1)
- **DPDP Act 2023 compliance:** consent model, data subject rights (export + delete), breach notification ≤ 72h
- **Labour wage data:** mark as sensitive; encryption-at-rest + reduced-access role
- **Photos of workers:** consent flow; provide opt-out for identifiable persons

Legal review in Phase 5.

---

## B12. Architectural Kill Switches (things we can rip out without rewrites)

Good architecture leaves exits. If these parts disappoint, here are our exits:

| Component | Exit plan |
|---|---|
| Vercel | Re-deploy Next.js on Cloudflare Pages or self-hosted |
| Railway | Dockerfile exists — move to Fly.io or DO App Platform |
| Prisma | Abstracted in repository layer — swap to Drizzle in 2 weeks |
| BullMQ | Behind a `QueueService` interface — swap to SQS in 1 week |
| Resend | Swap to SES/SendGrid via adapter |
| S3 | Swap to Backblaze B2 (S3-compatible) |
| WatermelonDB | Swap to Realm / TanStack DB — schema migration required |

We won't optimize for every possible swap, but the **adapters exist where third parties attach**.

---

# PART C — DECISION LOG (summary)

| # | Decision | Status | Date | Revisit |
|---|---|---|---|---|
| 1 | NestJS for backend | ✅ | Pre-kickoff | Year 3+ |
| 2 | PostgreSQL for primary DB | ✅ | Pre-kickoff | Year 3+ |
| 3 | Next.js 14 App Router | ✅ | Pre-kickoff | Year 2 |
| 4 | React Native (Expo) | ✅ | Pre-kickoff | Year 2 |
| 5 | Prisma ORM | ✅ | Pre-kickoff | Year 2 |
| 6 | BullMQ + Redis queue | ✅ | Pre-kickoff | Scale gate |
| 7 | Turborepo monorepo | ✅ | Pre-kickoff | Year 2 |
| 8 | REST (no GraphQL) | ✅ | Pre-kickoff | If 3rd party API need |
| 9 | Monolith (no microservices) | ✅ | MVP | When module scales independently |
| 10 | tus.io for uploads | ✅ | MVP | If native S3 multipart improves RN story |

---

# PART D — "IF WE ONLY HAD 3 LESSONS FROM THIS DOC"

1. **The ledger is sacred.** Every risk mitigation in this doc boils down to: the ledger must never be wrong. Structure team, code, reviews, and tests around this.
2. **Scope creep is the #1 killer.** Bigger risk than any technical choice. Defend the MVP cut-line like it's a nation border.
3. **Offline-first is the product.** The web admin is the bonus; the field app is the moat. If sync isn't reliable, nothing else matters.

---

**End of Doc 08 — Tech Justification & Risks**

**All 8 architecture documents complete.** You now have:
- `01-system-architecture.md` — infrastructure & isolation
- `02-database-schema.md` — PostgreSQL schema
- `03-financial-ledger-system.md` — double-entry design
- `04-api-design.md` — REST API contract
- `05-ui-wireframes.md` — web admin + field app UX
- `06-sync-architecture.md` — offline + event bus
- `07-roadmap-and-costs.md` — phased delivery + team + ₹ estimate
- `08-tech-justification-and-risks.md` — stack rationale + risk matrix

**Ready for your review.** When you approve, Phase 0 (repo scaffolding + CI + COA + DNS) begins.
