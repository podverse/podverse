# Phase 06: Tests and E2E

**Repo:** Both (Metaboost tests for rename, Podverse tests for new functionality)

## Goal

Ensure all existing tests pass with the renamed/updated constants and add comprehensive test coverage for the three signup modes.

## Changes

### 1. Metaboost -- update existing tests

All test files that reference `AUTH_MODE` must be updated to `ACCOUNT_SIGNUP_MODE`:

- `apps/api/src/test/startup-validation-auth-mode.test.ts`
- `apps/api/src/test/auth-username.test.ts`
- `apps/api/src/test/auth-admin-only-email.test.ts`
- `apps/api/src/test/auth-signup-mode-no-mailer.test.ts`
- `apps/api/src/test/auth-set-password-admin-only-username.test.ts`
- `apps/api/src/test/auth-set-password-admin-only-email.test.ts`
- `apps/management-api/src/test/management-users-auth-mode.test.ts`
- `apps/management-api/src/test/management-users-admin-only-email.test.ts`
- `apps/api/src/test/setup.ts` (default env)

E2E specs and Playwright configs:
- Rename env var references in all config files
- Rename env var references in spec files

### 2. Podverse -- new unit/integration tests

**Startup validation per mode:**
- Test that `admin_only_username` does NOT require mailer env vars
- Test that `admin_only_email` DOES require mailer env vars
- Test that `user_signup_email` DOES require mailer env vars
- Test that invalid values are rejected

**Account creation service:**
- Test creating account with email only (existing behavior)
- Test creating account with username only (new)
- Test creating account with both email and username
- Test rejecting account with neither email nor username
- Test username validation (length, characters)

**Auth strategy:**
- Test login with email (existing)
- Test login with username (new)
- Test login with invalid username
- Test that username-only accounts cannot use password reset

**Set-password flow:**
- Test valid token sets password
- Test expired token is rejected
- Test invalid token is rejected
- Test that email is set when provided in admin_only_email mode
- Test that email is optional in admin_only_username mode

**Management API:**
- Test admin creating username-only user
- Test admin creating user with invite link
- Test admin creating user with password (no invite link)
- Test that invite link generation is blocked in user_signup_email mode

### 3. Podverse -- E2E tests

**New E2E specs:**

- `auth-admin-only-username.spec.ts` -- tests for the admin_only_username mode
  - Login with username
  - No signup form visible
  - No forgot password link
  - Set-password invite link flow
  - Password change via settings works
  - Password reset via email is blocked

- `auth-user-signup-email.spec.ts` -- update existing signup tests
  - Signup with email
  - Email verification flow
  - Password reset flow
  - Login with email
  - Login with username (if account has one)

**Update existing E2E specs:**
- Any spec that references `sign-up` or `contact-only` mode values
- Ensure existing email-based flows still work

### 4. Both repos -- verify all tests pass

- `npm run test:unit` in both repos
- `npm run lint && npm run type-check` in both repos
- Run relevant E2E specs

## Verification

- All Metaboost tests pass with renamed constants
- All Podverse tests pass with new signup mode support
- New tests cover all three modes
- No regressions in existing email-based flows
