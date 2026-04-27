# Phase 02: Podverse nullable email and username

**Repo:** Podverse only

## Goal

Make `AccountCredentials.email` nullable and add a `username` column (nullable, unique). Update the ORM entity, account creation service, and auth strategy to support login with either email or username.

## Why

Currently Podverse requires email for every account. To support `admin_only_username` mode, email must be nullable and a username field must exist as an alternative identifier.

## Changes

### 1. Database migration

Create a new migration in `infra/k8s/base/db/source/`:

```sql
-- Add username column to account_credentials
ALTER TABLE account_credentials ADD COLUMN username VARCHAR(...);
-- Make email nullable
ALTER TABLE account_credentials ALTER COLUMN email DROP NOT NULL;
-- Add unique constraint on username
ALTER TABLE account_credentials ADD CONSTRAINT uq_account_credentials_username UNIQUE (username);
-- Add check constraint: at least one of email or username must be non-null
ALTER TABLE account_credentials ADD CONSTRAINT chk_account_credentials_email_or_username CHECK (
  email IS NOT NULL OR username IS NOT NULL
);
```

### 2. ORM entity changes

**`packages/orm/src/entities/account/accountCredentials.ts`**
- Change `email` from `string` to `string | null`, add `nullable: true`
- Add `username` column: `string | null`, `nullable: true`, `unique: true`
- Add length constants matching Metaboost's approach

### 3. Account creation service

**`packages/orm/src/services/account/account.ts`**
- `create()` method: accept optional `username` alongside `email`
- Validate: at least one of email or username must be provided
- If email is provided, validate format (existing `validateEmail()`)
- If username is provided, validate format (new `validateUsername()` -- length, allowed chars)
- Both are nullable in the insert, but the check constraint enforces at-least-one

### 4. Username validation helper

**`packages/helpers-validation/`** (or appropriate package)
- Add `validateUsername()`: length constraints (e.g., 3-50 chars), allowed characters (alphanumeric + underscore/dash), no whitespace
- Add client-side helper `getUsernameErrorKey()` for web forms

### 5. Auth strategy -- support email or username login

**`apps/api/src/lib/auth/index.ts`**

Current: `LocalStrategy` uses `usernameField: 'email'`.

New approach:
- Accept a generic `identifier` field (or check both `email` and `username` body fields)
- In the strategy verify callback:
  1. If the identifier looks like an email (contains `@`), look up by `AccountCredentials.email`
  2. Otherwise, look up by `AccountCredentials.username`
- Alternative: keep `usernameField: 'email'` and add a second `usernameField: 'username'` strategy, or use a custom strategy that checks both

**`apps/api/src/lib/auth/index.ts` line 163-168** (post-login JWT generation):
- Currently requires `account_credentials.email`. Must handle the case where email is null (use username as fallback for the JWT subject/claims).

### 6. Update AccountSignupMode type

**`packages/helpers/src/lib/accountSignupMode.ts`**
- Change from `'sign-up' | 'contact-only'` to `'admin_only_username' | 'admin_only_email' | 'user_signup_email'`
- Remove `'sign-up'` and `'contact-only'` values

### 7. Update startup validation

**`apps/api/src/lib/startup/validation.ts`**
- Update `validateSignupMode()` to accept the three new values
- Update `ACCOUNT_SIGNUP_MODE` validation in `packages/helpers-config/src/startupValidation.ts`

### 8. Update config

**`apps/api/src/config/index.ts`**
- Update `mailer.disabled` to check for `admin_only_username` mode (not just `!== 'sign-up'`)
- Update `config.premium.signupMode` type

### 9. Update env files

- `infra/k8s/base/api/source/api.env` -- change `ACCOUNT_SIGNUP_MODE=contact-only` to `ACCOUNT_SIGNUP_MODE=admin_only_email` (or appropriate default)
- `infra/k8s/base/web/source/web-sidecar.env` -- change `NEXT_PUBLIC_ACCOUNT_SIGNUP_MODE=sign-up` to `NEXT_PUBLIC_ACCOUNT_SIGNUP_MODE=user_signup_email` (or appropriate)
- `apps/api/.env.example` -- update value comments
- `k.podcastdj.com/apps/podverse-alpha/api/source/api.env` -- update

### 10. Update web sidecar validation

**`apps/web/sidecar/src/server.ts`**
- Update signup mode validation to accept the three new values

## Verification

- ORM entity compiles with nullable email and new username column
- Existing email-based accounts still work (no regression)
- Login works with email (existing flow)
- Login works with username (new flow, for accounts that have username)
- Account creation validates at-least-one constraint
- Startup validation accepts the three new mode values
