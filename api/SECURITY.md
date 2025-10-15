# Wineify API Security Overview

## Password storage
- User passwords are hashed with bcrypt (`BCRYPT_ROUNDS`) before persisting to the database.
- Plaintext passwords are never stored or logged; the API only stores the resulting hash.

## Token strategy
- Access tokens are short-lived JWTs (default 15 minutes) signed with `HS256` using `JWT_SECRET`.
- Refresh tokens are random, non-guessable values that are bcrypt-hashed and stored in the `Session` table.
- Refresh tokens are rotated on every call to `/auth/refresh`; the previous session entry is revoked (`revokedAt` timestamp).

## Session revocation
- `/auth/logout` revokes the current session (or all sessions when `all=true`).
- Expired refresh sessions are automatically marked as revoked when validation detects an expired token.

## Authorization middleware
- `requireAuth` validates the access token on every protected route and injects `req.user` with `{ id, role }` claims.
- `requireRole` enforces role-based access (USER vs ADMIN) and treats ADMIN as a super-user.

## Auditing & monitoring
- All authenticated POST/PUT/DELETE requests emit structured audit entries (user, event type, target, IP, metadata) to support
  forensic review and moderator oversight.
- Audit logs are retained for 90 days before expiring from storage. Avoid storing sensitive payloads; use the `meta` field for
  minimal context only (e.g. record identifiers) to comply with data minimisation expectations.
- Per-account rate limiting (60 req/minute for authenticated users, 30 req/minute for anonymous calls) protects the API from
  abuse. Rate-limit bursts beyond three violations per hour alert the admin team through the notification system.

## Recommended practices
- Keep `JWT_SECRET` at least 32 characters and unique per environment.
- Rotate secrets regularly and prefer HTTPS everywhere.
- Use environment-specific databases so session revocations do not bleed across environments.
