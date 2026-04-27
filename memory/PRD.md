# Decorous Construction Website - PRD

## Original Problem Statement
Build a Google-Dominating Lead Generation Website for Decorous - a construction company in Odisha, India. The website must function as a construction lead generation machine designed to rank #1 on Google in Odisha for construction-related keywords and generate 20,000+ organic visitors per month.

## Architecture & Tech Stack
- **Frontend**: React 19 with React Router, Tailwind CSS, Shadcn/UI components
- **Backend**: FastAPI with Python
- **Database**: MongoDB
- **Email**: Resend API for lead notifications
- **Analytics**: Google Analytics 4 (GA4) + Meta Pixel
- **Deployment**: Kubernetes-based container

## User Personas
1. **Homeowners** - Looking to build houses in Odisha (25-55 age, middle to upper-middle class)
2. **Business Owners** - Need commercial construction
3. **Industries** - Need warehouse/PEB construction
4. **Interior Design Seekers** - Want home/office interiors

## Core Requirements (Static)
- SEO-optimized pages with proper meta tags
- Lead capture forms throughout the site
- Construction cost calculator
- WhatsApp and Call floating buttons
- Mobile-first responsive design
- Premium engineering brand aesthetic (Deep Blue #1a365d + Gold #F5A623)
- Email notifications for new leads
- Admin dashboard for lead management
- Analytics tracking for all conversions

## What's Been Implemented

### Phase 1 - MVP (March 2026) ✅
- Homepage with hero, lead form, trust indicators, services, process, portfolio, testimonials, CTAs
- 5 Service Pages: Residential, Commercial, Interior, Warehouse, PEB Construction
- 11 City Landing Pages for local SEO
- 20 SEO Blog Articles
- Construction Cost Calculator (multi-step with lead capture)
- Contact Page with form and Google Map
- About Page with company story, values, milestones
- Projects/Portfolio Page with category filtering
- Construction Process Page

### Phase 2 - Lead Management & SEO (March 2026) ✅
- **Email Notifications**: Resend API integration - sends beautifully formatted HTML emails with lead details and WhatsApp click-to-chat link to contact@decorous.in
- **Admin Dashboard**: Password-protected at /admin (password: Decorous@2024)
  - Lead statistics (Total, New, Contacted, Converted)
  - Lead filtering by status
  - Update lead status (New → Contacted → Converted/Lost)
  - Delete leads
  - Quick WhatsApp & Call buttons for each lead
- **Schema Markup**: Organization and LocalBusiness JSON-LD schemas injected in homepage
- **XML Sitemap**: Dynamic sitemap at /api/sitemap.xml with 45+ URLs

### Phase 3 - Analytics & Tracking (March 2026) ✅
- **Google Analytics 4**: Measurement ID G-YFJ0E82MK6
  - Page view tracking
  - Lead submission events (generate_lead)
  - Cost calculator events (cost_calculator_used)
  - Phone/WhatsApp click tracking
  - Service/blog view tracking
- **Meta Ads Pixel**: Pixel ID 965442971770619
  - PageView on all pages
  - Lead events on form submissions
  - CustomizeProduct on cost calculations
  - Contact events on phone/WhatsApp clicks
  - ViewContent on service/blog pages
- **SEO Meta Tags**: Open Graph and Twitter Card tags for social sharing

### API Endpoints
- GET/POST /api/leads - Lead management
- GET/PATCH/DELETE /api/admin/leads/{id} - Admin lead operations
- GET /api/services - All services
- GET /api/services/{slug} - Service details
- GET /api/projects - Projects (filterable)
- GET /api/blog - Blog posts (paginated)
- GET /api/blog/{slug} - Blog post details
- GET /api/cities - City landing pages
- GET /api/cities/{slug} - City details
- GET /api/testimonials - Client testimonials
- POST /api/calculate-cost - Cost calculator
- GET /api/sitemap.xml - XML Sitemap
- GET /api/schema/organization - Organization schema
- GET /api/schema/local-business - LocalBusiness schema

## Prioritized Backlog

### P1 - High Priority
- Add 80 more blog articles to reach 100 total
- Create Google Ads landing pages
- Dynamic image upload / management on main marketing site (admin UI)

### P2 - Medium Priority
- Image optimization with lazy loading
- Page speed optimization
- More project case studies
- Blog comments system

### P3 - Nice to Have
- Live chat integration
- Customer testimonial video section
- Before/After project gallery
- Construction timeline tracker for clients

---

## NEW PRODUCT: Decorous Construction ERP (app.decorous.in)

### Scope (user mandate — Feb 2026)
Standalone Construction ERP + execution platform on **isolated subdomain `app.decorous.in`**. Marketing site (decorous.in, /app/frontend + /app/backend) MUST remain 100% untouched.

### Stack (CTO-confirmed)
- Frontend web: Next.js 14 (App Router) + TypeScript
- Frontend mobile: React Native (Expo) — scaffolded Phase 4
- Backend: NestJS 10 + TypeScript + Prisma
- DB: PostgreSQL 16
- Queue: BullMQ + Redis (Phase 3+)
- Storage: S3 (Mumbai region)
- Monorepo: Turborepo at `/app/erp/` ✅ scaffolded Feb 2026
- Deploy: Vercel (web) + Railway/DO (backend). NOT deployable from this Kubernetes preview.

### Phase 0 Scaffolding (COMPLETE — Feb 2026)

Location: `/app/erp/` (67 files, 0 node_modules, zero impact on marketing site).

**API (NestJS) modules shipped:**
- `auth` — JWT + refresh + login/signup + failed-attempt lockout
- `orgs` — multi-tenant root
- `users` — invite + role change + PIN setting (argon2 hashed)
- `projects` — full CRUD (reference module)
- `vendors` — master data CRUD
- `materials` — master data CRUD with 13 categories
- `dpr` — sacred module (CTO Rule 4), ≤10s entry target, 2-photo minimum, GPS capture
- `expenses` — petty cash capture, **ledgerPosted=false always** (freeze), routed through approvals
- `approvals` — maker-checker engine (CTO Rule 3), PIN ≥ ₹50k, role matrix, rejection reason required

**Cross-cutting:**
- `PrismaModule` singleton
- `JwtAuthGuard` + `TenantGuard` + `@Roles(...)` RBAC
- `AuditInterceptor` — writes `audit_logs` row on every mutation
- Throttler 200 req/min per IP
- Swagger at `/docs`

**Web (Next.js 14 App Router):**
- Landing page, login, dashboard shell with 7-item sidebar
- Ledger-freeze amber banner on every dashboard screen
- Typed `apiClient` wrapper using `@decorous/types`

**Shared `@decorous/types`:** enums + DTOs consumed by api + web (and mobile when scaffolded)

**`@decorous/ledger-core`:** FROZEN — empty by design, README explains why

**ADRs:**
- 001: Stack choice (NestJS/Next/RN/Postgres)
- 002: Offline sync deferred to Phase 7
- 003: Ledger freeze until CA sign-off
- 004: Maker-checker from day 1

**Prisma schema design:**
- Every table has `org_id` (multi-tenant)
- Money in `BigInt` paise, never float
- Capture tables carry `source_type`, `source_ref`, `approval_status`, `ledger_posted`, `ledger_entry_id` — ledger-ready without ledger
- Ledger tables (journal_entry, account, period) **intentionally omitted** — Phase 2 with CA

### Phase 1 Hardening + UI (COMPLETE — Feb 2026)

**5 hardening fixes (ADR 005):**
1. ✅ Soft delete (`deletedAt` + `deletedById`) on every domain table
2. ✅ Idempotency — `idempotency_keys` table + `@Idempotent()` decorator + interceptor; applied to DPR create/submit, Expense create/submit
3. ✅ Uploads module — presigned S3 POST, DB stores `objectKey` only, MIME allow-list, 5 MB images / 10 MB PDFs
4. ✅ Timezone UTC — every `DateTime` field is `@db.Timestamptz(6)`, dates are `@db.Date`; `Org.timezone` for display
5. ✅ Approval SLA + escalation — `slaDueAt` 24h (PM) / 48h (OWNER); `EscalationService.sweep()` runs as cron; ENGINEER → PM → OWNER

**Phase 1 Web UI shipped (Next.js App Router):**
- `/signup` — create org + owner user
- `/login` — JWT auth, lockout after 5 fails
- `/dashboard` — overview with 4 KPI cards
- `/dashboard/projects` — list + create dialog, budget in paise
- `/dashboard/vendors` — list + create dialog (GSTIN, PAN, bank)
- `/dashboard/materials` — list + create dialog (13 categories, 10 UoMs)
- `/dashboard/dpr` — timeline list with thumbnails + status badges
- `/dashboard/dpr/new` — **mobile-friendly 3-step entry** (project+work → labour counts with +/- buttons → photo capture); ≤10s target; idempotency key generated client-side
- `/dashboard/expenses` — list + quick-entry dialog with chip categories + required bill photo
- `/dashboard/approvals` — pending queue with approve/reject dialogs, PIN required ≥ ₹50k, rejection reason required

**Shared UI primitives:** `Button`, `Input`, `Card`, `Badge`, `PageHeader`, `EmptyState` in `components/ui.tsx` + `cn()` / `formatPaise()` / `formatDate()` utilities.

**Phase 1 polish shipped (Feb 2026 — after GitHub push):**
- `/dashboard` — real KPI counts (active projects, pending approvals with ₹ sum, DPRs today, month spend) + amber "approvals waiting" banner
- `/dashboard/settings` — org info + members list + invite member dialog + PIN setup modal (4-digit, confirm, API-wired)
- Scheduler module — `SchedulerService` runs `EscalationService.sweep()` every 10 min on boot
- `DEPLOY.md` at `/app/erp/DEPLOY.md` — 7-step Vercel + Railway + Cloudflare + S3 runbook with exact env vars and cost estimate (~$6-40/mo)

### Documentation Status (Phase 0 — Design)
All 9 architecture deliverables complete in `/app/docs/erp/`:
1. ✅ `01-system-architecture.md`
2. ✅ `02-database-schema.md`
3. ✅ `03-financial-ledger-system.md` (governance additions in Doc 09)
4. ✅ `04-api-design.md`
5. ✅ `05-ui-wireframes.md`
6. ⚠️ `06-sync-architecture.md` — deferred to Phase 7
7. ✅ `07-roadmap-and-costs.md`
8. ✅ `08-tech-justification-and-risks.md`
9. ✅ `09-cto-review-amendments.md` — binding

### Next Steps (owner action required)
- **PRE-PHASE-0 BLOCKER:** identify + engage construction-savvy CA (Doc 09 §3)
- **On dev machine:** `cd /app/erp && corepack enable && pnpm install && pnpm dev`
- **Phase 1:** Auth UX polish, org settings, project full screens, vendor/material UI
- **Phase 2:** Ledger + CA sign-off gate
- **Phase 3:** Vendor bills, material flow (PO+GRN), approvals matured
- **Phase 4:** Mobile field app (Expo, online-first)
- **Phase 5:** Beta hardening
- **Phase 6.0:** Internal GA — Decorous 90-day dogfood
- **Phase 6.1+:** External pilot → paid SaaS

### Open Decision Points (user input still needed)
1. Repo: stay in `/app/erp/` OR move to separate Git org?
2. Hosting region confirmation (Mumbai preferred)
3. DNS ownership / Cloudflare access for `app.decorous.in`
4. **CA shortlist started?** (Doc 09 §3 — PRE-PHASE-0 BLOCKER)
5. Which project becomes Month-4 pilot?
6. Budget band: **Lean ₹35-50 L** / **Strong ₹60-80 L (recommended)** / **Full SaaS ₹1 Cr+**?

## Credentials & IDs

### Admin Dashboard
- **URL**: /admin
- **Password**: Decorous@2024

### Analytics
- **Google Analytics**: G-YFJ0E82MK6
- **Meta Pixel**: 965442971770619

### Contact Information
- **Phone**: 7008863329
- **Email**: contact@decorous.in
- **WhatsApp**: +91 7008863329
- **Location**: Bhubaneswar, Odisha, India
