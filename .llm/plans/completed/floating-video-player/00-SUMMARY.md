# Floating video player + modal video — summary

## Status

**Deferred plan-set.** Execute numbered plans one at a time; verify the UI after each
before starting the next. No production code changes until you run a COPY-PASTA prompt.

## Goals

1. **Default appearance** — floating video flush to the right edge and flush to the top of
   the bottom media player bar; square corners (no `border-radius`).
2. **Draggable** — click-and-drag the floating player anywhere on screen (desktop / fine
   pointer only); position resets on full page reload (in-memory only).
3. **Resizable** — drag the top-left corner to grow/shrink while preserving aspect ratio
   (desktop / fine pointer only); size resets on reload.
4. **Modal video** — when a non-live video is playing, the full-size media player modal
   shows the video centered instead of album artwork, with responsive shrink and preserved
   scale.

## Scope

| Area                         | In scope                                      | Out of scope                          |
| ---------------------------- | --------------------------------------------- | ------------------------------------- |
| Non-live floating video      | Plans 01–03                                   | —                                     |
| Livestream floating video    | Plans 01–03 (video.js portal)                 | Plan 04 (modal)                       |
| Full-size modal              | Plan 04 (non-live + add-by-RSS video)         | Livestream video in modal             |
| Persistence                  | None — drag/resize are session-only           | localStorage / cookies                |
| Third-party libraries        | None — native pointer events only             | react-draggable, re-resizable, etc.   |
| Touch / mobile drag & resize | Disabled (coarse pointer)                     | Dedicated mobile drag handles         |

## Architecture anchors

- **Non-live video mount:** [`NonLiveMediaMount.tsx`](/apps/web/src/components/MediaPlayer/MediaElement/NonLiveMediaMount.tsx)
- **Non-live floating portal:** [`MediaPlayerVideoPortalFloating.tsx`](/apps/web/src/components/MediaPlayer/Controller/Video/MediaPlayerVideoPortalFloating.tsx)
- **Livestream floating portal:** [`MediaPlayerLivestreamVideoPortalFloating.tsx`](/apps/web/src/components/MediaPlayer/Controller/LiveStream/MediaPlayerLivestreamVideoPortalFloating.tsx)
- **Video location context:** [`MediaPlayerVideo.tsx`](/apps/web/src/contexts/MediaPlayerVideo.tsx) — `'full-modal'` type exists but is unused today
- **Modal artwork region:** [`MediaPlayerInfoModal.tsx`](/apps/web/src/components/MediaPlayer/Modal/MediaPlayerInfoModal.tsx)
- **Decision matrix:** [`MEDIA-PLAYER-DECISION-MATRIX.md`](/apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md) — playback behavior must stay passing

## Shared design (plans 02–03)

- One hook: `apps/web/src/hooks/useFloatingVideoTransform.ts` — in-memory `position` and
  `size` state, pointer-event handlers, viewport clamping.
- Both portal components consume the hook; SCSS default anchor remains the flush
  bottom-right from plan 01 until the user drags (then inline `left`/`top` override
  `right`/`bottom`).
- **Touch / small-screen UX:** drag and resize are both **disabled on coarse pointers**
  (`pointer: coarse`, `pointerType === 'touch'`). On phones and tablets, the floating
  player stays in the plan 01 default position/size so page scroll and incidental swipes
  do not move or resize it. Desktop users retain drag + corner resize.

## Execution order

Strictly sequential: **01 → 02 → 03 → 04**. See [`00-EXECUTION-ORDER.md`](00-EXECUTION-ORDER.md).

## Verification (per plan)

Each numbered plan lists targeted E2E specs and `make e2e_test_web_report_spec` commands.
[`COPY-PASTA.md`](COPY-PASTA.md) aggregates cumulative verification after all four plans.
