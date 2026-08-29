# podverse-media-engine

First-party Podverse native media engine (PG-2b, Track 2). One process-wide player owns phone, lock
screen, and future CarPlay / Android Auto now-playing. **Do not** use `react-native-track-player`.

- iOS: single shared `AVPlayer` + single shared `MPRemoteCommandCenter` (steps 2.4–2.6).
- Android: single Media3 `ExoPlayer` + `MediaLibraryService` (stub browse OK) + shared `MediaSession`
  (steps 2.7–2.9).
- Policy stays in `@podverse/playback-core`; this module is **transport only**.

Car foundation constraints:
[00-CAR-FOUNDATION.md](/.llm/plans/completed/phase-1/mobile-pg2b-media-engine-spike/00-CAR-FOUNDATION.md) and
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
- **Allowed callers (12.13):** `MediaLibrarySession.Callback.onConnect` trusts Media3's
  signature-checked helpers (`isMediaNotificationController`, `isAutoCompanionController`,
  `isAutomotiveController`) plus the app's own package. Unknown callers connect with
  `SessionCommands.EMPTY` / `Player.Commands.EMPTY` (graceful — no crash, no engine access), rather
  than a spoofable package-name allowlist or a hard reject.
- **App-closed root (12.13):** `onGetLibraryRoot` returns a stable browsable root
  (`isBrowsable=true`, `isPlayable=false`) for any `LibraryParams`, even with an empty/absent cache,
  and logs `Log.i("PodverseMediaLibrary", "onGetLibraryRoot served root=… caller=…")`. Android Auto /
  DHU starts the **service** (not the Activity), so that line fires with the app force-stopped —
  readable proof the root is served without JS. Operator DHU acceptance is **12.17**.
- **Android Auto media-app declaration (12.11):** the module `AndroidManifest.xml` adds the
  `com.google.android.gms.car.application` `<meta-data>` pointing at
  `res/xml/automotive_app_desc.xml` (`<automotiveApp><uses name="media"/></automotiveApp>`). The
  module manifest + resources merge into the app manifest at prebuild, so the app is recognized as a
  media app without hand-editing the generated app manifest. The Play Console "Android Auto"
  declaration is a separate **operator** step (12.16).
