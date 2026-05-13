# Phase 1 — Behavior baseline and test harness

## Goal

Lock current playback behavior down as an executable contract so every later
phase can refactor freely while CI catches regressions.

## Scope

Test infrastructure and documentation only. Zero production code changes.

## Deliverables

### 1. Decision matrix document

`apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md`

Enumerate every playback decision the player makes today, in table form, by
(source kind x medium x trigger). Columns:

- Source kind (clip, soundbite, chapter, item-podcast, item-video,
  item-music, add-by-RSS, livestream)
- Trigger (initial load, anonymous restore, queue load, autoQueue
  transition, skip-next button, track-ended, explicit play from list)
- Expected `currentTime` after `loadedmetadata`
- Expected `mpIsPlaying` after the load
- Expected side effects (history move, stats track, autoQueue clear,
  playlist position save)

This document becomes the test oracle for Phases 2–5.

### 2. Fake `HTMLMediaElement` test harness

`apps/web/src/test/mediaElementFake.ts`

A test double that:

- Implements the subset of `HTMLMediaElement` the player uses (`src`,
  `currentTime`, `duration`, `paused`, `volume`, `muted`, `playbackRate`,
  `readyState`, `play`, `pause`, `load`, `addEventListener`,
  `removeEventListener`).
- Records every `currentTime` write with a timestamp.
- Lets tests fire synthetic `loadedmetadata`, `play`, `pause`,
  `timeupdate`, `ended` events with controllable durations and positions.
- Exposes assertion helpers: `assertSeekedTo(seconds)`,
  `assertNeverSeeked()`, `getEventLog()`.

### 3. Orchestration tests for current behavior

`apps/web/src/components/MediaPlayer/Controller/__tests__/`

Render the controller tree against the fake element and assert the matrix
from deliverable 1. At minimum:

- Music: session restore loads then `loadedmetadata` fires → seeks to saved
  position (with near-end clamp).
- Music: explicit play loads → seeks to 0.
- Music: track-ended → next load starts at 0.
- Podcast: queue load with non-zero abridged `p` → seeks to `p`.
- Podcast: queue load with `p` within 5s of `d` → seeks to 0.
- Clip load → seeks to `start_time`; pauses at `end_time + 1`.
- Soundbite load → seeks to `start_time`; pauses at
  `start_time + duration + 1`.
- Chapter seek → seeks to `start_time`.
- Add-by-RSS resume → seeks to stored position.

### 4. E2E gap-fill specs

Under `apps/web/e2e/`. One spec per playback flow listed in deliverable 3,
plus:

- Keyboard shortcuts (`Space`, `ArrowLeft`, `ArrowRight`) work on every
  source kind.
- AutoQueue transition between music tracks does not silently resume the
  previous track's saved position.
- Anonymous-snapshot restore on first page load resumes the saved music
  track to the saved position.
- AnonymousPlaybackRestoreController behavior on login (snapshot cleared).

Use `make e2e_test_web_report_spec SPEC=...` to verify each spec
individually as it is added.

### 6. Live-stream / video.js baseline (REQUIRED)

This section is **required** for this plan-set, not just for the
follow-up HLS migration. Even though the architecture refactor does
**not** retire `video.js`, Phases 4a/4b/4c touch the
`MediaPlayerControlsContext` arbitration (no-op bridge while
livestream is active), the queue/autoplay paths that decide what
loads next, and remove the global event bus that previously fanned
out keyboard shortcuts. Each of those changes can plausibly affect
livestream UI behavior even without touching the video.js controllers
themselves.

These specs are therefore the **regression oracle** for livestream
behavior across this plan-set:

- They run unchanged in Phase 1 against today's controllers and
  capture the baseline.
- They run unchanged at the end of every later phase to prove the
  refactor preserved livestream behavior.
- They run again in the follow-up
  [`media-player-livestream-hls-migration`](../media-player-livestream-hls-migration/)
  plan-set against the unified `<MediaElement>` to prove equivalence
  after `video.js` retirement.

