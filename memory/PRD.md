# Decorous Construction Website - PRD

## Original Problem Statement
Build a Google-Dominating Lead Generation Website for Decorous - a construction company in Odisha, India. The website must function as a construction lead generation machine designed to rank #1 on Google in Odisha for construction-related keywords and generate 20,000+ organic visitors per month.

## Architecture & Tech Stack
- **Frontend**: React 19 with React Router, Tailwind CSS, Shadcn/UI components
- **Backend**: FastAPI with Python
- **Database**: MongoDB
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

## What's Been Implemented (March 2026)

### Phase 1 - MVP Complete ✅
- Homepage with hero, lead form, trust indicators, services, process, portfolio, testimonials, CTAs
- 5 Service Pages: Residential, Commercial, Interior, Warehouse, PEB Construction
- 11 City Landing Pages for local SEO
- 20 SEO Blog Articles
- Construction Cost Calculator (multi-step with lead capture)
- Contact Page with form and Google Map
- About Page with company story, values, milestones
- Projects/Portfolio Page with category filtering
- Construction Process Page

### Features Implemented
- Lead capture system (MongoDB storage)
- WhatsApp click-to-chat integration (7008863329)
- Call Now buttons
- Mobile bottom navigation bar
- Responsive navigation with Services dropdown
- SEO-ready structure (meta titles, descriptions in database)
- Interactive cost calculator with city-specific pricing

### API Endpoints
- GET/POST /api/leads - Lead management
- GET /api/services - All services
- GET /api/services/{slug} - Service details
- GET /api/projects - Projects (filterable)
- GET /api/blog - Blog posts (paginated)
- GET /api/blog/{slug} - Blog post details
- GET /api/cities - City landing pages
- GET /api/cities/{slug} - City details
- GET /api/testimonials - Client testimonials
- POST /api/calculate-cost - Cost calculator

## Prioritized Backlog

### P0 - Critical (Next)
- None (MVP complete)

### P1 - High Priority
- Lead notification via email/SMS integration
- Admin dashboard for lead management
- Schema markup implementation (LocalBusiness, FAQ, ConstructionBusiness)
- XML Sitemap generation
- Add 80 more blog articles to reach 100 total

### P2 - Medium Priority
- Google Analytics integration
- Meta Ads pixel integration
- Image optimization with lazy loading
- Page speed optimization
- More project case studies

### P3 - Nice to Have
- Live chat integration
- Customer testimonial video section
- Before/After project gallery
- Construction timeline tracker for clients

## Next Tasks
1. Implement email notification for new leads
2. Create admin dashboard
3. Add schema markup for SEO
4. Generate XML sitemap
5. Add remaining 80 blog articles
