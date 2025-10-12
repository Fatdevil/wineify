# Debugging Report

## API Service (`/api`)

### Implemented Capabilities
- Express application with security middleware (Helmet, JSON body parsing, CORS, and rate limiting) plus a `/healthz` endpoint. [`api/src/app.ts`]
- Environment loader enforcing presence and minimum strength of `JWT_SECRET`, and parsing of `CORS_ORIGIN`. [`api/src/config/env.ts`]
- Cryptographically secure helpers for join codes and user IDs. [`api/src/lib/random.ts`]
- Zod-based request body validation middleware for routes. [`api/src/middleware/validate.ts`]
- Auth module providing JWT creation/verification helpers and a `/auth/register` route issuing tokens. [`api/src/modules/auth/jwt.ts`, `api/src/routes/auth.ts`]

### Key Issues & Risks
- `/auth/register` ignores the provided password entirely, stores no data, and returns a token for an ephemeral user, so no real registration occurs. [`api/src/routes/auth.ts`]
- No persistence layer is wired up (Prisma dependency unused); issued IDs/tokens are not saved, preventing login or duplicate detection. [`api/src/routes/auth.ts`]
- JWT creation exposes only `sub`, `role`, `exp`; there is no refresh token or revocation strategy, making logout/revocation impossible. [`api/src/modules/auth/jwt.ts`]
- Validation schema allows `role: 'admin'`, but there are no authorization controls restricting who can request an admin role. [`api/src/modules/auth/schemas.ts`, `api/src/routes/auth.ts`]

## Friends Betting App Specification Prototype (`/specs/friends-betting-app`)

### Implemented Stubs
- Express app skeleton wiring many domain route placeholders after loading configuration. [`specs/friends-betting-app/src/app.ts`]
- Basic configuration loader with environment defaults. [`specs/friends-betting-app/src/config/index.ts`]
- In-memory event creation stub with random join code generator. [`specs/friends-betting-app/src/events/index.ts`]
- Participant manager storing entries in memory. [`specs/friends-betting-app/src/participants/index.ts`]
- Simple payout distribution helper. [`specs/friends-betting-app/src/payouts/index.ts`]
- Ledger class capturing entries and balances. [`specs/friends-betting-app/src/ledger/index.ts`]
- Join code generator/validator utilities. [`specs/friends-betting-app/src/join-codes/index.ts`]
- Notification stub logging messages to console. [`specs/friends-betting-app/src/notifications/index.ts`]

### Critical Gaps & Bugs
- Most domain modules only contain empty stubs (`users`, `bets`, `events/sub-competitions`, `auth`, etc.) with comments instead of implementations. [`specs/friends-betting-app/src/users/index.ts`, `specs/friends-betting-app/src/bets/index.ts`, `specs/friends-betting-app/src/events/sub-competitions/index.ts`, `specs/friends-betting-app/src/auth/index.ts`]
- Test suite references functions that do not exist (e.g., `joinEvent`, `placeBet`, `recordResult`) leading to immediate runtime failures. [`specs/friends-betting-app/tests/integration/sample.int.test.ts`, `specs/friends-betting-app/src/events/index.ts`]
- Type definitions conflict with implementation (string IDs vs numeric, payout rule enum vs number), so TypeScript compilation would fail. [`specs/friends-betting-app/src/types/index.ts`, `specs/friends-betting-app/src/events/index.ts`]
- `NotificationType` is imported but never defined, causing compile errors. [`specs/friends-betting-app/src/notifications/index.ts`]
- JWT auth default secret `'your_secret_key'` violates security expectations and contradicts API service enforcement. [`specs/friends-betting-app/src/auth/index.ts`, `api/src/config/env.ts`]
- `DEFAULT_HOUSE_CUT` defaults to 10%, conflicting with specification that defaults to 0%. [`specs/friends-betting-app/src/config/index.ts`, `specs/001-bettingapp-f-r/spec.md`]
- No data persistence, validation, or error handling exists for the majority of flows despite comprehensive functional requirements. [`specs/001-bettingapp-f-r/spec.md`, `specs/friends-betting-app/src`]

## Testing
- Only minimal Jest placeholder tests exist; running `npm test` in `/api` passes the environment guard suite, but the larger friends-betting-app tests cannot run because referenced modules are unimplemented. [`api/tests/security/env.test.ts`, `specs/friends-betting-app/tests/integration/sample.int.test.ts`]
