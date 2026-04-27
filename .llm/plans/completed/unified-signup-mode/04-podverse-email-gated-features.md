# Phase 04: Podverse email-gated features

**Repo:** Podverse only

## Goal

Gate all email-dependent features behind `canUseEmailVerificationFlows`. Username-only accounts should not see or be able to access email verification, password reset, or email change flows.

## Prerequisite

Phase 03 must be complete (capability matrix, mode support).

## Changes

### 1. API route gating

**`apps/api/src/routes/account.ts`**

The following endpoints must check `canUseEmailVerificationFlows` and return 403 when disabled:

- `POST /account/send-verification-email` -- email verification
- `POST /account/verify-email` -- email verification
- `POST /account/send-reset-password-email` -- password reset
- `POST /account/reset-password` -- password reset
- `POST /account/send-change-email-verification` -- email change
- `POST /account/verify-email-change` -- email change

### 2. Account-level email checks

For endpoints that operate on a specific account (not just the mode), also check whether the account has an email:

- Password reset: if account has no email, cannot send reset email (return appropriate error)
- Email verification: if account has no email, skip (already handled by mailer.disabled)
- Email change: if account has no email, return error "Account has no email address"

### 3. Web app -- hide email-dependent UI

**`apps/web/src/app/forgot-password/ForgotPasswordPageClient.tsx`**
- Redirect to login if `canUseEmailVerificationFlows` is false (same pattern as Metaboost)

**`apps/web/src/app/reset-password/ResetPasswordPageClient.tsx`**
- Redirect to login if `canUseEmailVerificationFlows` is false

**`apps/web/src/components/Modal/ModalAuthLogin.tsx`**
- Hide "Forgot Password" link when `canUseEmailVerificationFlows` is false

**`apps/web/src/app/sign-up/SignUpClient.tsx`**
- Update: when `admin_only_username` or `admin_only_email`, show "Contact admin" message (no public signup)
- When `user_signup_email`, show signup form

**Settings page (if it has email change):**
- Hide email change form when `canUseEmailVerificationFlows` is false
- Hide email field when account has no email

### 4. Login form adaptation

**`apps/web/src/components/Modal/ModalAuthLogin.tsx`**
- The login form should accept either email or username in the identifier field
- Update placeholder text to "Email or username" when both are possible
- Update label based on mode:
  - `admin_only_username`: label "Username"
  - `admin_only_email`: label "Email"
  - `user_signup_email`: label "Email or username"

### 5. Web runtime config

Ensure the web sidecar passes `canUseEmailVerificationFlows` and `canPublicSignup` capabilities to the client runtime config so the UI can adapt.

## Verification

- Username-only accounts cannot access password reset
- Username-only accounts cannot access email change
- Username-only accounts CAN change password via Settings (with current password)
- Web UI hides "Forgot Password" link in admin_only_username mode
- Web UI hides signup form in admin-only modes
- Email-based accounts are unaffected
