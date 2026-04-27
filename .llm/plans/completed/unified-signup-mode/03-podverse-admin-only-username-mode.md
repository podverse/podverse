# Phase 03: Podverse admin_only_username mode

**Repo:** Podverse only

## Goal

Implement the `admin_only_username` mode: management admins can create username-only accounts with optional invite links. No public signup. No email flows.

## Prerequisite

Phase 02 must be complete (nullable email, username column, updated type values).

## Changes

### 1. Capability matrix (shared with Metaboost pattern)

Add a `getAccountSignupModeCapabilities()` function to `packages/helpers/`:

| Capability | admin_only_username | admin_only_email | user_signup_email |
|---|---|---|---|
| `canPublicSignup` | false | false | true |
| `canUseEmailVerificationFlows` | false | true | true |
| `canIssueAdminInviteLink` | true | true | false |
| `requiresEmailAtInviteCompletion` | false | true | false |

### 2. Management API -- create user endpoint

**`apps/management-api/src/controllers/usersController.ts`** (new or extend existing)

Add a `POST /users` endpoint (or extend the existing admin account creation):
- Accepts `username` (required), `email` (optional), `password` (optional)
- If `password` is provided: create account with that password
- If `password` is NOT provided AND `canIssueAdminInviteLink`:
  - Set a random placeholder password hash
  - Create an `AccountSetPassword` verification token (new entity, similar to Metaboost's pattern)
  - Return the set-password invite link
- If `password` is NOT provided AND `!canIssueAdminInviteLink` (i.e., `user_signup_email`): return 400
- If email is provided and mode has email flows: mark email as verified immediately
- If email is provided and mode is `admin_only_username`: store email but do NOT verify (or verify immediately since admin provided it)

### 3. AccountSetPassword entity (new)

**`packages/orm/src/entities/account/accountSetPassword.ts`** (new file)

Similar to `AccountVerification` and `AccountResetPassword`:
- `account_id` (FK to Account)
- `token` (varchar, GUID)
- `expires_at` (timestamp)

### 4. API -- set-password endpoint

**`apps/api/src/routes/account.ts`**

Add `POST /account/set-password`:
- Validates token from `AccountSetPassword`
- Checks `canIssueAdminInviteLink` capability
- Validates `password` (min 8 chars, same rules as signup)
- If `requiresEmailAtInviteCompletion`: also requires `email` field
- If `!requiresEmailAtInviteCompletion` (`admin_only_username`): `email` is optional
- Hashes password, updates `AccountCredentials`
- Optionally sets email if provided and currently null
- Marks email as verified if set
- Deletes the `AccountSetPassword` record
- Returns success

### 5. Startup validation per mode

**`apps/api/src/lib/startup/validation.ts`**

Update the mailer validation section:
- `admin_only_username`: mailer env vars should NOT be set (or at minimum are not required)
- `admin_only_email` and `user_signup_email`: mailer env vars are REQUIRED
- Similar to Metaboost's `validateOptionalUnset()` for username mode

### 6. Management-web user form updates

**`apps/management-web/`**

Update the user creation form:
- Show `username` field
- Show `email` field (optional in `admin_only_username`, required in `admin_only_email`)
- Show `password` field (optional -- when omitted, generates invite link)
- Display invite link when generated (copy button)

### 7. Update config mailer disabled logic

**`apps/api/src/config/index.ts`**

Ensure `mailer.disabled` correctly maps to the new modes:
- `admin_only_username` -> disabled (no mailer needed)
- `admin_only_email` -> enabled if all mailer env vars set
- `user_signup_email` -> enabled if all mailer env vars set

## Verification

- Management API can create username-only accounts
- Set-password invite link flow works end-to-end
- Startup validation enforces correct mailer requirements per mode
- Username-only accounts can log in
- Email-based accounts are unaffected
