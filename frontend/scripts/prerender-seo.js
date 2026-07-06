/**
 * Postbuild step: writes a static index.html per route with the correct
 * <title>, <meta description>, and <link rel="canonical"> (plus their
 * og:/twitter: equivalents) baked into the raw HTML.
 *
 * Why this exists: this is a client-side-only React app (no SSR). The
 * <Seo> component updates these tags via react-helmet-async, but only
 * after JavaScript runs in a real browser. Crawlers/tools that don't
 * execute JS (link-preview bots, many SEO tools) only ever see whatever
 * is in build/index.html — which was identical for every route. Vercel
 * serves an exact static file match before falling through to the SPA
 * catch-all rewrite in vercel.json, so writing build/<route>/index.html
 * here is enough to fix this without any server or rewrite config changes.
 *
 * Static route titles/descriptions are duplicated from each page's <Seo>
 * usage (frontend/src/pages/*.jsx) — keep them in sync if those change.
 * Dynamic routes (services/cities/blog) are fetched from the live API at
 * build time; a failed/slow fetch degrades gracefully (skips that
 * section) rather than failing the whole build.
 */
const fs = require("fs");
const path = require("path");

// CRA/craco's dotenv loading only feeds REACT_APP_* into the webpack build,
// not the OS environment — so this sibling Node script won't see .env values
// unless we load it ourselves. On Vercel, dashboard env vars are already
// real process env vars for the whole build chain, so this is purely a
// local-dev fallback (never overrides a value already set).
function loadDotEnvFallback() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) continue;
    const key = match[1];
    let value = (match[2] || "").trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadDotEnvFallback();

const BUILD_DIR = path.join(__dirname, "..", "build");
const SITE = "https://decorous.in";
const API_BASE = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
// Render's free tier can take 50s+ to wake from a cold start.
const FETCH_TIMEOUT_MS = 60_000;

