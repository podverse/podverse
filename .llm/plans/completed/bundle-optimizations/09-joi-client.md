# Plan 09: Remove joi from Client Bundle

## Goal

Remove **joi** (~165 KB parsed) from the web app client bundle. Validation behavior stays the same; only the implementation and bundle boundary change.

## Cause

- [packages/helpers-validation](packages/helpers-validation) depends on **joi** and uses it for email/password validation.
- [apps/web](apps/web) depends on `@podverse/helpers-validation` and uses it for:
  - [AuthForgotPasswordForm](apps/web/src/components/Auth/AuthForgotPasswordForm.tsx), [AuthSignUpForm](apps/web/src/components/Auth/AuthSignUpForm.tsx), [AuthResetPasswordForm](apps/web/src/components/Auth/AuthResetPasswordForm.tsx), [AuthEmailChangeForm](apps/web/src/components/Auth/AuthEmailChangeForm.tsx)
  - [ModalChangeEmail](apps/web/src/components/Settings/Panels/SettingsAccount/ModalChangeEmail.tsx)
  - [SettingsNotifications](apps/web/src/components/Settings/Panels/SettingsNotifications/SettingsNotifications.tsx) (`validateHttpsUrl`)
  - [urlValidator](apps/web/src/utils/proxy/urlValidator.ts) (`validateHttpOrHttpsUrl`, `validateUrlForSSRF`)

That pulls joi into the client bundle. The API and server-side validation should keep using joi where appropriate.

## Scope

- `packages/helpers-validation` — split or refactor so client-safe validators don't depend on joi.
- `apps/web` — use client-safe validation only; keep joi out of client imports.
- API / server code that uses helpers-validation with joi — unchanged except for any new server-only exports.

## Implementation options

### Option A (recommended): Split helpers-validation

- **Client-safe helpers**: minimal validators (regex, length checks, URL format checks) used by web. No joi. Export from e.g. `@podverse/helpers-validation/client` or a dedicated `helpers-validation-client` package.
- **Server/API helpers**: keep joi-based validation in existing modules; export from main `@podverse/helpers-validation` for API and server use.
- **apps/web**: import only from the client-safe surface. Auth forms, `urlValidator`, and settings use those validators; API calls still get server-side joi validation.

### Option B: Use zod for client-only validation

- **apps/web** already has **zod** in [package.json](apps/web/package.json). Add client-side validation (forms, `urlValidator`) using zod instead of helpers-validation for those code paths.
- Keep **joi** in `@podverse/helpers-validation` for API and server. Ensure web never imports joi or any module that imports joi (e.g. no direct use of helpers-validation's joi-based exports in client components or client-only utils).

Implement either Option A or B; both achieve "joi not in client bundle."

## Verification

1. `npm run build:packages` then `npm run build` in `apps/web`.
2. `cd tools/web-perf/bundle-analyzer && npm run analyze:web` with a new report name (e.g. `post-joi-client-removal`).
3. Confirm joi (or `joi/dist`) is no longer present in the client bundle treemap.
4. Manually test: sign-up, sign-in, forgot password, reset password, email change, notification URL validation, proxy URL validation. Ensure validation behavior and error messages match previous behavior.
5. `npm run lint` passes; API and server-side validation still use joi where intended.

## Success criteria

- joi is not in the web app client bundle.
- Client-side validation behavior is unchanged for auth, settings, and URL validation.
- API and server continue to use joi for validation where appropriate.
