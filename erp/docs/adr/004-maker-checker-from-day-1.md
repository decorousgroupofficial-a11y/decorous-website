# ADR 004 — Maker-Checker approval workflow from day 1

**Status:** Accepted  
**Date:** Feb 2026  
**Related docs:** `/app/docs/erp/09-cto-review-amendments.md` §1.1, CTO Rule 3

## Context

Maker-checker discipline is a **behavioural** requirement, not only a technical one. If users start capturing expenses and receipts without approval workflow in Phase 0, behaviour is already wrong by the time the ledger comes online in Phase 2 — and culture is much harder to change than code.

## Decision

Every capture-table mutation in Phase 0 flows through the `approvals` module:

- `Expense` → `Approval` row at submit time
- `MaterialReceipt` → same
- `Dpr` → same (PM signs off non-financial reports too)
- Future `VendorBill`, `Payment` → same

Rules enforced in code (see `approvals.service.ts`):

1. Maker ≠ Checker (user-id equality refused)
2. Role matrix by (target_type, amount_cents)
3. PIN required for amounts ≥ ₹50,000
4. Every action creates an `ApprovalEvent` row (immutable audit)
5. Rejection requires a reason

Approval does **not** post to the ledger today. It only flips the target row's `approval_status`. Phase 2 adds a separate posting service.

## Consequences

+ Day-1 muscle memory — no "it used to be free-form, now it's approval" painful rollout later
+ Audit-log + approval-event gives CAs a grounded review artefact early
+ Same engine handles DPR sign-off today and vendor bill approval in Phase 3
− Users may resist the extra tap. Mitigation: auto-approve threshold (₹5,000 for expenses) and streamlined mobile UX (B3 / B4 in Doc 05)
