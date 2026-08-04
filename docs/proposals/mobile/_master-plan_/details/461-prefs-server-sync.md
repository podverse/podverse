# 461-prefs-server-sync

**Master step:** 16.2
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- On login / auth hydrate, **reconcile server account settings → device prefs** (DB wins for
  synced keys), mirroring web `Account.tsx`.
- On device pref change for **synced** keys, push device → server via the existing
  `@podverse/helpers-requests` account-settings wrappers.
- Synced keys v1 (match web server-backed settings):
  - **Playback** `preferred_media_type` (`audio` | `video`) → `PATCH /account-settings/playback`.
  - **Locale** override → `PATCH /account-settings/locale` (already partially wired via
    `applyAccountLocaleOverride`; formalize the write path).
  - **Listen stats** `allow_listen_stats` (boolean) → `PATCH /account-settings/listen-stats`.
  - **Notification types** create/delete → `POST` / `DELETE /account-settings/notification-type`.
- **Device-only** keys stay local (no server sync): `uit` theme, `aqc.rd` / `aqc.rp`,
  `home.subscriptionFilter`, `library.subscriptionFilter`, `downloads.auto_delete`, and the mobile
  home-tab `preferred_media_type` (home tab is NOT the web playback `pmt` — see naming note below).

## Naming note (must resolve in 16.1)

Mobile currently stores the **home-feed media tab** under AsyncStorage key `preferred_media_type`
(`podcasts|episodes|clips|artists|albums|tracks`), which collides semantically with web `pmt`
(`audio|video` playback preference). 16.1 must give the **playback** preference a distinct device
key (e.g. `pmt`) so 16.2 can sync it without clobbering the home-tab selection. Do not sync the
home-tab key to the server.

## Acceptance criteria

- After login, `account.account_settings.account_settings_playback.preferred_media_type` (when
  `audio` | `video`) is written to the device `pmt` store when it differs (DB wins), like web
  `Account.tsx`.
- Changing a synced pref while logged in fires the matching `reqAccountSettings*Update` wrapper via
  the bearer `ApiRequestService` from `apps/mobile/src/auth/mobileApi.ts`.
- Logged-out changes persist device-only and do not attempt a server call.
- Sync failures surface as non-blocking async errors (do not crash the settings screen); device
  value remains authoritative locally until next reconcile.
- No server sync for device-only keys (theme, auto-queue, filters, downloads, home-tab).

## Web parity references

- [`apps/web/src/contexts/Account.tsx`](/apps/web/src/contexts/Account.tsx) — DB → device reconcile
  effect for `preferred_media_type`.
- [`apps/web/src/components/Settings/Panels/SettingsGeneral/SettingsMediaTypeSelector.tsx`](/apps/web/src/components/Settings/Panels/SettingsGeneral/SettingsMediaTypeSelector.tsx)
  — device + server write pattern.
- [`packages/helpers-requests/src/api/accountSettings/accountSettings.ts`](/packages/helpers-requests/src/api/accountSettings/accountSettings.ts)
  — `reqAccountSettingsPlaybackUpdate`, `reqAccountSettingsLocaleUpdate`,
  `reqAccountSettingsListenStatsUpdate`, `reqAccountSettingsNotificationType{Create,Delete}`.
- [`apps/api/src/routes/accountSettings.ts`](/apps/api/src/routes/accountSettings.ts) — endpoints.

## Mobile wiring points

- [`apps/mobile/src/auth/AuthProvider.tsx`](/apps/mobile/src/auth/AuthProvider.tsx) —
  `hydrateFromSecureStorage` post-`setAccount` reconcile hook.
- [`apps/mobile/src/screens/auth/LoginScreen.tsx`](/apps/mobile/src/screens/auth/LoginScreen.tsx)
  and `SignUpScreen` — post-login `setAccount` reconcile hook.
- [`apps/mobile/src/auth/mobileApi.ts`](/apps/mobile/src/auth/mobileApi.ts) — bearer
  `createMobileApiRequestService(accessToken)`; confirm wrappers work with `authContext.mode: 'bearer'`.
- Prefs store from 16.1 (`apps/mobile/src/prefs`) — read/write synced keys.

## Out of scope

- New API endpoints (all exist).
- Conflict resolution beyond "DB wins on reconcile, last write wins on push" (advanced offline sync
  is Track 21.6 deferral).
- Video playback enclosure resolution changes (audio-first resolver stays; `pmt` is stored/synced
  even if video playback lands later).

## Verification

```bash
grep -rq "reqAccountSettingsPlaybackUpdate\|reqAccountSettingsLocaleUpdate" apps/mobile/src
npm run test -w apps/mobile
```
