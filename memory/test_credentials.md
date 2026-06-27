# Test credentials

## Marketing site admin
- URL: `/admin`
- Username: `admin`
- Password: `Decorous@2024` (read from backend env `ADMIN_PASSWORD`, **required**; backend refuses to boot if missing)

## Decorous ERP
- URL: `/erp/login`
- Seed test user:
  - Email: `pm+1777325294@decorous.in`
  - Password: `Demo@1234`
  - Role: OWNER

## Backend env requirements (production)
The backend REFUSES to boot if any of these are missing or weak:
- `ADMIN_PASSWORD` — min 8 chars
- `ERP_JWT_SECRET` — min 32 chars
- `MONGO_URL` — required
- `DB_NAME` — required

This is intentional (Phase 1 security hardening, Jun 2026). Use long random
secrets in production.
