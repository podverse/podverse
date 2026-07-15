# 01 — Auth bootstrap + post-login account hydrate

## Scope

Fix the two medium session-consistency gaps in mobile auth:

1. **Bootstrap split brain:** non-401 `/auth/me` failure sets `status: 'anonymous'` while tokens
   remain in React state and SecureStore.
2. **Post-login account null:** successful login / `setTokens` never loads `DTOAccount`.

## Preferred policy (locked for this plan)

### Bootstrap failure

When stored tokens exist and `/auth/me` fails with a **non-401** (timeout, network, 5xx):

- Do **not** present a clean anonymous shell while tokens remain.
- Prefer: keep tokens, set `status` to a distinct recoverable state **or** remain
  `'authenticated'` with `account: null` + `error: 'auth_bootstrap_failed'` and a UI retry path.
- Simplest scaffold-compatible choice (implement this unless product pushes otherwise):
  - On non-401 bootstrap failure: leave tokens, set `status: 'authenticated'`, `account: null`,
    `error: 'auth_bootstrap_failed'`.
  - App shell may show authenticated navigation with a non-blocking error, **or** a small
    bootstrap-error screen with Retry / Log out — keep UI minimal.
  - On **401** / refresh failure: keep existing `clearSession()` → `'anonymous'`.

If that authenticated-degraded path is too large for one prompt, acceptable minimal alternative:
clear SecureStore + in-memory tokens on non-401 bootstrap failure (fail closed to anonymous).
Document the choice in a short comment on `hydrateFromSecureStorage`.

### Post-login

After `loginWithMobileToken` succeeds (and after any path that calls `setTokens` for a new
session), load `/auth/me` with the new access token via `requestWithMobileAuthRefresh` (same as
hydrate). Set `account` before or immediately after marking authenticated. Failures:

- 401 → `clearSession`
- other → set `error` and still allow authenticated shell **or** fail closed — match bootstrap
  policy above.

## Files to change

- [apps/mobile/src/auth/AuthProvider.tsx](/apps/mobile/src/auth/AuthProvider.tsx) — hydrate catch
  branch; optional `status` / error UX helpers
- [apps/mobile/src/auth/loginWithMobileToken.ts](/apps/mobile/src/auth/loginWithMobileToken.ts)
  and/or LoginScreen / AuthProvider — post-login `/auth/me`
- [apps/mobile/App.tsx](/apps/mobile/App.tsx) — only if a distinct bootstrap/error UI is needed
- Optionally extract a shared `fetchAuthenticatedAccount(...)` helper under `src/auth/` to avoid
  duplicating `/auth/me` call shapes

## Do not

- Change E2E SecureStore wipe behavior (`__DEV__ && isE2e`)
- Reintroduce cookie / `withCredentials` auth for mobile login
- Run tests during agent work

## Verification (operator)

**Mobile Metro** + **Mobile E2E API** + E2E devices already up (see
[HOW-TO-RUN.md](/apps/mobile/e2e/HOW-TO-RUN.md)).

**Mobile Maestro:**

```bash
npm run mobile:e2e:test -- auth-login,auth-logout
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

Manual smoke (optional): with API down, launch app that has prior SecureStore tokens — confirm UI
is not a silent anonymous shell with leftover session.
