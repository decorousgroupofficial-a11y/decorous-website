# Decorous Construction ERP — Roadmap, Team & Costs

## Guiding Principles (Non-negotiable)

1. **MVP discipline.** Only three things matter for v1:
   - **Financial tracking** (ledger + bills + P&L per project)
   - **Material tracking** (PO → receive → consume → reconcile)
   - **DPR** (daily progress + labour + photos)
   No Gantt charts, no AI copilots, no dashboards-within-dashboards.

2. **Ship usable in 4 months.** A working tool in production > a "complete" plan stuck in design.

3. **Ruthless cut-line.** If something doesn't directly touch money, material, or progress, it waits for v2.

4. **Zero cost leakage.** Every rupee in the budget is justified by a feature a paying customer needs.

5. **Decorous is the first customer.** We build for our own job sites first, then generalize for SaaS.

---

## 1. PHASED ROADMAP

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        TIMELINE OVERVIEW (6 months to GA)                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Month 1       Month 2       Month 3       Month 4       Month 5-6         │
│  ─────────     ─────────     ─────────     ─────────     ─────────          │
│  Foundation    Ledger        Execution     Mobile +      Hardening +        │
│                Core          Modules       Integrate     GA                  │
│                                                                              │
│  ▓▓▓▓▓▓▓▓▓▓   ▓▓▓▓▓▓▓▓▓▓   ▓▓▓▓▓▓▓▓▓▓   ▓▓▓▓▓▓▓▓▓▓   ▓▓▓▓▓▓▓▓▓▓         │
│                                                                              │
│  Pilot starts Month 4 · Beta Month 5 · GA end of Month 6                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Phase 0 — Week 0-2 (Pre-kickoff)

> **CTO-amended (Doc 09):** CA identification is a pre-Phase-0 blocker. No ledger code until a CA is engaged. See Doc 09 §3.

- **[BLOCKER] Shortlist + engage a CA** (construction-experienced, software-comfortable) — Doc 09 §3
- Finalize COA (chart of accounts) in workshop with the engaged CA
- Cloudflare DNS setup for `app.decorous.in` (pointer only, no traffic yet)
- Spin up Postgres, Redis, S3 buckets in staging
- Repo scaffolding (NestJS, Next.js, Expo) under `/app/erp/` or a new repo
- CI pipeline (GitHub Actions → Vercel preview + Railway staging)
- Decision: monorepo (Turborepo/Nx) vs poly-repo → **monorepo** (shared types)
- Review **Ledger Governance Design** (Doc 09 §1 — maker-checker, period-lock, reason codes) with the CA before Phase 2

**Gate:** dev can hit "hello world" on staging URL + Postgres migration runs **+ CA engagement letter signed**.

---

### Phase 1 — Month 1 · Foundation

**Goal:** Authentication, tenancy, projects, users, roles — nothing else.

Backend (NestJS):
- User + org multi-tenant model
- JWT auth + refresh tokens + device enrollment
- Roles & permissions (owner, accountant, PM, engineer, viewer)
- Projects CRUD + project membership
- Audit log foundation (every mutation recorded)
- Outbox table + event dispatcher skeleton
- Integration playbook: use `integration_playbook_expert_v2` for JWT/auth setup

Frontend (Next.js):
- App shell (sidebar + top bar + project context switcher)
- Login / MFA / forgot password flows
- Projects list + create + member management
- Org settings + role matrix UI
- Empty states for every module (wired but placeholder)

Database:
- Core tables: orgs, users, memberships, projects, project_members, audit_log, outbox
- Migration tooling (Prisma migrate OR knex) chosen & documented

**Deliverables:**
- A user can sign up, create an org, invite teammates, create a project, assign roles
- Audit log records every action
- 80% unit test coverage on auth + tenancy
- Load test: 500 concurrent logins, p95 < 300ms

**Gate:** internal team (3-5 users) uses Phase 1 as their "user directory" for 1 week.

---

### Phase 2 — Month 2 · Ledger Core

**Goal:** Double-entry ledger + chart of accounts + journal entries + basic reports.

This is the **hardest and most important phase.** If ledger is wrong, nothing else matters.

Backend:
- Chart of accounts (COA) — seed with Indian construction standard
- Account types: Asset, Liability, Equity, Income, Expense
- Journal entry model (header + lines, debit/credit balance enforced)
- Period / FY management (open / closed states)
- **Immutability:** posted entries cannot be edited, only reversed
- Reversing entries flow (with reason + approver)
- Trial balance endpoint (real-time, from normalized ledger)
- Projections: `account_balance` materialized view (refresh on event)

Frontend:
- COA management UI (admin only)
- Journal entry form (multi-line, hot-key driven, Debit/Credit validation live)
- Journal list / filter / search (by project, date, account, tag)
- Trial balance report
- Export to CSV/Excel

