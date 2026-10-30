**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 30 — Media engine live window: bridge contract

## Rows

R23, R28, R31

## Runs after

none

## Files

apps/mobile/modules/podverse-media-engine/src/types.ts
apps/mobile/modules/podverse-media-engine/src/liveWindowNormalization.ts
apps/mobile/modules/podverse-media-engine/src/liveWindowNormalization.test.ts
apps/mobile/modules/podverse-media-engine/src/NativePlaybackBridge.ts
apps/mobile/modules/podverse-media-engine/src/PodverseMediaEngineModule.ts
apps/mobile/modules/podverse-media-engine/index.ts
apps/mobile/modules/podverse-media-engine/README.md
apps/mobile/src/bridge/nativePlaybackBridge.ts
apps/mobile/src/bridge/useNativePlaybackBridge.ts

## Goal

Define the TypeScript side of the live contract between `podverse-media-engine` and React Native:
which events carry the live window, what each field means, and the one new command, `goToLive`.
Plans 31 (iOS) and 32 (Android) implement it natively. Area G (plans 70–79) builds the mobile
player UI on it. This plan changes no native code and no player UI.

Until plans 31 and 32 land, native emits none of the new fields. The normalizer below turns their
absence into "not live, no window", so this plan is safe to ship on its own.

## What the code does today

- `progress` (`ProgressEvent` in `src/types.ts`) carries `positionSeconds` and `durationSeconds`
  only. Nothing reports a seekable range.
- iOS `getDuration()` returns 0 for a live stream (indefinite `CMTime`). Android returns the HLS
  live window length (ExoPlayer `duration` for a dynamic window), so a live HLS stream shows a
  duration on Android.
- `seek` clamps to `[0, duration]`; with no duration it only clamps at 0. Nothing jumps to the live
  edge, and nothing reconnects a progressive stream.
- JS already marks live loads: `buildMediaEngineSourceMeta` in
  `apps/mobile/src/lib/playback/mediaEngineSourceMeta.ts` sets `meta.isLive` to
  `target.kind === 'livestream'`. Native keeps that meta for the loaded source.

## The contract

### Liveness

A loaded source is live when its load meta has `isLive: true`. Native does not guess liveness from
an indefinite duration or a dynamic timeline; JS already knows which targets are livestreams.

### `MediaEngineLiveWindow` (new type in `src/types.ts`)

```ts
/**
 * The part of a live stream the native player can still play, in the same timeline as
 * `positionSeconds`. The timeline is the player's own: it can start above zero, and both ends move
 * forward while the stream runs. Compare fields only within one event or one snapshot.
 */
export type MediaEngineLiveWindow = {
  /** Earliest position the stream still holds. */
  startSeconds: number;
  /**
   * Where `goToLive` lands: the newest position the player will play, after the stream's own
   * hold-back. A listener at the live point reads `positionSeconds` within a few seconds of this.
   */
  liveEdgeSeconds: number;
};
```

Invariants native guarantees, and the normalizer enforces: both values are finite, and
`startSeconds <= liveEdgeSeconds`. A zero-length window (`startSeconds === liveEdgeSeconds`) is
valid; it means the stream is segmented but holds nothing to rewind into yet. Native reports the
window at whatever length the player gives; whether a window is long enough to offer rewind is
area A's policy, not the engine's.

The window is `null` when the source is not live, and when the live source holds no history:
progressive Icecast or Shoutcast streams, or a segmented stream before the player has a seekable
range.

How far behind live the listener is: `max(0, liveWindow.liveEdgeSeconds - positionSeconds)`.

### Events

Split `ProgressEvent` into a raw native shape and the public shape, the same way `error` is split
today (`NativePlaybackErrorPayload` raw, `PlaybackErrorEvent` public):

```ts
/** `progress` exactly as native emits it. Builds without the live fields omit them. */
export type NativeRawProgressEvent = {
  positionSeconds: number;
  durationSeconds: number;
  isLive?: boolean;
  liveWindow?: MediaEngineLiveWindow | null;
};

/** `progress` as RN consumers receive it from `useNativePlaybackBridge`. */
export type ProgressEvent = {
  positionSeconds: number;
  /** Seconds; `0` when unknown, and always `0` while a live source is loaded. */
  durationSeconds: number;
  /** The loaded source's meta marked it live. */
  isLive: boolean;
  /** Seekable span of a live source; `null` when not live or the stream holds no history. */
  liveWindow: MediaEngineLiveWindow | null;
};
```

