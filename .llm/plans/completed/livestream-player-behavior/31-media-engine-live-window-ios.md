**Cursor model:** Opus 5.5 · **Reasoning:** high

# 31 — Media engine live window: iOS

## Rows

R23, R28, R31

## Runs after

11, 30

- 11 exports `LIVE_WINDOW_START_MARGIN_SECONDS` from `@podverse/playback-core`, which the parity
  test imports.

## Files

apps/mobile/modules/podverse-media-engine/ios/PodverseAudioEngine.swift
apps/mobile/modules/podverse-media-engine/ios/PodverseMediaEngineModule.swift
apps/mobile/modules/podverse-media-engine/src/liveWindowStartMargin.ios.test.ts

## Goal

Implement the live contract from plan 30 on the single shared `AVPlayer`: report the seekable
window and live edge, clamp seeks into it, resume or jump to live on `play()`, add `goToLive`, and
reconnect a progressive stream. Read plan 30 § The contract first; it is the spec. This plan does
not touch the README or any shipped TypeScript; its only TypeScript file is the margin parity test.

## Constraints that stay true

- One `AVPlayer`, one `MPRemoteCommandCenter`, one event sink. Reconnect replaces the current item
  on the same player, never a second player (module README; **mobile-carplay-android-auto**).
- Main-thread discipline: every new read of `player` / `currentItem` runs inside `onMain` or a
  main-queue callback, like the existing code.
- `loadGeneration` guards stay meaningful: a reconnect bumps it so a seek or ready callback from
  the replaced item cannot start playback.
- Non-live sources behave exactly as today.

## Anchors in `PodverseAudioEngine.swift`

`load(url:initialSeekSeconds:basicAuth:audioProfile:metaJson:playWhenPrepared:)` (private),
`getCurrentSource()`, `play()`, `startPlayer()`, `startLoadedItem()`, `seek(seconds:)`,
`getDuration()`, `handleMediaServicesReset(_:)`, `applyRemoteCommandAvailability()`,
`registerRemoteCommands()`, `addTimeControlObservation()`, `addPeriodicTimeObserver()`,
`observeItemStatus(_:)`, `clampToDuration(_:)`.

## Changes

### Liveness and the window

- `isLiveSourceLoaded`: `loadedSource?.meta?.isLive == true`.
- `currentLiveWindow() -> (start: Double, liveEdge: Double)?`, main thread:
  - `nil` when not live, or `player.currentItem` is nil.
  - `nil` when `item.accessLog()?.events.last?.playbackType == "FILE"` (progressive Icecast or
    Shoutcast; AVPlayer can report a buffered span for those, and progressive streams stay
    live-only).
  - Take the last valid range of `item.seekableTimeRanges` (`timeRangeValue`, both ends finite,
    positive duration). None → `nil`.
  - `start = range.start.seconds`, `end = CMTimeRangeGetEnd(range).seconds`.
  - `offset = item.recommendedTimeOffsetFromLive.seconds` when finite and positive, else `0`.
  - `liveEdge = max(start, end - offset)`. Return `(start, liveEdge)`.
- `liveWindowPayload() -> Any`: `["startSeconds": start, "liveEdgeSeconds": liveEdge]` or
  `NSNull()`.
- One helper builds every `progress` payload: `positionSeconds`, `durationSeconds`, `isLive`,
  `liveWindow`. Use it in the periodic observer, the `.readyToPlay` sample, and the new
  post-`goToLive` sample. `getCurrentSource()` adds `isLive` and `liveWindow` too.
- `getDuration()` returns `0` while a live source is loaded.

### Remote commands

- `applyRemoteCommandAvailability()`: when a live source has no window, disable
  `skipForwardCommand`, `skipBackwardCommand`, and `changePlaybackPositionCommand`. Otherwise keep
  today's music/podcast split and leave `changePlaybackPositionCommand` enabled.
- Window presence can change after the item is ready (seekable ranges arrive late, the access log
  fills in). Track the last applied presence in a private `Bool?`; when the progress helper sees a
  different presence, call `applyRemoteCommandAvailability()`. Reset it on load and reconnect.
- The skip and change-position handlers already go through `seek(seconds:)`, which clamps (below).
  `playCommand` and `togglePlayPauseCommand` already go through `play()`, which applies the resume
  rule.

### `seek(seconds:)`

When live: no window → return without seeking; window → clamp into `[start, liveEdge]`. Not live
→ unchanged (`clampToDuration`).

### Resume rule in `play()`

- Declare the margin beside `maxErrorCauseDepth`, with a doc comment saying it must equal
  `LIVE_WINDOW_START_MARGIN_SECONDS` in `@podverse/playback-core` and that
  `liveWindowStartMargin.ios.test.ts` checks it. Write the declaration exactly like this, because
  the test parses it:

  ```swift
  private static let liveWindowStartMarginSeconds: Double = 6
  ```

- Add `hasPlayedCurrentItem`: set `true` when `timeControlStatus` becomes `.playing` (in
  `addTimeControlObservation`); set `false` in `load` and in reconnect.
- In `play()`, after clearing the interruption flags, when a live source is loaded,
  `hasPlayedCurrentItem` is true, and `player.timeControlStatus == .paused`, read
  `currentLiveWindow()` and `getPosition()` on the same main-thread turn, then:
  - no window → reconnect and start (below);
  - position not finite, or `position < start + Self.liveWindowStartMarginSeconds` → seek to
    `liveEdge`, start in the seek completion (guard on `loadGeneration`). This includes a window
    shorter than the margin;
  - otherwise → `startPlayer()` as today (resume in place).
