# 02 — Auth Routes

## Goal

Integration tests for `apps/api/src/routes/auth.ts`: login, logout, me, check-session.

## Routes under test

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/v1/auth/login` | Public (rate-limited 5/min) | Passport local strategy, sets JWT cookie |
| POST | `/api/v1/auth/logout` | Public | Clears auth cookie |
| GET | `/api/v1/auth/me` | Requires auth | Returns logged-in account data |
| GET | `/api/v1/auth/check-session` | Requires auth | Returns `{ message: 'Valid auth session' }` |

## File

`apps/api/src/test/auth.test.ts`

## Test cases

### POST /auth/login

- **200 with valid credentials** — mocks `AccountService.verifyPassword` to return true, verifies response has `Set-Cookie` header with JWT, body contains user data
- **401 with incorrect email** — mocks account lookup to return null
- **401 with incorrect password** — mocks account lookup to return account but `verifyPassword` returns false
- **403 when account not verified** — mocks account with `verified: false`, verifies `'Account not verified'` error
- **400 with missing email** — sends `{ password: 'test' }` only
- **400 with missing password** — sends `{ email: 'test@example.com' }` only
- **429 when rate limit exceeded** — sends 6 rapid requests, verifies 6th returns 429

### POST /auth/logout

- **200 with valid session** — sends auth cookie/header, verifies `Set-Cookie` clears it with proper `Expires` in the past
- **200 without session** — no auth header, still returns 200 (logout is idempotent)

### GET /auth/me

- **200 with valid auth** — sends valid JWT, mocks `AccountService.get()` to return account with active membership, verifies response body contains account fields (strips password)
- **401 without auth** — no auth header, verifies 401
- **401 with expired/invalid JWT** — sends `Authorization: Bearer invalid-token`, verifies 401
- **403 with expired membership** — mocks account with `membership_expires_at` in the past, verifies 403

### GET /auth/check-session

- **200 with valid auth** — sends valid JWT, verifies `{ message: 'Valid auth session' }`
- **401 without auth** — verifies 401

## Mocking strategy

- Mock `AccountService` from `@podverse/orm` to control account lookup and verification
- Mock `CategoryService` for app startup
- Use `supertest` agent or cookie jar to test cookie-based auth flows

## Verification

```bash
./scripts/nix/with-env npm run test -w apps/api -- src/test/auth.test.ts
```
