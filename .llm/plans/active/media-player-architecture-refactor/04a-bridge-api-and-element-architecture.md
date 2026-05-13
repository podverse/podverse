# Phase 4a — Bridge API + controls context + unified element contract

## Goal

Freeze the architecture for the imperative shell of **non-live**
playback: the `useMediaElementBridge` hook, the
`MediaPlayerControlsContext`, and the `<MediaElement>` component
contract. Wire the bridge into **only** the regular audio and video
controllers (`MediaPlayerControllerAudio` via
`MediaPlayerControllerAV`, `MediaPlayerVideoWrapper`); their event
listeners move into the bridge. **Livestream** controllers keep their
existing video.js-based wiring unchanged in this plan-set (see
[`media-player-livestream-hls-migration`](../media-player-livestream-hls-migration/)).

This phase ships an internal seam. No UI consumer (button, slider,
keyboard handler) is migrated yet — that is Phase 4c. No element
collapse yet — that is Phase 4b.

## Scope

- `apps/web/src/hooks/useMediaElementBridge.ts` (new)
- `apps/web/src/contexts/MediaPlayerControls.tsx` (new)
- `apps/web/src/components/MediaPlayer/MediaElement/MediaElement.tsx`
  (new component scaffold; not consumed by anyone in 4a)
- `apps/web/src/components/MediaPlayer/MediaElement/mediaElementSourceFromTarget.ts`
  (new)
- **In scope for bridge wiring:** `MediaPlayerControllerAudio` /
  `MediaPlayerControllerAV` path and `MediaPlayerVideoWrapper` path
  only.
- **Out of scope for bridge wiring:** `MediaPlayerControllerLiveStreamAudio`,
  `MediaPlayerLiveStreamVideoWrapper`, `MediaPlayerControllerLiveStreamAV`.

## 1. Bridge hook: `useMediaElementBridge`

### Signature

```typescript
import type { RefObject } from 'react';
import type { PlaybackLoadDecision } from '../lib/playback';

export type MediaElementSource = { kind: 'file'; src: string; mimeType?: string };

export type MediaElementBridge = {
  /** Imperative load: sets `src`, waits for `loadedmetadata`, then
   *  applies the decision. Resolves once seek + (optional) play
   *  have been applied. */
  loadAndStart: (
    source: MediaElementSource,
    decision: PlaybackLoadDecision,
  ) => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  togglePlay: () => Promise<void>;
  seek: (seconds: number) => void;
  jumpBy: (deltaSeconds: number) => void;
  pauseAt: (seconds: number) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  /** `file` after first successful `loadAndStart`; `null` before. */
  currentSourceKind: 'file' | null;
};

export function useMediaElementBridge(
  mediaRef: RefObject<HTMLMediaElement | null>,
  options: {
    onTimeUpdate?: (seconds: number) => void;
    onPlay?: () => void;
    onPause?: () => void;
    onEnded?: () => void;
    onError?: (error: MediaError | null) => void;
    onLoadedMetadata?: (durationSeconds: number) => void;
  },
): MediaElementBridge;
```

### Responsibilities

The bridge is the **only** module in the app that (for the non-live
path):

- Reads from `mediaRef.current`.
- Writes to `mediaRef.current.currentTime`, `.src`, `.volume`,
  `.muted`, `.playbackRate`.
- Calls `mediaRef.current.play()` and `.pause()`.
- Adds and removes event listeners on the media element.

The bridge **owns** the `pauseAt` armed timer, idempotent `loadAndStart`
for file sources, and cleanup on unmount.

#### In-flight load token (race protection)

Each call to `loadAndStart` mints a monotonically increasing internal
token. The token is captured at call time and re-checked after every
`await` boundary inside the bridge:

- After `waitForLoadedMetadata()` resolves: if the active token has
  advanced, abandon the seek + play steps and resolve `Promise<void>`.
- After `mediaRef.play()` resolves: if the active token has advanced,
  do not arm `pauseAt` from the stale decision.

This guarantees that if the consumer (e.g. `<MediaElement>`) calls
`loadAndStart` again before the previous resolution lands — common
when the user clicks "play" on a different item mid-load — only the
latest call's decision is enacted. The stale call resolves silently;
no error is surfaced.

Unit test (added to the list below): two back-to-back `loadAndStart`
calls with different decisions; assert only the second call's
`initialSeekSeconds` and `pauseAt` arming are applied.

### Invariants

- Never dispatches window events; never reads React context; never
  writes React state directly (uses `options.on*` callbacks).
- Throws if called before `mediaRef.current` is non-null.

### `loadAndStart` semantics (file only)

```
loadAndStart(source, decision):
  assert source.kind === 'file'
  if mediaRef.src !== source.src:
    mediaRef.src = source.src
    mediaRef.load()
  await waitForLoadedMetadata()
  mediaRef.currentTime = decision.initialSeekSeconds
  if decision.shouldAutoPlay:
    await mediaRef.play()
  if typeof decision.pauseAtSeconds === 'number':
    armPauseAt(decision.pauseAtSeconds)
```

### Unit tests

Use the Phase 1 fake `HTMLMediaElement`:

- `loadAndStart` with a file source: sets `src`, awaits
  `loadedmetadata`, seeks, plays.
