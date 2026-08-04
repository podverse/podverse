# 02 — Prefs server sync (16.2)

**Cursor model:** Codex 5.3
**Detail:** 461
**Ship bar:** Login reconcile + change-push for synced keys. No new endpoints.

## Goal

Sync **server-backed** account settings with the device prefs store from 01: on login reconcile
DB → device (DB wins), and on change of a synced key push device → server, mirroring web
`Account.tsx` + `SettingsMediaTypeSelector.tsx`.

## Context (read first)

- Detail 461 (`docs/proposals/mobile/_master-plan_/details/461-prefs-server-sync.md`).
- Web parity: `apps/web/src/contexts/Account.tsx` (DB → device reconcile),
  `apps/web/src/components/Settings/Panels/SettingsGeneral/SettingsMediaTypeSelector.tsx`.
- Request wrappers: `packages/helpers-requests/src/api/accountSettings/accountSettings.ts`
  (`reqAccountSettingsPlaybackUpdate`, `reqAccountSettingsLocaleUpdate`,
  `reqAccountSettingsListenStatsUpdate`, `reqAccountSettingsNotificationType{Create,Delete}`).
- API routes: `apps/api/src/routes/accountSettings.ts`.
- Mobile wiring: `apps/mobile/src/auth/AuthProvider.tsx` (`hydrateFromSecureStorage`),
  `apps/mobile/src/screens/auth/LoginScreen.tsx`, `SignUpScreen`,
  `apps/mobile/src/auth/mobileApi.ts` (bearer service), `apps/mobile/src/i18n/index.ts`
  (`applyAccountLocaleOverride`).
- Prefs store from 01 (`apps/mobile/src/prefs`).
- Skills: **mobile-data-layer**, **mobile-surface-async-errors**. Rules:
  **eqeqeq-strict-equality**, **avoid-type-assertions**, **api-no-pii-credentials-in-responses**.

## Tasks

1. **Reconcile on login/hydrate (DB → device)** — After `setAccount(account)` in `AuthProvider`
   hydrate, `LoginScreen`, and `SignUpScreen`, reconcile
   `account.account_settings.account_settings_playback.preferred_media_type` (when `audio`|`video`)
   into the device `pmt` store when it differs. Keep the existing locale override behavior;
   formalize it alongside the playback reconcile. Extract a shared helper
   (e.g. `apps/mobile/src/auth/syncAccountPrefs.ts`) so all three call sites reuse it.
2. **Push on change (device → server)** — When a **synced** pref changes while logged in, call the
   matching `reqAccountSettings*Update` wrapper via `createMobileApiRequestService(accessToken)`:
   - `pmt` → `reqAccountSettingsPlaybackUpdate({ preferred_media_type })`
   - locale → `reqAccountSettingsLocaleUpdate({ locale })`
   - listen-stats → `reqAccountSettingsListenStatsUpdate({ allow_listen_stats })`
   - notification types → `reqAccountSettingsNotificationType{Create,Delete}({ type })`
3. **Logged-out safety** — When no access token, persist device-only; do not attempt a server call.
4. **Error handling** — Surface sync failures as non-blocking async errors; device value stays
   authoritative locally until the next reconcile. Do not crash callers.
5. **Bearer confirm** — Verify wrappers work with `authContext.mode: 'bearer'` (wrappers pass
   `withCredentials: true` for web cookies; bearer should still succeed). Note any adjustment.
6. Mark **16.2** `done` in master plan Tracks + Appendix C; set detail 461 header `**Status:** done`.

## Out of scope

- Settings screen UI (03) — this prompt provides the sync helpers it will call.
- Device-only keys (theme, auto-queue, filters, downloads, home-tab) — never synced.
- New endpoints or DTO changes.
- Advanced offline conflict resolution (Track 21.6 deferral).

## Acceptance

- Post-login, DB `preferred_media_type` overrides device `pmt` when different (DB wins).
- Changing a synced pref while logged in fires the correct wrapper; logged-out does not.
- Sync failures do not crash; device value persists locally.
- No server calls for device-only keys.
