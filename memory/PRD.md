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
