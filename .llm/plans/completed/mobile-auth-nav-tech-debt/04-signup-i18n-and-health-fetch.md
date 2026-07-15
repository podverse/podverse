# 04 — Signup copy + HelloWorld health fetch (optional polish)

## Scope

Lower-priority polish from the pre-commit nit list. **Deferrable** after Phases 1–2.

## Changes

### 1. Signup / validation user-facing strings

File: [apps/mobile/src/screens/auth/SignUpScreen.tsx](/apps/mobile/src/screens/auth/SignUpScreen.tsx)

Today the UI can show raw keys (`sign_up_failed`, `account_created_message`, validation key
strings from `@podverse/helpers-validation/client`).

- Prefer resolving through mobile i18n (`useTranslation`) with keys under the mobile catalog, **or**
  temporary plain English strings matching LoginScreen style.
- Keep `testID`s (`signup-error`, `signup-success`, etc.).
- Do not block on full parity with web signup copy.

### 2. HelloWorld API health `fetch`

File: [apps/mobile/src/screens/HelloWorldScreen.tsx](/apps/mobile/src/screens/HelloWorldScreen.tsx)

Health check uses raw `fetch(`${apiBaseUrl}/health`)`.

Options (pick one, keep scope small):

- **A (keep):** Leave `fetch` with a short comment that health is a UI smoke probe and intentionally
  bypasses `ApiRequestService` (no auth, absolute env URL already includes version prefix).
- **B (align):** Use `createMobileApiRequestService()?.apiRequest` (or a tiny health helper) if
  there is an existing health path helper — do not invent a large abstraction.

Default recommendation: **A** unless a health helper already exists and is one call away.

## Do not

- Expand into full signup product UX / email verification flows
- Run tests during agent work

## Verification (operator)

If only copy/comments changed: optional. If health request path changed:

```bash
npm run mobile:e2e:test -- api-health,hello-world
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
