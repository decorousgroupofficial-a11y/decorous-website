# ADR 003 — Ledger freeze until CA sign-off

**Status:** Accepted (binding)  
**Date:** Feb 2026  
**Related docs:** `/app/docs/erp/03-financial-ledger-system.md`, `/app/docs/erp/09-cto-review-amendments.md` §1, §3

## Context

The ledger is the most important module. Mistakes cost reputation, legal exposure, and customer trust. Our team does not include an accounting specialist by default; a construction-experienced CA must design and review:

- Chart of accounts (COA)
- Maker-checker approval matrix
- Period state machine (open → soft_close → locked)
- Reversal reason code vocabulary
- 100-test scenario pack including "should fail" cases

## Decision

- `packages/ledger-core/` is **empty and frozen**. No journal/account/period tables exist in `schema.prisma`.
- No ledger code will be written under any path until:
  1. A CA is engaged (engagement letter signed)
  2. COA workshop is complete (2 sessions)
  3. Governance design (Doc 09 §1) is CA-approved in writing
- All Phase 0/1/3 capture tables carry **ledger-readiness fields** (`source_type`, `ledger_posted`, `ledger_entry_id`) so Phase 2 integration is a mapping, not a migration.
- A CI check (planned) will fail any PR that imports `@decorous/ledger-core` or adds tables prefixed `journal_*` / `account_*` until this ADR is superseded.

## Consequences

+ No premature financial architecture committed to production
+ CA becomes accountable co-author of ledger correctness
+ Phase 1 engineering proceeds in parallel with CA shortlist (auth, tenancy, projects, master data)
− Phase 2 cannot start before CA is engaged — owner action on critical path
− Ledger code effort is concentrated in Phase 2 (~4 weeks) rather than spread out
