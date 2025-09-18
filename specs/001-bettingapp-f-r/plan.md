# Implementation Plan — Friends Betting App (Pari-Mutuel)

Input: c:\Homeworkhelp\wineify\specs\001-bettingapp-f-r\spec.md  
Branch: 001-bettingapp-f-r  
Specs dir: c:\Homeworkhelp\wineify\specs\001-bettingapp-f-r

## Execution Flow (main)
1) Load Feature Spec → Done
2) Extract requirements and constraints → Done
3) Load Constitution (.specify/memory/constitution.md) → Applied (clarity, security, testability)
4) Establish Technical Context → Done
5) Phase 0: Research → Generated research.md
6) Phase 1: Design → Generated data-model.md, contracts/, quickstart.md
7) Phase 2: Tasks & Estimates → Generated tasks.md
8) Quality gates & risks → Done
9) Progress tracking → Updated
10) Report results → See bottom

## Technical Context (tailored to this project)
- Scope: Friends-only betting with pari-mutuel odds, no real money, one admin/event, countdown-based close, final odds at close, withdrawals/refunds policy, settlement with confirmations.
- Assumptions:
  - Platforms: Mobile-first (React Native) and/or Web SPA later.
  - Backend: TypeScript (Node.js/Express or NestJS), PostgreSQL, Prisma ORM.
  - Auth: Username/password with salted hashing, session/JWT. Rate-limited reset.
  - Notifications: In-app feed; optional email/push later.
  - Hosting: Any cloud (render/fly/azure); non-binding for plan.
- Non-functional targets:
  - Concurrency: up to a few hundred active users/event.
  - Data integrity: atomic close, deterministic payouts, audit trail.
  - Privacy: event visibility limited to participants; audit access admin-only.

## Architecture Overview
- Client: RN app → API (REST+JSON). Real-time optional (SSE/poll) for odds during open window.
- API: Domain modules (auth, events, sub-competitions, bets, pools, results, settlements, notifications, exports).
- DB: Postgres schema aligned to data-model.md with strong FKs and status enums.
- Key flows:
  - Betting window: server-authoritative close; idempotent “close” job.
  - Pool math: internal high precision; display rounding per spec.
  - Settlement: netting algorithm to minimize transfers; 2-sided confirmation.

## Phase 0 — Research (summary)
See research.md for details:
- Pari-mutuel math and rounding reconciliation.
- Netting algorithms for “who owes whom”.
- Countdown reliability and timezones.
- Auditability and correction policies.

## Phase 1 — Design Outputs
- Data model → data-model.md
- API contracts → contracts/*.md
- Quickstart (dev env, scripts, seed) → quickstart.md

## Phase 2 — Tasks & Plan
- Work breakdown with priorities, dependencies, and estimates → tasks.md

## Risks & Mitigations
- Race at close time → single writer lock and idempotent close action.
- Post-close withdrawals → deterministic rule (re-normalize or cancel) implemented and audited.
- Disputed settlements → allow dispute/reopen until both confirm.
- Scope creep (payments) → explicitly out-of-scope; units only.

## Success Criteria (traceable to FRs)
- Create/join event, configure unit/min/max, outcomes, countdown (FR-002/004/007/009).
- Place and correct bets while open (FR-010/012).
- Finalize odds at close; record result; payouts consistent to 0.01 with reconciliation (FR-008/014/015/023).
- Settlement plan with notifications and 2-sided confirmation (FR-016/017/018).
- Cross-event summaries (FR-020).

## Progress Tracking
- Phase 0: Research → Complete
- Phase 1: Design (data model, contracts, quickstart) → Complete
- Phase 2: Tasks & Estimates → Complete

## Generated Artifacts
- research: c:\Homeworkhelp\wineify\specs\001-bettingapp-f-r\research.md
- data model: c:\Homeworkhelp\wineify\specs\001-bettingapp-f-r\data-model.md
- contracts: c:\Homeworkhelp\wineify\specs\001-bettingapp-f-r\contracts\
- quickstart: c:\Homeworkhelp\wineify\specs\001-bettingapp-f-r\quickstart.md
- tasks: c:\Homeworkhelp\wineify\specs\001-bettingapp-f-r\tasks.md