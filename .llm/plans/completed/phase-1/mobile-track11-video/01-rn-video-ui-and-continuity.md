# 01 — RN video UI audit + continuity (11.3, 11.6–11.8)

**Cursor model:** Opus 4.8  
**Details:** 342, 351, 352, 353  
**Ship bar:** Functional sketch only — no layout redesign / transcript chrome.

## Goal

Confirm Track 11 video UI acceptance against what PG-5 already shipped; close any gaps so mini and
full players register/animate the **single** native surface without reload. Then document/assert
playhead continuity (11.8).

## Context (read first)

- Details:
  - [342-mini-player-video-placeholder](/docs/proposals/mobile/_master-plan_/phase-1/details/342-mini-player-video-placeholder.md)
  - [351-full-player-video-surface](/docs/proposals/mobile/_master-plan_/phase-1/details/351-full-player-video-surface.md)
  - [352-collapse-to-mini-animation](/docs/proposals/mobile/_master-plan_/phase-1/details/352-collapse-to-mini-animation.md)
  - [353-position-continuity-verify](/docs/proposals/mobile/_master-plan_/phase-1/details/353-position-continuity-verify.md)
- Skills: **mobile-playback**, **mobile-theme-parity** (ship bar), **mobile-e2e-screenshots**
- Code likely already present:
  - `apps/mobile/src/components/player/MiniPlayer.tsx`
  - `apps/mobile/src/screens/player/FullPlayerScreen.tsx`
  - `apps/mobile/src/playback/PlaybackProvider.tsx` (`setVideoSurfaceVisible`)
  - `apps/mobile/modules/podverse-media-engine/` (reparent from `mobile-pg5-video-gaps`)
  - `apps/mobile/src/playback/E2ePlayVideoButton.tsx`

## Tasks

1. **Audit vs 11.3 / 11.6 / 11.7**
   - Mini: transparent/placeholder rect + `targetId=mini` registration; audio-only hides surface
     (artwork visible); `testID`s stable.
   - Full: `targetId=full`; expand calls `animateVideoSurface('full', …)` without `load`/`destroy`.
   - Collapse: unmount/close animates back to `mini`; no second `Video`/engine mount (11.18).
   - Confirm native reparent still lands surface **inside** the modal full-player tree (gap fix),
     not a window overlay behind the modal.
2. **Close gaps only** — if acceptance already met, do not restyle. If missing:
   layout updates on keyboard/rotation for registered rects, visibility gate bugs, or missing
   `testID`s — fix minimally.
3. **11.8 continuity**
   - Prefer an automated assert where the harness allows (e.g. `playback-active-e2e` never drops;
     optional position probe if already exposed to JS/E2E).
   - Else add a short operator checklist under the media-engine README or detail 353 noting
     on-device frame check (Maestro cannot prove pixels/occlusion).
4. Mark steps **11.3, 11.6, 11.7, 11.8** `done` in Tracks + Appendix C; set detail headers
   `**Status:** done`.

## Out of scope

- Track 23 polish, transcripts on player, clip authoring, playlist CRUD (9d)
- Rewriting native engine unless a regression from the reparent fix requires a tiny fix

## Acceptance

- Video item: mini shows surface placeholder; expand/collapse animates same surface; playhead does
  not restart
- Audio item: surface hidden; artwork path unchanged
- No second video mount on expand

## Operator verify (end of whole set — do not run here)

```bash
# Mobile Maestro (after Metro + devices + E2E API + test-assets are up — see HOW-TO-RUN)
npm run mobile:e2e:test -- video-transition
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
