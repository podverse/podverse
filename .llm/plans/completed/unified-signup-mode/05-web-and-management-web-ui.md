# Phase 05: Web and management-web UI

**Repo:** Podverse only

## Goal

Update the Podverse web app and management-web app to fully support all three signup modes with proper UI adaptation.

## Prerequisite

Phase 04 must be complete (feature gating in place).

## Changes

### 1. Runtime config for capabilities

**`apps/web/sidecar/src/server.ts`**
- Pass `canPublicSignup`, `canUseEmailVerificationFlows`, `canIssueAdminInviteLink` to the runtime config
- These are derived from `NEXT_PUBLIC_ACCOUNT_SIGNUP_MODE` (which maps to `ACCOUNT_SIGNUP_MODE`)

**`apps/web/src/config/runtime-config-store.ts`**
- Add capability fields to the runtime config type and store

### 2. Auth pages

**Signup page (`/sign-up`)**
- `admin_only_username` / `admin_only_email`: Show "Contact your administrator" message (no self-signup)
- `user_signup_email`: Show existing signup form with email + password
- Add username field to signup form when `user_signup_email` (or always show it)

**Login page/modal**
- Single identifier field that accepts email or username
- Label adapts to mode (see Phase 04)
- "Forgot Password" link: shown only when `canUseEmailVerificationFlows`
- "Sign Up" link: shown only when `canPublicSignup`

**Set-password page (new: `/set-password?token=...`)**
- New page for completing admin invite link
- Shows password + confirm password fields
- If `requiresEmailAtInviteCompletion`: also shows email field (required)
- If `!requiresEmailAtInviteCompletion` (`admin_only_username`): email field optional or hidden
- Username field if needed

### 3. Settings page updates

**Account settings**
- "Change Password" section: always available (requires current password)
- "Email" tab or section: only shown when `canUseEmailVerificationFlows` AND account has an email
- "Change Email" form: only when `canUseEmailVerificationFlows`
- Display name/bio: always available

### 4. Management-web user form

**User creation form**
- Mode-aware form that adapts to `ACCOUNT_SIGNUP_MODE`:
  - `admin_only_username`: username required, email optional, password optional (invite link if omitted)
  - `admin_only_email`: email required, username optional, password optional (invite link if omitted)
  - `user_signup_email`: email required, username optional, password optional
- When password is omitted and invite link is generated, display the link with copy button
- Validation: at least one of email or username required

**User detail/edit page**
- Show both email and username fields
- Handle null email gracefully (show "Not set" or similar)
- Password reset option for management admins

### 5. i18n updates

Add/update translation keys for:
- "Username" / "Email or username" labels
- "Contact your administrator" message
- "Set your password" page title and instructions
- "Invite link" label and copy button text
- "Not set" for missing email

## Verification

- Login works with both email and username identifiers
- Signup form is hidden in admin-only modes
- Set-password page works for admin invite links
- Settings page hides email tab when no email verification flows
- Management-web user form creates accounts correctly per mode
- All i18n translations are complete