Add the following before declaring Phase 1 complete:

#### 6a. Matrix appendix: live-stream behavior

Add a "Live streams" section to the decision matrix with rows for:

- **Initial play** of a live audio stream from a podcast/episode page:
  what `<source>` is selected, how long until first byte plays, what
  `currentTime` reads (live streams generally have no useful seek
  position), what `duration` reads (often `Infinity`), what UI controls
  are enabled.
- **Initial play** of a live video stream: same observations plus the
  fullscreen / portal-floating wrapper behavior.
- **Source fallback**: when the first `<source>` 404s or the codec is
  unsupported, video.js currently selects the next source. Document
  every fallback path observed locally with a known-good test feed.
- **Live → non-live transition**: while a livestream is playing,
  trigger an explicit play of a regular podcast episode. Document
  whether the live element pauses, whether its DOM node is destroyed,
  whether the regular `<audio>` element starts cleanly. The legacy
  `MediaPlayerControllerLiveStreamAV.tsx` has a bottom-of-file note
  describing the dispose/recreate dance that was needed because of a
  bug here — capture exactly what triggered it and what symptoms it
  prevented.
- **Non-live → live transition**: the reverse direction.
- **Live stream end / disconnect**: behavior when the upstream stream
  stops (does the player surface an error, retry, or stay paused?).
- **Reload while live is playing**: full-page reload behavior; whether
  anonymous snapshot restore tries to resume a livestream (it should
  not).

#### 6b. Live-stream E2E specs

Add at least these specs under `apps/web/e2e/`:

- `media-player-livestream-audio-start.spec.ts` — start a known live
  audio stream and verify the play state and player UI.
- `media-player-livestream-video-start.spec.ts` — same for a live
  video stream, including the floating-portal wrapper behavior.
- `media-player-livestream-to-podcast-transition.spec.ts` — the
  problem case the dispose/recreate dance was added to fix; assert
  clean transition with no double-audio and no stuck UI.
- `media-player-podcast-to-livestream-transition.spec.ts` — the
  reverse direction.

These specs are the regression oracle for **this** plan-set
(livestream behavior must be unchanged after every phase) and the
comparison baseline for the HLS migration plan-set. After that
plan-set lands, the same specs must pass against the `hls.js` /
native-HLS-backed unified element.

#### 6c. Test feed selection

Pick **one stable known-good live audio feed** and **one stable
known-good live video feed** for the specs above. Prefer feeds the
project already uses in dev seed data; if none exist, use a reliable
public test stream (e.g. `bbcradio4` or a `Mux test stream`) and
document the choice in the matrix doc with the date verified. The HLS
migration plan-set will rerun the same specs against the same feeds to
verify equivalence.

### 5. Pure-helper unit test coverage

Confirm and extend coverage on existing helpers that the new policy will
reuse:

- [`apps/web/src/lib/playbackResumeNearEnd.test.ts`](../../../../apps/web/src/lib/playbackResumeNearEnd.test.ts)
- [`apps/web/src/lib/musicSessionRestoreCurrentTime.test.ts`](../../../../apps/web/src/lib/musicSessionRestoreCurrentTime.test.ts)

Add cases for boundaries the matrix exposes (zero duration, negative
position, NaN inputs, very large positions).

## Out of scope

- Renaming or moving any production file.
- Touching `MediaPlayerController*.tsx`, `MediaPlayer.tsx` context, or any
  hook implementation.

## Exit criteria

- `npm run test:unit -w apps/web` passes including the new orchestration
  tests.
- `make e2e_test_web_report` passes including the new playback specs.
- The decision matrix doc lists every (source kind x trigger) cell with
  observed behavior and is referenced from
  [`apps/web/src/components/MediaPlayer/MediaPlayer.tsx`](../../../../apps/web/src/components/MediaPlayer/MediaPlayer.tsx)
  via a top-of-file comment so future contributors find it.

## Verification commands

```bash
npm run test:unit -w apps/web
make e2e_test_web_report
```
