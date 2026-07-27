# 394-car-playback-url-resolution

**Master step:** 12.15
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- When Android Auto selects a playable `MediaItem` from the browse tree (12.12 / 12.14), play it
  through the **same** shared `PodverseAudioEngine` player using the **same** URL resolution as the
  phone: prefer the offline `file://` path, else the remote enclosure URL.
- Support car resume app-closed via `onPlaybackResumption` from the cached queue snapshot.
- Now-playing metadata (title / artwork) populates from the cached entry so the head unit shows
  correct info without JS.

## Architecture notes

- **Resolution callback:** `MediaLibrarySession.Callback.onAddMediaItems` rebuilds each incoming
  MediaItem (Auto sends only a `mediaId`, no `localConfiguration`) with a resolved URI +
  `playableMetadata`. mediaIds are `download/<idText>`, `library/<kind>/<idText>`, or
  `queue/<idText>`; the trailing path segment is the idText. Unresolvable items are dropped.
- **URL preference (`resolvePlayable`):** look up the idText in the downloads index first — use its
  local file (`file://<filePath>`, or `file://`/`content://` passthrough) so offline items never
  touch the network — otherwise a remote enclosure `mediaUrl` from downloads or the queue snapshot.
- **Resume (`onPlaybackResumption`):** read the queue snapshot, pick the now-playing entry (fallback
  to the first), resolve its URL, return a `MediaItemsWithStartPosition`. Fail the future when
  nothing is resumable — Media3 then simply does not resume. No stored position field yet, so start
  position is `C.TIME_UNSET` (default).
- **One player:** playback runs on the single shared `PodverseAudioEngine` wrapped by the one
  `MediaLibrarySession`. No second `ExoPlayer` / session for the car.
- **Policy stays in JS:** queue/auto-queue reordering policy lives in `@podverse/playback-core`.
  Car play of a single cached item is a direct transport action; native does not re-decide policy.
- **No second resolver:** the engine has no native host rewrite (the E2E `10.0.2.2` rewrite is a
  JS/dev concern); production uses the real enclosure host. The `file://` vs remote preference is
  the only resolution here, consistent with `PodverseAudioEngine.load`.

## Files

- `apps/mobile/modules/podverse-media-engine/android/.../PodverseMediaLibraryService.kt`
  (`onAddMediaItems`, `onPlaybackResumption`, `resolveForPlayback` / `resolvePlayable` /
  `fileUriOrRemote` / `playableMetadata`)
- `apps/mobile/modules/podverse-media-engine/android/.../PodverseNativeCacheModel.kt`
  (`parseQueueSnapshot` / `QueueSnapshot` / `QueueEntry`)

## Edge cases

- Offline item with a valid `filePath` → plays from `file://` with no network.
- Download entry with a missing file → engine surfaces `file_not_found` (fail fast), same as phone.
- Queue `mediaUrl` null (not resolved yet) → resume falls through / fails gracefully.
- Empty / corrupt cache → nothing resolves; no crash.

## Acceptance criteria

- Selecting a download in Auto plays it on the shared engine from its local file.
- Now-playing shows the cached title + artwork without JS.
- `onPlaybackResumption` resumes the cached now-playing when resolvable, else no-ops.
- No second player/session; no native queue policy.

## Web parity references

- [DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md)
- [105-engine-local-file-playback](/docs/proposals/mobile/_master-plan_/details/105-engine-local-file-playback.md)
- [DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md)

## Verification

```bash
rg -n 'onAddMediaItems|onPlaybackResumption|resolvePlayable|fileUriOrRemote' \
  apps/mobile/modules/podverse-media-engine/android
```

## Depends on

- 12.12 browse tree (detail 391) + 12.14 offline items (detail 393) — this phase
- 2.7–2.9 shared engine (done); 12.4 JS cache write path incl. queue snapshot (done)
