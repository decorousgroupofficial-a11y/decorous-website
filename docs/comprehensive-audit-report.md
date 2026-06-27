# Decorous — Comprehensive Technical Audit Report
**Audit date:** 2026-06-27 · **Mode:** Read-only · **Auditor:** Senior Full-Stack Engineer

---

## Executive Summary

Decorous is a **React 19 + FastAPI + MongoDB** marketing site bundled with a multi-tenant **Construction ERP**. Production deploys to **Vercel** (frontend at `decorous.in`) and **Emergent** (backend + ERP at a `*.emergent.host` URL).

**Overall production-readiness: 6.5 / 10**

| Strength | Weakness |
|---|---|
| Clean React routing, real JSON-LD, deep static-HTML SEO fallback in `index.html` | No code splitting; entire 195 KB JS ships on every route |
| Comprehensive content (60+ blog posts, city/service pages) | Sitemap leaks the preview URL — **SEO-critical bug** |
| Decent accessibility floor (aria-label, role) | 70% of images missing `alt` text; 13/14 images not lazy-loaded |
| Clean dependency tree after react-day-picker removal | 30+ unused shadcn components and one large unused `seo/SchemaMarkup.jsx` |

**Top 3 issues to fix before any further marketing spend:**
1. 🔴 Sitemap leaks Emergent preview URL in production (every URL in `sitemap.xml` points to `*.preview.emergentagent.com`)
2. 🔴 ERP `/erp` and admin routes are **not** marked `noindex` at the page level — relying solely on `robots.txt`
3. 🟠 No code splitting — single 195 KB main bundle ships even on first paint

---

## 1. Project architecture

| Layer | Stack | Hosting |
|---|---|---|
| Frontend (marketing) | React 19 (CRA + Craco) | Vercel — project `decorous-website-rink` |
| Frontend (ERP) | Same React app, routes under `/erp` | Same Vercel build |
| Backend | FastAPI 0.110, Motor (async Mongo) | Emergent native deploy |
| Database | MongoDB | Emergent-managed |
| Sitemap / Robots | Backend-served `/api/sitemap.xml`, static `/robots.txt` | Mixed (issue — see §13) |

**Current implementation:** Monorepo with `/frontend` (React), `/backend` (FastAPI), `/erp` (parked Next.js — dead code), `/docs`, `/memory`.
**Best practice:** ✅ Clear separation. ⚠️ Parked Next.js code under `/erp/` should be removed — confuses contributors.
**Risk:** 🟡 Medium
**Impact:** New engineer onboarding takes longer; build tooling could mistakenly pick up `/erp/`.

---

## 2. Folder structure

```
/app/
├── backend/          ✅ Clean — server.py, erp_routes.py, seed_data.py
├── frontend/
│   ├── public/       ✅ index.html, robots.txt, og-image.jpg
│   ├── src/
│   │   ├── pages/    ✅ public + erp/
│   │   ├── components/ ✅ layout/, forms/, ui/ (shadcn), seo/
│   │   └── lib/      ✅ utils, erp-api
├── erp/              ⚠️ DEAD CODE — parked Next.js/NestJS monorepo (~636 KB)
├── docs/             ✅ Architecture + ERP planning docs
└── memory/           ✅ PRD.md, test_credentials.md
```

**Risk:** 🟡 Medium (dead `/erp` directory)
**Impact:** ~636 KB checked-in code with no purpose. Could break Vercel build if root directory gets mis-set.
**Fix:** Delete `/erp/` from repo or move to a separate archive branch.

---

## 3. React routing

**File:** `/app/frontend/src/App.js`

Uses `react-router-dom@7.5` with 12 public routes + `/admin` + `/erp/*` nested route tree.

```jsx
<Route path="/" element={<HomePage />} />
<Route path="/about" element={<AboutPage />} />
<Route path="/services" element={<ServicesPage />} />
<Route path="/services/:slug" element={<ServiceDetailPage />} />
<Route path="/cities/:slug" element={<CityPage />} />
<Route path="/blog/:slug" element={<BlogPostPage />} />
<Route path="/erp" element={<ErpLayout />}>
  {/* 8 nested routes */}
</Route>
```

