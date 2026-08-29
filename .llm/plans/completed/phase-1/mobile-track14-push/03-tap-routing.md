# 03 — Notification tap routing (14.4)

**Cursor model:** Codex 5.3
**Detail:** 443
**Ship bar:** Tap → correct screen, incl. cold start. Reuses Track 15 routing.

## Prerequisite

- **Track 15 (452 path map, 453 cold-start replay) must be `done`.** If not, stop and do Track 15
  first (`.llm/plans/active/mobile-track15-deep-links/`).

## Goal

Route notification taps to the target screen using the same deep-link mapping as universal links.

## Context (read first)

- Detail 443; Track 15 details 452, 453.
- `apps/mobile/src/navigation/index.tsx` (`getStateFromPath` from 452).
- `apps/mobile/App.tsx` (pending-URL buffer from 453).
- Push boundary from 01 (`onOpen` / open-event; cold-start `getInitialNotification`).
- Skills: **routing-url-params**, **mobile-surface-async-errors**.

## Tasks

1. On notification open (foreground/background and cold start), extract the target
   (URL or `{ type, id_text }`) and route via the 452 mapping.
2. Cold-start taps replay through the 453 pending-URL buffer after the auth gate resolves.
3. Unknown/malformed payload → fall back to Home; no crash.
4. Mark **14.4** `done` in master plan Tracks + Appendix C; detail 443 header `done`.

## Acceptance

- Tapping a notification opens the correct screen (episode/podcast/playlist/profile), warm + cold.
- Bad payloads fall back safely.
