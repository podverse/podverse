# 03 — Car play action + URL resolution (12.15)

**Cursor model:** Opus 4.8
**Detail to author:**
[394-car-playback-url-resolution](/docs/proposals/mobile/_master-plan_/details/394-car-playback-url-resolution.md)

## Goal

When Android Auto selects a playable `MediaItem` from the browse tree (step 2), play it through the
**same** shared `PodverseAudioEngine` player using the **same** URL resolution as the phone: prefer
the offline `file://` path when present, else the remote enclosure URL. Now-playing must bind to the
one engine instance (no second player).

## Context

- Playable MediaItems from step 2 carry mediaIds like `download/<idText>` (offline) and, for library
  items that resolve to an episode, an enclosure-backed id. Downloads payload
  (`NativeCacheDownloadEntry`) has `filePath` (offline) and optional `mediaUrl`.
- Shared player: `PodverseAudioEngine.getOrCreatePlayer(context)` (Track 2). Session already wraps it.
- Transport only — **queue/auto-queue policy stays in `@podverse/playback-core`** (JS). Car play of a
  single cached item is a direct transport action; do not reimplement policy natively.

## Do

1. Read detail 394 (author if TBD) and the downloads/queue payload fields.
2. Implement play in the `MediaLibrarySession.Callback`:
   - `onAddMediaItems` / `onSetMediaItems` (Media3 resolution callback): resolve each incoming
     MediaItem's mediaId against the cached payloads and return items with a **playable
     `localConfiguration` URI** set — offline `filePath` (as `file://`) if available, else `mediaUrl`
     (remote enclosure). Items with no resolvable URL are dropped.
   - Ensure `onPlaybackResumption` returns the last cached now-playing/queue if present (so a car
     "resume" works app-closed) — minimal: resolve from cache, tolerate empty.
3. **Host rewrite parity:** reuse the same URL handling the engine uses (e.g. the Android E2E
   `10.0.2.2` rewrite is a dev-only concern; production uses the real enclosure host). Do not invent
   a second resolver — factor a small shared Kotlin helper if the engine already has one.
4. Confirm now-playing metadata (title/artwork/duration) populates from the cached entry so the car
   HU shows correct info without JS.
5. Update `README.md` (play/now-playing car section), mark **12.15** + Appendix C **394** + detail
   header **done**, check the box in `COPY-PASTA.md`.

## Do not

- Do not create a second `ExoPlayer`/session for car.
- Do not implement queue reordering / auto-queue policy in native (playback-core owns it).
- Do not block playback on network for offline items (must play from `file://`).
- Do not implement iOS CarPlay.
- Do not run tests during agent work.

## Skills / rules

- **mobile-playback**, **mobile-carplay-android-auto**, **media-player-architecture**

## Operator verify (after implement)

```bash
rg -n 'onAddMediaItems|onPlaybackResumption|file://|getOrCreatePlayer' apps/mobile/modules/podverse-media-engine/android
npm run mobile:prebuild
# End-to-end DHU browse+play proof is step 4.
```