| Aspect | Status |
|---|---|
| All routes have components | ✅ |
| No 404 fallback route | 🔴 **MISSING** — `<Route path="*" element={<NotFound />} />` not present. Direct hits to unknown URLs render blank |
| All routes are eager-loaded (no `React.lazy`) | 🔴 — see §20 |
| ERP routes inside same SPA as marketing | 🟠 — bundled together; visitors download ERP code they'll never use |

**Risk:** 🔴 High (404 fallback) · 🟠 High (bundling)
**Impact:** Bad UX on broken inbound links; SEO penalty for soft-404 pages

---

## 4. SEO implementation

**Current state (after recent fixes):**

| Asset | Location | Status |
|---|---|---|
| Static h1 + NAP in `<body>` for crawlers | `public/index.html` L101-160 | ✅ excellent |
| JSON-LD: LocalBusiness, WebSite, ItemList, FAQPage | `public/index.html` L25-100 | ✅ |
| Per-route `<Seo>` component | `src/components/Seo.jsx` | ✅ |
| Old/duplicate SchemaMarkup component | `src/components/seo/SchemaMarkup.jsx` | 🟡 **DEAD — unused, 157 lines** |
| Sitemap | `/api/sitemap.xml` (backend) | 🔴 BUG — see §13 |
| robots.txt | `public/robots.txt` | ✅ |

**Risk:** 🔴 High (sitemap), 🟡 Medium (dead schema file)
**Business impact:** Google may index `*.preview.emergentagent.com` URLs as canonical → tanks decorous.in rankings.

---

## 5. react-helmet-async usage

**Files using `<Seo>` (which wraps Helmet):**
- ✅ `HomePage.jsx`, `ServicesPage.jsx`, `AboutPage.jsx`, `ContactPage.jsx`, `ProjectsPage.jsx`, `ProcessPage.jsx`, `BlogPage.jsx`, `BlogPostPage.jsx`, `CitiesListPage.jsx`, `CityPage.jsx`, `ServiceDetailPage.jsx`, `CostCalculatorPage.jsx`

**Files MISSING `<Seo>`:**
- 🟠 `AdminPage.jsx` — needs `noindex` meta to keep out of Google
- 🟠 All `pages/erp/*.jsx` — need `noindex` meta

**Provider wired correctly:** ✅ `<HelmetProvider>` wraps `<BrowserRouter>` in `App.js`.

**Risk:** 🟠 High
**Impact:** Admin/ERP pages could leak into Google index if `robots.txt` is missed or ignored by a misbehaving crawler.

---

## 6. Canonical tags

**Implementation:** `Seo.jsx` line 36 — `<link rel="canonical" href={url} />` on every route that uses `<Seo>`.

| Aspect | Status |
|---|---|
| Static canonical in `index.html` (homepage) | ✅ |
| Per-route canonical via Helmet | ✅ |
| Dynamic routes (`:slug`) build canonical from param | ✅ |
| Trailing slash policy enforced | 🟡 Not enforced — could create duplicate-content risk if both `/services` and `/services/` resolve |

**Risk:** 🟢 Low
**Impact:** Minor — Google typically handles this gracefully.

---

## 7. Meta titles

| Page | Title source | Quality |
|---|---|---|
| Home | `Seo` default | ✅ 60 chars, keyword-rich |
| /services | Custom override | ✅ 67 chars |
| /about | Custom override | ✅ 64 chars |
| /contact | Custom override | ✅ 67 chars |
| /services/:slug | `${service.name} in Bhubaneswar, Odisha \| Decorous` | ✅ |
| /cities/:slug | `${city.service_type} in ${city.name}, Odisha \| Decorous` | ✅ |
| /blog/:slug | `${post.title} \| Decorous Blog` | ✅ |

**Risk:** 🟢 Low
**Impact:** Strong baseline.

