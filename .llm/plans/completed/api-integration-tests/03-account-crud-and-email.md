# 03 — Account CRUD and Email Flows

## Goal

Integration tests for account creation, update, deletion, email verification, and password reset routes.

## Routes under test

| Method | Path | Auth | Rate Limit | Notes |
|--------|------|------|------------|-------|
| POST | `/api/v1/account` | Public | 10min/3 (IP) | Create account |
| PUT | `/api/v1/account` | Requires auth + membership | None | Update display_name, bio, etc. |
| DELETE | `/api/v1/account/delete` | Requires auth | None | Delete account |
| POST | `/api/v1/account/send-verification-email` | Public | 10min/4 (IP) | Send verification email |
| POST | `/api/v1/account/verify-email` | Public | 10min/10 (IP) | Verify email with token |
| POST | `/api/v1/account/send-change-email-address-email` | Requires auth + membership | 10min/4 (IP) | Send email change verification |
| POST | `/api/v1/account/verify-email-change` | Public | 10min/10 (IP) | Verify email change |
| POST | `/api/v1/account/send-reset-password-email` | Public | 10min/4 (IP) | Send reset password email |
| POST | `/api/v1/account/reset-password` | Public | 10min/4 (IP) | Reset password with token |
| GET | `/api/v1/account/download-data` | Requires auth | 24hr/3 (per-user) | Download user data as zip |
| GET | `/api/v1/account/:id_text` | Optional auth | None | Get public account profile |

## File

`apps/api/src/test/account.test.ts`

## Test cases

### POST /account (create)

- **201 with valid data** — `{ email, password (8+ chars), locale }`, mocks `AccountService.create` to succeed, verifies `{ message: 'Account created' }`
- **201 on duplicate email** — mocks `AccountService.create` to throw duplicate error, verifies still returns 201 (prevents enumeration)
- **400 with password too short** — sends password < 8 chars
- **429 when rate limited** — 4 rapid requests, verifies 4th returns 429

### PUT /account (update)

- **200 with valid data** — authenticated, active membership, mocks `AccountService.update`, verifies updated fields returned
- **401 without auth** — no auth header
- **403 with expired membership** — mocks expired membership
- **400 with invalid body** — sends unexpected fields

### DELETE /account/delete

- **200 with valid auth** — mocks `AccountService.delete`, verifies success response
- **401 without auth**

### POST /account/send-verification-email

- **200 with valid email** — mocks email service, verifies `{ message }` response
- **429 when rate limited**

### POST /account/verify-email

- **200 with valid token** — mocks token verification to succeed
- **400 with invalid/expired token** — mocks token verification to fail

### POST /account/send-change-email-address-email

- **200 with auth + active membership** — mocks email service
- **401 without auth**
- **403 with expired membership**

### POST /account/verify-email-change

- **200 with valid token** — mocks token verification
- **400 with invalid token**

### POST /account/send-reset-password-email

- **200 with valid email** — mocks email service
- **429 when rate limited**

### POST /account/reset-password

- **200 with valid token + password (8+ chars)** — mocks token verification and password update
- **400 with invalid token**
- **400 with password too short**

### GET /account/download-data

- **200 with auth** — mocks data export service, verifies zip content type
- **401 without auth**
- **429 when rate limit exceeded** (3 requests)

### GET /account/:id_text

- **200 with public account** — mocks `AccountService.getByIdText` to return public account, verifies response strips private info
- **200 with own account when authenticated** — mocks account with matching owner ID, verifies full data
- **404 for private account when not owner** — mocks private account, verifies 404
- **404 for nonexistent account**

## Mocking strategy

- Mock `AccountService`, `EmailVerificationService`, `PasswordResetService`, and email-sending services from `@podverse/orm`
- Use shared helpers for auth and app startup

## Verification

```bash
./scripts/nix/with-env npm run test -w apps/api -- src/test/account.test.ts
```
