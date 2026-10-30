**Cursor model:** Opus 5.5 · **Reasoning:** extra high

# 71 — Mobile: hold the live window in JS, add Go to Live, and keep skips inside the window

## Rows

R17, R24, R26

## Runs after

11, 30, 70

## Files

apps/mobile/src/playback/livePlaybackStore.ts
apps/mobile/src/playback/livePlaybackStore.test.ts
apps/mobile/src/playback/PlaybackProvider.tsx

## Why

Plan 30 makes the native engine report a live source's seekable window on every `progress` event
(`event.isLive`, `event.liveWindow`) and from `getCurrentSource()`, and adds
`nativePlaybackBridge.goToLive()`. Plan 11 holds the shared rules (`resolveLivePlaybackDisplay`,
`clampLiveSeekSeconds`, `isRewindableLiveWindow`). Nothing in the mobile app keeps the window
today, so the player cannot show how far behind live it is, cannot offer a Live control, and the
skip buttons either do nothing (`target.kind === 'livestream'` early return in `jumpBy`) or, for an
Add by RSS livestream, seek against bounds meant for files.

This plan adds the state and the session commands. Plan 72 draws them. Resume after a pause (R26)
needs no JS rule: plan 30 puts the resume rule inside native `play()`, so `resume()` keeps calling
plain `play()`. What JS adds for R26 is the display: a fresh window while paused, and "at live"
until the stream has played once.

## Decisions this plan makes

- **The window lives in its own module store**, `livePlaybackStore.ts`, beside
  `playbackProgressStore.ts`, not inside the progress snapshot. `usePlaybackProgress()` and the
  `PlaybackContextValue` type stay as they are. The provider writes the window and the position in
  the same synchronous `progress` callback, so React renders them together.