Reports (minimum 3):
- **Trial Balance** (all accounts, opening/debit/credit/closing)
- **Project P&L** (per project, time-filtered)
- **Vendor Statement** (per vendor, ageing 0-30, 30-60, 60-90, 90+)

**Deliverables:**
- CA-auditor-approved test case covering 100 scenarios (with "should fail" cases)
- Concurrency safety: parallel journal posts cannot double-post
- All 3 reports match manual Excel calculation to the paise
- Event bus publishes `ledger.entry.posted` → consumers present

**Gate:** external CA audits the ledger model and signs off. No compromise.

---

### Phase 3 — Month 3 · Execution Modules

**Goal:** Vendor bills, material flow, basic project budget, approval workflow.

Backend:
- Vendor master (name, GST, bank, contact)
- Bill model (draft → pending → approved → paid)
- Bill-to-journal mapping rules
- PO (Purchase Order) model
- Material master + stock ledger per project
- Material receipt (GRN) with photo evidence
- Material consumption / issue
- Project budget (planned vs actual, per head)
- Approval workflow engine (configurable thresholds)
- PIN-based approval

Frontend:
- Vendors list + CRUD
- Bills inbox (tabs: draft, pending, approved, paid, overdue)
- New bill form with line items → auto-maps to journal entry (shown to user)
- PO creation + tracking
- Material stock view per project
- Project budget screen (the wireframe A4 in doc 05)
- Approvals feed on dashboard (wireframe A2)

Integrations:
- Email notifications on approval requests (use existing Resend integration)
- WhatsApp click-to-chat on overdue bills (re-use pattern from marketing site)

**Deliverables:**
- Full flow: PO → receipt → bill → approval → payment → ledger impact
- Budget vs actual updates in real-time as bills post
- Photo-evidence enforcement on receipts

**Gate:** Decorous accountant enters last month's real bills (20-30 bills) in the system. Output matches current Excel.

---

### Phase 4 — Month 4 · Field App + Integration

**Goal:** React Native app with offline DPR + material receipt + petty cash. Full sync architecture per doc 06.

Mobile (Expo RN):
- Authentication + device enrollment
- Local SQLite (WatermelonDB)
- Outbox pattern + sync worker
- Home screen (wireframe B1)
- DPR 3-step flow (B2)
- Material receipt with QR (B3)
- Petty cash expense (B4)
- Sync status screen (B5)
- Camera + photo pipeline (tus upload)
- EN + HI localization
- Crash reporting (Sentry)

Backend:
- `/v1/sync` endpoint per doc 06
- Idempotency layer
- Event log + conflict detection
- Photo upload service (tus + S3)
- Time drift detection

Web:
- DPR list + detail view (read-only on web, mobile authoritative)
- Photo gallery per project
- Device management in settings

**Deliverables:**
- Field engineer can submit DPR fully offline, see it synced when back online
- Chaos test suite (from doc 06 §12) passes
- Pilot launch with 3 devices on 1 real project

**Gate:** 7 days of continuous field use, 0 data loss, < 1% conflict rate.

---

### Phase 5 — Month 5 · Beta Hardening

**Goal:** Stability, performance, UX polish, documentation, onboarding.

- Performance: all pages load < 800ms on 4G
- Backup/restore drills (Postgres PITR verified)
- Data export tools (every entity → CSV/JSON)
- User onboarding wizard (first-run experience)
- Help center (Markdown-based, embedded)
- Terms of service, privacy policy
- Access log UI for admin (who viewed what, when)
- Security audit (OWASP top 10, RBAC leak tests)
- Load test: 50 concurrent field users × 30 min

Beta cohort: 2-3 external pilot customers (friendly Decorous peers).

**Gate:** zero P0/P1 bugs open. All beta users retain 7+ day active usage.

---

### Phase 6 — Month 6 · GA

**Goal:** Launch `app.decorous.in` publicly.

- Monitoring SLO: 99.5% uptime, < 1% error rate
- Status page (statuspage.io or Instatus)
- Billing integration (Stripe for SaaS tier — only if we open to external customers)
- Marketing site updates (the existing `decorous.in` can reference app subdomain)
- Support rotation + ticket system (Linear / HelpScout)

Launch plan:
1. Decorous uses it exclusively for 30 days in production
2. Invite 5 friendly contractors at no cost
3. Iterate based on real feedback
4. Open paid SaaS tier at month 9 (out of MVP scope, but noted)

---

## 2. FEATURE CUT-LINE (What is NOT in v1)

Everything below is **explicitly excluded** and parked in a "Phase 7+" backlog:

