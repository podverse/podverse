# 14 — Management API Auth and Admin Account

## Goal

Integration tests for the management-api: login, logout, me, and admin-account endpoints. Expand existing `adminAccount.integration.test.ts` and add new `auth.integration.test.ts`.

## Routes under test

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/v2/` | Public | Health check |
| POST | `/api/v2/auth/login` | Public | Admin login (Passport LocalStrategy) |
| POST | `/api/v2/auth/logout` | Public | Clear auth cookie |
| GET | `/api/v2/auth/me` | Required | Get current admin |
| GET | `/api/v2/admin-account/:id` | Required + self-only | Get admin account by ID |

## Files

### `apps/management-api/src/routes/auth.integration.test.ts` (new)

### `apps/management-api/src/routes/adminAccount.integration.test.ts` (expand existing)

## Test cases

### POST /auth/login (new)

- **200 with valid credentials** — mocks `AdminAccountService.verifyPassword` to succeed, verifies JWT cookie set, returns admin data
- **401 with incorrect email** — mocks admin lookup to return null
- **401 with incorrect password** — mocks verify password to fail
- **400 with missing credentials** — empty body

### POST /auth/logout (new)

- **200 with auth** — verifies cookie cleared
- **200 without auth** — idempotent

### GET /auth/me (new)

- **200 with valid auth** — mocks admin lookup, returns `{ id, id_text, created_at }`
- **401 without auth** — no cookie/header

### GET /admin-account/:id (expand existing)

Existing tests cover 200 (self) and 403 (other). Add:
- **401 without auth** — no cookie/header
- **404 with non-existent ID** — mocks service to return null

### GET / (health check)

- **200** — returns status text

## Mocking strategy

- Mock `AdminAccountService` from management-api ORM layer
- Follow existing pattern in `adminAccount.integration.test.ts`

## Verification

```bash
./scripts/nix/with-env npm run test -w apps/management-api
```
