# @decorous/mobile — Expo React Native (scaffold in Phase 4)

This app is **intentionally not scaffolded yet.**

**Why:** Phase 4 of the roadmap is when the field app is built. Scaffolding it now means stale dependencies and empty boilerplate that has to be re-generated. When Phase 4 begins, run:

```bash
cd /app/erp/apps
pnpm create expo-app mobile --template tabs
```

Then wire:

- `@decorous/types` for shared DTOs (already set up in the workspace)
- JWT auth matching the web client pattern (`apps/web/src/lib/api-client.ts`)
- SQLite draft cache for DPR + expense (online-first, per Doc 09 §2)
- Simple retry queue (not the full outbox — that's Phase 7)
- tus-based photo upload

See wireframes B1–B6 in `/app/docs/erp/05-ui-wireframes.md`.
