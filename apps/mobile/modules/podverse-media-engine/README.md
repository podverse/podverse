# podverse-media-engine

First-party Podverse native media engine (PG-2b, Track 2). One process-wide player owns phone, lock
screen, and future CarPlay / Android Auto now-playing. **Do not** use `react-native-track-player`.

- iOS: single shared `AVPlayer` + single shared `MPRemoteCommandCenter` (steps 2.4–2.6).
- Android: single Media3 `ExoPlayer` + `MediaLibraryService` (stub browse OK) + shared `MediaSession`
  (steps 2.7–2.9).
- Policy stays in `@podverse/playback-core`; this module is **transport only**.

Car foundation constraints:
[00-CAR-FOUNDATION.md](/.llm/plans/completed/mobile-pg2b-media-engine-spike/00-CAR-FOUNDATION.md) and
[mobile-carplay-android-auto](/.cursor/rules/mobile-carplay-android-auto.mdc).

**Spike gate (PG-2b step 2.34):** [`GO-NO-GO.md`](./GO-NO-GO.md) — **GO.** Tracks 10/11/12 may proceed
on this engine (seamless car QA remains Track 12).

> **Not seamless yet.** These stubs reserve the surface only. Seamless CarPlay / Android Auto
> acceptance (native reads with JS not started / app force-stopped) is proven in **Track 12** —
> steps **12.5–12.6** and **12.17–12.18**. Durable cache storage is **12.2–12.3**; JS write call
> sites are **10.22 / 12.4**.

## Status (PG-2b)

- **iOS audio (steps 2.4–2.6): implemented.** Single shared `AVPlayer`, `AVAudioSession` `.playback`
  with interruption / route-change handling, and one shared `MPRemoteCommandCenter` +
  `MPNowPlayingInfoCenter`. See `ios/PodverseAudioEngine.swift`.
- **Android audio (steps 2.7–2.9): implemented.** Single Media3 `ExoPlayer`, a foreground
  `MediaLibraryService` (`PodverseMediaLibraryService`) for background survival, and the one
  `MediaLibrarySession` (media notification / lock screen / BT controls) wrapping that player. See
  `android/src/main/java/expo/modules/podversemediaengine/`.
- **Native → JS events (step 2.10) and JS adapter (step 2.11): implemented.** Both platforms emit the
  five events below; the JS adapter (`apps/mobile/src/bridge/`) implements `NativePlaybackBridge` and
  is the only place RN talks to the engine. RN screens must not import the native module directly.

### Android shared engine + service (car foundation)

`PodverseAudioEngine` (Kotlin `object`) owns the one `ExoPlayer`. `PodverseMediaLibraryService` is a
Media3 `MediaLibraryService` (declared in the module `AndroidManifest.xml` with
`foregroundServiceType="mediaPlayback"` and the `MediaLibraryService` / `MediaBrowserService` intent
filters) that wraps **that same player** in the one `MediaLibrarySession`.

- **One player, one session, one service.** Android Auto (Track **12.11–12.13**) connects to the
  **service, not the Activity**, and reuses this session — never a second player/session.
- **Stub browse tree:** the session returns a browsable root with **empty children**; Track 12 fills
  `onGetChildren` from the native cache (`writeLibraryBrowseIndex`). JS never owns the browse tree.
- **Foreground/notification:** `play()` starts the service; Media3 promotes it to foreground and posts
  the media notification once playing. App-force-stopped read/browse is proven later (12.6 / 12.17).
- **Media3 version:** `androidx.media3:media3-exoplayer` + `media3-session` (see `android/build.gradle`,
  `media3Version`).

### iOS shared engine accessor (car foundation)

`PodverseAudioEngine.shared` is a process-wide singleton that owns the one `AVPlayer`, the one
`AVAudioSession` configuration, and the one `MPRemoteCommandCenter` registration. It is intentionally
independent of the Expo module lifecycle: a future CarPlay scene (Track **12.9–12.10**) binds
now-playing and remote commands to `PodverseAudioEngine.shared` **without starting the JS runtime**.
The Expo module only sets an `eventSink` to forward events to JS while JS is alive.

- **One player, one command center.** Lock screen, Control Center, and future CarPlay all drive the
  same `AVPlayer` via the same command center — never a second registration path.
- **`destroy()` keeps** the shared player, session config, and command-center registration so car
  surfaces can rebind; it only tears down the current item/observers.
- **Interruptions:** pause on `.began`; resume only when the system sets `.shouldResume`.
- **Route changes:** pause when the previous output becomes unavailable (headphones unplugged).

## Background & after-kill behavior (spikes 2.12–2.13)

**Verified for GO** (operator device sign-off; gate in [`GO-NO-GO.md`](./GO-NO-GO.md)).

### Background audio (step 2.12 / detail 091)

Prerequisites are wired in `app.config.ts`: iOS `UIBackgroundModes: ['audio']` (paired with the
`AVAudioSession` `.playback` category, step 2.5), and Android `FOREGROUND_SERVICE` +
`FOREGROUND_SERVICE_MEDIA_PLAYBACK` with `PodverseMediaLibraryService`
(`foregroundServiceType="mediaPlayback"`, step 2.8).

- **Verified:** audio continues when the app is backgrounded (Home / lock) on **iOS and Android**,
  with lock-screen / media-notification controls on the same player instance.
- **iOS:** treat **device** as authoritative; simulator can differ (audio focus / route quirks).
- **Android:** foreground service posts the media notification once playing.