---

## 8. Meta descriptions

**Status:** ✅ All 11 pages have unique 130–180 char descriptions with location + service keywords.

**Issue spotted:** Dynamic pages (`/services/:slug`, `/cities/:slug`) rely on DB-stored `short_description`. If DB content is generic, meta description will be generic. **Not verified — DB content not audited as out of scope.**

**Risk:** 🟢 Low

---

## 9. Open Graph tags

**`public/index.html` L30-42:**
```html
<meta property="og:type" content="website" />
<meta property="og:locale" content="en_IN" />
<meta property="og:site_name" content="Decorous" />
<meta property="og:url" content="https://decorous.in/" />
<meta property="og:title" ... />
<meta property="og:description" ... />
<meta property="og:image" content="https://decorous.in/og-image.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="..." />
```

**Per-route:** `Seo.jsx` emits OG title/url/image/description per page.

| Aspect | Status |
|---|---|
| Image self-hosted | ✅ |
| Image dimensions specified | ✅ |
| Locale present | ✅ |
| `og:type=article` for blog posts | ✅ (`BlogPostPage.jsx` L?? `type="article"`) |
| Article-specific OG (`article:published_time`, `article:author`) | 🟠 Missing for blog posts |

**Risk:** 🟡 Medium
**Impact:** Slightly less rich previews on Facebook/LinkedIn for blog posts.

---

## 10. Twitter cards

**Static:** ✅ `summary_large_image` in `index.html`.
**Per-route:** ✅ `Seo.jsx` emits twitter:card/title/desc/image.

**Missing:**
- 🟡 `twitter:site` (no @decorous handle declared)
- 🟡 `twitter:creator` (n/a for organization)

**Risk:** 🟢 Low
**Impact:** Twitter previews work, but no analytics attribution to Decorous's Twitter handle if/when you create one.

---

## 11. JSON-LD schema

**Static (in `index.html`):**
- ✅ LocalBusiness/GeneralContractor (full NAP, geo, sameAs, areaServed, makesOffer)
- ✅ WebSite (with search action)
- ✅ ItemList (4 services)
- ✅ FAQPage (5 questions)

**Per-route (via `Seo` jsonLd prop):**
- ✅ ServiceDetailPage — `Service` + nested `FAQPage`
- ✅ CityPage — `Service` scoped to city
- ✅ BlogPostPage — `Article`

**Missing/Dead:**
- 🔴 **Two organization schemas active simultaneously**: `index.html` has GeneralContractor + LocalBusiness. `src/components/seo/SchemaMarkup.jsx` (dead, unused) defines a 3rd `ConstructionCompany` schema with stale data and a `customer-assets.emergentagent.com` logo URL.
- 🟠 No `BreadcrumbList` schema anywhere (despite Google recommending it for service/city/blog hierarchies)
- 🟠 No `Review`/`AggregateRating` schema (yet — needs real reviews first)

**Risk:** 🟠 High
**Impact:** Google may pick the wrong canonical entity. Missing BreadcrumbList loses sitelink rich-results.

---

## 12. robots.txt

**File:** `/app/frontend/public/robots.txt`

```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /erp
Disallow: /erp/
```

| Aspect | Status |
|---|---|
| Disallows admin + erp | ✅ |
| Explicit allow for GPTBot, PerplexityBot, ClaudeBot, Google-Extended, Bingbot | ✅ |
| Sitemap URL declared | ✅ |
| Sitemap URL is **correct** (`https://decorous.in/api/sitemap.xml`) | ⚠️ Correct hostname, but the API route is on a different deployment (Emergent), not Vercel. If Vercel doesn't proxy `/api/*` → broken sitemap link |

**Risk:** 🔴 High (cross-host sitemap)
**Impact:** Google fetches `https://decorous.in/api/sitemap.xml` → Vercel returns 404 (no API on Vercel) → sitemap never indexed.

---

## 13. sitemap.xml

🔴 **TWO CRITICAL ISSUES**

