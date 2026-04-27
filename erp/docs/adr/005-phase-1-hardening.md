# ADR 005 — Phase 1 hardening (before UI expansion)

**Status:** Accepted  
**Date:** Feb 2026  
**Related:** CTO review of Phase 0 scaffold

## Context

Before expanding the admin UI across all modules, five backend gaps were flagged by CTO review:

1. No explicit soft-delete convention across tables
2. No idempotency protection on writes (DPR / expense / GRN duplicate risk)
3. File upload architecture undefined (images could leak into DB)
4. Timezone conventions unwritten
5. Approvals have no SLA / escalation mechanism

Shipping UI on top of these gaps would create behavioral debt that is painful to fix later.

## Decision

### 1. Soft delete everywhere
- Every domain table gets `deletedAt` (`timestamptz`) and `deletedById`
- Services filter `deletedAt: null` by default
- Hard delete is an ops task gated by a 7-day cooling period (future admin tool)

### 2. Idempotency
- New `idempotency_keys` table keyed on (`orgId`, `key`)
- `@Idempotent()` decorator + interceptor for write endpoints
- Client sends `Idempotency-Key: <ULID>`; duplicate keys return cached response
- Applied first to: `POST /v1/dpr`, `POST /v1/dpr/:id/submit`, `POST /v1/expenses`, `POST /v1/expenses/:id/submit`, `POST /v1/material-receipts`

### 3. File uploads
- New `UploadsModule` returns presigned S3 POST URLs
- DB stores only `objectKey` strings — never bytes
- Images ≤ 5 MB, PDFs ≤ 10 MB, MIME allow-list
- Read URLs composed via CDN env var or signed GET

### 4. Timezone
- **All** `DateTime` fields → `@db.Timestamptz(6)` (UTC with microsecond precision)
- Server-side `new Date()` is UTC by default in Node
- Frontend converts to org timezone (`Org.timezone`, default `Asia/Kolkata`)
- Date-only fields use `@db.Date` (no timezone component)

### 5. Approval SLA + escalation
- `Approval.slaDueAt` set on creation: 24h (PM), 48h (OWNER)
- `Approval.escalatedAt`, `Approval.escalatedToRole` track escalation state
- `EscalationService.sweep()` runs every 10 min in Phase 1 deploy (cron)
- Escalation path: ENGINEER → PM → OWNER (OWNER stuck = flagged, not moved)
- Every escalation writes an `ApprovalEvent(action=ESCALATED)` row

## Consequences

+ Audit trail stays intact even when entries are "deleted" by users
+ Field app retries are safe by DB constraint, not application guesswork
+ Images scale to millions without pressuring the DB
+ Multi-region + SaaS timezones don't break reports
+ Approvals can't stall silently

− Slightly more boilerplate on new write endpoints (must add `@Idempotent()`)
− Small per-request DB overhead for idempotency check (mitigated: indexed unique)
− Escalation cron must be set up in Phase 1 deploy (not tested here in preview)
