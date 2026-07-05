# Vercel Deployment Fix — Technical Report

**Branch target:** `conflict_220626_1844`
**Repo:** `decorousgroupofficial-a11y/decorous-website`
**Vercel project:** `decorous-website-rink`
**Frontend path in repo:** `/frontend`

---

## 1. Audit findings (BEFORE fixes)

### Project type
- **Create React App** with **Craco** override (`scripts.start = "craco start"`)
- Build command: `craco build` → output: `build/`
- No SSR. Pure SPA. (Next.js code lives separately in `/erp/` but is NOT in the Vercel deploy path)

### Package managers detected
| Lockfile | Location |
|---|---|
| `yarn.lock` | `/frontend/yarn.lock` (and a stale one at repo root) |
| No `package-lock.json` | — |
| Vercel deploy uses: `npm install` (per failure log) |

### Conflict #1 — `date-fns` (you already knew about this)
- `react-day-picker@8.10.1` requires `date-fns@^2.28.0 || ^3.0.0`
- Project had `date-fns@^4.1.0` → ❌ ERESOLVE
- *Already partially fixed by you to `^3.6.0` before this audit*

### 🚨 Conflict #2 — React 19 vs react-day-picker (the REAL blocker)
- `react-day-picker@8.10.1` peer deps require `react@^16.8.0 || ^17.0.0 || ^18.0.0`
- Project uses `react@^19.0.0` → ❌ ERESOLVE — **this is what was actually breaking Vercel's npm install even after the date-fns fix**

Reproduced with:
```bash
$ npm install --no-audit --no-fund
npm error code ERESOLVE
npm error Found: react@19.2.7
npm error Could not resolve dependency:
npm error peer react@"^16.8.0 || ^17.0.0 || ^18.0.0" from react-day-picker@8.10.1
```

### Usage audit
```bash
$ grep -rn "react-day-picker\|date-fns" src/
src/components/ui/calendar.jsx:3:import { DayPicker } from "react-day-picker"
```
- `react-day-picker` is **only** imported by `src/components/ui/calendar.jsx`
- `calendar.jsx` is **NEVER imported by anything** (dead code — a leftover from the shadcn/ui boilerplate)
- `date-fns` has **zero direct imports** in `src/`

### Vercel config (before)
- No `vercel.json` originally → Vercel was using auto-detection
- Defaults to npm because of how Vercel resolved the project
- No SPA rewrite → client-side routes like `/services/residential` would 404 on direct visit

---

## 2. Fix strategy chosen

**Approach: Remove dead dependencies**
Cleanest, safest, most permanent option. Three alternatives were considered:

| Option | Verdict |
|---|---|
| Upgrade `react-day-picker` to v9 (supports React 19) | Rejected — v9 has breaking API changes, no benefit since code is unused |
| Add `legacy-peer-deps=true` | Rejected — masks the problem; installs broken code that will runtime-crash if ever rendered |
| **Delete unused `calendar.jsx` + remove both packages** ✅ | **Chosen** — zero runtime impact, permanent fix, ~150 KB smaller node_modules |

---

## 3. Changes made

| File | Change | Why |
|---|---|---|
| `frontend/src/components/ui/calendar.jsx` | **Deleted** | Unused shadcn boilerplate; only consumer of `react-day-picker` |
| `frontend/package.json` | Removed `"react-day-picker": "8.10.1"` | Peer-dep conflict with React 19 |
| `frontend/package.json` | Removed `"date-fns": "^3.6.0"` | No direct usage; only existed for react-day-picker |
| `frontend/yarn.lock` | Auto-updated by `yarn remove` | Keeps lockfile consistent |
| `frontend/vercel.json` | **Created** | Pins Vercel install/build commands, adds SPA rewrite, sets cache headers |

---

## 4. `vercel.json` contents

```json
{
  "framework": "create-react-app",
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "outputDirectory": "build",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    { "source": "/static/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
    { "source": "/og-image.jpg", "headers": [{ "key": "Cache-Control", "value": "public, max-age=86400" }] },
    { "source": "/robots.txt",   "headers": [{ "key": "Cache-Control", "value": "public, max-age=3600" }] }
  ]
}
```

**Why each setting:**
- `framework: create-react-app` — explicit, no detection ambiguity
- `installCommand: npm install` — matches Vercel's current behavior; install passes cleanly now
- `rewrites` — fixes 404s on direct hits to client routes (`/services/residential-construction`, etc.)
- Cache headers — proper CDN caching for static assets (CRA hashes filenames, so 1y immutable is safe)

