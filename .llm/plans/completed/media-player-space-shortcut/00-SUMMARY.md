# Media player Space shortcut — summary

## Status

**Ready to execute.** Run numbered plans one at a time via [`COPY-PASTA.md`](COPY-PASTA.md).
Verify after each phase before starting the next.

## Problem

Spacebar play/pause is unreliable in normal use:

1. **Focus model** — clicking empty main content does not move keyboard focus; Space is
   blocked when focus remains on sidebar links, nav controls, or other interactive elements.
2. **Toggle path** — keyboard calls `bridge.togglePlay()` while the UI play button uses
   `setMPIsPlaying`; livestream (audio + video) is broken because the non-live bridge is
   disarmed.
3. **Test gap** — E2E only checks stability, not actual play-state toggling.

## Goals

Consistent Space play/pause across all four media modes when focus is not on an element that
should intercept Space:

| Mode              | Engine                                      |
| ----------------- | ------------------------------------------- |
| Audio (non-live)  | `NonLiveMediaOrchestrator` hidden audio       |
| Video (non-live)  | `NonLiveMediaOrchestrator` floating video   |
| Audio live        | `MediaPlayerControllerLiveStreamAV` video.js  |
| Video live        | Same (floating portal)                        |

Preserve documented behavior: Space is ignored in inputs and does not toggle when focus is on
a button, link, or menu item (see `settings.keyboard.shortcut_play_pause_detail` in
`apps/web/i18n/originals/en-US.json`).

## Architecture anchors

- Keyboard handler (pure): [`mediaPlayerWindowKeyDown.ts`](/apps/web/src/components/MediaPlayer/Controller/mediaPlayerWindowKeyDown.ts)
- Listener registration: [`MediaPlayerController.tsx`](/apps/web/src/components/MediaPlayer/Controller/MediaPlayerController.tsx)
- UI play button: [`PlayButton.tsx`](/apps/web/src/components/MediaPlayer/Buttons/PlayButton.tsx)
- Main content wrapper: [`MainWrapper.tsx`](/apps/web/src/components/Main/MainWrapper.tsx)
- Scroll container: [`MainPageScaffold.tsx`](/packages/ui/src/components/layout/MainPageScaffold/MainPageScaffold.tsx)
- Livestream AV: [`MediaPlayerControllerLiveStreamAV.tsx`](/apps/web/src/components/MediaPlayer/Controller/MediaPlayerControllerLiveStreamAV.tsx)
- Decision matrix: [`MEDIA-PLAYER-DECISION-MATRIX.md`](/apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md)

## Execution order

Strictly sequential: **01 → 02 → 03**. See [`00-EXECUTION-ORDER.md`](00-EXECUTION-ORDER.md).

Plan 03 is optional polish; plans 01 and 02 address the reported bug and livestream gap.

## Confidence (abbreviated)

| Item                         | Confidence | Risk if careful              |
| ---------------------------- | ---------- | ---------------------------- |
| Focus retention diagnosis    | ~85%       | N/A                          |
| Plan 01 (`setMPIsPlaying`)   | ~90%       | Low                          |
| Plan 02 (main focus on click)  | ~75%       | Medium — needs strict guards |
| Plan 03 (slider/dialog guards) | High     | Low (intentional behavior change) |

Do **not** weaken `button` / `a[href]` exclusions — that would break link activation and
Settings copy.

## Verification

Each numbered plan lists targeted unit/E2E commands. [`COPY-PASTA.md`](COPY-PASTA.md)
aggregates cumulative verification after all plans.
