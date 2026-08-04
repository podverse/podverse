# 01 — FCM integration + device register + locale + permission (14.1, 14.2, 14.3, 14.5)

**Cursor model:** Codex 5.3
**Details:** 440, 441, 442, 444
**Ship bar:** Playstore FCM registers on login with contextual permission. No tap routing (03).

## Goal

Stand up the playstore-flavor push transport behind a flavor-swappable boundary, register the device
on auth, keep locale in sync, and request permission contextually.

## Context (read first)

- Details 440 (integration), 441 (register), 442 (locale), 444 (permission).
- Wrappers: `packages/helpers-requests/src/api/account/fcm/fcm.ts`, `_request.ts` (expose new one).
- API: `apps/api/src/routes/account.ts` (`/account/fcm-device/*`), DTO
  `packages/helpers/src/dtos/account/accountFCMDevice.ts`.
- Hooks: `apps/mobile/src/auth/AuthProvider.tsx`, `apps/mobile/src/screens/auth/LoginScreen.tsx`,
  `apps/mobile/src/auth/mobileApi.ts`.
- i18n: `settings.notifications.*` (consumer); add mobile-overlay permission/open-settings keys.
- Skills: **mobile-expo-monorepo** (peer pins), **mobile-fdroid-flavors** (isolation),
  **mobile-surface-async-errors**, **native-deps-platform-mismatch**, **i18n-user-facing-strings**.

## Tasks

1. **Integration (14.1)** — Install + configure FCM (`expo install`); expose a flavor-isolated push
   boundary (`register/unregister/onMessage/onOpen`, token accessor + refresh listener). No Firebase
   symbols in shared paths.
2. **Register (14.2)** — Generate + persist a stable `installation_id`; register on login + on
   authenticated cold-start via `reqAccountFCMDeviceCreate` (`{ fcm_token, installation_id,
   platform }`); update on token refresh; delete on logout. Reuse a shared post-auth hook (same call
   sites as Track 16.2). Do not block login on failure.
3. **Locale (14.3)** — Add missing `reqAccountFCMDeviceUpdateLocale` wrapper + expose on
   `ApiRequestService`; call on locale change when registered + authenticated.
4. **Permission UX (14.5)** — Request permission only after an explicit user action; graceful denied
   path with open-settings affordance; register only after grant.
5. Mark **14.1, 14.2, 14.3, 14.5** `done` in master plan Tracks + Appendix C; detail headers `done`.

## Out of scope

- UnifiedPush FOSS (02); tap routing (03); E2E (04).

## Acceptance

- FCM token obtainable; device registers once (idempotent on `installation_id`); refresh updates.
- Locale wrapper added + wired; permission is contextual with graceful denied path.
