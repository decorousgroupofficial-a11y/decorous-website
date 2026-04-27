# Test credentials

## Marketing site admin
- URL: `/admin`
- Username: `admin`
- Password: `Decorous@2024`

## Decorous ERP
- URL: `/erp/login`
- Seed test user (ensure via /api/erp/auth/signup if missing):
  - Email: `pm+1777325294@decorous.in`
  - Password: `Demo@1234`
  - Role: OWNER
- Existing test user (password unknown):
  - Email: `demo@decorous.in`

Note: ERP signup is self-serve at `/erp/signup`. Testing agents can create a fresh user if the above ones fail.
