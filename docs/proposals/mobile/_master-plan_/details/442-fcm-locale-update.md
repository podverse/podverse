# 442-fcm-locale-update

**Master step:** 14.3
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Update the FCM device locale on the server when the app locale changes, via
  `PUT /account/fcm-device/update-locale` (`{ locale }`).
- **Add the missing request wrapper** `reqAccountFCMDeviceUpdateLocale` in
  `packages/helpers-requests` (endpoint exists server-side; wrapper does not) and expose it on
  `ApiRequestService`. Mirror for UnifiedPush (`reqAccountUPDeviceUpdateLocale`) for the FOSS flavor
  (14.6) if trivially parallel.
- Trigger on locale change (Track 17 locale detection / Track 16.2 locale sync) when a device is
  registered and the user is authenticated.

## Acceptance criteria

- New `reqAccountFCMDeviceUpdateLocale` wrapper added + exported + on `ApiRequestService`.
- Locale change while registered updates the server device locale.
- No call when unregistered / logged out.

## Web parity references

- `apps/api/src/routes/account.ts` (`/account/fcm-device/update-locale`, shared `localeBodySchema`).
- `packages/helpers-requests/src/api/account/fcm/fcm.ts` (add wrapper here).
- `packages/helpers-requests/src/api/_request.ts` (expose on service).
- Locale source: `apps/mobile/src/i18n/index.ts` (`applyAccountLocaleOverride`), Track 16.2.

## Verification

```bash
grep -rq "reqAccountFCMDeviceUpdateLocale" packages/helpers-requests/src apps/mobile/src
npm run build:packages
```