- `NativeRawPlaybackEvents.progress` takes `NativeRawProgressEvent`.
- `NativePlaybackEvents.progress` takes `ProgressEvent`.
- When it fires is unchanged: once when the item is ready, then about every 500 ms while playing.
  Plans 31 and 32 add one more sample right after a `goToLive` seek lands, so the behind-live
  offset clears without waiting for the next tick.
- No new event name. The window rides on `progress` because it changes on the same clock.

### `getCurrentSource()`

Same split. `NativeRawCurrentSource` is today's `MediaEngineCurrentSource` plus optional
`isLive?: boolean` and `liveWindow?: MediaEngineLiveWindow | null`. Public `MediaEngineCurrentSource`
gains required `isLive: boolean` and `liveWindow: MediaEngineLiveWindow | null`, with
`durationSeconds` forced to `0` when live. `PodverseMediaEngineNativeModule.getCurrentSource`
returns `Promise<NativeRawCurrentSource | null>`; the adapter normalizes.

`getCurrentSource()` is how a caller reads a fresh window while paused, since `progress` does not
tick while paused.

### `getDuration()`

Doc change only: returns `0` while a live source is loaded, on both platforms. Plan 32 makes
Android match.

### `seek(seconds)` on a live source

- With a window: native clamps `seconds` into `[startSeconds, liveEdgeSeconds]`.
- Without a window: no-op. A progressive stream cannot seek.
- Non-live sources: unchanged.

### `play()` on a live source

Native applies the operator's resume rule ("Resume where it was paused if the stream still holds
that moment; otherwise jump to live") inside `play()`, so the in-app button, the lock screen,
headset buttons, the notification, CarPlay, and Android Auto all behave the same. It applies only
when the current item has already played once since it was loaded; a fresh paused load (cold-start
restore) just starts.

The rule is the same as `resolveLiveResume` in `packages/playback-core/src/livePlayback.ts`
(plan 11), with the position and window sampled when `play()` is called:

- No window (progressive): reconnect, then play.
- Position not finite: seek to `liveEdgeSeconds`, then play.
- `positionSeconds >= startSeconds + LIVE_WINDOW_START_MARGIN_SECONDS` (6 seconds): resume in
  place. The margin covers the window start moving forward while the player is paused or seeking.
- Otherwise, including a window shorter than the margin: seek to `liveEdgeSeconds`, then play.

#### Where native gets the margin

Swift and Kotlin cannot import the TypeScript constant, so each platform declares its own copy
in its engine file, kept equal to `LIVE_WINDOW_START_MARGIN_SECONDS`:

- iOS (plan 31): `private static let liveWindowStartMarginSeconds: Double = 6` in
  `PodverseAudioEngine.swift`.
- Android (plan 32): `private const val LIVE_WINDOW_START_MARGIN_MS = 6_000L` in
  `PodverseAudioEngine.kt` (Media3 positions are milliseconds).

The value is not passed over the bridge. `play()` also runs from the lock screen, the
notification, CarPlay, and Android Auto, on a source the engine reloaded after a media services
reset or kept from an earlier app build, so native needs its own value in every case; a bridge
value would be a second copy, not a replacement.

A mismatch is caught by Vitest. Plans 31 and 32 each add a test under
`modules/podverse-media-engine/src/` that reads its platform's engine source as text, parses the
declaration above, and asserts it equals `LIVE_WINDOW_START_MARGIN_SECONDS` imported from
`@podverse/playback-core`. The test also fails when the declaration is renamed or removed. The
import is test-only; the module's shipped TypeScript keeps no `@podverse/*` dependency.

JS callers call `play()` and nothing else for resume. They do not pre-seek.

### New command: `goToLive()`

```ts
/**
 * Jump to the live point of a live source and play. With a window, seeks to `liveEdgeSeconds`.
 * Without one (progressive stream), reconnects the stream so playback starts at what is live now.
 * Resolves once the seek or reconnect is issued. No-op for a non-live source.
 */
goToLive(): Promise<void>;
```

- Always plays, including from paused. The live point moves on, so landing there paused would be
  stale by the time the listener presses play.
- Reconnect keeps the same source: same URL, meta, credentials, now-playing info, and artwork. It
  does not emit `sourceChanged` and does not write a `started` journal row. `playbackState` moves
  through `loading` → `ready` → `playing` as with any load.
- No arguments, so `bridgeCommandSerialization.ts` gains nothing.

### What this contract does not cover

- DASH. iOS `AVPlayer` cannot play DASH, the Android module ships no
  `media3-exoplayer-dash`, and nothing in `@podverse/helpers` classifies `.mpd`. Mobile rewind is
  HLS only.
- An app-side buffer for progressive streams (operator answer: none).
- Progress samples while paused. Behind-live grows while paused; a caller that needs the current
  number reads `getCurrentSource()`.

