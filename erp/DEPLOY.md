# Decorous ERP — Deployment Guide

> **Goal:** Get the ERP running at `https://app.decorous.in` (or a temporary Vercel URL) in ≈ 45 minutes.
> **Prerequisites:** GitHub connected ✅ (done). A credit card for Railway (~$5/mo). A Vercel account (free tier works).

---

## Architecture recap

```
                    app.decorous.in
                         │
      ┌──────────────────┴──────────────────┐
      │                                     │
      ▼                                     ▼
  Vercel                                 Railway
  (Next.js web)                          (NestJS API + Postgres + Redis)
  apps/web                               apps/api
      │                                     │
      └────────  Internet (HTTPS)  ─────────┘
```

Two deploys. One DB. Done.

---

## Step 1 — Push to GitHub (done ✅)

Repo should now contain `/app/erp/` at the root (or in a subfolder). Confirm in github.com that you see folders: `apps/`, `packages/`, `infra/`, `docs/`.

---

## Step 2 — Deploy database on Railway (10 min)

1. Go to **[railway.app](https://railway.app)** → sign in with GitHub
2. Click **"+ New Project"** → **"Deploy PostgreSQL"**
3. Wait ~30 seconds. Railway provisions a Postgres instance.
4. Click the Postgres tile → **"Variables"** tab → copy the `DATABASE_URL` value. Looks like:
   ```
   postgresql://postgres:abc123xyz@containers-us-west-12.railway.app:6543/railway
   ```
   **Save it somewhere temporarily — you'll paste it twice.**
5. In the same project, click **"+ New"** → **"Database"** → **"Add Redis"**. Copy `REDIS_URL` similarly.

**Checkpoint:** Railway project now has 2 databases (Postgres + Redis). Total cost ≈ $5/mo.

---

## Step 3 — Deploy NestJS API on Railway (15 min)

In the same Railway project:

1. Click **"+ New"** → **"GitHub Repo"** → select your Decorous ERP repo
2. Railway will try to auto-detect — override these:
   - **Root directory:** `apps/api` (adjust if your repo has a different nesting)
   - **Build command:** `pnpm install --frozen-lockfile=false && pnpm prisma:generate && pnpm build`
   - **Start command:** `pnpm prisma:deploy && node dist/main.js`
3. Click **"Variables"** → add:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | *(paste Postgres URL from Step 2)* |
   | `REDIS_URL` | *(paste Redis URL from Step 2)* |
   | `JWT_SECRET` | *(run `openssl rand -base64 48` on any Mac/Linux terminal, paste output)* |
   | `JWT_REFRESH_SECRET` | *(another `openssl rand -base64 48`)* |
   | `JWT_EXPIRES_IN` | `15m` |
   | `JWT_REFRESH_EXPIRES_IN` | `7d` |
   | `API_PORT` | `4000` |
   | `NODE_ENV` | `production` |
   | `S3_REGION` | `ap-south-1` |
   | `S3_BUCKET` | `decorous-erp-uploads` *(create later, see Step 5)* |

4. Click **"Networking"** → **"Generate Domain"**. Railway gives you a URL like `decorous-api-production.up.railway.app`. **Copy this URL.**
5. Wait ~3 minutes for build + deploy. Check the **Deploy Logs** tab for `[api] Decorous ERP listening on :4000`.

**Checkpoint:** `https://<your-railway-api-url>/v1/docs` should show the Swagger API documentation.

---

## Step 4 — Deploy Next.js web on Vercel (10 min)

1. Go to **[vercel.com](https://vercel.com)** → sign in with GitHub
2. Click **"Add New"** → **"Project"** → import your Decorous ERP repo
3. Override:
   - **Root Directory:** `apps/web`
   - **Framework preset:** Next.js (auto-detected)
   - **Build command:** leave default (`next build`)
4. Click **"Environment Variables"** → add:

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | *(paste Railway API URL from Step 3 — no trailing slash)* |

5. Click **"Deploy"**. Vercel builds in ~2 minutes.
6. You'll get a URL like `decorous-erp.vercel.app`. **That's your live ERP.** Open it.

**Checkpoint:** Visit your Vercel URL → see the landing page → click "Sign in" → try creating an org at `/signup`. Should work end-to-end.

---

## Step 5 — Add S3 for file uploads (optional for first demo, 10 min)

Until you add S3, the "photo upload" buttons work UI-wise but images are lost (the presign stub returns a non-functional URL). For real usage:

1. Go to **[aws.amazon.com](https://aws.amazon.com/s3)** → create an account (free tier)
2. S3 console → **"Create bucket"** → name `decorous-erp-uploads` → region `ap-south-1` (Mumbai)
3. **Uncheck "Block all public access"** on the bucket (needed for presigned POST)
4. Add this bucket CORS configuration (bucket → Permissions → CORS):
   ```json
   [{
     "AllowedHeaders": ["*"],
     "AllowedMethods": ["PUT", "GET"],
     "AllowedOrigins": ["https://your-vercel-url.vercel.app"],
     "ExposeHeaders": []
   }]
   ```
5. IAM → create user `decorous-erp-api` with policy `AmazonS3FullAccess` (scope tighter later)
6. Generate access keys → add to Railway API environment:
   ```
   S3_ACCESS_KEY=<AKIA...>
   S3_SECRET_KEY=<secret>
   ```
7. **TODO:** You still need to wire the actual AWS SDK signing in `uploads.service.ts` (right now it's a stub). A developer can do this in ~30 min — see the comment in that file.

For a first internal demo, skip S3 and just use placeholder photos. Real photo capture becomes critical in Phase 4 with the mobile app.

---

## Step 6 — Point your subdomain `app.decorous.in`

1. **Cloudflare** (where decorous.in DNS lives) → Add two records:

   | Type | Name | Target | Proxy |
   |---|---|---|---|
   | `CNAME` | `app` | `cname.vercel-dns.com` | DNS only |

2. **Vercel** → project → Settings → Domains → add `app.decorous.in` → follow verification.

3. (Optional) **Railway** → API service → Networking → Custom domain → add `api.decorous.in` (if you want the API on your own subdomain). Requires another CNAME in Cloudflare.

**Checkpoint:** `https://app.decorous.in` loads your ERP. ✅

---

## Step 7 — Create your first org + owner account

Open `https://app.decorous.in/signup` and create:

```
Organisation name: Decorous Construction
Your name:         <your name>
Email:             <your email>
Password:          <strong 12+ char password>
```

You're logged in as OWNER. You can now:

- Create projects at `/dashboard/projects`
- Add vendors at `/dashboard/vendors`
- Add materials at `/dashboard/materials`
- Submit DPRs at `/dashboard/dpr/new`
- Capture expenses at `/dashboard/expenses`
- Review approvals at `/dashboard/approvals`

Invite your site supervisor + accountant via `POST /v1/users/invite` (UI for this is Phase 1 polish — use Swagger docs at `<api-url>/docs` for now).

---

## Operational basics

### Restart / redeploy

- **Web:** push to GitHub main → Vercel auto-redeploys
- **API:** push to GitHub main → Railway auto-redeploys + runs migrations

### View logs

- **Vercel:** project → "Logs" tab
- **Railway:** service → "Deploy Logs" / "HTTP Logs"

### Backups

- **Railway Postgres:** automatic daily snapshots on Pro plan ($10/mo). Upgrade when going live.
- **Manual backup:** `pg_dump $DATABASE_URL > backup.sql` from any machine with Postgres CLI.

### Costs after this setup

| Service | Monthly |
|---|---|
| Railway (Postgres + Redis + API) | $5-15 |
| Vercel (Hobby tier) | $0 (or $20 Pro when going live) |
| AWS S3 (low usage) | $1-5 |
| Domain (already owned) | $0 |
| **Total** | **≈ $6-40/mo** |

---

## What's NOT set up yet (parked for Phase 1 polish)

- ❌ Automated cron for `EscalationService.sweep()` — needs a scheduler (Railway cron, or `@nestjs/schedule` in the API container)
- ❌ S3 presign actual signing — stubbed, works for UI but uploads don't persist
- ❌ Email notifications on approval requests — wire existing Resend integration later
- ❌ Sentry / error tracking — add when first real users hit bugs
- ❌ Monitoring dashboards — add after 10 daily users

None of these block the first demo. Pick them up incrementally.

---

## Troubleshooting

**"Invalid credentials" on signup**
→ Check Railway API env vars: `JWT_SECRET` and `JWT_REFRESH_SECRET` must be set and non-empty.

**CORS error from web to API**
→ Railway API allows all origins by default. If you locked it down, add your Vercel URL to CORS.

**"Missing Idempotency-Key header" on DPR/Expense submit**
→ UI auto-generates these. If you see this, the request is hitting the API bare — check `NEXT_PUBLIC_API_URL` on Vercel.

**Migrations failed during deploy**
→ Railway logs will show Prisma error. Most common: `DATABASE_URL` not reachable. Re-copy from Postgres service and redeploy.

**Page is blank after deploy**
→ Open browser DevTools → Console. Usually `NEXT_PUBLIC_API_URL` is missing or wrong. Must be set at build time on Vercel.

---

## Handoff if you need a developer

Share this doc + your GitHub repo + Railway + Vercel access. Any competent full-stack dev will have this running in one afternoon.

**End of DEPLOY.md**
