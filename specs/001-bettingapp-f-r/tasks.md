# Tasks — Friends Betting App (Pari-Mutuel)
Feature Dir: c:\Homeworkhelp\wineify\specs\001-bettingapp-f-r
Spec: c:\Homeworkhelp\wineify\specs\001-bettingapp-f-r\spec.md
Plan: c:\Homeworkhelp\wineify\specs\001-bettingapp-f-r\plan.md
Contracts: c:\Homeworkhelp\wineify\specs\001-bettingapp-f-r\contracts\

Guidance
- [P] means task can run in parallel with other [P] tasks.
- Same file edits are sequential (no [P]).
- Follow TDD: write contract/integration tests before implementing endpoints/services.
- Use Node.js + TypeScript, Express, Prisma (PostgreSQL), Zod, JWT, Bcrypt, Pino.

Setup (repo root: c:\Homeworkhelp\wineify)
T001 — Initialize API project (Express + TS)
- Create folder: c:\Homeworkhelp\wineify\api
- Files:
  - api/package.json (name api, scripts: dev, build, start, test)
  - api/tsconfig.json (ES2020, outDir dist, rootDir src)
  - api/.env.example (DATABASE_URL=, JWT_SECRET=changeme, NODE_ENV=development)
  - api/src/server.ts (Express app bootstrap)
  - api/src/app.ts (routes mount)
- Command:
  - cd c:\Homeworkhelp\wineify\api
  - npm init -y
  - npm i express zod jsonwebtoken bcrypt dotenv pino pino-pretty cors helmet
  - npm i -D typescript ts-node-dev @types/express @types/jsonwebtoken @types/cors @types/node jest ts-jest @types/jest supertest @types/supertest
- Scripts:
  - dev: ts-node-dev --respawn --transpile-only src/server.ts
  - test: jest
  - build: tsc
  - start: node dist/server.js
- Depends on: —

T002 — Add Prisma and Postgres connectivity
- Commands:
  - npm i prisma @prisma/client
  - npx prisma init --datasource-provider postgresql
- Files:
  - api/prisma/schema.prisma (empty models for now)
  - api/.env (copy .env.example and set DATABASE_URL)
- Depends on: T001

T003 — Add project tooling (lint, format, gitignore)
- Files:
  - .gitignore: node_modules, dist, .env
  - api/.eslintrc.cjs, api/.prettierrc
- Commands:
  - npm i -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier eslint-config-prettier
- Depends on: T001

Domain Models (Prisma schema; single file → sequential)
T010 — Define User model (Prisma) in api/prisma/schema.prisma
- Model: User(id, username unique, displayName, passwordHash, createdAt, updatedAt)
- Command: npx prisma format
- Depends on: T002

T011 — Define Event model
- Model: Event(id, name, unitName, houseCutPct, minBet, maxBet, joinCode unique, timezone, status, adminUserId FK User)
- Depends on: T010

T012 — Define SubCompetition model
- Fields: eventId FK, name, mode, outcomes flags, closeAt, status
- Depends on: T011

T013 — Define Participant model
- Fields: subCompetitionId FK, name, status
- Depends on: T012

T014 — Define Bet model
- Fields: subCompetitionId FK, outcomeRef (participantId or enum), bettorUserId FK, amountUnits (int minor units), status, editedReason?
- Depends on: T013

T015 — Define PoolSnapshot model
- Fields: subCompetitionId FK, at enum(open|final|adjusted), totalsByOutcome JSON, totalUnits, houseCutUnits, netPoolUnits
- Depends on: T014

T016 — Define Result model
- Fields: subCompetitionId FK, winningOutcomeRef, recordedBy FK User
- Depends on: T015

T017 — Define Payout model
- Fields: subCompetitionId FK, betId FK, amountUnits
- Depends on: T016

T018 — Define LedgerEntry model
- Fields: eventId FK, userId FK, amountUnits, source subCompetitionId
- Depends on: T017

T019 — Define SettlementObligation model
- Fields: eventId FK, payerUserId, payeeUserId, amountUnits, status(pending|sent|received|settled|disputed), sentAt, receivedAt
- Depends on: T018

T01A — Define Notification model
- Fields: userId FK, type, payload JSON, status(queued|sent|read|failed)
- Depends on: T019

