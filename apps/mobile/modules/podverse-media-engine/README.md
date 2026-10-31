# podverse-media-engine

First-party Podverse native media engine (PG-2b, Track 2). One process-wide player owns phone, lock
screen, and future CarPlay / Android Auto now-playing. **Do not** use `react-native-track-player`.

- iOS: single shared `AVPlayer` + single shared `MPRemoteCommandCenter` (steps 2.4–2.6).
- Android: single Media3 `ExoPlayer` + `MediaLibraryService` (stub browse OK) + shared `MediaSession`
  (steps 2.7–2.9).
- Policy stays in `@podverse/playback-core`; this module is **transport only**.

Car foundation constraints are retained in
[mobile-carplay-android-auto](/.cursor/rules/mobile-carplay-android-auto.mdc); the completed plan
archive was removed after its decisions were captured in this module and the Phase 1 master plan.

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
  `library-index.json`) + **Downloads** (playable offline items from `downloads-index.json`);
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
- **Interruptions:** Media3 owns audio focus (`handleAudioFocus = true`). A call or alarm pauses and
  resumes; another media app taking focus pauses for good. `setHandleAudioBecomingNoisy(true)` pauses
  when headphones are unplugged or Bluetooth disconnects. `WAKE_MODE_NETWORK` (needs `WAKE_LOCK`)
  keeps streams alive with the screen off.
- **Audio profile:** the `audioProfile` load argument maps to the content type — `spoken` → SPEECH,
  `music` → MUSIC, `video` → MOVIE. Media3 pauses a SPEECH stream for a navigation prompt and ducks
  the others, which keeps a podcast from talking under directions.
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
- **Interruptions:** pause on `.began` (ignoring `.appWasSuspended`, which reports an interruption
  that already ended while the app was suspended). On `.ended`, resume only when audio was playing
  when the interruption began **and** the system sets `.shouldResume`. A user who had paused stays
  paused after a call. When playback does not resume and no other app is playing, the session is
  activated again and Now Playing is republished at rate 0, so a later headset press still reaches
  this player. The same reclaim runs when the app becomes active. A load-and-play that lands
  mid-interruption waits for `.ended`.
- **Explicit play:** lock screen, headset, CarPlay, and in-app play reload the current source once
  when its player item has failed. Any recorded source resumes at that playhead, whatever its
  medium, including Add by RSS. The last observed position is used when the failed player reports
  0. A clip or soundbite with no position starts at its start and still ends at its end. A failed
  livestream starts at live. A session that will not activate is tried once more without replacing
  the item, so a healthy playhead stays put. A second failure reports the error and stops.
- **Route changes:** pause when the previous output becomes unavailable (headphones unplugged,
  Bluetooth or CarPlay disconnected).
- **Audio profile:** `load` / `loadAndStart` take an optional `audioProfile` (`spoken` / `music` /
  `video`) that sets the session mode (`.spokenAudio` / `.default` / `.moviePlayback`). JS derives
  it from the playback target's medium in `resolveEngineAudioProfile`; omitted keeps the last one.
- **Media services reset:** the engine rebuilds its `AVPlayer`, reconfigures the session, and
  reloads the last source paused at the same position. Explicit play rebuilds the player only when
  `AVPlayer.status` is failed, then reloads and plays. `onPlayerReplaced` lets the video surface
  rebind. It is still one player at a time.