### After force-stop / swipe-away (step 2.13 / detail 092)

Documented honestly — **kill-survival is not required for GO** as long as background audio works:

- **iOS:** force-quit (swipe up from the app switcher) terminates the process; **audio stops**.
  Expected OS behavior, not a bug.
- **Android:** swipe-away from Recents may stop the service depending on OEM / task-removed policy;
  continuity after kill is not claimed for GO.

**Important distinction:** "audio continuity after kill" is separate from **seamless CarPlay / Android
Auto browse when JS is dead / the app is force-stopped**. The latter is proven in **Track 12**
(12.5–12.6, 12.17–12.18) and relies on the **native cache** (`writeQueueSnapshot` /
`writeDownloadsIndex` / `writeLibraryBrowseIndex`, durable storage 12.2–12.3) — **not** on keeping the
JS runtime or the Activity alive.

## JS surface

```ts
import type { NativePlaybackBridge, MediaEngineSource } from 'podverse-media-engine';
// The typed native accessor (used by the step 2.11 adapter, not RN screens directly):
import { PodverseMediaEngineModule } from 'podverse-media-engine/src/PodverseMediaEngineModule';
```

## Playback method contract (step 2.3 / detail 082)

Position and duration are **seconds** (`number`), matching the web bridge. `pause`, `seek`, `setRate`,
and `destroy` are synchronous native functions; `load`, `play`, `getPosition`, and `getDuration` are
async (resolve on the JS thread after the native call). All methods run against the single shared
player instance.

| Method          | Args                                           | Returns           | Errors / notes                                                                          |
| --------------- | ---------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------- |
| `load(source)`  | `{ url: string; initialSeekSeconds?: number }` | `Promise<void>`   | Prepares URL + initial seek. Does **not** start playback. Rejects on load failure.      |
| `play()`        | —                                              | `Promise<void>`   | Activates audio session (iOS 2.5) / foreground service (Android 2.8) then plays.        |
| `pause()`       | —                                              | `void`            | Keeps current item and position.                                                        |
| `seek(seconds)` | `number` (seconds)                             | `void`            | Absolute seek. Clamping owned by native.                                                |
| `setRate(rate)` | `number` (e.g. `1.0`, `1.5`)                   | `void`            | Sets playback rate.                                                                     |
| `getPosition()` | —                                              | `Promise<number>` | Current playhead in seconds.                                                            |
| `getDuration()` | —                                              | `Promise<number>` | Duration in seconds; `0` when unknown/live.                                             |
| `destroy()`     | —                                              | `void`            | Tears down current item/observers. Shared player/command-center ownership stays native. |

A later `loadAndStart` convenience (step 2.25 / detail 104) will combine `load` + `play`.

## Native → JS events (step 2.10 / detail 089)

Event names are stable — they are the input to future RN queue orchestrators. `progress` is throttled
to ~500 ms (within the 250–1000 ms guidance) on both platforms. Subscribe via the JS adapter
(`useNativePlaybackBridge`), not the native module.

| Event           | Payload                                                | When                                    |
| --------------- | ------------------------------------------------------ | --------------------------------------- |
| `playbackState` | `{ state: PlaybackStateValue }`                        | Lifecycle transitions (idle…error).     |
| `progress`      | `{ positionSeconds: number; durationSeconds: number }` | ~500 ms while playing.                  |
| `ended`         | `{ positionSeconds: number }`                          | Item played to natural end.             |
| `error`         | `{ code: string; message: string }`                    | Playback/load failure (mapped in 2.27). |
| `stalled`       | `{ positionSeconds: number }`                          | Buffer underrun / rebuffering.          |

### JS adapter (step 2.11 / detail 090)

`apps/mobile/src/bridge/` — `nativePlaybackBridge` implements the high-level `NativePlaybackBridge`
(object-based `load({ url, initialSeekSeconds })`) over the raw native module, and
`useNativePlaybackBridge(handlers?)` returns the bridge and subscribes to events with cleanup. This is
the ONLY place RN drives the engine (parallels web's `useMediaElementBridge` boundary). A temporary
spike debug panel (`src/debug/PlaybackEngineDebugPanel.tsx`) exercises the bridge from the Hello World
screen and may be removed once player UI (Tracks 10–11) lands.

## Reserved native-cache write methods (step 2.35 / detail 114)

JS mirrors state into native storage so Track 12 car surfaces read queue / downloads / library
**without JS running**. Signatures are reserved now; native persist is a **no-op stub** in PG-2b.
**Schema owned by Track 12.1** — do not invent a throwaway schema here.

| Method (JS → native)      | Payload (v0 draft, final list owned by 12.1)    | Reader                        |
| ------------------------- | ----------------------------------------------- | ----------------------------- |
| `writeQueueSnapshot`      | now-playing + upcoming item ids / titles / urls | car skip/advance, now-playing |
| `writeDownloadsIndex`     | local `file://` paths + metadata                | offline car browse            |
| `writeLibraryBrowseIndex` | podcast / playlist list for templates           | car browse roots              |

Each takes a single JSON-string payload and returns `Promise<void>`. Native stores an opaque snapshot
and does not re-decide queue rules (policy stays in `@podverse/playback-core`).

## Verify (operator)

```bash
test -d apps/mobile/modules/podverse-media-engine
! rg -q 'react-native-track-player' apps/mobile/package.json apps/mobile/modules
```