---

## 5. Vercel project settings to use

Configure these in **Vercel dashboard → decorous-website-rink → Settings → General**:

| Setting | Value |
|---|---|
| **Framework Preset** | Create React App |
| **Root Directory** | `frontend` ⚠️ (CRITICAL — repo has /frontend subfolder) |
| **Build Command** | *(leave blank — uses vercel.json)* — or `npm run build` |
| **Install Command** | *(leave blank — uses vercel.json)* — or `npm install` |
| **Output Directory** | *(leave blank — uses vercel.json)* — or `build` |
| **Node.js Version** | 18.x or 20.x |

**Environment variables** to add in Vercel:
| Key | Value |
|---|---|
| `REACT_APP_BACKEND_URL` | `https://construct-pro-139.emergent.host` (your Emergent prod URL) |
| `CI` | `false` *(optional — silences CRA's "warnings = error" behavior)* |

---

## 6. Build verification (BEFORE vs AFTER)

### Before
```
npm error code ERESOLVE
npm error peer react@"^16.8.0 || ^17.0.0 || ^18.0.0" from react-day-picker@8.10.1
```

### After (full simulation of Vercel's flow)
```bash
$ npm install --no-audit --no-fund
added 1486 packages in 33s ✓

$ npm run build
Compiled with warnings. (lint warnings only, no errors)
  201.76 kB  build/static/js/main.e2665994.js
  15.41 kB   build/static/css/main.d08458cb.css
```

✅ **Zero ERESOLVE errors. Zero dependency conflicts. Build artifact produced.**

---

## 7. Deployment checklist

| # | Item | Status |
|---|---|---|
| 1 | `date-fns` removed from package.json | ✅ |
| 2 | `react-day-picker` removed from package.json | ✅ |
| 3 | Unused `calendar.jsx` deleted | ✅ |
| 4 | `yarn.lock` updated and consistent | ✅ |
| 5 | `vercel.json` committed at `frontend/vercel.json` | ✅ |
| 6 | `npm install` passes locally | ✅ |
| 7 | `npm run build` produces `build/` artifact | ✅ |
| 8 | Vercel **Root Directory** set to `frontend` | ⚠️ Check Vercel UI |
| 9 | Vercel env var `REACT_APP_BACKEND_URL` set | ⚠️ Check Vercel UI |
| 10 | Commit pushed to `conflict_220626_1844` | ⚠️ **You do this via "Save to GitHub"** |

---

## 8. Risks / things to verify on first deploy

| Risk | Likelihood | Mitigation |
|---|---|---|
| Vercel Root Directory still set to repo root (not `frontend`) | Medium | Set it in Vercel UI before redeploying |
| `REACT_APP_BACKEND_URL` not set on Vercel | High | Add it in Vercel → Settings → Environment Variables |
| Build "Treat warnings as errors" CRA behavior | Low | Set env `CI=false` in Vercel if it errors on warnings |
| Stale Vercel build cache | Low | Click "Redeploy" with "Clear cache" checked |

---

## 9. Git commit (you do this)

I cannot push to GitHub from the Emergent environment (security boundary).

**To commit & push to `conflict_220626_1844`:**

1. In Emergent chat, click **"Save to GitHub"** (icon near the chat input)
2. Repository: `decorousgroupofficial-a11y/decorous-website`
3. Branch: `conflict_220626_1844`
4. Suggested commit message:
   ```
   fix(frontend): remove react-day-picker + date-fns to resolve React 19 peer conflict on Vercel

   - Delete unused src/components/ui/calendar.jsx (dead shadcn boilerplate)
   - Remove react-day-picker@8.10.1 (peer requires react@^16-18, project uses 19)
   - Remove date-fns (no direct usage, only existed for react-day-picker)
   - Add frontend/vercel.json (CRA framework, SPA rewrites, cache headers)
   ```

After "Save to GitHub" completes, Emergent will return the commit hash — replace this placeholder in your records:
```
Commit hash: <returned by Emergent after Save to GitHub>
```

---

## 10. Final expectation

**Deployment is expected to SUCCEED** on next Vercel build, assuming:
1. Root Directory in Vercel is set to `frontend`
2. `REACT_APP_BACKEND_URL` env var is present in Vercel

If the above 2 conditions are met → first redeploy after this push **will succeed**.
