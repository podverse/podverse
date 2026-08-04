# 03 — Settings screen (16.3) — final

**Cursor model:** Codex 5.3
**Detail:** 462
**Ship bar:** Functional settings screen (theme, locale, playback defaults, notification toggles).
No Track 23 polish; no freestyle redesign. Archive the plan set when done.

## Goal

Replace the `MoreSettingsScreen` placeholder with a functional Settings screen that reads/writes the
unified prefs store (01) and uses the sync helpers (02), with i18n labels and web-parity theme ids.

## Context (read first)

- Detail 462 (`docs/proposals/mobile/_master-plan_/details/462-settings-screen.md`).
- Placeholder + route: `apps/mobile/src/navigation/index.tsx` (`MoreSettingsScreen`,
  route `MoreSettings`, deep link `more/settings`, `testID="more-settings"`).
- Web parity:
  `apps/web/src/components/Settings/Panels/SettingsGeneral/SettingsThemeSelector.tsx`,
  `SettingsMediaTypeSelector.tsx`.
- Theme: `apps/mobile/src/theme/useTheme.ts` (`setUITheme`), `packages/design-tokens/src/uiTheme.ts`
  (`ALL_POSSIBLE_THEMES`).
- Prefs store (01) + sync helpers (02).
- i18n keys: `packages/i18n-catalog/shared/originals/en-US.json` (`settings.ui_theme.*`,
  `language.*`), `packages/i18n-catalog/consumer/originals/en-US.json`
  (`settings.settings`, `settings.preferred_media_type.*`, `settings.account.*`,
  `settings.notifications.*`). Add any missing mobile-specific keys to
  `packages/i18n-catalog/mobile/originals/en-US.json`.
- Skills: **mobile-theme-parity**, **i18n-user-facing-strings**, **reusable-components**,
  **mobile-surface-async-errors**. Rules: **css / theme tokens**, **avoid-type-assertions**,
  **eqeqeq-strict-equality**.

## Tasks

1. **Theme selector** — List the six web theme ids (`dark, light, dracula, violet, ember, dawn`)
   from `ALL_POSSIBLE_THEMES`; labels from `settings.ui_theme.{id}`. On change call `setUITheme`
   (persists `uit` via 01, updates colors + StatusBar immediately without restart).
2. **Locale picker** — Options from `language.languages.*`; on change persist locale pref and call
   the 02 locale sync helper; apply via `applyAccountLocaleOverride` path.
3. **Playback defaults** — `preferred_media_type` (`audio`|`video`) using `settings.preferred_media_type.*`;
   read/write device `pmt` (01) and push via 02 when logged in. Optionally surface auto-queue
   shuffle/repeat (device-only) if trivially reusable from `AutoQueueProvider`.
4. **Notification toggles** — Toggles for supported notification types
   (`new-item`, `livestream-scheduled`, `livestream-started`) using `settings.notifications.*`;
   create/delete via 02 wrappers when logged in.
5. **Chrome** — Tokenized styles only (theme tokens, no hardcoded colors); testIDs for E2E
   (`more-settings-screen`, theme option testIDs). Do not redesign navigation.
6. Mark **16.3** `done` in master plan Tracks + Appendix C; set detail 462 header `**Status:** done`.
   Since 16.1–16.10 are then all `done`, append ` (DONE)` to the `## Track 16 …` heading.
7. **Archive** this plan set (`.llm/plans/active/mobile-track16-prefs-settings/` →
   `.llm/plans/completed/`) per **plan-completion**; update `.llm/plans/active/LLM-PLANS-ACTIVE.md`.

## Out of scope

- Custom operator/remote themes (web-only v1).
- Track 23 visual polish / final layout.
- Video playback enclosure changes (pref stored/synced only).

## Acceptance

- Theme picker matches web theme id set; changing theme updates colors immediately, no restart.
- Locale, playback, and notification controls read the store and (logged in) sync to server.
- All labels resolve through i18n (no hardcoded English).
- Placeholder replaced; route + testIDs intact for Maestro.