- **Not played yet reads as at live** (web plan 51's rule). Until the loaded livestream has played
  once, the display gets `positionSeconds: null`, so a paused restore or cross-device adopt shows
  Live, not a large behind time from a position of 0.
- **While paused, the provider re-reads the window once a second** with `getCurrentSource()`, only
  while the app is active, a livestream is loaded, it has played, and it is paused. `progress` does
  not tick while paused (plan 30), and the behind time grows during a pause.
- **Go to Live from another device's view does nothing.** The remote live view has no Live control
  (plan 11: no remote go-to-live).

## Change 1 — `apps/mobile/src/playback/livePlaybackStore.ts` (new)

Module store, same shape and doc style as `playbackScrubPreviewStore.ts` and
`playbackProgressStore.ts` (module `let` state, a `Set` of listeners, `useSyncExternalStore`
hooks exported from the same file).

Imports:

```typescript
import { useSyncExternalStore } from 'react';

import type { LivePlaybackDisplay, LiveSeekWindow } from '@podverse/playback-core/livePlayback';
import {
  isRewindableLiveWindow,
  resolveLivePlaybackDisplay,
} from '@podverse/playback-core/livePlayback';

import type { MediaEngineLiveWindow } from '../../modules/podverse-media-engine';
import {
  getPlaybackPositionClockSeconds,
  subscribePlaybackPositionClock,
} from './playbackProgressStore';
```

State: `let liveWindow: LiveSeekWindow | null = null;` and `let hasPlayed = false;`, plus a
listener set and `emit()`.

Exports, in this order, each with a one-line doc comment:

- `toLiveSeekWindow(engineWindow: MediaEngineLiveWindow | null): LiveSeekWindow | null` — `null` passes
  through; otherwise a fresh `{ startSeconds, liveEdgeSeconds }`. The engine already returns `null`
  for progressive streams and invalid ranges (plan 30), so this adds no checks.
- `getLivePlaybackWindow(): LiveSeekWindow | null`.
- `getLivePlaybackHasPlayed(): boolean`.
- `setLivePlaybackSample(params: { engineWindow: MediaEngineLiveWindow | null; isPlaying: boolean }): void`
  — the `progress` write. Sets `hasPlayed = true` when `params.isPlaying`. Replaces `liveWindow`
  with `toLiveSeekWindow(params.engineWindow)` only when the new window differs (null vs non-null, or either number differs). Emits only when
  `liveWindow` or `hasPlayed` changed.
- `setLivePlaybackWindow(engineWindow: MediaEngineLiveWindow | null): void` — the paused re-read. Same
  replace-and-emit rule; does not touch `hasPlayed`.
- `markLivePlaybackPlayed(): void` — sets `hasPlayed = true`, emits when it changed.
- `resetLivePlayback(): void` — `liveWindow = null`, `hasPlayed = false`, emits when either
  changed.
- `subscribeLivePlayback(listener: () => void): () => void`.
- `getLivePlaybackDisplay(): LivePlaybackDisplay` — `resolveLivePlaybackDisplay({ positionSeconds:
  hasPlayed ? getPlaybackPositionClockSeconds() : null, window: liveWindow })`, memoized: keep the
  last inputs (`positionSeconds` value, `liveWindow` reference, `hasPlayed`) and the last result in
  module variables, and return the same object while the inputs are unchanged. Required for
  `useSyncExternalStore`, which compares snapshots by identity.
- `subscribeLivePlaybackDisplay(listener: () => void): () => void` — subscribes `listener` to both
  `subscribeLivePlayback` and `subscribePlaybackPositionClock`; returns one function that removes
  both. The clock subscription keeps re-renders to at most once a second.
- `getLivePlaybackCanRewind(): boolean` — `isRewindableLiveWindow(liveWindow)`.
- `subscribeLivePlaybackCanRewind(listener: () => void): () => void` — wraps
  `subscribeLivePlayback` and calls `listener` only when `getLivePlaybackCanRewind()` flips (same
  filter pattern as `subscribePlaybackDuration` in `playbackProgressStore.ts`). The full player
  screen reads this, so it re-renders when the scrubber appears or goes, not every second.
- Hooks: `useLivePlaybackDisplay(): LivePlaybackDisplay`,
  `useLivePlaybackWindow(): LiveSeekWindow | null`, `useLivePlaybackCanRewind(): boolean`, each a
  `useSyncExternalStore(subscribe…, get…, get…)`.

Module doc comment (top of file), present tense: what the store holds (the loaded livestream's
seekable window as the native engine reports it, and whether it has played since it loaded),
that the provider writes it from `progress` samples and, while paused, from `getCurrentSource()`,
and that the display treats a stream that has not played as at live.

## Change 2 — `PlaybackProvider.tsx`

Large file; edit only the anchors below. Plan 61 edits `restoreFromSnapshot`,
`adoptQueueHeadWhenPlayerEmpty`, and the handoff-prompt `useEffect`; plan 70 edits the
duration lines in `playTarget`, `adoptEngineSource`, the `progress` handler, and
`reconcileFromNative`. Keep their changes.

### 2a — imports and a constant

- Add a value import from `@podverse/playback-core/livePlayback`: `clampLiveSeekSeconds`,
  `isRewindableLiveWindow` (after the `@podverse/playback-core/clampNearEndSeconds` import).
- Add a value import from `./livePlaybackStore`: `getLivePlaybackHasPlayed`,
  `getLivePlaybackWindow`, `markLivePlaybackPlayed`, `resetLivePlayback`,
  `setLivePlaybackSample`, `setLivePlaybackWindow` (in the file's local-import order).
- Next to `const START_PLAY_SETTLE_MS = 300;` add:

```typescript
/** While a livestream is paused, how often the provider re-reads its window from the engine. */
const LIVE_PAUSED_WINDOW_REFRESH_MS = 1000;
```

### 2b — `PlaybackContextValue` type

After `jumpBy: (deltaSeconds: number) => void;` add:

```typescript
  /**
   * Go to a livestream's live moment and play: a seek to the live edge, or a reconnect when the
   * stream holds no window. Does nothing for other items or while another device plays.
   */
  goToLive: () => Promise<void>;
```

`PlaybackSessionContextValue` derives from it, so it gains the field too.

### 2c — reset the window with every load

Call `resetLivePlayback()` in exactly these places:

- `clearNowPlaying`: next to `resetPlaybackProgress();`.
- `playTarget` success path: immediately before `setActiveTarget(target);`.
- `playTarget` catch branch: immediately before `activeTargetRef.current = target;` (with plan 70's
  progress reset).
- `adoptEngineSource`: immediately before `setPlaybackProgress({ durationSeconds: …,
  positionSeconds })`. Then, when `source.isPlaying === true`, call `markLivePlaybackPlayed()`
  (a car or a still-running engine is already playing it).

### 2d — `progress` handler writes the window

In `progress: (event) => {`, after the `downloadSourceSwapSuppressProgressRef` block and before
`if (isPositionHeldBySeek(event.positionSeconds)) {`, add the window write. Move plan 70's
`const loadedTarget = activeTargetRef.current;` up to this point so both reads share it:

```typescript
      const loadedTarget = activeTargetRef.current;
      if (
        event.isLive &&
        loadedTarget !== null &&
        isLivePlaybackTarget(loadedTarget) &&
        engineSourceMatchesTarget(engineSourceIdTextRef.current, loadedTarget)
      ) {
        setLivePlaybackSample({ engineWindow: event.liveWindow, isPlaying: isPlayingRef.current });
      }
```

It sits before the seek-hold return on purpose: while a seek is held, the position stays at the
seek target and the window keeps moving, which is what the behind time should show.

### 2e — re-read the window while paused

Directly after the `reconcileFromNative` `useCallback` (before `useNativePlaybackBridge({`), add:

```typescript
  useEffect(() => {
    if (activeTarget === null || !isLivePlaybackTarget(activeTarget) || isPlaying) {
      return;
    }
    const intervalId = setInterval(() => {
      if (appStateRef.current !== 'active' || !getLivePlaybackHasPlayed()) {
        return;
      }
      void (async () => {
        const source = await nativePlaybackBridge.getCurrentSource().catch(() => null);
        const target = activeTargetRef.current;
        if (
          source === null ||
          !source.isLive ||
          target === null ||
          !isLivePlaybackTarget(target) ||
          !engineSourceMatchesTarget(source.meta?.idText ?? null, target)
        ) {
          return;
        }
        setLivePlaybackWindow(source.liveWindow);
      })();
    }, LIVE_PAUSED_WINDOW_REFRESH_MS);
    return () => {
      clearInterval(intervalId);
    };
  }, [activeTarget, isPlaying]);
```

`appStateRef` already exists in the provider (`const appStateRef = useRef(AppState.currentState);`)
and the existing `AppState.addEventListener('change', …)` effect assigns
`appStateRef.current = nextState`. `activeTarget` and `isPlaying` are the provider's existing
state values used in `sessionValue`.

### 2f — `goToLive`

Directly after `seekToRef.current = seekTo;`, add:

```typescript
  const goToLive = useCallback(async (): Promise<void> => {
    const target = activeTargetRef.current;
    if (target === null || !isLivePlaybackTarget(target)) {
      return;
    }
    const wasPlaying = isPlayingRef.current;
    clearSeekHold();
    getListenSession().recordSeek();
    const liveWindow = getLivePlaybackWindow();
    if (liveWindow !== null) {
      positionRef.current = liveWindow.liveEdgeSeconds;
      setPlaybackPositionSeconds(liveWindow.liveEdgeSeconds);
    }
    markLivePlaybackPlayed();
    await nativePlaybackBridge.goToLive();
    setPlaybackPlaying(true);
    setTransportState('playing');
    if (!wasPlaying) {
      await writePlaybackEvent({
        eventKind: playbackEventFromDiscreteSignal('play'),
        forceNetwork: true,
        isPlaying: true,
        playbackPositionSeconds: positionRef.current,
      });
    }
  }, [clearSeekHold, getListenSession, setPlaybackPlaying, writePlaybackEvent]);
```

Doc comment above it: "Pressing Live. Always plays: the live moment moves on, so landing there
paused would be stale. The engine seeks to the live edge, or reconnects a progressive stream." The
optimistic position write makes the behind time clear at once; the engine sends a fresh sample
after it lands (plan 30). It mirrors `resume()` for the play event and has no `try`/`catch`, same
as `resume()`. Omit `mediaFileDurationSeconds` (a livestream has none). Name local window
variables `liveWindow` (here, in `jumpBy`, and in the store), never `window`, which React Native
also defines as a global.

### 2g — `jumpBy` for livestreams

In `const jumpBy = useCallback(`, replace

```typescript
      if (target === null || target.kind === 'livestream') {
        return;
      }
```

with

```typescript
      if (target === null) {
        return;
      }
      if (isLivePlaybackTarget(target)) {
        const liveWindow = getLivePlaybackWindow();
        if (!isRewindableLiveWindow(liveWindow)) {
          return;
        }
        const fromSeconds = getLivePlaybackHasPlayed()
          ? Math.min(positionRef.current, liveWindow.liveEdgeSeconds)
          : liveWindow.liveEdgeSeconds;
        seekTo(clampLiveSeekSeconds(liveWindow, fromSeconds + deltaSeconds));
        return;
      }
```

This covers database and Add by RSS livestreams (`isLivePlaybackTarget` is true for both). The
rest of `jumpBy` (`seekBoundsFromTarget` + `resolveJumpTarget`) is unchanged for files. Leave
`seekTo` itself unchanged: the scrubber (plan 72) passes already-clamped targets, and native
`seek` clamps into the window too (plan 30).

### 2h — routed command and session value

After `routedJumpBy`, add:

```typescript
  const routedGoToLive = useCallback<PlaybackContextValue['goToLive']>(async () => {
    if (crossDevice.isRemote()) {
      return;
    }
    await goToLive();
  }, [crossDevice, goToLive]);
```

In `sessionValue`, add `goToLive: routedGoToLive,` after `jumpBy: routedJumpBy,`, and add
`routedGoToLive` to its dependency array in alphabetical position (after
`routedJumpBy` is fine; match the existing order style).

### What stays as it is

- `resume()` calls `nativePlaybackBridge.play()` with no pre-seek (plan 30's contract). Native
  resumes in place when the window still holds the paused moment, else jumps to live, else
  reconnects.
- `skipToPrevious`, `skipToPreviousTrack`, `skipToNext`, `hasAutomaticNext`, and
  `seekBoundsFromTarget` keep their livestream branches.
- Remote (another device) live controls are untouched.

## Reuse and parity

Web plan 51 (`liveMediaStore` with `goToLive`, `seekToFraction`, and its 1-second paused
refresh) is the parity source; this is the mobile copy over the native engine instead of the
media element. The rules are plan 11's helpers; nothing here re-derives them.

## Tests

New `apps/mobile/src/playback/livePlaybackStore.test.ts` (Vitest, same style as
`playbackProgressStore.test.ts` and `playbackScrubPreviewStore.test.ts`). In `beforeEach`, call
`resetLivePlayback()` and `resetPlaybackProgress()`. Use `const liveWindow = { startSeconds: 100,
liveEdgeSeconds: 400 }` unless a case says otherwise.

- `toLiveSeekWindow`: `null` → `null`; a window → an equal, distinct object.
- Not played: `setLivePlaybackSample({ engineWindow: liveWindow, isPlaying: false })` with
  position 0 → display at
  live edge, `behindLiveLabel` null, `canRewind` true, `windowFraction` null.
- Played and behind: `setPlaybackPositionSeconds(358)`, then
  `setLivePlaybackSample({ engineWindow: liveWindow, isPlaying: true })` → `behindLiveSeconds` 42,
  label
  `'\u22120:42'`.
- Played and at the edge: position 395 → at live edge, label null, `windowFraction` 1.
- `markLivePlaybackPlayed` alone flips the display from at live to behind for position 358.
- `setLivePlaybackWindow` keeps `hasPlayed`; a wider window (`liveEdgeSeconds` 460) at position 358
  → behind 102.
- Snapshot identity: two `getLivePlaybackDisplay()` calls with no change return the same object; a
  listener on `subscribeLivePlayback` is not called when the same window is sampled again.
- `getLivePlaybackCanRewind`: `null` window → false; `{ 0, 20 }` → false; the 300-second window →
  true. A `subscribeLivePlaybackCanRewind` listener fires once when the window goes from `null` to
  rewindable and not again for a second rewindable window.
- `resetLivePlayback` → window `null`, `getLivePlaybackHasPlayed()` false, display at live.

Provider wiring (progress write, paused re-read, `goToLive`, live `jumpBy`) is held by plan 73's
Maestro flow on iOS and Android.

## Release scratchpad

```markdown
## Mobile livestream skips stay inside what the stream holds

- Surfaces: mobile
- Change: On a livestream whose stream keeps a rewindable window (HLS), skip back and skip forward
  move within that window and never past the live moment. On a livestream with no window
  (progressive audio), skips do nothing. Add by RSS livestreams follow the same rule; before, their
  skips used the bounds meant for episodes.
- Who notices: mobile listeners of livestreams
- Operator steps: none
```