T01B — Prisma migrate and generate
- Commands:
  - npx prisma migrate dev -n init_core
  - npx prisma generate
- Depends on: T01A

Core Infrastructure
T020 — Configure app wiring and middlewares
- Files:
  - api/src/app.ts: cors, helmet, json, pino-http logger; mount /auth, /events, /sub-competitions, /participants, /bets, /pools, /results, /settlements, /notifications, /exports
  - api/src/server.ts: load .env, start server, health endpoint
- Depends on: T001

T021 — Implement Prisma client and DI
- Files:
  - api/src/db/prisma.ts (singleton)
- Depends on: T01B

T022 — Auth utilities and middleware
- Files:
  - api/src/auth/hash.ts (bcrypt)
  - api/src/auth/jwt.ts (sign/verify)
  - api/src/middleware/auth.ts (extract bearer, attach req.user)
  - api/src/middleware/admin.ts (ensure event admin)
- Depends on: T021

Contract Tests (per contracts/*.md) [P]
T030 [P] — Contract Test: Auth (register/login/logout)
- File: api/tests/contracts/auth.contract.test.ts
- Use supertest against in-memory or test DB; start app in test env
- Map to endpoints from contracts/auth.md
- Depends on: T022

T031 [P] — Contract Test: Events
- File: api/tests/contracts/events.contract.test.ts
- Covers POST /events, GET /events/:id, POST /events/:id/cancel, POST /events/:id/join
- Depends on: T022

T032 [P] — Contract Test: Sub-Competitions
- File: api/tests/contracts/sub-competitions.contract.test.ts
- Depends on: T022

T033 [P] — Contract Test: Participants
- File: api/tests/contracts/participants.contract.test.ts
- Depends on: T022

T034 [P] — Contract Test: Bets
- File: api/tests/contracts/bets.contract.test.ts
- Depends on: T022

T035 [P] — Contract Test: Pools & Odds
- File: api/tests/contracts/pools.contract.test.ts
- Depends on: T022

T036 [P] — Contract Test: Results
- File: api/tests/contracts/results.contract.test.ts
- Depends on: T022

T037 [P] — Contract Test: Settlements
- File: api/tests/contracts/settlements.contract.test.ts
- Depends on: T022

T038 [P] — Contract Test: Notifications
- File: api/tests/contracts/notifications.contract.test.ts
- Depends on: T022

T039 [P] — Contract Test: Exports
- File: api/tests/contracts/exports.contract.test.ts
- Depends on: T022

Services (domain logic)
T040 — Auth service (register/login/logout, rate limits)
- Files: api/src/services/auth.service.ts
- Depends on: T022, T030

T041 — Events service (create, join, cancel; joinCode gen; single admin enforcement)
- Files: api/src/services/events.service.ts
- Depends on: T021, T031

T042 — Sub-Competitions service (CRUD, open, close with final snapshot, timezone)
- Files: api/src/services/subcompetitions.service.ts
- Depends on: T041, T032

T043 — Participants service (CRUD, withdraw with refunds)
- Files: api/src/services/participants.service.ts
- Depends on: T042, T033

T044 — Pools service (provisional odds, snapshots, rounding rules)
- Files: api/src/services/pools.service.ts
- Depends on: T042, T035

T045 — Bets service (place bet with min/max, admin correction while open, audit)
- Files: api/src/services/bets.service.ts
- Depends on: T044, T034

T046 — Results service (record single winner, compute payouts from net pool)
- Files: api/src/services/results.service.ts
- Depends on: T045, T036

T047 — Settlements service (netting algorithm, obligations, two-sided confirm)
- Files: api/src/services/settlements.service.ts
- Depends on: T046, T037

T048 — Notifications service (in-app feed)
- Files: api/src/services/notifications.service.ts
- Depends on: T047, T038

T049 — Exports service (CSV/JSON for event settlement)
- Files: api/src/services/exports.service.ts
- Depends on: T047, T039

Endpoints (map contracts → controllers/routes)
T050 — Auth routes (/auth/register, /auth/login, /auth/logout)
- Files: api/src/routes/auth.ts; wire in app.ts
- Depends on: T040, T030

T051 — Events routes (/events, /events/:id, /events/:id/join, /events/:id/cancel)
- Files: api/src/routes/events.ts
- Depends on: T041, T031

T052 — Sub-Competitions routes (create, patch, open, close, odds)
- Files: api/src/routes/sub-competitions.ts
- Depends on: T042, T032

T053 — Participants routes (create, delete, withdraw)
- Files: api/src/routes/participants.ts
- Depends on: T043, T033

T054 — Bets routes (create, patch)
- Files: api/src/routes/bets.ts
- Depends on: T045, T034

T055 — Pools routes (get pool, get final)
- Files: api/src/routes/pools.ts
- Depends on: T044, T035

T056 — Results routes (post/get result)
- Files: api/src/routes/results.ts
- Depends on: T046, T036

T057 — Settlements routes (get event settlement, mark-sent, mark-received, dispute)
- Files: api/src/routes/settlements.ts
- Depends on: T047, T037

T058 — Notifications routes (list, mark read)
- Files: api/src/routes/notifications.ts
- Depends on: T048, T038

T059 — Exports routes (CSV/JSON)
- Files: api/src/routes/exports.ts
- Depends on: T049, T039

Integration & E2E Tests (from spec acceptance scenarios) [P]
T060 [P] — E2E: Create event with unit/constraints and join via code
- File: api/tests/e2e/01_event_create_join.e2e.test.ts
- Covers FR-001/002/004/009

T061 [P] — E2E: Configure sub-competition (modes), add/remove participants
- File: api/tests/e2e/02_sub_competition_setup.e2e.test.ts
- Covers FR-005/006/007

T062 [P] — E2E: Open betting with countdown; place bets within min/max; admin correction while open
- File: api/tests/e2e/03_betting_window_and_bets.e2e.test.ts
- Covers FR-008/009/010/012

T063 [P] — E2E: Withdrawal before/after close; refunds and re-normalization
- File: api/tests/e2e/04_withdrawals.e2e.test.ts
- Covers FR-013

T064 [P] — E2E: Close betting; record result; payouts and rounding reconciliation
- File: api/tests/e2e/05_result_and_payouts.e2e.test.ts
- Covers FR-014/015/023

T065 [P] — E2E: Settlement netting; notifications; two-sided confirmation; event summary
- File: api/tests/e2e/06_settlement_and_notifications.e2e.test.ts
- Covers FR-016/017/018/019

T066 [P] — E2E: Cross-event summary and exports
- File: api/tests/e2e/07_cross_event_and_exports.e2e.test.ts
- Covers FR-020/024

Polish, Ops, and Quality
T070 — Rounding/precision unit tests (odds display 2dp, settlement 0.01 with largest remainders)
- File: api/tests/unit/rounding.test.ts
- Depends on: T044, T064

T071 — Timezone and countdown consistency tests
- File: api/tests/unit/timezone_countdown.test.ts
- Depends on: T042

T072 — Audit trail for admin actions
- Files: api/src/services/audit.ts (append-only logs), integrate with admin actions
- Depends on: T041–T047

T073 — Rate limiting and basic security headers
- Files: api/src/middleware/rateLimit.ts; add helmet config
- Depends on: T020

T074 — Seed script for local testing
- Files: api/scripts/seed.ts
- Commands: ts-node scripts/seed.ts
- Depends on: T051–T055

T075 — Developer quickstart doc
- File: c:\Homeworkhelp\wineify\specs\001-bettingapp-f-r\quickstart.md (ensure commands reflect actual scripts)
- Depends on: T001–T059

Parallel Execution Guidance
- Group A [P]: Contract tests T030–T039 can be authored in parallel after T022.
- Group B [P]: E2E tests T060–T066 can be authored in parallel once core routes skeletons exist (stubs), ideally after T050–T059 stubs.
- Models T010–T01A modify one file (schema.prisma) → keep sequential.
- Services and routes can progress in vertical slices per feature (e.g., Bets: T045 → T054) once shared deps exist.

Task Agent Commands (examples, PowerShell from repo root)
- cd api; npm run dev
- cd api; npm run test -- --watch
- cd api; npx prisma migrate dev -n init_core
- cd api; npm run build && npm start