# 445-unifiedpush-foss-flavor

**Master step:** 14.6
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Integrate **UnifiedPush** as the FOSS-flavor push transport (no Firebase), via the existing
  `/account/up-device/*` endpoints. Swap in behind the flavor-isolated push boundary from 440.
- Register endpoint via `reqAccountUPDeviceCreate` (`{ up_endpoint, up_auth_key | null }`);
  update/delete via the matching wrappers.
- **Add missing wrappers** where server endpoints exist but wrappers do not:
  `reqAccountUPDeviceUpdateLocale` (`PUT /account/up-device/update-locale`) and
  `reqAccountUPDeviceDeleteAll` (`DELETE /account/up-device/delete-all`).
- Full Gradle `productFlavors` (playstore vs FOSS) remain **Track 20**; this step wires the client
  transport + registration so Track 20 can select it.

## Acceptance criteria

- UnifiedPush distributor endpoint acquired and registered via `reqAccountUPDeviceCreate`.
- New UP wrappers (`updateLocale`, `deleteAll`) added + exposed on `ApiRequestService`.
- No Firebase symbols in the FOSS transport path.
- Playstore flavor still uses FCM (440–442); selection deferred to Track 20 flavors.

## Web parity references

- `apps/web/src/contexts/Notifications.tsx` (UP device read reference).
- `packages/helpers-requests/src/api/account/unifiedpush/unifiedpush.ts` (add wrappers here).
- `apps/api/src/routes/account.ts` (`/account/up-device/*`), DTO
  `packages/helpers/src/dtos/account/accountUPDevice.ts`.
- Skill: **mobile-fdroid-flavors**; process doc MOBILE-ONLY-FEATURES §4.

## Architecture notes

- Push boundary interface (from 440) has `register/unregister/onMessage/onOpen`; provide an
  UnifiedPush implementation. Locale + delete-all reuse 442's locale-change hook.

## Verification

```bash
grep -rq "reqAccountUPDeviceCreate\|reqAccountUPDeviceUpdateLocale\|reqAccountUPDeviceDeleteAll" packages/helpers-requests/src apps/mobile/src
npm run build:packages
```
