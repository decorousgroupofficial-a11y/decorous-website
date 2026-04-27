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

### Stack (user-confirmed)
- Frontend web: Next.js 14 (App Router) + TypeScript
- Frontend mobile: React Native (Expo)
- Backend: NestJS + TypeScript
- DB: PostgreSQL 16
- Queue: BullMQ + Redis
- Storage: S3 (Mumbai region)
- Monorepo: Turborepo at `/app/erp/` (NOT yet scaffolded)
- Deploy: Vercel (web) + Railway/DO (backend). NOT deployable from this Kubernetes preview.

### MVP Scope (locked — Doc 07 §2)
Only three pillars:
1. Financial tracking (double-entry ledger + bills + P&L)
2. Material tracking (PO → GRN → consume)
3. DPR (daily progress report + labour + photos)

Explicitly EXCLUDED from MVP: Gantt, AI, payroll, multi-currency, GST return filing, quotation module, client portal, IoT, BIM viewer.

### Documentation Status (Phase 0 — Design)
All 8 architecture deliverables complete in `/app/docs/erp/`:
1. ✅ `01-system-architecture.md` — infra, DNS isolation, component diagram
2. ✅ `02-database-schema.md` — PostgreSQL schema
3. ✅ `03-financial-ledger-system.md` — double-entry design + CA-grade rules
4. ✅ `04-api-design.md` — REST contract, idempotency, RBAC
5. ✅ `05-ui-wireframes.md` — web admin + field app screens (Feb 2026)
6. ✅ `06-sync-architecture.md` — offline outbox, event bus, conflict resolution (Feb 2026)
7. ✅ `07-roadmap-and-costs.md` — 6-month phased plan, team, ₹73 L MVP budget (Feb 2026)
8. ✅ `08-tech-justification-and-risks.md` — stack rationale + risk matrix + DR plan (Feb 2026)

### Next Steps (awaiting user approval)
- Phase 0 (Week 0): Scaffold `/app/erp/` monorepo (NestJS + Next.js + Expo), CI, Postgres, COA seed
- Phase 1 (Month 1): Auth, orgs, projects, RBAC
- Phase 2 (Month 2): Ledger core (most critical — CA sign-off gate)
- Phase 3 (Month 3): Vendor bills, materials, approvals
- Phase 4 (Month 4): Mobile field app + sync
- Phase 5 (Month 5): Beta hardening
- Phase 6 (Month 6): GA

### Open Decision Points (user input needed before Phase 0)
1. Repo: monorepo inside `/app/erp/` OR separate Git org?
2. Hosting region confirmation (Mumbai preferred)
3. DNS ownership / Cloudflare access for `app.decorous.in`
4. Existing CA engaged, or hire fresh?
5. Which project becomes Month-4 pilot?
6. Budget envelope: ₹73 L full OR ₹45-50 L lean (timeline +2-3 months)?

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
