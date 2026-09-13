# Offline downloads (`apps/mobile/src/downloads`)

Download episode files for offline playback. Pure logic + shared contract live here; the SQLite
index and API access live in `src/data/` (`downloadsRepository`). See mobile-only features notes in
[DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md).

## Eligibility gate

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

## Status machine

`DownloadStatus`: `queued → downloading → complete`; `downloading → paused` / `paused → downloading`;
`downloading → failed`; `queued|downloading|paused → cancelled` (via remove); `failed → queued`
(retry). **Concurrency is 5** (`DOWNLOAD_MAX_CONCURRENCY`) — up to five Expo `DownloadResumable`
transfers at once. Pause all parks in-flight jobs and marks remaining queued jobs `paused`. Progress
is reported via `DownloadProgressEvent` (`bytesDownloaded`, `byteSize`, `fraction`).

Screens and hooks talk to `downloadsRepository` (source of truth) and the download manager only —
never Expo FileSystem directly. Downloads do **not** enter the serial sync queue; the global activity
bar shows a download line separately from sync.

## Storage

**Expo FileSystem** (`expo-file-system`): resumable background downloads (`createDownloadResumable`)
with progress callbacks, writing to app-private `documentDirectory`. Path layout:
`documentDirectory + downloads/<id_text>.<ext>` — see `downloadStorage.ts`.

## Playback from download

`resolvePlaybackUrl(item)` (in `src/lib/playback/resolvePlaybackUrl.ts`) prefers a **completed local
file** (`file://` from `documentDirectory`) and falls back to the remote enclosure. Only progressive
files ever have a download row. If a `complete` row's file is missing on disk, the row is flipped to
`failed` and playback falls back to remote for that attempt.

## Storage quota + auto-free

`downloadQuota.ts` holds the policy: default **10 GiB** cap (`DEFAULT_DOWNLOAD_QUOTA_BYTES`),
optional unlimited, `sumCompletedBytes` (only `complete` rows), and oldest-complete-first eviction.

**More → Settings → Downloads** is the manage-storage surface: device / downloaded media / app data /
cache meters, a configurable limit (1–50 GB or Unlimited), two independent auto-free toggles (limit
reached; device free space under **1 GB**), and danger **Delete all** with confirm (deletes local
media files and index rows). Prefs live in `prefs/downloadPrefs.ts` (AsyncStorage, mobile-only).

**My Library → Downloads** is a monitor: Pause all / Resume all, Clear all finished
(`dismissedFromList` — files stay playable and still count toward storage), sectioned list, swipe
Remove. No storage chrome and no Play on that screen.

## Native cache projection

Every `downloadsRepository` mutation that can change the completed set rebuilds the completed-downloads
index and calls `projectDownloadsIndexToNativeCache` so CarPlay / Android Auto offline browse can list
downloads without SQLite.

## E2E

- `apps/mobile/e2e/library-downloads.yaml` — download → complete → play → list (Completed /
  Clear finished). Needs E2E API + test-assets.
- `apps/mobile/e2e/settings-downloads.yaml` — Settings → Downloads meters, delete-all confirm, limit
  picker. Needs E2E API.

Run: `npm run mobile:e2e:test -- library-downloads,settings-downloads` (see
[e2e/HOW-TO-RUN.md](/apps/mobile/e2e/HOW-TO-RUN.md)).

## Files

- `downloadEligibility.ts` — `isItemDownloadable`, `isHlsSource` (pure, unit-tested).
- `downloadTypes.ts` — `DownloadStatus`, `DownloadRecord`, `DownloadProgressEvent` + guards.
- `downloadStorage.ts` — on-disk naming/paths + URI hash (pure, unit-tested).
- `downloadStorageStats.ts` — device / downloads / app data / cache byte breakdown for Settings.
- `downloadManager.ts` — Expo FileSystem transfer runner (concurrency 5, pause/resume, auto-free);
  `useDownloads.ts` — list / item / storage hooks.
- `downloadQuota.ts` — quota cap, usage sum, oldest-first eviction, byte formatting (pure,
  unit-tested); `src/prefs/downloadPrefs.ts` — limit + auto-free toggles.
- Playback: `src/lib/playback/resolvePlaybackUrl.ts`.
- Persistence: `src/data/repositories/downloadsRepository.ts` (SQLite + native-cache projection).
