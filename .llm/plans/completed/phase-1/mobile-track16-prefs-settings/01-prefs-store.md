# 01 — Unified device prefs store (16.1)

**Cursor model:** Codex 5.3
**Detail:** 460
**Ship bar:** One prefs module; no settings UI yet (that is 03).

## Goal

Replace the split per-domain AsyncStorage modules with a single typed prefs store
(`getPref` / `setPref` / `hydratePrefs`) mirroring web `localSettings` key strings/semantics, and
resolve the `pmt` naming clash so the web playback preference has its own device key.

## Context (read first)

- Detail 460 (`docs/proposals/mobile/_master-plan_/phase-1/details/460-device-prefs-store.md`).
- Web parity: `apps/web/src/utils/localSettings/localSettings.ts`,
  `apps/web/src/contexts/LocalSettings.tsx`.
- Existing mobile prefs (to unify, keep behavior): `apps/mobile/src/prefs/uiTheme.ts`,
  `autoQueuePrefs.ts`, `preferredMediaType.ts`, `subscriptionFilter.ts`, `downloadPrefs.ts`.
- Consumers to keep working: `apps/mobile/src/theme/ThemeProvider.tsx`,
  `apps/mobile/src/contexts/AutoQueueProvider.tsx`,
  `apps/mobile/src/screens/home/HomeScreen.tsx` + `MediaTypeSelector.tsx`.
- Theme ids: `packages/design-tokens/src/uiTheme.ts` (`ALL_POSSIBLE_THEMES`).
- Skills: **mobile-data-layer** (AsyncStorage = tiny prefs, not entities),
  **mobile-theme-parity**, **prefer-named-exports**. Rule: **eqeqeq-strict-equality**,
  **avoid-type-assertions**, **type-imports-separate-line**.

## Tasks

1. **Prefs module** — Add a unified store (e.g. `apps/mobile/src/prefs/index.ts` or
   `prefsStore.ts`) exposing typed `getPref(key)`, `setPref(key, value)`, and `hydratePrefs()`.
   Back it with **AsyncStorage** (MMKV NOT adopted v1). Keep the same key strings as web where
   applicable (`uit`, `aqc.rd`, `aqc.rp`) and validate enum prefs against allowed values.
2. **Resolve `pmt` clash** — Introduce a distinct **playback** media-type key `pmt`
   (`audio` | `video`, default matching web) separate from the existing mobile **home-tab** key
   `preferred_media_type`. Do NOT change the home-tab semantics. Document both in
   `apps/mobile/src/data/README.md` (or `prefs` README).
3. **Migrate callers** — Refactor `ThemeProvider`, `AutoQueueProvider`, home media-type,
   subscription filter, and download prefs consumers to read/write through the unified store.
   Preserve current defaults (theme `dark`/system fallback; auto-queue `false`/`false`).
4. **Typed keys** — Central typed key map so 02 (sync) and 03 (settings UI) import a single source.
5. Mark **16.1** `done` in master plan Tracks + Appendix C; set detail 460 header `**Status:** done`.

## Out of scope

- Server sync (02).
- Settings screen UI (03).
- Video playback enclosure resolution.
- MMKV migration.

## Acceptance

- Single prefs module used by theme, auto-queue, media-type/home-tab, filters, downloads.
- `uit` read/write flows through the unified store and still drives `ThemeProvider`.
- Playback `pmt` key exists and is distinct from home-tab `preferred_media_type`.
- Same key strings/semantics as web cookie JSON (transport is AsyncStorage, not a cookie).
- Existing screens behave unchanged (operator runs tests).
