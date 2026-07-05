# ADR 002 — Offline Sync deferred to Phase 7

**Status:** Accepted  
**Date:** Feb 2026  
**Supersedes:** —  
**Related docs:** `/app/docs/erp/06-sync-architecture.md`, `/app/docs/erp/09-cto-review-amendments.md` §2

## Context

The original plan (Doc 06) had a full offline-first architecture in MVP: outbox, event bus, conflict resolution, tus resumable uploads, device enrollment. CTO review flagged this as the single biggest execution risk:

- 20–30% extra engineering complexity
- Conflict-resolution bugs are costly and subtle
- Offline is an unvalidated hypothesis (many Indian sites have 4G now)

## Decision

For v1.0 MVP, the mobile app is **online-first with local drafts + retry**:

- SQLite-backed local drafts (autosave)
- Simple in-memory + SQLite-persisted retry queue
- Photo upload with resume-on-open
- Banner: "Saved locally — will retry"
- No outbox, no event bus from mobile, no multi-device conflict resolution

Full offline-first (Doc 06 as written) moves to Phase 7 / v2.0 when usage data justifies it.

## Consequences

+ Phase 4 scope shrinks ~40% → on-time delivery
+ Simpler mental model for devs and users in MVP
+ Lower fraud surface (events hit server sooner)
− Workers in truly-offline sites (rural basements) are blocked from live submit — mitigated by local-draft autosave
− Doc 06 remains the reference for the Phase 7 upgrade — do not delete