- **Video in the background:** the video surface detaches its `AVPlayerLayer` when the app enters
  the background (iOS pauses a layer-bound player otherwise) and reattaches it on foreground, so a
  video item keeps playing as audio with the screen locked. Fullscreen is the exception: the layer
  stays attached so the system can move it into picture-in-picture. If that window does not start,
  the layer detaches and audio continues.

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
- **App-closed advance:**
  - While JS runs, it owns advance (`setJsOwnsAdvance(true)`) and the auto-queue fills in
    `@podverse/playback-core` as in the app.
  - JS also writes `advance-window.json`: the play order after the playing item (the manual
    queue's upcoming rows for that medium, then up to 10 resolved automatic rows), with the
    playing item's `kind` and id as the anchor. Automatic rows are auto-queue rows (items, clips,
    and soundbites) or, for an Add by RSS episode, that feed's next episodes.
  - Each entry carries its engine `kind`; clip and soundbite entries carry `clipStartSeconds` and
    `clipEndSeconds`. Rows are matched by `kind` plus id, so a clip and its full episode are
    separate rows.
  - When JS is not running, `ended`, a clip's end, and a remote Next play the next window entry
    when the loaded item is the anchor or is in the window; at the window's end playback stops;
    any other item walks the account queue snapshot as before.
  - Add by RSS entries are plain media URLs or downloads. Feed passwords and auth headers are
    never written; an entry whose media needs them and is not downloaded ends the window.
  - Native takes advance back as soon as the module that owns the event sink goes away.
  - When the app runs again and picks up the playing item, it continues the source the window came
    from (the same playlist, album, or podcast rows and settings, or the same Add by RSS feed) if
    the item is one of its rows. An item in the account queue (now playing or upcoming) keeps the
    whole saved playlist, album, or podcast behind the queue, as a manual-queue play in the app
    does, even when it is not one of those rows. Any other item, even from the same podcast,
    refills from its own podcast or album. The source is kept on the device and deleted on
    sign-out.
  - Not covered: an item the car starts that is not in the window (no automatic rows until the app
    runs again), livestreams (manual queue only). Previous with the app closed restarts the track.
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
(12.5–12.6, 12.17–12.18) and relies on the **native cache** (`writeQueueSnapshotAv` /
`writeQueueSnapshotMusic` / `writeDownloadsIndex` /
`writeLibraryBrowseIndex`, durable storage 12.2–12.3) — **not** on keeping the
JS runtime or the Activity alive.

## JS surface

```ts
import type { NativePlaybackBridge, MediaEngineSource } from 'podverse-media-engine';
// The typed native accessor (used by the step 2.11 adapter, not RN screens directly):
import { PodverseMediaEngineModule } from 'podverse-media-engine/src/PodverseMediaEngineModule';
```

## Playback method contract (step 2.3 / detail 082)

Position, duration, and the live window are **seconds** (`number`), matching the web bridge.
`pause`, `seek`, `setRate`, and `destroy` are synchronous native functions; `load`, `play`,
`goToLive`, `getPosition`, and `getDuration` are async (resolve on the JS thread after the native
call). All methods run against the single shared player instance.

| Method                 | Args                                                       | Returns           | Errors / notes                                                                                                                                                         |
| ---------------------- | ---------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `load(source)`         | `{ url: string; initialSeekSeconds?: number; basicAuth? }` | `Promise<void>`   | Prepares URL + initial seek. Does **not** start playback. Rejects on load failure. `basicAuth`: see below.                                                             |
| `loadAndStart(source)` | `{ url: string; initialSeekSeconds?: number; basicAuth? }` | `Promise<void>`   | Atomic `load` + `play`. Used by the primary autoplay path; keep `load`/`play` for prepare-without-play (restore).                                                      |
| `play()`               | —                                                          | `Promise<void>`   | Starts playback (audio session on iOS, foreground service on Android). Live: resume in place only at or after the window start plus 6 seconds; otherwise jump to live. |
| `pause()`              | —                                                          | `void`            | Keeps current item and position.                                                                                                                                       |
| `seek(seconds)`        | `number` (seconds)                                         | `void`            | Absolute seek. A live source with a window clamps to `[startSeconds, liveEdgeSeconds]`; without a window it is a no-op.                                                |
| `goToLive()`           | —                                                          | `Promise<void>`   | Jumps to the live point and plays. With a window, seeks to `liveEdgeSeconds`; without one, reconnects. No-op when not live.                                            |
| `setRate(rate)`        | `number` (e.g. `1.0`, `1.5`)                               | `void`            | Sets playback rate. Must not start playback while paused (iOS `AVPlayer.rate` would otherwise auto-play).                                                              |
| `getPosition()`        | —                                                          | `Promise<number>` | Current playhead in seconds.                                                                                                                                           |
| `getDuration()`        | —                                                          | `Promise<number>` | Duration in seconds; `0` when unknown, and always `0` while a live source is loaded.                                                                                   |
| `destroy()`            | —                                                          | `void`            | Tears down current item/observers. Shared player/command-center ownership stays native.                                                                                |

