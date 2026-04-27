# ADR 001 — Stack: NestJS + Next.js + Expo + PostgreSQL

**Status:** Accepted  
**Date:** Feb 2026  
**Supersedes:** —  
**Related docs:** `/app/docs/erp/08-tech-justification-and-risks.md`

## Context

We're building a multi-tenant construction ERP that must eventually run on  
`app.decorous.in` as a web dashboard + field app, isolated from the existing  
marketing site (`decorous.in`). We need:

- End-to-end type safety (financial code)
- Modular backend that scales with team size
- Mobile offline-capable at some point (Phase 7)
- PostgreSQL (ACID, relational integrity — see Doc 02 + 08)

## Decision

- **Backend:** NestJS 10 + TypeScript + Prisma + PostgreSQL 16
- **Web:** Next.js 14 (App Router) + TypeScript + Tailwind + shadcn
- **Mobile:** React Native (Expo SDK 51+) — scaffolded Phase 4
- **Monorepo:** Turborepo + pnpm workspaces

## Consequences

+ Shared TS types across api/web/mobile (huge for financial correctness)
+ Opinionated NestJS structure enforces module boundaries
+ Prisma gives us type-safe queries with mature migration tooling
− Smaller NestJS hiring pool than Django in India (mitigated: TS is universal)
− Prisma + BigInt requires care — we use BigInt for paise, string in JSON responses
