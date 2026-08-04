# Track 16 — Device prefs, prefs server sync, settings screen

**Phase slug:** `mobile-track16-prefs-settings`
**Master steps:** 16.1–16.3
**Detail IDs:** 460, 461, 462
**Parallel group:** PG-9 (with Tracks 14, 15; this set is the Track 16 prefs/settings slice only —
OPML 16.4–16.10 already `done`)
**Ship bar:** Functional unified prefs store + working Settings screen (theme, locale, playback
defaults, notification toggles) + server sync for synced keys. No Track 23 visual polish; no
freestyle redesign.

## Prerequisites (all done)

- Track 7.11–7.16 theme scaffold — `ThemeProvider`, `useTheme()`, `uit` persistence, StatusBar.
- Track 17 i18n runtime — `settings.ui_theme.*`, `language.*`, `settings.*` catalog keys exist
  (shared + consumer layers).
- Auth + account snapshot — `AuthProvider`, `accountRepository`, bearer `mobileApi`.
- Account-settings API + `@podverse/helpers-requests` wrappers already exist (no new endpoints).

## Current state (from exploration)

- **No unified prefs store.** Prefs are split per-domain under `apps/mobile/src/prefs/`
  (`uiTheme.ts`, `autoQueuePrefs.ts`, `preferredMediaType.ts`, `subscriptionFilter.ts`,
  `downloadPrefs.ts`). 16.1 unifies these behind one API without breaking callers.
- **Settings screen is a placeholder** (`MoreSettingsScreen` → `PlaceholderScreen`).
- **No server sync on login** except locale side-effect (`applyAccountLocaleOverride`).

## Locked decisions

| Topic                    | Choice                                                                        |
| ------------------------ | ----------------------------------------------------------------------------- |
| Prefs storage            | **AsyncStorage** (keep; MMKV NOT adopted v1) behind a unified `prefs` module  |
| Theme id set             | `dark, light, dracula, violet, ember, dawn` from `@podverse/design-tokens`    |
| Custom operator themes   | **Out of scope v1** (web-only via env)                                        |
| `pmt` naming clash        | 16.1 gives web playback pref a distinct key (`pmt`); mobile home-tab key stays |
| Synced keys              | `pmt` (playback), locale, listen-stats, notification-types                    |
| Device-only keys         | `uit`, `aqc.rd`, `aqc.rp`, subscription filters, `downloads.auto_delete`, home-tab |
| Sync conflict policy     | DB wins on login reconcile; last-write-wins on push (advanced sync = 21.6)    |
| Settings UI strings      | i18n only (`settings.*`, `language.*`) — no hardcoded English                 |

## Model mix

| Model     | Steps            |
| --------- | ---------------- |
| Codex 5.3 | 16.1, 16.2, 16.3 |

## After this phase

- Track 14 push notifications and Track 15 deep links (PG-9 siblings).
- Track 23 operator visual polish (only after feature bulk + operator screen briefs).