### Source URLs (`load` / `loadAndStart`) — remote + local files (step 2.26 / detail 105)

`source.url` accepts remote `http(s)` URLs and **local files** for offline playback (Track 13). Local
files play through the **same single engine** — never a second player or RN `<Video>`:

- **iOS:** `file://` URLs and absolute filesystem paths (`/…`, resolved via `URL(fileURLWithPath:)`).
- **Android:** `file://` and `content://` URIs (Media3 `MediaItem.fromUri`).

A missing `file://` target fails fast with a `file-not-found` error (see taxonomy below) instead of
hanging. Local files emit the same `progress` / `ended` / `error` events as remote sources.

### Protected media (`source.basicAuth`)

`source.basicAuth` (`{ username, password, scopeHost, scopeMatch: 'domain' | 'exact', allowInsecure }`)
answers an HTTP Basic challenge from a protected add-by-RSS feed's media host. It is never sent
up front: the credential goes out only in reply to a `401` challenge from a host inside the scope,
so a redirect to another host gets no credential.

- **iOS:** the item is an `AVURLAsset` whose `resourceLoader` delegate
  (`PodverseMediaAuthLoaderDelegate`) answers `NSURLAuthenticationMethodHTTPBasic` / `Default`
  challenges. It declines proxy challenges, retries (`previousFailureCount > 0`), and out-of-scope
  hosts.
- **Android:** the item is built through `OkHttpDataSource` with a `ScopedBasicAuthenticator`
  (`PodverseScopedBasicAuth.kt`), which applies the same checks. Sources without `basicAuth` keep
  the default data source.
- **Scope:** `scopeMatch: 'domain'` accepts `scopeHost` and its subdomains; `'exact'` accepts only
  `scopeHost` (IPs, `localhost`). HTTPS only unless `allowInsecure`. JS resolves `scopeHost` from the
  feed URL with the public suffix list (`resolveCredentialScopeHost` in `@podverse/helpers`); native
  applies a suffix match to each challenging host.
- The password never reaches a native log: both `ScopedBasicAuth` types print without it.

## Native → JS events (step 2.10 / detail 089)

Event names are stable — they are the input to future RN queue orchestrators. `progress` fires
once when the item is ready, then about every 500 ms while playing (within the 250–1000 ms
guidance), and once more right after `goToLive` lands. Subscribe via the JS adapter
(`useNativePlaybackBridge`), not the native module.

