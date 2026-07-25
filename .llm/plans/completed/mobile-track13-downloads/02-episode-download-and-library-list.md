# 02 — Episode download + library list (13.4–13.5)

**Cursor model:** Codex 5.3  
**Details:** 433, 434  
**Ship bar:** Functional sketch + `testID`s — no Track 23 polish.

## Goal

Enqueue downloads from episode detail (progress UI) and replace the Library Downloads
placeholder with a real list.

## Context (read first)

- Details 433–434
- [DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md) §1.1–1.2
- `apps/mobile/src/navigation/index.tsx` (`LibraryDownloadsScreen` placeholder)
- Episode detail screen under `apps/mobile/src/screens/`
- `PlaybackProvider` live_item block (download must stay blocked too)
- Media row actions inventory (Download deferred) — wire episode first; row overflow optional
- Skills: **mobile-theme-parity**, **i18n-user-facing-strings**
- Rules: **mobile-surface-async-errors**, **eqeqeq**, no `any`

## Tasks

1. **Episode download (13.4)** — Download action + progress; repository/manager only; i18n keys
   (`features.download.*` when available); surface errors. **Hide/disable Download** when
   `item.live_item` is set or enclosure is HLS/m3u8 (eligibility helper from 01).
2. **Library list (13.5)** — Replace placeholder: FlatList of in-progress + completed; cancel /
   delete; empty/loading/error `testID`s (`library-downloads-screen` retained or evolved).
3. Mark **13.4–13.5** `done` in master plan Tracks + Appendix C; detail headers `done`.

## Out of scope

- Offline play resolution (03)
- Quota auto-delete (04)
- Maestro flow (05)
- Making livestreams downloadable

## Acceptance

- User can download a progressive non-live episode and see it on Library → Downloads
- Livestream / HLS items do not offer a working Download path
- No silent async failures