- **Browse tree from cache (12.12 / 12.14):** `onGetChildren` projects the durable native cache into
  the tree via `PodverseNativeCacheModel` (`org.json`, tolerant — unknown keys ignored, schema
  mismatch / corrupt payload → empty list, never throws). Root → **Library** (from
  `library-browse-index.json`) + **Downloads** (playable offline items from `downloads-index.json`);
  a node is omitted when its payload is empty. mediaIds are stable + decodable for play:
  `library/<kind>/<idText>` (browsable) and `download/<idText>` (playable). Paging honors Media3
  `page`/`pageSize`. JS never owns the tree; SQLite is never read here (JS-dead contract). Play
  wiring (mediaId → file/remote URL) is **12.15**. Deeper hydration (a podcast's episodes) is a
  12.12 follow-up.
- **Car play + URL resolution (12.15):** `onAddMediaItems` resolves a selected browse item's mediaId
  against the cache and rebuilds it with a playable URI + now-playing metadata — **prefer the offline
  `file://` path, else the remote enclosure `mediaUrl`** (same preference as the phone engine).
  Unresolvable items are dropped. `onPlaybackResumption` returns the cached now-playing item so a car
  "resume" works app-closed (fails gracefully when nothing is resumable). Playback runs on the single
  shared `PodverseAudioEngine`; queue/auto-queue policy stays in `@podverse/playback-core` (JS).
- **Foreground/notification:** `play()` starts the service; Media3 promotes it to foreground and posts
  the media notification once playing. App-force-stopped read/browse is proven later (12.6 / 12.17).
- **Media3 version:** `androidx.media3:media3-exoplayer` + `media3-session` (see `android/build.gradle`,
  `media3Version`).

### iOS shared engine accessor (car foundation)

`PodverseAudioEngine.shared` is a process-wide singleton that owns the one `AVPlayer`, the one
`AVAudioSession` configuration, and the one `MPRemoteCommandCenter` registration. It is intentionally
independent of the Expo module lifecycle: the CarPlay scene (Track **12.9–12.10**) binds
now-playing and remote commands to `PodverseAudioEngine.shared` **without starting the JS runtime**.
The Expo module only sets an `eventSink` to forward events to JS while JS is alive.

- **One player, one command center.** Lock screen, Control Center, and CarPlay all drive the
  same `AVPlayer` via the same command center — never a second registration path.
- **`destroy()` keeps** the shared player, session config, and command-center registration so car
  surfaces can rebind; it only tears down the current item/observers.
- **Interruptions:** pause on `.began`; resume only when the system sets `.shouldResume`.
- **Route changes:** pause when the previous output becomes unavailable (headphones unplugged).

### iOS CarPlay scene (12.7–12.10)

`PodverseCarPlaySceneDelegate` (`@objc`) is the car entry point. It is connected from AppDelegate via
the Expo config plugin `apps/mobile/plugins/withPodverseCarPlay.js`
(`configurationForConnectingSceneSession`) — **not** via a CarPlay-only
`UIApplicationSceneManifest` in Info.plist (that suppresses the phone `UIWindowScene` and blacks out
the phone UI on this Expo/RN stack).

- **Browse (12.8):** builds a `CPListTemplate` root of **Library** + **Downloads** from
  `PodverseNativeCache` (shared App Group `group.com.podverse.app.next`) via
  `PodverseCarPlayCacheModel` — the Swift mirror of Android's `PodverseNativeCacheModel`. No SQLite,
  no network, JS may be dead.
- **Play (12.9 / 12.15):** selecting a download resolves its URL with the same preference as Android
  (`file://` local first, else remote `mediaUrl`), calls `PodverseAudioEngine.shared.loadAndStart` +
  `setNowPlayingMetadata(title:)`, and presents `CPNowPlayingTemplate.shared`.
- **Remotes (12.10):** `CPNowPlayingTemplate` / `MPRemoteCommandCenter` bind to the **one** command
  center registered by the engine — the CarPlay scene adds **no** second command center or player.
- **Known gap:** app-closed skip/advance uses engine/session behavior only; full auto-queue refill
  stays in `@podverse/playback-core` (JS) and is not reimplemented in Swift.
- **Operator:** entitlement/App Group runbook
  [`CARPLAY-ENTITLEMENT.md`](./CARPLAY-ENTITLEMENT.md); Simulator browse+play gate
  [`CARPLAY-SIMULATOR-CHECKLIST.md`](./CARPLAY-SIMULATOR-CHECKLIST.md).

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

| Method                 | Args                                           | Returns           | Errors / notes                                                                                                           |
| ---------------------- | ---------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `load(source)`         | `{ url: string; initialSeekSeconds?: number }` | `Promise<void>`   | Prepares URL + initial seek. Does **not** start playback. Rejects on load failure.                                       |
| `loadAndStart(source)` | `{ url: string; initialSeekSeconds?: number }` | `Promise<void>`   | Atomic `load` + `play` (2.25). Used by the primary autoplay path; keep `load`/`play` for prepare-without-play (restore). |
| `play()`               | —                                              | `Promise<void>`   | Activates audio session (iOS 2.5) / foreground service (Android 2.8) then plays.                                         |
| `pause()`              | —                                              | `void`            | Keeps current item and position.                                                                                         |
| `seek(seconds)`        | `number` (seconds)                             | `void`            | Absolute seek. Clamping owned by native.                                                                                 |
| `setRate(rate)`        | `number` (e.g. `1.0`, `1.5`)                   | `void`            | Sets playback rate.                                                                                                      |
| `getPosition()`        | —                                              | `Promise<number>` | Current playhead in seconds.                                                                                             |
| `getDuration()`        | —                                              | `Promise<number>` | Duration in seconds; `0` when unknown/live.                                                                              |
| `destroy()`            | —                                              | `void`            | Tears down current item/observers. Shared player/command-center ownership stays native.                                  |

### Source URLs (`load` / `loadAndStart`) — remote + local files (step 2.26 / detail 105)

`source.url` accepts remote `http(s)` URLs and **local files** for offline playback (Track 13). Local
files play through the **same single engine** — never a second player or RN `<Video>`:

- **iOS:** `file://` URLs and absolute filesystem paths (`/…`, resolved via `URL(fileURLWithPath:)`).
- **Android:** `file://` and `content://` URIs (Media3 `MediaItem.fromUri`).

A missing `file://` target fails fast with a `file-not-found` error (see taxonomy below) instead of
hanging. Local files emit the same `progress` / `ended` / `error` events as remote sources.

## Native → JS events (step 2.10 / detail 089)

Event names are stable — they are the input to future RN queue orchestrators. `progress` is throttled
to ~500 ms (within the 250–1000 ms guidance) on both platforms. Subscribe via the JS adapter
(`useNativePlaybackBridge`), not the native module.

| Event           | Payload                                                      | When                                                        |
| --------------- | ------------------------------------------------------------ | ----------------------------------------------------------- |
| `playbackState` | `{ state: PlaybackStateValue }`                              | Lifecycle transitions (idle…error).                         |
| `progress`      | `{ positionSeconds: number; durationSeconds: number }`       | ~500 ms while playing.                                      |
| `ended`         | `{ positionSeconds: number }`                                | Item played to natural end.                                 |
| `error`         | `{ code: string; message: string; kind: PlaybackErrorKind }` | Playback/load failure. `kind` is normalized (see taxonomy). |
| `stalled`       | `{ positionSeconds: number }`                                | Buffer underrun / rebuffering.                              |

### Error taxonomy (step 2.27 / detail 106)

Native `code` strings differ per platform (iOS custom codes; Android Media3 `errorCodeName`). The
pure TS mapper `mapPlaybackErrorKind` / `normalizePlaybackError`
(`src/playbackErrorTaxonomy.ts`) collapses them into a stable `PlaybackErrorKind` so RN shows an i18n
message keyed off the enum instead of raw native text. The **raw** `code` + `message` are preserved
for logs (including for `unknown`). `useNativePlaybackBridge` delivers the normalized `error` event;
the transport adapter delivers raw and direct `addListener('error', …)` callers can normalize
themselves. Mapper is native-free so Vitest covers the table without a device (pairs with 2.28).

| `kind`           | Example native codes                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `network`        | Android `ERROR_CODE_IO_NETWORK_CONNECTION_FAILED`, `…_TIMEOUT`, `…_BAD_HTTP_STATUS`       |
| `file-not-found` | iOS `file_not_found`, Android `ERROR_CODE_IO_FILE_NOT_FOUND`                              |
| `decode`         | Android `ERROR_CODE_DECODING_FAILED`, `ERROR_CODE_DECODER_INIT_FAILED`                    |
| `unsupported`    | Android `ERROR_CODE_PARSING_CONTAINER_UNSUPPORTED`, `…_MANIFEST_UNSUPPORTED`              |
| `invalid-source` | iOS `invalid_url`                                                                         |
| `audio-session`  | iOS `audio_session`, `audio_session_activate`                                             |
| `unknown`        | anything not enumerated (iOS `item_failed`, unmatched native codes) — detail kept in logs |

### JS adapter (step 2.11 / detail 090)

`apps/mobile/src/bridge/` — `nativePlaybackBridge` implements the high-level `NativePlaybackBridge`
(object-based `load({ url, initialSeekSeconds })` and `loadAndStart({ … })`) over the raw native
module, and `useNativePlaybackBridge(handlers?)` returns the bridge and subscribes to events with
cleanup (normalizing `error` through the taxonomy mapper). This is the ONLY place RN drives the engine
(parallels web's `useMediaElementBridge` boundary). The primary autoplay path
(`useMediaPlayerResourceUpdate`) uses `loadAndStart`; session restore stays `load`-only (paused). A temporary
spike debug panel (`src/debug/PlaybackEngineDebugPanel.tsx`) exercises the bridge from the Hello World
screen and may be removed once player UI (Tracks 10–11) lands.

## Reserved native-cache write methods (step 2.35 / detail 114)

JS mirrors state into native storage so Track 12 car surfaces read queue / downloads / library
**without JS running**. Signatures are reserved now; native persist is a **no-op stub** until
durable storage lands (12.2–12.3) and the JS write path is wired (12.4).

**Authoritative schema:** master step **12.1** —
[380-native-cache-schema](/docs/proposals/mobile/_master-plan_/phase-1/details/380-native-cache-schema.md).
TypeScript source of truth: `apps/mobile/src/data/nativeCache/projection.ts` (envelope +
`NATIVE_CACHE_SCHEMA_VERSION`, currently `1`). Do not invent a competing schema here.

| Method (JS → native)      | Payload (schema owned by 12.1 / detail 380)     | Reader                        |
| ------------------------- | ----------------------------------------------- | ----------------------------- |
| `writeQueueSnapshot`      | now-playing + upcoming item ids / titles / urls | car skip/advance, now-playing |
| `writeDownloadsIndex`     | local `file://` paths + metadata                | offline car browse            |
| `writeLibraryBrowseIndex` | podcast / playlist list for templates           | car browse roots              |

Each takes a single JSON-string payload and returns `Promise<void>`. Every payload carries a
`schemaVersion` + `updatedAtMs` envelope (see `build*Payload` in `projection.ts`). Native stores an
opaque snapshot, ignores unknown keys, and does not re-decide queue rules (policy stays in
`@podverse/playback-core`).

### Durable storage + read helpers (steps 12.2–12.3 / details 381–382)

The bridge write methods persist each payload as JSON via a small per-platform cache module. Native
car surfaces (CarPlay scene 12.7+, Android Auto `MediaLibraryService` 12.11+) and the read spikes
(12.5–12.6) load these files **with the JS runtime not running**. Writes are atomic (temp + rename)
and best-effort — a failed write never rolls back the phone-side mutation.

| Platform | Module (read/write API)                                               | Location                                                                  | Filenames                                                                  |
| -------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| iOS      | `PodverseNativeCache.write(_:json:)` / `read(_:)`                     | Application Support `/native-cache/` (App Group when provisioned — 12.16) | `queue-snapshot.json`, `downloads-index.json`, `library-browse-index.json` |
| Android  | `PodverseNativeCache.write(context,kind,json)` / `read(context,kind)` | `context.filesDir/native-cache/`                                          | same three filenames                                                       |

- iOS uses the app container now; `PodverseNativeCache.appGroupIdentifier` is reserved (`nil`) until
  the CarPlay entitlement + App Group land (12.16) — setting it migrates storage transparently.
- Android uses app-private `filesDir`, readable by the media-library service process (same app UID);
  no Google Play Services dependency.
- Missing / corrupt payloads read back as `nil`/`null`; callers render an empty tree, never crash.
- Kinds: `PodverseNativeCacheKind` (`queue` / `downloads` / `libraryBrowse`). Payload shapes are
  owned by [380-native-cache-schema](/docs/proposals/mobile/_master-plan_/phase-1/details/380-native-cache-schema.md).

#### Read-with-JS-dead spikes (steps 12.5–12.6)

Both cache modules expose a `debugDump()` that reads all three payloads and logs a one-line summary
(presence, byte size, parsed `schemaVersion`). On Android, `PodverseMediaLibraryService.onCreate`
calls it so Android Auto / DHU — which starts the **service, not the Activity** — proves a native
read with the app force-stopped. On iOS the same helper is reserved for the CarPlay scene (12.7);
the current proof is a container file read with Metro not attached (CarPlay entitlement lands 12.16).
Operator procedures + GO/NO-GO: [`NATIVE-CACHE-SPIKE-IOS.md`](./NATIVE-CACHE-SPIKE-IOS.md),
[`NATIVE-CACHE-SPIKE-ANDROID.md`](./NATIVE-CACHE-SPIKE-ANDROID.md).

## Player UI single-surface ownership (Track 11.18 — anti-pattern)

The mini player and full player (Track 11) are two React views over **one** engine. They read the
shared `PlaybackProvider` (`usePlayback()`, app root) and drive the single process-wide
`nativePlaybackBridge`. Expanding to the full player is a navigation event only — it must **never**
call `bridge.load` / `bridge.destroy`, so audio position and play/pause stay continuous (Track 11.4).

**Anti-pattern: never mount a second `Video` component or a second engine on full-screen open.**
When video lands (Track 11.3 / 11.6–11.8):

- There is exactly **one** native video surface (`VideoSurfaceHost`). Opening the full player
  **re-parents / attaches** that same surface from the `mini` target to the `full` target
  (`animateVideoSurface` bridge attach) — it does **not** create a second `<Video>` / `expo-video`
  view or a second player.
- Collapsing animates the same surface back to the `mini` target (Track 11.7). No teardown, no
  reload, no duplicate audio/video engine.
- Policy stays in `@podverse/playback-core`; this module remains transport + single-surface owner.

This mirrors web's "no remounting the media element" rule. Cross-linked from
[apps/mobile/APPS-MOBILE.md § Player UI](/apps/mobile/APPS-MOBILE.md) and the module comments in
`apps/mobile/src/screens/player/FullPlayerScreen.tsx` / `apps/mobile/src/components/player/MiniPlayer.tsx`.

## Video surface hosts (PG-5 steps 2.14–2.17)

The shared engine is video-capable and owns exactly **one** native video surface per platform:

- **iOS:** `PodverseVideoSurfaceHost.shared` (`ios/PodverseVideoSurfaceHost.swift`) owns a single
  `AVPlayerLayer` bound to `PodverseAudioEngine.shared.sharedPlayer`. Audio and video items use the
  same `AVPlayer` (no second player). `currentItemHasVideoTracks()` +
  `onVideoCapabilityChanged` report whether frames exist.
- **Android:** `PodverseVideoSurfaceHost` (`android/.../PodverseVideoSurfaceHost.kt`) owns a single
  `TextureView` bound to the shared `ExoPlayer` via `attachVideoTextureView`. (`TextureView`, not
  `SurfaceView` — SurfaceView does not reparent cleanly during native-stack modal fragment
  transitions.) `currentItemHasVideo()` + `onVideoSizeChanged` report capability.

Both hosts expose an internal `registerTargetView` / `setActiveTarget` / `setVisible` API. The single
surface is **reparented into the RN-mounted `PodverseVideoSurfaceView`** for the active target (see
"RN registration path" below) — not into a process-global window/content overlay. This is the
**Plan 01 / detail 099 addendum** fix: the earlier overlay was drawn _behind_ the React Navigation
native-stack modal full player, so the full player only showed the artwork fallback. Reparenting into
the RN view keeps correct z-order and coordinate space in both the base tab view and the modal. There
is always one surface, re-parented between `mini` and `full` — never a second `<Video>` / player
(Track 11.18).

### Video surface bridge contract (steps 2.18–2.20 / details 097–099)

Registered on `NativePlaybackBridge` (call via `nativePlaybackBridge` / `useNativePlaybackBridge`,
never the native module directly). Both are synchronous and dispatch to the native main thread; they
**never** call `load` / `destroy` and never reset the playhead — only surface geometry/parenting
changes, so audio/video stays continuous across mini↔full.

| Method                                        | Args                                                   | Returns | Notes                                                                                                         |
| --------------------------------------------- | ------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------- |
| `attachVideoSurface(targetId, rect)`          | `targetId: 'mini' \| 'full'`, `rect: VideoSurfaceRect` | `void`  | Registers/updates a target's rect (idempotent). First registered target becomes active. Unknown id no-ops.    |
| `animateVideoSurface(toTargetId, durationMs)` | `toTargetId: 'mini' \| 'full'`, `durationMs: number`   | `void`  | Moves the one surface to `toTargetId` over `durationMs` (`<= 0` snaps). Overlapping calls coalesce to latest. |
| `setVideoSurfaceVisible(visible)`             | `visible: boolean`                                     | `void`  | JS-desired visibility (RN drives from target kind). Actual show = `visible && item-has-video-frames` (2.23).  |

**`VideoSurfaceRect` coordinate space:** `{ x, y, width, height, cornerRadius? }` in
**density-independent window coordinates** — the same units RN `measureInWindow` returns (iOS
points; Android **dp**). iOS uses the values as points directly; Android multiplies by
`displayMetrics.density` to position the surface in device pixels. A zero-size rect is treated as
hidden for that target. `cornerRadius` is applied to the layer on **iOS**; Android surface clipping
is refined with the RN targets in prompt 03.

**Reparent invariant (2.20):** there is exactly one surface owner for the session. `attach` places the
one layer/`SurfaceView`; `animate` moves the **same** view between the registered `mini` / `full`
rects. Anti-pattern (never a second video view):
[363-anti-pattern-no-second-video](/docs/proposals/mobile/_master-plan_/phase-1/details/363-anti-pattern-no-second-video.md).

**Audio-only hide (2.23):** final surface visibility is `setVideoSurfaceVisible(visible)` **AND** the
current item actually having video frames (native `onVideoCapabilityChanged`). So a video-medium item
that plays its audio enclosure never leaves a black rectangle, and audio podcasts/clips stay hidden.
Hide/show never calls `load`/`destroy` or resets the playhead.

### RN registration path (steps 2.21–2.24 + Plan 01 reparent)

RN mounts the **native** `PodverseVideoSurfaceView` inside each player; the native surface is
reparented into whichever is active. There is no `measureInWindow`/rect publishing — the surface
fills the RN view directly, so it lives in the correct window (including the modal) and z-order.

- **Component:** `modules/podverse-media-engine/src/PodverseVideoSurfaceView.tsx` — wraps the native
  view (`requireNativeView('PodverseMediaEngine')`) with a `targetId` prop. The native view
  (`ios/PodverseVideoSurfaceView.swift`, `android/.../PodverseVideoSurfaceView.kt`) registers itself
  with the host on attach and unregisters on detach; `onLayout`/`layoutSubviews` keeps the surface
  filling its bounds (rotation, split view, mini↔full).
- **Mini (2.21):** `MiniPlayer` overlays `<PodverseVideoSurfaceView targetId="mini" />` on its
  artwork inside `testID="mini-player-video-surface"` (artwork shows through when hidden).
- **Full (2.22):** `FullPlayerScreen` overlays `<PodverseVideoSurfaceView targetId="full" />` inside
  `testID="full-player-video-surface"` and, on mount/unmount, calls
  `animateVideoSurface('full' | 'mini')` — expand/collapse flips the active reparent target only
  (Track 11.4), never `load`/`destroy`.
- **Visibility (2.23):** `PlaybackProvider` calls `setVideoSurfaceVisible(activeTarget.kind === 'item-video')`
  whenever the active target changes.

## Bridge command serialization + unit tests (step 2.28 / detail 107)

Native functions take **positional** args (`load(url, seek?)`, `attachVideoSurface(targetId, x, y,
width, height, cornerRadius)`, `animateVideoSurface(toTargetId, durationMs)`). `src/bridgeCommandSerialization.ts`
is a pure module that converts the object-based bridge inputs into those exact tuples and validates
them (rejects empty `url`, negative/`NaN` seek, malformed rects, negative duration). The JS adapter
(`apps/mobile/src/bridge/nativePlaybackBridge.ts`) uses these serializers, so the arg order is proven
in one place and malformed payloads never reach native.

Vitest covers the serializers and the error taxonomy (2.27) with **no native / Expo imports**
(`src/bridgeCommandSerialization.test.ts`, `src/playbackErrorTaxonomy.test.ts`). `apps/mobile` is a
standalone install (own lockfile, not a root workspace), so run tests with `--prefix`:

```bash
npm --prefix apps/mobile run test
```

Config: `apps/mobile/vitest.config.ts` (Node env; `include` scoped to
`modules/podverse-media-engine/src/**/*.test.ts` so no RN/Expo module is loaded). The adapter itself
is intentionally **not** unit-tested here because it imports `expo-modules-core`.

## FOSS / F-Droid dependencies (step 2.31 / detail 110)

The engine is **FOSS-clean** and ships in both the playstore and FOSS Android flavors unchanged:

- **Android:** Media3 **ExoPlayer** (`androidx.media3`, Apache-2.0). **No** Google Play Services, **no**
  Firebase, **no** `react-native-track-player`.
- **iOS:** AVFoundation / `AVPlayer` + `MPRemoteCommandCenter` (Apple system frameworks).

No playstore-flavor gating is required for playback. If later video/DRM/cast work introduces a
proprietary SDK (e.g. Play Services Cast), gate it to the playstore flavor and record it in the
running register in [`.cursor/skills/mobile-fdroid-flavors/SKILL.md`](/.cursor/skills/mobile-fdroid-flavors/SKILL.md)
in the same PR. Do not add Play Services solely to satisfy a feature.

## Verify (operator)

```bash
test -d apps/mobile/modules/podverse-media-engine
! rg -q 'react-native-track-player' apps/mobile/package.json apps/mobile/modules
rg -n "second Video|VideoSurfaceHost|anti-pattern" apps/mobile
npm --prefix apps/mobile run test
```
