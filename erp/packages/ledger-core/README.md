# @decorous/ledger-core — 🔒 FROZEN

> This package is **intentionally empty.**  
> Do not add code here until the engaged CA has signed off the ledger governance design.

## What will live here (Phase 2)

- Pure TypeScript double-entry primitives (no Prisma, no HTTP):
  - `JournalEntry`, `JournalLine`
  - `Account`, `ChartOfAccounts`
  - `Period` state machine (`open` → `soft_close` → `locked`)
  - `assertBalanced(entry)` — throws if debits ≠ credits
  - `reverse(entry, reason)` — emits a reversing entry with reason code
- Property-based tests (fast-check) verifying double-entry invariants
- 100-test scenario pack authored by the engaged CA

## Why it's separated

- Ledger logic must be **pure and unit-testable** without a DB
- Keeping it in its own package means the API can import it but the web/mobile apps never do
- When the CA signs off, this package is the single source of truth for financial correctness

## Enforcement

- CI check (planned) blocks any PR that adds files here without two approvals
  including the tech lead AND the CA-reviewed test pack
- Importing `@decorous/ledger-core` from anywhere other than `apps/api/src/modules/ledger/` triggers a lint error (planned custom rule)

## References

- `/app/docs/erp/03-financial-ledger-system.md` — core double-entry design
- `/app/docs/erp/09-cto-review-amendments.md` §1 — governance layer (maker-checker, period lock, reason codes)