## Steps

1. `src/types.ts`: add `MediaEngineLiveWindow`, `NativeRawProgressEvent`, `NativeRawCurrentSource`;
   change `ProgressEvent` and `MediaEngineCurrentSource` as above; point
   `NativeRawPlaybackEvents.progress` at the raw type. Keep the file's doc-comment style.
1. New `src/liveWindowNormalization.ts`, pure, no Expo or native imports (the Vitest include
   already covers `modules/podverse-media-engine/src/**/*.test.ts`):
   - `normalizeLiveWindow(value: unknown): MediaEngineLiveWindow | null` — returns a fresh object
     only when `value` is a non-null object whose `startSeconds` and `liveEdgeSeconds` are finite
     numbers with `startSeconds <= liveEdgeSeconds`; otherwise `null`. Narrow with `typeof` and
     `in`; no `as` (**avoid-type-assertions**).
   - `normalizeProgressEvent(raw: NativeRawProgressEvent): ProgressEvent` — `isLive` is
     `raw.isLive === true`; when live, `durationSeconds` is `0` and `liveWindow` is
     `normalizeLiveWindow(raw.liveWindow)`; when not live, `durationSeconds` is the raw value and
     `liveWindow` is `null`.
   - `normalizeCurrentSource(raw: NativeRawCurrentSource | null): MediaEngineCurrentSource | null`
     — same rules; `null` passes through.
1. `src/NativePlaybackBridge.ts`: add `goToLive(): Promise<void>` to `NativePlaybackBridge` with
   the doc comment above. Update the `seek`, `play`, and `getDuration` doc comments with the live
   rules (one or two lines each).
1. `src/PodverseMediaEngineModule.ts`: add `goToLive(): Promise<void>` to
   `PodverseMediaEngineNativeModule`; `getCurrentSource` returns the raw type.
1. `index.ts`: export the new types and the three normalizers next to the existing
   `normalizePlaybackError` export.
1. `apps/mobile/src/bridge/nativePlaybackBridge.ts`: add `goToLive()` passing through to the
   native module; `getCurrentSource()` returns `normalizeCurrentSource(...)` of the native result.
1. `apps/mobile/src/bridge/useNativePlaybackBridge.ts`: the `progress` listener calls
   `handlersRef.current?.progress?.(normalizeProgressEvent(event))`. Update the comment that
   explains normalization so it covers both `error` and `progress`.
1. `README.md` (module): in "Playback method contract" add a `goToLive()` row and the live rules
   for `seek`, `play`, and `getDuration`; in "Native → JS events" extend the `progress` row with
   `isLive` and `liveWindow`; add a short "Live streams" section stating liveness, the window
   fields and invariants, the resume rule (in place only at or after the window start plus the
   6-second margin, the native copies of the margin and the Vitest tests that keep them equal to
   `LIVE_WINDOW_START_MARGIN_SECONDS` in `@podverse/playback-core`), reconnect, the per-platform window source (iOS:
   `seekableTimeRanges` and `recommendedTimeOffsetFromLive`, progressive excluded by the access log
   `playbackType == "FILE"`; Android: the current timeline window, `defaultPositionMs` as the live
   edge, `ERROR_CODE_BEHIND_LIVE_WINDOW` recovery), the iOS lock-screen skip rule, and that DASH is
   not supported. Plans 31 and 32 do not edit the README.

`PlaybackProvider.tsx` and `PlaybackEngineDebugPanel.tsx` compile unchanged: they read only
`positionSeconds` and `durationSeconds`, which keep their names. Do not edit them here; area G
consumes the new fields.

## Tests

- New `apps/mobile/modules/podverse-media-engine/src/liveWindowNormalization.test.ts` (Vitest):
  - a raw progress event with no live fields reads as `isLive: false`, `liveWindow: null`, and the
    raw duration;
  - a live event with a valid window keeps both window values and forces `durationSeconds` to `0`
    even when native sent a non-zero duration;
  - a live event with `liveWindow: null` reads as live with no window;
  - malformed windows read as `null`: `NaN` or `Infinity` in either field, `startSeconds` above
    `liveEdgeSeconds`, a missing field, a non-object;
  - a zero-length window is kept;
  - a non-live event that still carries a window drops it;
  - `normalizeCurrentSource(null)` is `null`, and a live snapshot gets the same treatment as
    progress.
- The resume margin's native copies are checked by the parity tests in plans 31 and 32, not
  here; this plan changes no native file.

## Release scratchpad

none

## Notes for the implementer

- Keep `import type` on its own line (**type-imports-separate-line**).
- Comments describe the code as it stands; no plan numbers (**comments-future-forward**).