const STATIC_ROUTES = [
  {
    path: "/about",
    title: "About Decorous — Construction Company in Bhubaneswar Since 2016 | 500+ Projects",
    description:
      "Decorous is a trusted construction company in Bhubaneswar with 8+ years of experience and 500+ completed projects across residential, commercial and PEB sectors in Odisha.",
  },
  {
    path: "/services",
    title: "Construction Services in Bhubaneswar — Residential, Commercial, Interior, PEB | Decorous",
    description:
      "Decorous offers residential, commercial, interior design and PEB/warehouse construction across Odisha. Engineer-led teams, transparent BOQ, on-time handover. Get a free estimate.",
  },
  {
    path: "/projects",
    title: "Our Projects — Recent Construction Work in Bhubaneswar & Odisha | Decorous",
    description:
      "Browse Decorous's portfolio of 500+ completed residential, commercial, interior and PEB projects across Bhubaneswar, Cuttack and Odisha.",
  },
  {
    path: "/process",
    title: "Our Construction Process — 6 Steps from Consultation to Handover | Decorous",
    description:
      "From free consultation to handover — Decorous's transparent 6-step construction process: design, BOQ, execution, QC, handover. Timeline & warranty covered.",
  },
  {
    path: "/blog",
    title: "Construction Blog — House Building Tips, Costs & Guides in Odisha | Decorous",
    description:
      "Expert articles on house construction, interior design, PEB warehouses, BOQ planning, and building costs in Bhubaneswar and across Odisha.",
  },
  {
    path: "/cities",
    title: "Construction Services Across Odisha — Bhubaneswar, Cuttack, Puri, Rourkela | Decorous",
    description:
      "Decorous delivers residential, commercial, interior and PEB construction across major cities of Odisha — Bhubaneswar, Cuttack, Puri, Khordha, Rourkela, Berhampur and Sambalpur.",
  },
  {
    path: "/contact",
    title: "Contact Decorous — Construction Company in Bhubaneswar | +91 7008863329",
    description:
      "Talk to Decorous in Bhubaneswar — call +91 7008863329 or visit Plot N3/370, Nayapalli, Bhubaneswar 751015. Free consultation and BOQ for residential, commercial, interior and PEB projects.",
  },
  {
    path: "/cost-calculator",
    title: "Construction Cost Calculator — Estimate Your House Cost in Bhubaneswar | Decorous",
    description:
      "Get an instant construction cost estimate for your home in Bhubaneswar and across Odisha. Enter plot size, floors and quality — see the per-sqft and total budget.",
  },
  {
    path: "/privacy-policy",
    title: "Privacy Policy | Decorous",
    description:
      "How Decorous collects, uses and safeguards your personal information when you use decorous.in or contact us for a construction or interior design enquiry.",
  },
  {
    path: "/terms-and-conditions",
    title: "Terms & Conditions | Decorous",
    description:
      "Terms of service governing your use of decorous.in. Construction project agreements are governed by separate signed contracts.",
  },
];

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function getDynamicRoutes() {
  if (!API_BASE) {
    console.warn("[prerender-seo] REACT_APP_BACKEND_URL not set — skipping dynamic routes");
    return [];
  }

  const routes = [];

  try {
    const services = await fetchJson(`${API_BASE}/api/services`);
    for (const s of services) {
      routes.push({
        path: `/services/${s.slug}`,
        title: `${s.name} in Bhubaneswar, Odisha | Decorous`,
        description: s.short_description,
      });
    }
  } catch (err) {
    console.warn("[prerender-seo] services fetch failed, skipping:", err.message);
  }

  try {
    const cities = await fetchJson(`${API_BASE}/api/cities`);
    for (const c of cities) {
      routes.push({
        path: `/cities/${c.slug}`,
        title: `${c.service_type} in ${c.name}, Odisha | Decorous`,
        description: `Decorous offers trusted ${c.service_type.toLowerCase()} services in ${c.name}, Odisha. Engineer-led teams, transparent BOQ, on-time delivery. Call +91 7008863329 for a free quote.`,
      });
    }
  } catch (err) {
    console.warn("[prerender-seo] cities fetch failed, skipping:", err.message);
  }

  try {
    // /api/blog defaults to limit=10 (max 50) — pass it explicitly so all
    // seeded posts get prerendered, not just the first page.
    const posts = await fetchJson(`${API_BASE}/api/blog?limit=50`);
    for (const p of posts) {
      routes.push({
        path: `/blog/${p.slug}`,
        title: `${p.title} | Decorous Blog`,
        description: p.excerpt,
      });
    }
  } catch (err) {
    console.warn("[prerender-seo] blog fetch failed, skipping:", err.message);
  }

  return routes;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderForRoute(template, route) {
  const url = `${SITE}${route.path}`;
  const title = escapeHtml(route.title);
  const description = escapeHtml(route.description || "");

  return template
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${description}" />`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${url}" />`)
    .replace(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${url}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${title}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${description}" />`)
    .replace(/<meta property="twitter:url" content="[^"]*"\s*\/?>/, `<meta property="twitter:url" content="${url}" />`)
    .replace(/<meta property="twitter:title" content="[^"]*"\s*\/?>/, `<meta property="twitter:title" content="${title}" />`)
    .replace(/<meta property="twitter:description" content="[^"]*"\s*\/?>/, `<meta property="twitter:description" content="${description}" />`);
}

async function main() {
  const templatePath = path.join(BUILD_DIR, "index.html");
  if (!fs.existsSync(templatePath)) {
    console.error("[prerender-seo] build/index.html not found — did the build run first?");
    process.exit(1);
  }
  const template = fs.readFileSync(templatePath, "utf8");

  const dynamicRoutes = await getDynamicRoutes();
  const allRoutes = [...STATIC_ROUTES, ...dynamicRoutes];

  let written = 0;
  for (const route of allRoutes) {
    const html = renderForRoute(template, route);
    const outDir = path.join(BUILD_DIR, route.path.replace(/^\//, ""));
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "index.html"), html);
    written += 1;
  }

  console.log(`[prerender-seo] wrote ${written} route-specific index.html files (${STATIC_ROUTES.length} static + ${dynamicRoutes.length} dynamic)`);
}

main().catch((err) => {
  console.error("[prerender-seo] failed:", err);
  // Don't fail the deploy over this — the SPA still works, it just falls
  // back to the default (homepage) meta tags for un-prerendered routes.
  process.exit(0);
});