- Every other case is today's `startPlayer()`.
- `startLoadedItem()` (autoplay after load, interruption resume) is unchanged: a fresh item has not
  played, and an interruption resume continues from the buffer the system kept.

### `goToLive()`

- Not live → return.
- Window → `player.seek(to: liveEdge)`; in the completion, guarded on `loadGeneration`:
  `updateNowPlayingElapsed()`, emit one `progress` sample, then `startLoadedItem()` (so a live
  jump during an interruption waits like any other start).
- No window → reconnect and start.

### Reconnect

- Private `reloadCurrentItem(playWhenReady: Bool)`, main thread. Guard `loadedSource`.
- Extract the item construction that `load` does today (credentialed `AVURLAsset` with
  `PodverseMediaAuthLoaderDelegate`, or plain `AVPlayerItem`) into one private factory both paths
  call, so credentials are answered the same way after a reconnect.
- Remove the previous item's end and stalled observers, bump `loadGeneration`, clear
  `pendingInitialSeekSeconds` and `playAfterPendingSeek`, observe the new item
  (status/end/stalled), set `currentItem`, `publish(state: .loading)`,
  `player.replaceCurrentItem(with:)`. Keep `nowPlaying` (title, artist, album, artwork) and
  `loadedSource` as they are.
- Do not emit `sourceChanged`. Do not append a `started` journal row.
- When `playWhenReady`, call `startLoadedItem()` on the same turn, as `load` does for an autoplay
  load with no seek.

### Media services reset

In `handleMediaServicesReset(_:)`, pass `initialSeekSeconds: nil` when the saved source is live.
A saved live position is meaningless after the reset; the reload starts at live.

### Expo module

`PodverseMediaEngineModule.swift`: add `AsyncFunction("goToLive") { PodverseAudioEngine.shared.goToLive() }`
beside `play`. `getCurrentSource` needs no change beyond what the engine returns.

## Tests

The AVFoundation behavior has no automated test; only a device shows it. The JS contract and
normalizer are covered by plan 30's Vitest file.

New `apps/mobile/modules/podverse-media-engine/src/liveWindowStartMargin.ios.test.ts` (Vitest;
the existing `modules/podverse-media-engine/src/**/*.test.ts` include already picks it up, so
`apps/mobile/vitest.config.ts` needs no edit). It keeps the native margin equal to the shared one:

- `import { LIVE_WINDOW_START_MARGIN_SECONDS } from '@podverse/playback-core';` (apps/mobile
  already depends on it; the import is test-only).
- Read `../ios/PodverseAudioEngine.swift` with `readFileSync` from `node:fs`, resolved against
  `import.meta.url` with `fileURLToPath` and `node:path` (`apps/mobile/src/config/deepLinkSchemes.test.ts`
  already uses `node:` imports with `import.meta.url` in this suite).
- Match `/^\s*private static let liveWindowStartMarginSeconds: Double = ([0-9.]+)$/m`. Assert the
  match is not null (a renamed or removed declaration fails), then assert `Number(match[1])`
  equals `LIVE_WINDOW_START_MARGIN_SECONDS`.
- One `describe` with one `it`, in plain sentences (for example "keeps the iOS resume margin
  equal to the shared live window start margin").

Device checks for the set's final verification list (iOS, after a native rebuild):

- Live HLS (`tools/test-assets/assets/e2e/hls/e2e-hls-event.m3u8` through an Add by RSS live item,
  or any live HLS stream): `progress` carries `isLive: true`, `durationSeconds: 0`, and a non-null
  `liveWindow`. With a stream that holds more than a minute, seeking back stays inside the window,
  and `goToLive` returns to within a few seconds of `liveEdgeSeconds`.
- Live HLS with a window of at least 30 seconds (the rewind fixture `e2eLiveHlsRw01` from plan
  53): pause, drag the lock-screen scrubber to the window start (the seek clamps to
  `startSeconds`), then press play on the lock screen; playback goes to live, because the paused
  position is inside the 6-second margin. Pause again, drag to 20 seconds or more after the
  window start, and press play; it resumes in place.
- Progressive Icecast or Shoutcast live stream: `liveWindow` stays `null`; the lock screen shows no
  skip buttons; pause for a minute then play reconnects and plays current audio rather than the
  buffered minute.
- A regular episode: duration, seek, skip, and lock-screen controls unchanged.

## Release scratchpad

Append this entry (or put it in the final message when this prompt shares a phase):

```markdown
## Live streams on iOS rewind, jump to live, and reconnect

- Surfaces: mobile (iOS)
- Change: the media engine reports a live stream's seekable window and live edge, keeps seeks
  inside the window, and adds a go-to-live command. Pressing play after pausing a live stream
  resumes where it paused when the stream still holds that moment with at least 6 seconds to
  spare before the window start, otherwise jumps to live (the same rule as web); a
  progressive stream reconnects so it plays what is live now. The lock screen hides the skip
  buttons for a live stream that cannot rewind.
- Who notices: iOS listeners of livestreams, from the app, lock screen, headset, and CarPlay
- Operator steps: native rebuild of the iOS app
```