- `loadAndStart` called twice: second call replaces first; prior
  `pauseAt` cleared.
- **In-flight token**: `loadAndStart(A)` then immediately
  `loadAndStart(B)` before `loadedmetadata` for A fires; only B's
  decision is enacted (B's seek, B's play, B's `pauseAt`). A's
  promise resolves cleanly with no observable state from A applied.
- `pauseAt`, `seek`, `jumpBy`, `togglePlay` behavior.

## 2. `MediaPlayerControlsContext`

### Shape

```typescript
type MediaPlayerControlsContextValue = MediaElementBridge & {
  /** True when the non-live `<audio>`/`<video>` bridge is mounted and
   *  bound. False while a livestream is active (legacy controllers). */
  isAttached: boolean;
};
```

### Provider

`MediaPlayerControlsProvider` publishes one of two values:

1. **Live non-live bridge.** When `<MediaElement>` is mounted (active
   target is non-livestream), the provider publishes the real bridge
   returned by `useMediaElementBridge`, with `isAttached: true`.
2. **No-op bridge.** When the active target is a livestream (legacy
   path) or there is no active target, the provider publishes a
   sentinel `noopMediaElementBridge` with `isAttached: false`.

#### `noopMediaElementBridge`

A frozen module-level constant. Every method is a no-op (or returns
`Promise.resolve()` where the type requires a `Promise`); `currentSourceKind`
is `null`. Defined once in `apps/web/src/contexts/MediaPlayerControls.tsx`
and reused — it is referentially stable across renders so consumers'
`useEffect` deps don't churn.

```typescript
export const noopMediaElementBridge: MediaElementBridge = Object.freeze({
  loadAndStart: () => Promise.resolve(),
  play: () => Promise.resolve(),
  pause: () => {},
  togglePlay: () => Promise.resolve(),
  seek: () => {},
  jumpBy: () => {},
  pauseAt: () => {},
  setVolume: () => {},
  setMuted: () => {},
  setPlaybackRate: () => {},
  currentSourceKind: null,
});
```

#### Why no-op (not "buttons disable themselves")

Today the seek/jump/track-previous buttons fire window events that
effectively do nothing while video.js owns playback (the bridge's
listeners aren't attached to the video.js element). Calling typed
no-op methods preserves that **observable** behavior exactly — buttons
remain visually enabled and click-through but accomplish nothing,
matching pre-refactor parity. UI-level "disable while livestream
active" is a separate UX decision and belongs in the HLS plan-set
when livestreams gain real seek capability.

This is stable after Phase 4b: one `<MediaElement>` for non-live; the
provider always has at most one non-live bridge. Livestream still uses
legacy components until the HLS follow-up plan-set.

### Throws-if-missing default

Default value throws if `useMediaPlayerControls` is used outside the
provider.

## 3. `<MediaElement>` component contract

### File layout

```
apps/web/src/components/MediaPlayer/MediaElement/
  MediaElement.tsx
  mediaElementSourceFromTarget.ts
```

(HLS helpers such as `useHlsAttach.ts` belong in the HLS plan-set, not
here.)

### Rendered DOM

Either `<audio>` or `<video>` per `PlaybackTarget` (non-live only).

### `key` strategy

`elementKey` is `${isVideo ? 'video' : 'audio'}::file` — no HLS attach
mode in this plan-set.

### Media Session API + autoplay

Same as the prior plan: `attachMediaSession` in the bridge;
`AUTOPLAY_BLOCKED` on `play()` rejection for observability only.

## 4. Wiring legacy controllers (in 4a)

**Use the bridge:** `MediaPlayerControllerAudio` /
`MediaPlayerControllerAV` and `MediaPlayerVideoWrapper` (and any
shared AV file they delegate to) — replace giant listener `useEffect`s
with `useMediaElementBridge` + bridge method calls.

**Do not change:** `MediaPlayerControllerLiveStreamAudio`,
`MediaPlayerLiveStreamVideoWrapper`, `MediaPlayerControllerLiveStreamAV`
— keep video.js and existing listeners until the HLS plan-set.

Net effect: non-live controllers shrink; livestream code is
untouched.

## 5. ESLint (Phase 5)

Phase 5 adds `no-restricted-syntax` so `mediaRef.current` writes stay
inside `useMediaElementBridge.ts` only. **No** `no-restricted-imports`
for `video.js` in this plan-set (that guard ships with the HLS
follow-up).

## Out of scope

- Collapsing audio + video into one element (4b).
- HLS, `hls.js`, or removing `video.js` (HLS plan-set).
- UI migration off `EVENTS.MEDIA_PLAYER` (4c).

## Exit criteria

- `useMediaElementBridge` exists with unit tests on the fake element.
- `MediaPlayerControlsContext` is provided; non-live path publishes
  `isAttached: true` when appropriate.
- Regular AV controllers use the bridge; livestream controllers are
  unchanged from pre-4a behavior.
- `MediaPlayerControllerAV.tsx` is < 350 lines (or equivalent after
  extraction).
- Phase 1 E2E suite passes.
- `<MediaElement>` scaffold checked in; not yet the active renderer for
  non-live (that is 4b).

## Verification commands

```bash
npm run lint -w apps/web
npm run test:unit -w apps/web
make e2e_test_web_report
```
