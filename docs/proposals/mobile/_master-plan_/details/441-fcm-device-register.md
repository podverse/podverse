# 441-fcm-device-register

**Master step:** 14.2
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Register the device with the server on login / auth bootstrap using the existing
  `reqAccountFCMDeviceCreate` wrapper (`POST /account/fcm-device/create`).
- Body: `{ fcm_token, installation_id, platform: 'android' | 'ios' }`.
- Generate + persist a stable `installation_id` (none exists today) — e.g. a UUID stored in
  SecureStore/AsyncStorage, created once per install.
- Update on token refresh via `reqAccountFCMDeviceUpdate` (`PUT /account/fcm-device/update`).
- Deregister on logout via `reqAccountFCMDeviceDelete`.

## Acceptance criteria

- On successful login and on authenticated cold-start, the device registers once (idempotent on
  `installation_id`).
- Token refresh updates the server record.
- Logout deletes the device record.
- Logged-out state performs no registration.

## Web parity references

- `packages/helpers-requests/src/api/account/fcm/fcm.ts` (`reqAccountFCMDevice*`).
- `apps/api/src/routes/account.ts` (`/account/fcm-device/*`), DTO
  `packages/helpers/src/dtos/account/accountFCMDevice.ts`.
- Mobile hooks: `apps/mobile/src/auth/AuthProvider.tsx`,
  `apps/mobile/src/screens/auth/LoginScreen.tsx`, `apps/mobile/src/auth/mobileApi.ts`
  (`createMobileApiRequestService`).

## Architecture notes

- Reuse a shared post-auth hook (same call sites as Track 16.2 prefs sync) to register the device.
- Token from 440's accessor; do not block login on registration failure (surface async error).

## Verification

```bash
grep -rq "reqAccountFCMDeviceCreate\|installation_id" apps/mobile/src
npm run test -w apps/mobile
```
