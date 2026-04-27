# Unified signup mode -- summary

## Problem

Podverse and Metaboost use different env var names and values to control signup/auth behavior:
- **Podverse**: `ACCOUNT_SIGNUP_MODE` with values `'sign-up'`, `'contact-only'`
- **Metaboost**: `AUTH_MODE` with values `'admin_only_username'`, `'admin_only_email'`, `'user_signup_email'`

Both should use `ACCOUNT_SIGNUP_MODE` with the same three values. Podverse needs a new `admin_only_username` mode.

## New unified values

| Value | Public self-signup | Email verification flows | Admin invite link | Mailer required |
|-------|-------------------|--------------------------|-------------------|-----------------|
| `admin_only_username` | No | No | Yes | No |
| `admin_only_email` | No | Yes | Yes | Yes |
| `user_signup_email` | Yes | Yes | No | Yes |

## Key constraints

1. **`admin_only_username`** accounts are created ONLY by management admins. No public signup form.
2. Email and username-only accounts may coexist in the same database.
3. Features that require email (password reset, email verification, email change) must be gated behind `canUseEmailVerificationFlows`.
4. Username-only accounts can only change passwords via: (a) the Settings page with current password, or (b) a management admin forcing a reset.
5. Podverse must add a `username` column to `AccountCredentials` (nullable, unique).
6. Podverse must make `email` nullable in `AccountCredentials` (currently required + unique).
7. At least one of email or username must be non-null for any account.

## Definition of done

- [ ] Both repos use `ACCOUNT_SIGNUP_MODE` with values `admin_only_username`, `admin_only_email`, `user_signup_email`
- [ ] Podverse supports username-only accounts (nullable email, nullable username, at-least-one constraint)
- [ ] Podverse login accepts either email or username as the identifier
- [ ] Management API can create username-only accounts with optional invite link
- [ ] Email-dependent features are hidden/disabled for username-only accounts
- [ ] Web UI adapts to all three modes
- [ ] All existing tests pass; new tests cover the three modes
- [ ] No regressions in existing email-based flows