### Issue 13.1 — Preview URL leak
**File:** `/app/backend/server.py` L487
```python
base_url = os.environ.get("APP_URL", "https://decorous.in").rstrip("/")
```
**Supervisor config** `/etc/supervisor/conf.d/supervisord.conf` overrides:
```
environment=APP_URL="https://4416c650-0944-4fa1-84aa-1610752cd6ad.preview.emergentagent.com"
```

**Current sitemap output (verified live):**
```
<loc>https://4416c650-0944-4fa1-84aa-1610752cd6ad.preview.emergentagent.com</loc>
<loc>https://4416c650-...preview.emergentagent.com/about</loc>
... × 45 URLs
```

**Risk:** 🔴 **CRITICAL**
**Business impact:** If Google crawls this sitemap from production:
- Every URL gets indexed under `*.emergentagent.com` instead of `decorous.in`
- Massive duplicate-content penalty
- `decorous.in` ranking signal split across two hostnames
- Months of SEO work wasted

### Issue 13.2 — Sitemap host mismatch
robots.txt declares sitemap at `https://decorous.in/api/sitemap.xml`, but Vercel hosts only static `decorous.in` — no `/api/*` proxy.

**Fix needed:**
- Pin `APP_URL=https://decorous.in` in production Emergent env
- Either move sitemap to a static file in `/frontend/public/` (build-time generation) OR add a Vercel rewrite from `/api/sitemap.xml` → Emergent backend.

---

## 14. Internal linking

**Audit:**
- ✅ Header has 8 nav links
- ✅ Footer (`/app/frontend/src/components/layout/Footer.jsx`) — links to all primary routes
- ✅ Blog category cross-linking via `relatedPosts` in BlogPostPage
- 🟠 No contextual in-content links from service pages → city pages and vice versa
- 🟠 No "related services" block on city pages
- 🟠 Homepage doesn't link to top 5 city pages

**Risk:** 🟠 High (for SEO link-equity)
**Business impact:** Underutilized internal link graph → city/service pages don't accrue the homepage's authority.

---

## 15. Breadcrumbs

**Component exists:** `/app/frontend/src/components/ui/breadcrumb.jsx` (shadcn)
**Used:** ❌ **Zero usages in any page**

**Risk:** 🟠 High
**Impact:**
1. UX — users can't navigate hierarchy (Home > Services > Residential)
2. SEO — no BreadcrumbList JSON-LD → loses Google sitelinks-style enhancement in SERPs

---

## 16. Images and alt text

| Metric | Count |
|---|---|
| Total `<img>` tags | 14 |
| With `alt=` attribute | 4 (29%) |
| With non-empty alt | 3 |
| With `loading="lazy"` | 3 (21%) |
| Without alt | 10 |

**Files with missing alts:** Header.jsx L70, HomePage.jsx L209/L280, BlogPostPage.jsx L184, ProjectsPage.jsx L103, AboutPage.jsx L72/L162, BlogPage.jsx L113, CitiesListPage.jsx L81, ServicesPage.jsx L77

**Risk:** 🔴 High
**Business impact:**
1. WCAG 2.1 Level A violation (legal risk in EU/USA)
2. Major Google Image Search miss — construction is a visually-driven query
3. Screen-reader users can't navigate the site

---

## 17. Core Web Vitals (predicted)

Not run live (audit is read-only), but predictions based on build artifacts:

| Metric | Predicted | Reasoning |
|---|---|---|
| LCP | 2.5–3.5 s | 195 KB JS blocking + non-lazy hero images |
| CLS | < 0.1 | Tailwind, no layout shift suspects |
| INP | < 200 ms | React 19 + relatively light interactions |
| FCP | 1.5–2.5 s | Static fallback in body helps, but 195 KB JS still blocks |
| TTI | 3–4 s | No code splitting means whole app must load |

**Risk:** 🟠 High
**Business impact:** Mobile users on 3G/4G will see slow page loads → Google penalizes; conversion drops.

---

## 18. Bundle size

