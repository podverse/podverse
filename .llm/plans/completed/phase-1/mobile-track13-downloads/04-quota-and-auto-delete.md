# 04 — Quota + auto-delete (13.7–13.8)

**Cursor model:** Codex 5.3  
**Details:** 436, 437  
**Ship bar:** Simple usage + policy — no charts.

## Goal

Add storage usage / manage-storage sketch and optional auto-delete when over quota (oldest
completed first).

## Context (read first)

- Details 436–437
- Downloads repository + library downloads screen from prompts 01–02
- Prefs store patterns (`uit` / AsyncStorage) if toggle needed
- Rules: **i18n-user-facing-strings**, **mobile-surface-async-errors**

## Tasks

1. **Quota (13.7)** — Default cap + usage summary UI; delete-to-free-space affordances.
2. **Auto-delete (13.8)** — Optional toggle (default off); on complete, delete oldest until under
   cap; project cache after removals.
3. Mark **13.7–13.8** `done` in master plan Tracks + Appendix C; detail headers `done`.

## Out of scope

- E2E (05)
- Cloud backup of downloads

## Acceptance

- User can see usage and free space
- Auto-delete does not remove in-progress jobs
