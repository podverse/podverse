**Cursor model:** Opus 5.5 · **Reasoning:** high

# 32 — Media engine live window: Android

## Rows

R23, R28, R31

## Runs after

11, 30

- 11 exports `LIVE_WINDOW_START_MARGIN_SECONDS` from `@podverse/playback-core`, which the parity
  test imports.

## Files

apps/mobile/modules/podverse-media-engine/android/src/main/java/expo/modules/podversemediaengine/PodverseAudioEngine.kt
apps/mobile/modules/podverse-media-engine/android/src/main/java/expo/modules/podversemediaengine/PodverseMediaEngineModule.kt
apps/mobile/modules/podverse-media-engine/android/src/main/java/expo/modules/podversemediaengine/PodverseSessionPlayer.kt
apps/mobile/modules/podverse-media-engine/src/liveWindowStartMargin.android.test.ts

## Goal

Implement the live contract from plan 30 on the single shared Media3 `ExoPlayer`: report the
seekable window and live edge, stop reporting the HLS window length as a duration, clamp seeks into
the window, resume or jump to live on play, add `goToLive`, reconnect a progressive stream, and
recover from falling behind the live window. Read plan 30 § The contract first; it is the spec.
This plan does not touch the README or any shipped TypeScript; its only TypeScript file is the
margin parity test.

## Constraints that stay true

- One `ExoPlayer`, one `MediaLibrarySession`, wrapped by `PodverseSessionPlayer`. Reconnect
  re-prepares the same player, never a second one (module README;
  **mobile-carplay-android-auto**).
- Player reads stay on the main thread (`onMain` / `onMainSync` / listener callbacks).
- `loadGeneration` and `playWhenReadyGeneration` keep their meaning; a reconnect bumps
  `loadGeneration` and clears `playWhenReadyGeneration`.
- Non-live sources behave exactly as today. Media3 `media3-exoplayer-hls` is already a dependency
  (`android/build.gradle`); add no new dependency.

## Anchors in `PodverseAudioEngine.kt`

`prepareSource(...)`, `authenticatedMediaSource(...)`, `buildMediaItem(...)`, `startPlayback(...)`,
`play(context)`, `seek(seconds)`, `getDuration()`, `getDurationUnsafe()`, `clampToDuration(...)`,
`getCurrentSource()`, `playerListener` (`onPlaybackStateChanged`, `onIsPlayingChanged`,
`onPlayerError`), `progressRunnable`.

## Changes

### Liveness and the window

- `isLiveSourceLoaded()`: `loadedMeta?.get("isLive") == true`.
- Retain the load's `basicAuth` in a new private `loadedBasicAuth` (set in `prepareSource`), so a
  reconnect answers the same credential challenge. `ScopedBasicAuth` already prints without the
  password; keep it out of every log line.