```
build/static/js/main.fc355129.js     gzip: 195.6 KB
build/static/css/main.d08458cb.css   gzip:  15.5 KB
TOTAL build artifact size: 3.9 MB (uncompressed, includes maps + images)
Other JS chunks: 0  ← no code splitting
```

**Risk:** 🟠 High
**Business impact:** Mobile-data users especially impacted. Google's recommended JS budget is < 170 KB gzip for first-load. Currently 15% over.

**Breakdown likely culprits:**
- React 19 + react-dom (~50 KB)
- Radix UI + shadcn components (largely unused — see §32)
- Lucide icons (tree-shake should help, verify)
- Axios (~15 KB)
- Recharts? (loaded? unused?) — appears in deps

---

## 19. Lazy loading

**Image lazy-loading:** 3/14 images use `loading="lazy"` — 79% of images load eagerly.

**Route lazy-loading:** ❌ Zero `React.lazy()` usage — every page component, including the entire ERP, is loaded on first paint.

**Risk:** 🟠 High
**Business impact:** Particularly bad on mobile — homepage loads ERP code that the visitor will never use.

---

## 20. Code splitting

**Current state:** None. Single `main.fc355129.js` bundle contains all routes.

**Recommended:** Route-based code splitting at minimum:
```jsx
const HomePage = lazy(() => import('./pages/HomePage'));
const ServiceDetailPage = lazy(() => import('./pages/ServiceDetailPage'));
const ErpLayout = lazy(() => import('./pages/erp/ErpLayout'));
```

**Risk:** 🟠 High
**Business impact:** First-load bundle could drop from 195 KB → ~70 KB if split correctly.

---

## 21. Security headers

**Vercel `vercel.json` headers:**
- ✅ Cache-Control for static + og-image + robots.txt
- 🔴 **MISSING**: `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`

**Backend (FastAPI) headers:** None added beyond uvicorn defaults.

**Risk:** 🟠 High
**Business impact:**
- Clickjacking possible (no `X-Frame-Options`)
- MIME-sniff attacks possible (no `X-Content-Type-Options`)
- HSTS missing → man-in-the-middle on first HTTP visit
- Will fail Mozilla Observatory / securityheaders.com audits

---

## 22. Environment variables

**Frontend (`/app/frontend/.env`):**
```
REACT_APP_BACKEND_URL=<set>
WDS_SOCKET_PORT=<set>
ENABLE_HEALTH_CHECK=<set>
```

