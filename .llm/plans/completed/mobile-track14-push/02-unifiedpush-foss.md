# 02 — UnifiedPush FOSS transport + missing wrappers (14.6)

**Cursor model:** Opus 4.8
**Detail:** 445
**Ship bar:** UnifiedPush transport wired behind the boundary; Gradle flavors stay Track 20.

## Goal

Provide an UnifiedPush implementation of the push boundary (from 01) for the FOSS flavor, using the
existing `/account/up-device/*` endpoints, and add the missing UP request wrappers.

## Context (read first)

- Detail 445.
- Wrappers: `packages/helpers-requests/src/api/account/unifiedpush/unifiedpush.ts`, `_request.ts`.
- API: `apps/api/src/routes/account.ts` (`/account/up-device/*`), DTO
  `packages/helpers/src/dtos/account/accountUPDevice.ts`.
- Web reference: `apps/web/src/contexts/Notifications.tsx` (UP device read).
- Skills: **mobile-fdroid-flavors**, **mobile-surface-async-errors**. Process: MOBILE-ONLY §4.

## Tasks

1. Implement the push boundary with UnifiedPush: acquire distributor endpoint; register via
   `reqAccountUPDeviceCreate` (`{ up_endpoint, up_auth_key | null }`); update/delete via wrappers.
2. **Add missing wrappers** + expose on `ApiRequestService`:
   `reqAccountUPDeviceUpdateLocale` (`PUT /account/up-device/update-locale`) and
   `reqAccountUPDeviceDeleteAll` (`DELETE /account/up-device/delete-all`).
3. Keep Firebase out of the FOSS transport path; playstore still uses FCM (01). Flavor **selection**
   is deferred to Track 20 — this step only makes the transport available + swappable.
4. Reuse 442's locale-change hook for UP locale updates.
5. Mark **14.6** `done` in master plan Tracks + Appendix C; detail 445 header `done`.

## Out of scope

- Gradle `productFlavors` (Track 20); tap routing (03); E2E (04).

## Acceptance

- UnifiedPush registration works via `reqAccountUPDeviceCreate`; new UP wrappers added + exposed.
- No Firebase symbols in the FOSS transport path.