- `currentLiveWindowUnsafe(): Pair<Double, Double>?`, main thread:
  - `null` when not live, no player, the timeline is empty, or `!p.isCurrentMediaItemSeekable`
    (progressive Icecast or Shoutcast streams are not seekable).
  - Read `p.currentTimeline.getWindow(p.currentMediaItemIndex, Timeline.Window())`.
    `durationMs == C.TIME_UNSET` → `null`.
  - Positions from `p.currentPosition` are relative to that window, so `start = 0.0`.
  - `liveEdge = defaultPositionMs` (Media3's live edge after the target live offset), falling back
    to `durationMs` when unset; clamp into `[0, durationMs]`; convert to seconds.
- Both `progress` emits (`STATE_READY` and `progressRunnable`) and `getCurrentSource()` add
  `isLive` and `liveWindow` (`mapOf("startSeconds" to …, "liveEdgeSeconds" to …)` or `null`).
  Build the payload in one helper.
- `getDuration()`, `getDurationUnsafe()`, and `clampToDuration` treat a live source as duration
  `0`. Today a live HLS stream reports its window length as the duration; after this it reports `0`
  and the window separately.

### `seek(seconds)`

When live: no window → return; window → clamp into `[start, liveEdge]`. Not live → unchanged.

### Resume rule

- Declare the margin beside `PREVIOUS_RESTARTS_AFTER_MS`, with a KDoc comment saying it must
  equal `LIVE_WINDOW_START_MARGIN_SECONDS` (in seconds) in `@podverse/playback-core` and that
  `liveWindowStartMargin.android.test.ts` checks it. Write the declaration exactly like this,
  because the test parses it:

  ```kotlin
  private const val LIVE_WINDOW_START_MARGIN_MS = 6_000L
  ```

- Add `hasPlayedCurrentItem`: `true` in `onIsPlayingChanged(true)`; `false` in `prepareSource` and
  in reconnect.
- In `play(context)`, when a live source is loaded, `hasPlayedCurrentItem` is true, and the player
  is not playing, read `currentLiveWindowUnsafe()` and `p.currentPosition` on the same main-thread
  turn, then:
  - not seekable or no window (progressive) → reconnect and start;
  - `currentPosition < LIVE_WINDOW_START_MARGIN_MS` → `seekToDefaultPosition()` then
    `startPlayback`. The window start is `0` on this timeline, so this is the shared rule's
    "start plus margin". It covers the window sliding past the paused point (`currentPosition`
    below `0`), a paused point inside the margin, and a window shorter than the margin;
  - otherwise → `startPlayback` as today (resume in place).
- A paused position the window has dropped can also surface as
  `PlaybackException.ERROR_CODE_BEHIND_LIVE_WINDOW` once playback resumes or during a long stall.
  In `onPlayerError`, for that code on a live source: `seekToDefaultPosition()`, `prepare()`,
  publish `loading`, and do not emit `error`. Every other error is unchanged.

### `goToLive()`

- Not live → return.
- Window → `seekToDefaultPosition()`, emit one `progress` sample (ExoPlayer reports the seek target
  from `currentPosition` on the same turn), then `startPlayback`.
- No window → reconnect and start.

### Reconnect

- Private `reconnectCurrentSource(context, playWhenReady: Boolean)`, main thread. Guard
  `loadedUrl`.
- Rebuild the `MediaItem` with `buildMediaItem(loadedUrl, loadedMeta)`; set it with
  `authenticatedMediaSource` when `loadedBasicAuth` is set and the URL is remote, otherwise
  `setMediaItem`. `prepare()`. Bump `loadGeneration`, reset `playWhenReadyGeneration` to `-1`,
  `hasPlayedCurrentItem = false`, publish `loading`.
- Do not emit `sourceChanged`. Do not append a `started` journal row.
- When `playWhenReady`, `startPlayback(context, p)`.

### Session player

`PodverseSessionPlayer.kt`: the notification, headset, and Android Auto call play on this
`ForwardingPlayer`, not on `PodverseAudioEngine`. Override `play()` and `setPlayWhenReady(true)` so
that, when a live source is loaded, they call `PodverseAudioEngine.play(context)` (which applies the
resume rule on the underlying ExoPlayer) instead of `super`. Non-live sources and
`setPlayWhenReady(false)` go to `super`. Add `fun isLiveSourceLoaded(): Boolean` on the engine for
this check, the same shape as `isMusicSourceLoaded()`. Media3 already removes seek commands for an
unseekable item and bounds `seekBack` / `seekForward` to the window, so no command filtering is
needed here.

### Expo module

`PodverseMediaEngineModule.kt`: add `AsyncFunction("goToLive") { PodverseAudioEngine.goToLive(reactContext()) }`
beside `play`.

## Tests

The Media3 behavior has no automated test; only a device shows it. The JS contract and normalizer
are covered by plan 30's Vitest file.

New `apps/mobile/modules/podverse-media-engine/src/liveWindowStartMargin.android.test.ts` (Vitest;
the existing `modules/podverse-media-engine/src/**/*.test.ts` include already picks it up, so
`apps/mobile/vitest.config.ts` needs no edit). It keeps the native margin equal to the shared one:

- `import { LIVE_WINDOW_START_MARGIN_SECONDS } from '@podverse/playback-core';` (apps/mobile
  already depends on it; the import is test-only).
- Read
  `../android/src/main/java/expo/modules/podversemediaengine/PodverseAudioEngine.kt` with
  `readFileSync` from `node:fs`, resolved against `import.meta.url` with `fileURLToPath` and
  `node:path` (`apps/mobile/src/config/deepLinkSchemes.test.ts` already uses `node:` imports with
  `import.meta.url` in this suite).
- Match `/^\s*private const val LIVE_WINDOW_START_MARGIN_MS = ([0-9_]+)L$/m`. Assert the match is
  not null (a renamed or removed declaration fails), then assert
  `Number(match[1].replaceAll('_', '')) / 1000` equals `LIVE_WINDOW_START_MARGIN_SECONDS`.
- One `describe` with one `it`, in plain sentences (for example "keeps the Android resume margin
  equal to the shared live window start margin").

Device checks for the set's final verification list (Android, after a native rebuild):

- Live HLS (`tools/test-assets/assets/e2e/hls/e2e-hls-event.m3u8` through an Add by RSS live item,
  or any live HLS stream): `progress` carries `isLive: true`, `durationSeconds: 0` (not the window
  length), and a non-null `liveWindow`. With a stream that holds more than a minute, seeking back
  stays inside the window, and `goToLive` returns to within a few seconds of `liveEdgeSeconds`.
- Pause a sliding-window live HLS stream until the window passes the paused point, then press play
  in the notification: playback lands at live with no error dialog.
- Live HLS with a window of at least 30 seconds (the rewind fixture `e2eLiveHlsRw01` from plan
  53): pause, drag the notification scrubber to the window start (the seek clamps to
  `startSeconds`), then press play in the notification; playback goes to live, because the paused
  position is inside the 6-second margin. Pause again, drag to 20 seconds or more after the
  window start, and press play; it resumes in place.
- Progressive Icecast or Shoutcast live stream: `liveWindow` stays `null`; pause for a minute then
  play (in the app and in the notification) reconnects and plays current audio.
- A regular episode: duration, seek, skip, and notification controls unchanged.

## Release scratchpad

Append this entry (or put it in the final message when this prompt shares a phase):

```markdown
## Live streams on Android rewind, jump to live, and reconnect

- Surfaces: mobile (Android)
- Change: the media engine reports a live stream's seekable window and live edge instead of
  reporting an HLS window length as the duration, keeps seeks inside the window, and adds a
  go-to-live command. Pressing play after pausing a live stream (app, notification, headset, or
  Android Auto) resumes where it paused when the stream still holds that moment with at least 6
  seconds to spare before the window start, otherwise jumps to live (the same rule as web); a
  progressive stream reconnects so it plays what is live now. Falling behind a live
  window recovers at live instead of failing.
- Who notices: Android listeners of livestreams
- Operator steps: native rebuild of the Android app
```