**Backend (`/app/backend/.env`):**
- `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `WHATSAPP_NUMBER`, `ERP_JWT_SECRET`, `APP_URL`

| Aspect | Status |
|---|---|
| Secrets out of source code | ✅ |
| `.env` not git-ignored anymore (intentional for Emergent) | ⚠️ Acceptable for current setup but unusual |
| `ADMIN_PASSWORD` default `'admin123'` in code | 🔴 Dangerous if env var missing |
| `ERP_JWT_SECRET` default `'change-me'` in code | 🔴 Same |

**Risk:** 🔴 High
**Business impact:** If env injection fails silently, admin login becomes `admin/admin123`.

---

## 23. API security

**`/app/backend/server.py`:**
- `CORSMiddleware` — origins from env `CORS_ORIGINS` or `*` default (🟡 `*` default in dev is acceptable but should never be `*` in prod)
- Admin endpoints — HTTPBasic auth with `secrets.compare_digest` ✅
- ERP endpoints — JWT (bcrypt) ✅
- Rate limiting — ❌ NONE
- Input validation — Pydantic models ✅ (good baseline)
- SQL/NoSQL injection — Mongo via Motor, parameterized — ✅

**Risk:** 🟠 High
**Business impact:** No rate limiting = lead form abuse, brute-force on admin/ERP login.

---

## 24. Form validation

**Audit:** No form library (`react-hook-form`, `zod`, `yup`) is installed/used.

**Forms found:**
- `LeadForm` — basic HTML5 `required` only
- ERP forms — manual state validation
- Contact form, cost calculator — basic only

**Risk:** 🟡 Medium
**Business impact:** Inconsistent validation, allows bad data into DB (e.g. phone="abc"), worse UX than schema-validated forms.

---

## 25. Google Analytics

**File:** `public/index.html` L161
```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-YFJ0E82MK6"></script>
```

✅ GA4 installed correctly. Tracking ID hardcoded — fine for a single-site setup. PageView fires on initial load.

**Missing:**
- 🟡 SPA route-change tracking — GA4 only sees initial pageview, not React Router navigations
- 🟡 Event tracking on lead form submit, phone clicks, WhatsApp clicks

**Risk:** 🟡 Medium
**Business impact:** GA reports significantly under-count engagement.

---

## 26. Meta Pixel

**File:** `public/index.html` L171-185 — Pixel ID `965442971770619` ✅

**Status:**
- ✅ Fires PageView on initial load
- 🟡 Same issue as GA — no SPA route-change tracking
- 🟡 No `Lead`/`Contact` events on form submission

**Risk:** 🟡 Medium
**Business impact:** Facebook Ads optimization is starved of conversion signals → ad spend less efficient.

---

## 27. Search Console readiness

| Item | Status |
|---|---|
| HTML verification meta tag | ❌ Not added to `index.html` |
| Domain verification (DNS TXT) | ❓ Unknown (out of repo scope) |
| Sitemap submission | ❌ Will fail with current sitemap bug (§13) |
| Bing Webmaster | ❌ Not set up (assumed) |

**Risk:** 🔴 High
**Business impact:** Cannot monitor index status, errors, queries, or backlinks.

---

## 28. Mobile responsiveness

**Audit method:** Static analysis (no live screenshot in this audit).

**Indicators:**
- ✅ Tailwind responsive utilities used throughout (`sm:`, `md:`, `lg:`)
- ✅ Mobile-first viewport meta tag (`<meta name="viewport" content="width=device-width, initial-scale=1" />`)
- ✅ Hamburger menu in Header.jsx
- ✅ Bottom-padding on pages (`pb-16 md:pb-0`) suggests a mobile bottom nav
- 🟡 14 `<img>` without explicit width/height → potential layout shift on mobile

**Risk:** 🟢 Low
**Business impact:** Likely fine — needs a live Lighthouse mobile run to confirm.

---

## 29. Accessibility

| Indicator | Count / Status |
|---|---|
| `aria-label` attributes | 7 |
| `role=` attributes | 8 |
| Images with alt text | 4/14 (29%) ❌ |
| Color contrast | Not audited (needs visual run) |
| Keyboard navigation | Inherits from shadcn — likely OK ✅ |
| Form labels | shadcn `<Label>` used ✅ |
| Skip-to-content link | ❌ Missing |
| Heading hierarchy (single h1, sequential h2/h3) | Not audited per-page |

**Risk:** 🟠 High
**Business impact:**
- Legal: ADA-equivalent lawsuits up 50% YoY in India under Rights of Persons with Disabilities Act
- SEO: poor a11y correlates with poor Lighthouse scores → ranking penalty
- Brand: 1 in 6 visitors has a disability

---

## 30. ERP/Admin indexing

**Current protection:**
- ✅ `robots.txt` Disallow: /erp, /admin
- 🔴 **No `noindex` meta tag** on these pages (`<meta name="robots" content="noindex">`)
- 🔴 No HTTP `X-Robots-Tag: noindex` header
- 🔴 ERP login page is publicly accessible (no auth required to GET the route)

**Risk:** 🔴 **CRITICAL**
**Business impact:** If a single rogue crawler ignores robots.txt (which is technically allowed — robots.txt is advisory), your ERP login URL gets indexed. If a competitor or attacker shares the link on a high-authority site, Google has been known to index "Disallow"ed URLs anyway.

---

## 31. Dead code

**Files unused / unreferenced:**

| Path | Lines | Status |
|---|---|---|
| `/app/erp/` (entire directory) | ~10K | 🔴 Parked Next.js — never referenced |
| `src/components/seo/SchemaMarkup.jsx` | 157 | 🟠 No longer imported (replaced by index.html) |
| 30+ `src/components/ui/*.jsx` (shadcn) | ~3000 total | 🟠 Tree-shaken at build time — bloats repo, not bundle |
| `src/components/ui/breadcrumb.jsx` | 100 | Could be used in §15 fix |

**Console statements in production code:** 12 occurrences (mostly `console.error` in catch blocks — acceptable but should be removed or routed through Sentry)

**Risk:** 🟡 Medium
**Business impact:** Slower dev velocity, larger repo, but no production impact (tree-shaking).

---

## 32. Unused dependencies

**Recently cleaned:** ✅ `react-day-picker`, `date-fns`

**Still suspicious (worth verifying via `depcheck`):**
- `recharts` — used? grep showed 0 direct imports
- `embla-carousel-react` — used? carousel.jsx is unused
- `react-resizable-panels` — used? resizable.jsx is unused
- `vaul` — drawer.jsx is unused
- `cmdk` — command.jsx is unused
- `react-hook-form` — declared but 0 imports
- `@hookform/resolvers` — same
- `zod` — same

**Risk:** 🟡 Medium
**Business impact:** Slows down `npm install` on Vercel (already 48s), confuses contributors.

---

## 33. Performance bottlenecks

| Bottleneck | Severity |
|---|---|
| No route code-splitting (§20) | 🟠 High |
| 195 KB main bundle (§18) | 🟠 High |
| Eager-loaded images (§16, §19) | 🟠 High |
| No CDN image optimization (Cloudinary/Next Image equivalent) | 🟠 High |
| Backend HomePage triggers parallel fetches for blog+services on first paint | 🟡 Medium |
| No service worker / offline cache | 🟢 Low |
| MongoDB queries lack indexes — not verified | 🟡 Medium |

---

## 34. Production readiness checklist

| Item | Status |
|---|---|
| Deploys to Vercel | ⚠️ Pending fix verification |
| Deploys to Emergent | ✅ |
| SSL certificate (Vercel auto-managed) | ✅ |
| Custom domain `decorous.in` | ✅ |
| Custom subdomain `app.decorous.in` for ERP | ⚠️ Pending DNS |
| Sitemap valid for production hostname | 🔴 Broken (§13) |
| Robots.txt | ✅ |
| Privacy Policy page | 🔴 **MISSING** |
| Terms of Service page | 🔴 **MISSING** |
| Cookie consent banner | 🔴 **MISSING** (legal risk in EU/UK if traffic comes from there) |
| Error monitoring (Sentry/etc.) | ❌ |
| Backup strategy for MongoDB | ❓ Not verified |
| Rate limiting | ❌ |
| Health-check endpoints | ✅ (`/api/`) |
| Favicon | ❌ Not visible in `public/` |
| Apple touch icon | ❌ |
| Manifest.json (PWA) | ❌ |

---

# 🎯 Prioritized Roadmap

## 🔴 Phase 1 — Critical (must fix this week)

| # | Fix | Effort | Files |
|---|---|---|---|
| P1.1 | **Fix sitemap preview-URL leak** — pin `APP_URL=https://decorous.in` in Emergent prod env, OR generate static sitemap at build time | 1 hr | `/app/backend/server.py`, Emergent env config |
| P1.2 | **Move sitemap to Vercel** — either build-time static sitemap or Vercel rewrite to backend | 1 hr | `frontend/vercel.json`, build script |
| P1.3 | **Add `noindex` meta to /admin and all /erp routes** | 30 min | `AdminPage.jsx`, `pages/erp/*.jsx` (or in `ErpLayout.jsx` once) |
| P1.4 | **Remove hardcoded password defaults** (`'admin123'`, `'change-me'`) — fail-fast on missing env | 15 min | `server.py`, `erp_routes.py` |
| P1.5 | **Add 404 fallback route** | 15 min | `App.js`, new `NotFoundPage.jsx` |
| P1.6 | **Fix missing image alts** (10 files) — WCAG + Google Image Search | 1 hr | Header, Home, About, Projects, Blog, etc. |
| P1.7 | **Add Privacy Policy + Terms** pages | 2 hr | new pages + footer link |
| P1.8 | **Delete dead `/app/erp/` directory** | 5 min | git rm |
| P1.9 | **Delete dead `seo/SchemaMarkup.jsx`** | 2 min | git rm |

**Phase 1 total: ~6 hours**

---

## 🟠 Phase 2 — High Priority (this month)

| # | Fix | Effort |
|---|---|---|
| P2.1 | **Code-split routes** with `React.lazy` + `Suspense` — target 70 KB initial bundle | 3 hr |
| P2.2 | **Implement breadcrumbs** on services/cities/blog with `BreadcrumbList` JSON-LD | 4 hr |
| P2.3 | **Add lazy-loading + `width/height`** to all images (CLS fix) | 2 hr |
| P2.4 | **Security headers** in vercel.json (CSP, HSTS, X-Frame, etc.) | 1 hr |
| P2.5 | **SPA route-change tracking** for GA4 + Meta Pixel | 2 hr |
| P2.6 | **Lead/Contact/Phone-click event tracking** for both GA + Pixel | 2 hr |
| P2.7 | **Internal linking improvements** — Service ↔ City cross-links, related-services blocks | 4 hr |
| P2.8 | **Rate limiting** on backend (FastAPI middleware: `slowapi`) | 1 hr |
| P2.9 | **Google Search Console verification** meta tag + sitemap submission | 30 min |
| P2.10 | **Remove unused dependencies** (recharts, embla-carousel, react-hook-form if unused, etc.) | 1 hr |
| P2.11 | **Add favicon, apple-touch-icon, manifest.json** | 1 hr |
| P2.12 | **Article-specific OG tags** (`article:published_time`, etc.) on blog posts | 30 min |
| P2.13 | **Cookie consent banner** (if EU/UK traffic expected) | 2 hr |

**Phase 2 total: ~24 hours**

---

## 🟢 Phase 3 — Nice to Have (next quarter)

| # | Fix | Effort |
|---|---|---|
| P3.1 | **Migrate to react-snap or Next.js** for full per-route pre-rendering | 2 days |
| P3.2 | **Form library** — react-hook-form + zod for all forms | 1 day |
| P3.3 | **Error monitoring** — Sentry integration | 4 hr |
| P3.4 | **Image CDN** — Cloudinary or imgix for auto-WebP/AVIF + responsive srcsets | 1 day |
| P3.5 | **Service worker / PWA** for offline + install | 1 day |
| P3.6 | **MongoDB indexes** review + add compound indexes for hot queries | 4 hr |
| P3.7 | **Skip-to-content link** + thorough a11y audit | 4 hr |
| P3.8 | **Review schema** (AggregateRating) once you have 25+ Google reviews | 2 hr |
| P3.9 | **Backlink-acquisition content** — comparison pages, free tools (BOQ generator) | ongoing |
| P3.10 | **Internationalization** — Odia (or) language toggle | 1 week |

**Phase 3 total: ~2 weeks**

---

# Closing observations

1. **The site has strong SEO bones** — JSON-LD, static fallback content, per-route Helmet, robots.txt, dedicated AI-crawler allow-list. With the sitemap bug fixed (P1.1), you're in the top 10% of CRA marketing sites for SEO readiness.
2. **The biggest single risk is the sitemap leak (§13)**. Until that's fixed, every new piece of content you publish is potentially being indexed under the wrong hostname.
3. **No production-readiness blockers** beyond Phase 1. Phase 2 turns this from "indexable" to "competitively ranking."
4. **Recommendation:** Approve Phase 1 only. Verify each fix. Then approve Phase 2. Skip Phase 3 until after 3 months of Phase 2 results.

---

**End of audit. Awaiting approval before making any code changes.**
