# 02 — Auth screens i18n + account locale override

## Scope

Wire product copy on auth surfaces through `useTranslation()` / `t()`, resolve signup validation
keys via `authentication.*`, and call `applyAccountLocaleOverride` after successful `/auth/me`
(bootstrap + post-login).

Prerequisite: [01-catalog-keys.md](./01-catalog-keys.md) complete.

## Files

- `apps/mobile/src/screens/auth/LoginScreen.tsx`
- `apps/mobile/src/screens/auth/SignUpScreen.tsx`
- `apps/mobile/src/screens/HelloWorldScreen.tsx` (auth CTAs only: Log in / Sign up / Log out)
- `apps/mobile/src/auth/AuthProvider.tsx` (locale override after hydrate / `setAccount`)

## Implementation notes

### LoginScreen

- `const { t } = useTranslation();`
- Map UI:
  - Title → `authentication.login`
  - Email / Password labels → `authentication.email` / `authentication.password`
  - Submit → `misc.submit` (or loading → `misc.loading`)
  - Switch CTA → `authentication.need_an_account_sign_up` (or key from 01)
  - Errors: `authentication.invalid_email_or_password`, `authentication.mobile_api_not_configured`,
    `authentication.session_expired`, `authentication.signed_in_account_load_failed`,
    `authentication.could_not_sign_in`
- Keep all `testID`s (`login-screen`, `login-email`, `login-password`, `login-submit`,
  `login-error`, switch CTA ids).

### SignUpScreen

- Same pattern for titles/labels/buttons (`authentication.sign_up`, `create_account`,
  `confirm_password`, switch CTA).
- **Validation:** today `validateInputs()` returns keys like `invalid_email`, `invalid_password`,
  `password_mismatch` but the UI shows a generic English string. Resolve with
  `t(\`authentication.${key}\`)` (or equivalent safe map) when the key is one of the known
  validation keys; keep a fallback `t('authentication...')` for unexpected keys.
- Success → `authentication.account_created_message`.
- Keep `signup-*` testIDs.

### HelloWorldScreen auth CTAs

- Replace hardcoded “Log in” / “Sign up” / “Log out” button labels with
  `authentication.login` / `sign_up` / `logout`.
- Leave locale code buttons (`en-US` / `es`), debug smoke lines, and `test.hello_world` as they
  are (debug / already localized).

### Account locale override

After `setAccount(account)` succeeds in:

1. `AuthProvider` hydrate (`/auth/me` success path), and
2. LoginScreen post-login `/auth/me` success path (and any equivalent `setAccount` in AuthProvider
   if login is centralized),

call:

```ts
await applyAccountLocaleOverride(
  account.account_settings?.account_settings_locale?.locale
);
```

Import from `apps/mobile/src/i18n` (or existing barrel). Swallow nothing silently — if change fails,
log per existing mobile logging patterns; do not clear the session for locale-only failures.

## Acceptance criteria

- No hardcoded product auth strings remain in Login/SignUp (or HelloWorld auth CTAs).
- Signup validation keys resolve to localized `authentication.*` strings.
- Authenticated hydrate applies account locale when present.
- All existing auth-related Maestro testIDs unchanged.

## Verification (operator)

Prereqs already running: **Mobile Metro** `npm run mobile:dev:e2e`, **Mobile E2E API**, E2E
devices installed (HOW-TO-RUN).

**Mobile Maestro:**

```bash
npm run mobile:e2e:test -- auth-login,auth-logout
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
