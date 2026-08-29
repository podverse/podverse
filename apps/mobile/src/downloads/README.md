# Offline downloads (`apps/mobile/src/downloads`)

Track 13 — download episode files for offline playback. Pure logic + shared contract live here; the
SQLite index and API access live in `src/data/` (`downloadsRepository`). See the master plan
[Track 13](/docs/proposals/mobile/_master-plan_/phase-1/001-MASTER-PLAN.md) and
[DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md §1–1.2](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md).

## Eligibility gate (13.1)

`isItemDownloadable(item)` decides whether an item can be downloaded and, if so, which progressive
source to fetch. It **rejects**:

- **Livestreams** — `item.live_item` is set (Podcasting 2.0 live item). Livestreams are streamed,
  not fixed files.
- **HLS / m3u8** — the only usable enclosure(s) resolve to a `.m3u8` playlist or an HLS MIME
  (`application/x-mpegurl`, `application/vnd.apple.mpegurl`, `audio/mpegurl`). A playlist is a
  manifest of segments, not a single downloadable file.
- **No enclosure** — no enclosure with a usable source URI.

When both an HLS and a progressive enclosure exist, the progressive one is selected (audio-first,
matching mobile playback). Selection reuses `@podverse/helpers/item/itemEnclosure`
(`buildLabeledItemEnclosures`) so URI / media-type / extension logic stays identical to web.

**Progressive formats (first-class):** audio `mp3 aac opus m4a ogg wav`, video `mp4 m4v webm mov
mkv` (see the helpers extension/MIME maps). Files are stored on disk **with their progressive
extension** — never a `.m3u8` as the media file.

## Status machine (13.1)

`DownloadStatus`: `queued → downloading → complete`; `downloading → failed`; `queued|downloading →
cancelled`; `failed|cancelled → queued` (retry). **Concurrency is 1** — one job downloads at a time,
the rest wait `queued`. Progress is reported via `DownloadProgressEvent` (`bytesDownloaded`,
`byteSize`, `fraction`). Cancel/retry mutate the row and re-drive the queue.

Screens and hooks talk to `downloadsRepository` (source of truth) and the download manager only —
never Expo FileSystem directly.

## Storage decision (13.2)

**Expo FileSystem** (`expo-file-system`, ships with Expo SDK 52): resumable background downloads
(`createDownloadResumable`) with progress callbacks, writing to app-private `documentDirectory`
(persists across launches). Path layout: `documentDirectory + downloads/<id_text>.<ext>` — see
`downloadStorage.ts` (`DOWNLOADS_SUBDIRECTORY`, `buildDownloadFileName`, `buildDownloadFilePath`,
`hashEnclosureUri`). The absolute base directory and the transfer runner are wired in **13.4**; add
the dependency then with `npm --prefix apps/mobile exec -- expo install expo-file-system`.

## Playback from download (13.6)

`resolvePlaybackUrl(item)` (in `src/lib/playback/resolvePlaybackUrl.ts`) is the single place the
`PlaybackProvider` resolves an item's media URL. It prefers a **completed local file** (`file://`
from `documentDirectory`) and falls back to the remote enclosure otherwise, feeding the exact same
`podverse-media-engine` load path as remote playback — no second player. Only progressive files ever
have a download row, so a downloaded item plays offline (airplane mode) while livestreams keep the
remote path. If a `complete` row's file is missing on disk, the row is flipped to `failed` (so the
episode screen offers a re-download) and playback falls back to remote for that attempt.

## Storage quota + auto-delete (13.7–13.8)

`downloadQuota.ts` (pure, unit-tested) holds the policy: a **fixed 3 GiB default cap**
(`DEFAULT_DOWNLOAD_QUOTA_BYTES`), `sumCompletedBytes` (only `complete` rows count — in-progress files
are not final on disk), and `selectAutoDeleteVictims`, which picks **oldest completed first** (by
`updatedAt`) until under cap, never selecting an in-progress row nor the just-finished download.

The **Downloads** screen is the manage-storage surface: usage summary
(`Storage used: <used> / <cap>`), a **delete-all** affordance, per-row remove, and an **auto-delete
toggle** (default **off**, persisted in `prefs/downloadPrefs.ts`). When auto-delete is on, the
download runner calls `maybeAutoDelete` after each complete and, if over cap, evicts oldest-first;
the screen shows a dismissible "removed oldest to free space" banner (`downloadManager`'s
`getAutoDeleteNotice`). Every eviction deletes the file + SQLite row and re-projects the native cache
(13.9). Usage/toggle/banner state comes from the `useDownloadStorage` hook.

## Native cache projection (13.9)

Every `downloadsRepository` mutation that can change the completed set rebuilds the full
completed-downloads index and calls `projectDownloadsIndexToNativeCache`
(`src/data/nativeCache/projection.ts`), which forwards to the media-engine `writeDownloadsIndex`
bridge (best-effort; never rolls back a successful download). This keeps the native cache coherent so
CarPlay / Android Auto offline browse (Track 12.1 / 12.4 / 12.14) can list downloads without SQLite.
Durable native-cache storage lands in Track 12; the bridge logs until then.

## E2E (13.10)

`apps/mobile/e2e/library-downloads.yaml` (Maestro) downloads a seeded progressive episode, waits for
complete, plays it (local-file path, 13.6), and confirms it in My Library → Downloads with the usage
summary. The download runner reuses the playback loopback-host rewrite (`resolveE2eMediaUrl`) so
transfers work on the iOS simulator / Android emulator. Maestro cannot toggle airplane mode, so true
offline play is verified manually (airplane mode). Run: `npm run mobile:e2e:test -- library-downloads`
(needs the E2E API + test-assets stack — see [e2e/HOW-TO-RUN.md](/apps/mobile/e2e/HOW-TO-RUN.md)).

## Files

- `downloadEligibility.ts` — `isItemDownloadable`, `isHlsSource` (pure, unit-tested).
- `downloadTypes.ts` — `DownloadStatus`, `DownloadRecord`, `DownloadProgressEvent` + guards.
- `downloadStorage.ts` — on-disk naming/paths + URI hash (pure, unit-tested); Expo FileSystem
  decision documented above.
- `downloadManager.ts` — Expo FileSystem transfer runner (single-concurrency queue, de-dupe,
  cancel/remove/removeAll + auto-delete); `useDownloads.ts` — `useDownloadsList` / `useItemDownload`
  / `useDownloadStorage` hooks.
- `downloadQuota.ts` — quota cap, usage sum, oldest-first eviction, byte formatting (pure,
  unit-tested); `src/prefs/downloadPrefs.ts` — auto-delete toggle (AsyncStorage, default off).
- Playback: `src/lib/playback/resolvePlaybackUrl.ts` (local-file-first URL resolution, 13.6).
- Persistence: `src/data/repositories/downloadsRepository.ts` (SQLite + native-cache projection).