| Excluded | Why cut | When revisit |
|---|---|---|
| Gantt + critical path | Too sparse data in first 3 projects | Phase 8 |
| AI assistant / chatbot | No grounded training data yet | Phase 9 |
| Tax (GST) return generation | Needs specialist + legal review | Phase 7 |
| Payroll / EPF / ESIC | Massive scope, separate product | Phase 10 |
| Quotation / estimation module | Distinct persona (pre-sales) | Phase 7 |
| Client portal (owners see progress) | Nice-to-have, not core | Phase 7 |
| Multi-currency | Indian-only MVP | When expanding market |
| IoT / sensor integration | Speculative, no confirmed demand | Phase 10 |
| 3D BIM / Drawing viewer | Requires Autodesk / Forge — expensive | Phase 9 |
| Public API / Zapier | Customers can ask after GA | Phase 7 |
| White-label / multi-brand | Not needed until 50+ customers | Phase 10 |

Printing this list and pinning it to the wall prevents feature creep.

---

## 3. TEAM STRUCTURE

### 3.1 Minimum Viable Team (for 6-month MVP)

| Role | Headcount | Where | Monthly cost (INR) |
|---|---|---|---|
| Tech Lead / Architect | 1 | Full-time | 2,50,000 |
| Backend Engineer (NestJS + Postgres + ledger) | 1 | Full-time | 1,80,000 |
| Frontend Engineer (Next.js) | 1 | Full-time | 1,60,000 |
| Mobile Engineer (React Native) | 1 | Full-time | 1,80,000 |
| Product Designer (UX, wireframes → pixel) | 1 | Part-time 0.5 FTE | 80,000 |
| QA / Test Engineer | 1 | Part-time 0.5 FTE | 60,000 |
| CA consultant (ledger review) | 1 | Advisory | 50,000 |
| DevOps (shared) | 1 | Part-time 0.3 FTE | 60,000 |
| **Total team cost / month** | | | **10,20,000** |

### 3.2 Delivery Model

- **Tech Lead is the accountability owner.** One throat to choke.
- **2-week sprints.** Demo to stakeholders (Decorous owner + 1 site engineer) at every sprint end.
- **Weekly CA review** during Phase 2. Non-negotiable.
- **Pilot feedback loop** starts Month 4. One day/week of observing real site engineers using the app.

---

## 4. COST ESTIMATE — 6 MONTHS TO GA

### 4.1 People

| Phase | Months | Monthly cost | Sub-total |
|---|---|---|---|
| Phase 0-1 | 1 | 10.2 L | 10.2 L |
| Phase 2 | 1 | 10.2 L | 10.2 L |
| Phase 3 | 1 | 10.2 L | 10.2 L |
| Phase 4 | 1 | 10.2 L | 10.2 L |
| Phase 5-6 | 2 | 10.2 L | 20.4 L |
| **People total** | 6 | | **61.2 L** |

### 4.2 Infrastructure (monthly burn)

| Service | Tier | Monthly cost (₹) |
|---|---|---|
| Vercel Pro (frontend + edge) | 1 team, 3 projects | 1,800 |
| Railway / Render / DO app platform (backend) | 2 services, 1 worker | 4,500 |
| Postgres managed (DO / Supabase) | 4 GB RAM, 25 GB SSD | 3,800 |
| Redis managed | 1 GB | 1,200 |
| S3 (AWS) object storage | 100 GB + traffic | 2,000 |
| Cloudflare (DNS + WAF) | Pro | 1,700 |
| Sentry (errors) | Team | 2,200 |
| BetterStack / Logtail | Start | 1,500 |
| Email (Resend) | 50k/mo | 1,600 |
| Expo EAS (RN builds) | Production | 8,000 |
| Domain + SSL | yearly / 12 | 200 |
| Misc (Figma, GitHub Team, etc.) | | 6,000 |
| **Monthly infra** | | **34,500** |

6 months → ≈ **₹ 2.1 L**

### 4.3 One-time

| Item | Cost (₹) |
|---|---|
| Security audit (pen test, Phase 5) | 1.5 L |
| Legal review (T&C, privacy, DPA) | 60,000 |
| CA engagement (COA + ledger sign-off) | 1 L |
| Initial branding assets for app | 40,000 |
| Contingency (10% of total) | 6.8 L |
| **One-time total** | **≈ 10 L** |

### 4.4 GRAND TOTAL

```
People (6 mo) ............... ₹ 61.2 L
Infra (6 mo) ................ ₹  2.1 L
One-time + contingency ...... ₹ 10.0 L
─────────────────────────────────────
TOTAL MVP COST (6 months) ... ₹ 73.3 L
```

### 4.5 Leaner Variant (if budget is tight)

Cut to **₹ 45-50 L**:
- Tech Lead also leads backend (remove separate backend engineer)
- Mobile dev contracted part-time for last 2 months only
- Designer contracted sprint-by-sprint
- Ship web + mobile "lite" (WebView fallback for first 3 months)

