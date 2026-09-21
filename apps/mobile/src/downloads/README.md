# Offline downloads (`apps/mobile/src/downloads`)

Download episode files for offline playback. Pure logic + shared contract live here; the SQLite
index and API access live in `src/data/` (`downloadsRepository`). See mobile-only features notes in
[DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md).

## Eligibility gate

`isItemDownloadable(item, selectedParams?)` decides whether an item can be downloaded and, if so,
which progressive source to fetch. It **rejects**:

- **Livestreams** — `item.live_item` is set (Podcasting 2.0 live item). Livestreams are streamed,
  not fixed files.
- **HLS / m3u8** — the only usable enclosure(s) resolve to a `.m3u8` playlist or an HLS MIME
  (`application/x-mpegurl`, `application/vnd.apple.mpegurl`, `audio/mpegurl`). A playlist is a
  manifest of segments, not a single downloadable file.
- **No enclosure** — no enclosure with a usable source URI.

When both an HLS and a progressive enclosure exist, the default path chooses the progressive one
(audio-first, matching mobile playback). If an explicit enclosure selection is passed (for the
active session item), that selected source is used when progressive; selected HLS remains
non-downloadable. Selection reuses `@podverse/helpers/item/itemEnclosure`
(`buildLabeledItemEnclosures`) so URI / media-type / extension logic stays identical to web.

**Progressive formats (first-class):** audio `mp3 aac opus m4a ogg wav`, video `mp4 m4v webm mov
mkv` (see the helpers extension/MIME maps). Files are stored on disk **with their progressive
extension** — never a `.m3u8` as the media file.

## Status machine

`DownloadStatus`: `queued → downloading → complete`; `downloading → paused` / `paused → downloading`;
`downloading → failed`; `queued|downloading|paused → cancelled` (via remove); `failed → queued`
(retry). **Concurrency is 5** (`DOWNLOAD_MAX_CONCURRENCY`) — up to five Expo `DownloadResumable`
transfers at once. Pause all parks in-flight jobs and marks remaining queued jobs `paused`. The
queue is FIFO by `createdAt`, so taps are honored in the order they were made.

Screens and hooks read `downloadStore` and act through `downloadManager` — never Expo FileSystem
directly, and never `downloadsRepository` for state a transfer is changing. Downloads do **not** enter
the serial sync queue; the global activity bar shows a download line separately from sync.

## State: memory renders, SQLite persists

`downloadStore.ts` is an in-memory mirror of the index and the only thing download UI renders from.
Every mutation lands there synchronously — a tapped control changes in the same frame — and the
SQLite write follows as the durable record. Records are immutable, so a mutation replaces one and
leaves the rest identical; a row's `setState` then receives the same reference and skips its
re-render, which is what keeps a forty-row list still while five things download.

Two notification channels, because a transfer reports bytes many times a second and RN handles
touches on that same thread:

| Channel               | Fires for            | Cadence                                       | Who subscribes                         |
| --------------------- | -------------------- | --------------------------------------------- | -------------------------------------- |
| `subscribe`           | set + status changes | leading edge, then one trailing pass (100 ms) | everything                             |
| `subscribeToProgress` | byte movement        | trailing only (500 ms)                        | My Library → Downloads |

`batch(fn)` collapses a bulk operation (pause all, resume all, clear finished) into one notification.

**Never on a byte tick:** a SQLite write, a native-cache projection, a filesystem walk, or a
full-table read. Byte counts reach SQLite through `downloadsRepository.patchProgress` at most once
every few seconds per transfer, plus a forced flush on pause and on failure — they exist only so an
interrupted download resumes near where it stopped. Rules: **mobile-progress-ux-and-notification-channels**.

**Progress detail goes where the user asked for it.** A list row shows a busy spinner and no number
(`DownloadRowControl`); the Downloads screen shows percentages and bars; badges and the activity
bar are derived from statuses alone.

## Storage

**Expo FileSystem** (`expo-file-system`): resumable background downloads (`createDownloadResumable`)
with progress callbacks, writing to app-private `documentDirectory`. Path layout:
`documentDirectory + downloads/<id_text>.<ext>` — see `downloadStorage.ts`.

## Playback from download

`resolvePlaybackUrl(item, selectedParams)` (in `src/lib/playback/resolvePlaybackUrl.ts`) prefers a
**completed local file** (`file://` from `documentDirectory`) and falls back to the remote enclosure
selected from the session's labeled-enclosure params. Only progressive files ever have a download
row. If a `complete` row's file is missing on disk, the row is flipped to `failed` and playback
falls back to remote for that attempt.

## Storage quota + auto-free

`downloadQuota.ts` holds the policy: default **10 GiB** cap (`DEFAULT_DOWNLOAD_QUOTA_BYTES`),
optional unlimited, `sumCompletedBytes` (only `complete` rows), and oldest-complete-first eviction.

**More → Settings → Downloads** is the manage-storage surface: device and downloaded-media meters
(bars only when a cap exists), app-data and cache sizes without bars, a configurable limit
(1–50 GB or Unlimited), two independent auto-free toggles (limit reached; device free space under
**1 GB**), and danger **Delete all** with confirm (deletes local media files and index rows). Prefs
live in `prefs/downloadPrefs.ts` (AsyncStorage, mobile-only).

**My Library → Downloads** is a monitor: Pause all / Resume all, sectioned list, swipe Remove.
Completed rows stay until the file is deleted (Settings → Delete all, or swipe Remove). No storage
chrome and no Play on that screen.

## Native cache projection

Every `downloadsRepository` mutation that can change the completed set rebuilds the completed-downloads
index and calls `projectDownloadsIndexToNativeCache` so CarPlay / Android Auto offline browse can list
downloads without SQLite. Byte progress cannot change that set, which is why it goes through
`patchProgress` and skips the projection entirely.

## E2E

- `apps/mobile/e2e/library-downloads.yaml` — play while streaming, then download; completion
  switches the engine to the local file (`playback-source-e2e` `remote` → `local`) and the row
  appears under Completed. Needs E2E API + test-assets.
- `apps/mobile/e2e/settings-downloads.yaml` — Settings → Downloads meters, delete-all confirm, limit
  picker. Needs E2E API.

Run: `npm run mobile:e2e:test -- library-downloads,settings-downloads` (see
[e2e/HOW-TO-RUN.md](/apps/mobile/e2e/HOW-TO-RUN.md)).

## Files

- `downloadEligibility.ts` — `isItemDownloadable`, `isHlsSource` (pure, unit-tested).
- `downloadTypes.ts` — `DownloadStatus`, `DownloadRecord`, `DownloadPatch` + guards.
- `downloadStore.ts` — in-memory mirror, split status / progress channels (pure, unit-tested).
- `downloadStorage.ts` — on-disk naming/paths + URI hash (pure, unit-tested).
- `downloadStorageStats.ts` — device / downloads / app data / cache byte breakdown for Settings.
- `downloadManager.ts` — Expo FileSystem transfer runner (concurrency 5, pause/resume, auto-free);
  `useDownloads.ts` — list / item / storage hooks.
- `downloadQuota.ts` — quota cap, usage sum, oldest-first eviction, byte formatting (pure,
  unit-tested); `src/prefs/downloadPrefs.ts` — limit + auto-free toggles.
- Playback: `src/lib/playback/resolvePlaybackUrl.ts` (local file on a new play) and
  `src/lib/playback/planDownloadCompletePlaybackHandoff.ts` (swap onto that file when a download
  of the current stream finishes).
- Persistence: `src/data/repositories/downloadsRepository.ts` (SQLite + native-cache projection).