| Event           | Payload                                                                                                          | When                                                                                                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `playbackState` | `{ state: PlaybackStateValue }`                                                                                  | Lifecycle transitions (idle…error).                                                                                                                                       |
| `progress`      | `{ positionSeconds: number; durationSeconds: number; isLive: boolean; liveWindow: MediaEngineLiveWindow          | null }`                                                                                                                                                                   | Once when ready, then ~500 ms while playing, and once right after `goToLive` lands. |
| `ended`         | `{ positionSeconds: number }`                                                                                    | Item played to natural end.                                                                                                                                               |
| `error`         | `{ code: string; message: string; kind: PlaybackErrorKind; httpStatus?: number; url?: string; detail?: string }` | Playback/load failure. `kind` is normalized (see taxonomy). `httpStatus` is the media host's response status, `url` the request that failed, `detail` the platform cause. |
| `stalled`       | `{ positionSeconds: number }`                                                                                    | Buffer underrun / rebuffering.                                                                                                                                            |

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
| `host-http`      | any code arriving with `httpStatus` (the creator's host answered with an error status)    |
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
cleanup (normalizing `error` to a stable kind and `progress` to the public live shape). This is the
ONLY place RN drives the engine (parallels web's `useMediaElementBridge` boundary). The primary
autoplay path (`useMediaPlayerResourceUpdate`) uses `loadAndStart`; session restore stays
`load`-only (paused). A temporary spike debug panel (`src/debug/PlaybackEngineDebugPanel.tsx`)
exercises the bridge from the Hello World screen and may be removed once player UI (Tracks 10–11)
lands.

## Live streams

A loaded source is live when its load meta has `isLive: true`. The engine does not infer liveness
from an indefinite duration or a dynamic timeline.

`progress` and `getCurrentSource()` report `isLive` and `liveWindow`. The window is the part of a
live stream the player can still play, on the same timeline as `positionSeconds`. That timeline is
the player's own: it can start above zero, and both ends move forward while the stream runs.
Compare fields only within one event or one snapshot.

| Field             | Meaning                                                   |
| ----------------- | --------------------------------------------------------- |
| `startSeconds`    | Earliest position the stream still holds.                 |
| `liveEdgeSeconds` | Where `goToLive` lands, after the stream's own hold-back. |

A listener at the live point reads `positionSeconds` within a few seconds of `liveEdgeSeconds`.
Both values are finite, and `startSeconds <= liveEdgeSeconds`. A zero-length window
(`startSeconds === liveEdgeSeconds`) is valid: the stream is segmented but holds nothing to rewind
into yet. The engine reports the window at whatever length the player gives. Whether that window
is long enough to offer rewind is player policy, not this module.

`liveWindow` is `null` when the source is not live, and when a live source holds no history: a
progressive Icecast or Shoutcast stream, or a segmented stream before the player has a seekable
range. `durationSeconds` is `0` while a live source is loaded. How far behind live the listener
is: `max(0, liveWindow.liveEdgeSeconds - positionSeconds)`.

`progress` does not tick while paused. Behind-live grows while paused. A caller that needs the
current number reads `getCurrentSource()`. The hook normalizes `progress`. The adapter normalizes
`getCurrentSource()`. When `isLive` is omitted or not `true`, the payload reads as not live and any
window is dropped.

### Resume on `play()`

The resume rule runs inside native `play()`, so the in-app button, the lock screen, headset
buttons, the notification, CarPlay, and Android Auto behave the same. It applies only when the
current item has already played once since it was loaded. A fresh paused load just starts.
JavaScript calls `play()` and does not pre-seek.

The position and window are sampled when `play()` is called:

- No window (progressive): reconnect, then play.
- Position not finite: seek to `liveEdgeSeconds`, then play.
- Position at least `startSeconds` plus 6 seconds: resume in place. The margin covers the window
  start moving forward while the player is paused or seeking.
- Otherwise, including a window shorter than the margin: seek to `liveEdgeSeconds`, then play.

Swift and Kotlin each declare that 6-second margin, equal to `LIVE_WINDOW_START_MARGIN_SECONDS`
in `@podverse/playback-core`. The value is not passed over the bridge. `play()` also runs from the
lock screen, the notification, CarPlay, and Android Auto, on a source the engine reloaded after a
media-services reset or kept from an earlier build, so native keeps the value itself.

- iOS: `private static let liveWindowStartMarginSeconds: Double = 6` in
  `PodverseAudioEngine.swift`.
- Android: `private const val LIVE_WINDOW_START_MARGIN_MS = 6_000L` in `PodverseAudioEngine.kt`
  (Media3 positions are milliseconds).

Vitest reads each declaration and fails when it is missing, renamed, or not equal to
`LIVE_WINDOW_START_MARGIN_SECONDS`. The shipped module does not import `@podverse/playback-core`.

### `goToLive()`

Jumps to the live point and plays, including from paused. With a window, seeks to
`liveEdgeSeconds`. Without one, reconnects so playback starts at what is live now. Resolves once
the seek or reconnect is issued. No-op for a non-live source.

Reconnect keeps the same source: same URL, meta, credentials, now-playing info, and artwork. It
does not emit `sourceChanged` and does not write a `started` journal row. `playbackState` moves
through `loading`, then `ready`, then `playing`, as with any load.

### Where the window comes from

- **iOS:** the last valid range of `seekableTimeRanges`. `recommendedTimeOffsetFromLive` is pulled
  back from the end of that range to form the live edge. A progressive stream is excluded when the
  access log's last event has `playbackType == "FILE"`. When a live source has no window, the lock
  screen hides skip and scrub.
- **Android:** the current timeline window. `defaultPositionMs` is the live edge. A position the
  window has dropped can surface as `ERROR_CODE_BEHIND_LIVE_WINDOW`; the engine seeks to the live
  edge and does not emit `error`.

DASH is not supported. iOS `AVPlayer` cannot play it, the Android module ships no DASH extractor,
and nothing in `@podverse/helpers` classifies `.mpd` links. Mobile rewind is HLS only. Progressive
streams have no app-side buffer.

## Reserved native-cache write methods (step 2.35 / detail 114)

JS mirrors state into native storage so Track 12 car surfaces read queue / downloads / library
**without JS running**. Signatures are reserved now; native persist is a **no-op stub** until
durable storage lands (12.2–12.3) and the JS write path is wired (12.4).

**Authoritative schema:** master step **12.1** —
[380-native-cache-schema](/docs/proposals/mobile/_master-plan_/phase-1/details/380-native-cache-schema.md).
TypeScript source of truth: `apps/mobile/src/data/nativeCache/projection.ts` (envelope +
`NATIVE_CACHE_SCHEMA_VERSION`, currently `2`). Do not invent a competing schema here.

| Method (JS → native)      | Payload (schema owned by 12.1 / detail 380)                                                                                    | Reader                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| `writeQueueSnapshotAv`    | podcast and video now-playing + upcoming item ids / titles / urls                                                              | car skip/advance, now-playing |
| `writeQueueSnapshotMusic` | music now-playing + upcoming                                                                                                   | same reader                   |
| `writeAdvanceWindow`      | play order after the playing item: manual upcoming, then resolved automatic rows (kind, clip range); anchor kind + id + medium | app-closed advance            |
| `writeDownloadsIndex`     | local `file://` paths + metadata                                                                                               | offline car browse            |
| `writeLibraryBrowseIndex` | podcast / playlist list for templates                                                                                          | car browse roots              |

Each takes a single JSON-string payload and returns `Promise<void>`. Every payload carries a
`schemaVersion` + `updatedAtMs` envelope (see `build*Payload` in `projection.ts`). Native stores an
opaque snapshot, ignores unknown keys, and does not re-decide queue rules (policy stays in
`@podverse/playback-core`). The advance window is a list to step through, not a rule set.

### Durable storage + read helpers (steps 12.2–12.3 / details 381–382)

The bridge write methods persist each payload as JSON via a small per-platform cache module. Native
car surfaces (CarPlay scene 12.7+, Android Auto `MediaLibraryService` 12.11+) and the read spikes
(12.5–12.6) load these files **with the JS runtime not running**. Writes are atomic (temp + rename)
and best-effort — a failed write never rolls back the phone-side mutation.

| Platform | Module (read/write API)                                               | Location                                                                                                                         | Filenames                                                                                                                  |
| -------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| iOS      | `PodverseNativeCache.write(_:json:)` / `read(_:)`                     | App Group container for `group.com.podverse.app.next` when that container resolves, otherwise Application Support `native-cache` | `queue-snapshot-av.json`, `queue-snapshot-music.json`, `downloads-index.json`, `library-index.json`, `advance-window.json` |
| Android  | `PodverseNativeCache.write(context,kind,json)` / `read(context,kind)` | `context.filesDir/native-cache/`                                                                                                 | same filenames                                                                                                             |

- `PodverseNativeCache.appGroupIdentifier` is `group.com.podverse.app.next`, and `baseDirectory()`
  prefers that container, falling back to Application Support `native-cache` when the group
  container is unavailable.
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