**Warning:** the leaner plan **extends timeline to 8-9 months**. Document trade-off with stakeholders.

---

## 5. RISK-WEIGHTED TIMELINE

Hard milestones with confidence ranges:

| Milestone | Best case | Target | Worst case |
|---|---|---|---|
| Phase 1 done | Week 3 | Week 4 | Week 6 |
| Ledger CA-approved | Week 7 | Week 9 | Week 12 |
| First real bill posted | Week 10 | Week 12 | Week 14 |
| Field app in pilot | Week 14 | Week 16 | Week 20 |
| Beta launch | Week 18 | Week 20 | Week 24 |
| GA | Week 22 | Week 24 | Week 30 |

Plan to **Target**, budget to **Worst case**.

---

## 6. MONETIZATION (Out of MVP scope — noted for strategy)

Two paths after GA:

- **Path A: SaaS** — price per org / per project / per user. ₹ 15-30k/month per construction firm. Needs billing, trials, support.
- **Path B: In-house only** — keep as Decorous competitive advantage, don't sell. Lower maintenance cost, slower ROI.

**Recommendation:** start Path B (use it internally for 6 months post-GA). Switch to Path A only after internal usage proves stable and Decorous sees 2-3 peers asking to use it.

---

## 7. KPIs & SUCCESS CRITERIA

### 7.1 MVP success definition

Decorous replaces all of the following with the ERP within 90 days of GA:
- Excel-based project budget tracking
- WhatsApp-based DPR reporting
- Email-based bill approval
- Paper-based petty cash vouchers

### 7.2 Specific numeric targets

| KPI | Target | Measurement |
|---|---|---|
| Daily active field users (post-GA) | ≥ 80% of eligible | App analytics |
| DPR submission rate (by 9 PM) | ≥ 95% of active sites | Server data |
| Ledger accuracy vs manual | 100% (paise match) | Monthly audit |
| Bill approval cycle time | ≤ 48 hours median | Timestamp delta |
| Sync failure rate | < 0.5% | Sync audit log |
| Web dashboard p95 load | < 1.5 s | Real user monitoring |
| Crash-free sessions (mobile) | > 99% | Sentry |
| MTTR for P0 bugs | < 4 hours | Incident log |

Track these on a 1-page dashboard, reviewed every Friday.

---

## 8. DELIVERY PLAYBOOK

- **Trunk-based development** + feature flags
- **Preview deploys** on every PR (Vercel + Railway ephemeral)
- **Staging environment** mirrors production (data anonymized)
- **Release cadence:**
  - Web: continuous (auto-deploy on merge to main)
  - Mobile: every 2 weeks via EAS Update (OTA)
  - Native binary: monthly (App Store / Play Store)
- **Change freezes:** last week before month-end close (no ledger changes)

---

## 9. DECISION POINTS (next 30 days)

These need stakeholder answers BEFORE Phase 1 kicks off:

1. **Repo strategy** — monorepo in existing `/app/erp/` OR a new dedicated Git org? → recommend NEW org for clean separation
2. **Hosting region** — Mumbai (AWS ap-south-1) vs Singapore → **Mumbai** (data residency + latency)
3. **Domain** — `app.decorous.in` confirmed? Cloudflare ownership?
4. **COA** — is there an existing CA engaged, or do we hire?
5. **Pilot site** — which 1 project becomes the first real-usage pilot in Month 4?
6. **Budget sign-off** — is ₹ 73 L the envelope, or are we going lean?

No Phase 1 commits until all 6 answered.

---

## 10. WHAT GOES INTO `/app/erp/` IN SPRINT 0

Repo layout after Phase 0 (Week 0):

```
/app/erp/
├── README.md
├── .gitignore
├── turbo.json           # turborepo
├── package.json
├── apps/
│   ├── web/             # Next.js 14 (app router)
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   ├── api/             # NestJS
│   │   ├── src/
│   │   ├── test/
│   │   └── prisma/
│   └── mobile/          # Expo React Native
│       ├── app/
│       ├── components/
│       └── src/
├── packages/
│   ├── types/           # shared TS types (events, DTOs)
│   ├── ui/              # shared React components (Radix + Tailwind)
│   ├── ledger-core/     # double-entry logic (pure TS, testable)
│   └── config/          # eslint, tsconfig, prettier
├── infra/
│   ├── docker/          # local dev compose files
│   ├── terraform/       # IaC for DO / AWS
│   └── scripts/
└── docs/                # (contains this file and siblings)
```

**Marketing site (`/app/backend`, `/app/frontend`) remains 100% untouched.** The ERP lives entirely under `/app/erp/`.

---

**End of Doc 07 — Roadmap & Costs**

Next doc: `08-tech-justification-and-risks.md` — why this stack, what could go wrong, and how we mitigate.
