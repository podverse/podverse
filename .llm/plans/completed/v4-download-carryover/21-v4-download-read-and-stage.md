**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 21 — Read v4 download state and stage one row per file (mobile)

## Rows

R10, R11, R19, R28

This plan stages what v4 knew about each downloaded file, plus files in v4's own folders that
neither key names. Area D (plans 40–49) reads these rows and decides each file's fate. The read
here never deletes, moves, or locates a file, so a file waiting on a lookup or a parse stays on
disk (R19). A thrown read of the download lists (R28) is tried again on a later launch. It is
not stored as an empty list and it stages no rows, so area D does not delete those files.

## Runs after

20

## Files

apps/mobile/src/migration/v4/parseV4LocalState.ts
apps/mobile/src/migration/v4/parseV4DownloadState.ts
apps/mobile/src/migration/v4/parseV4DownloadState.test.ts
apps/mobile/src/migration/v4/readV4DownloadState.ts
apps/mobile/src/migration/v4/readV4DownloadState.test.ts
apps/mobile/src/migration/v4/readV4LocalState.ts
apps/mobile/src/data/db/migrations.ts
apps/mobile/src/data/db/migrations.test.ts
apps/mobile/src/data/db/schema.ts
apps/mobile/src/data/customApiLocalClearPlan.test.ts
apps/mobile/src/data/repositories/v4DownloadCarryoverRepository.ts
apps/mobile/vitest.config.ts

## What v4 stored (researched, settled)

All three are AsyncStorage keys written by `../podverse-rn` (`src/resources/Keys.ts`).

- `DOWNLOADED_PODCASTS` (`src/lib/downloadedPodcast.ts`): JSON array of podcast objects, each with
  an `episodes` array of finished downloads. The episode's own `podcast` field is deleted before
  storing.
  - Podcast fields read: `id` (v4 podcast id; for Add by RSS it equals the feed URL),
    `addByRSSPodcastFeedUrl`, `title`, `shrunkImageUrl`, `imageUrl`, `feedUrls[0].url`,
    `podcastIndexId` (number or string), `podcastGuid`.
  - Episode fields read: `id` (the file stem), `mediaUrl`, `guid`, `title`, `pubDate` (a JSON date
    string), `duration` (seconds, number or numeric string), `mediaType` (MIME), `imageUrl`,
    `addedByRSS` (true on Add by RSS episodes).
- `DOWNLOADING_EPISODES` (`src/lib/downloadingEpisode.ts`): JSON array of episode objects with the
  same episode fields and the podcast embedded as `episode.podcast`.
- `EXT_STORAGE_DLOAD_LOCATION` (`src/lib/downloader.ts`): a plain string, not JSON. Plan 20
  § Where v4 put its files explains its two shapes.

The file for an episode is `v4FileKey(episode.id, v4ExtensionFromUrl(episode.mediaUrl))` (plan 20,
`v4DownloadNames.ts`). The extension is computed from the raw `mediaUrl` before any cleanup, because
that is what v4 used.

`DOWNLOADED_PODCASTS` holds whole podcast and episode objects and can be large. On Android a value
above the AsyncStorage row limit makes the read throw. The download keys are therefore read in their
own `multiGet`, separate from the four subscription keys, so a failure here cannot empty the
subscription read. That throw is tried again on a later launch. It is not replaced with an empty
list, and it does not stage the files in v4's own folders as orphans.

## Pure parse: `src/migration/v4/parseV4DownloadState.ts`

First, in `parseV4LocalState.ts`, export the existing `readArray`, `httpUrlWithoutUserinfo`, and
`readCachedFeedUrl` unchanged (add `export`, no behavior change) and reuse them here. Do not copy
them.

```ts
export type V4DownloadSource = 'downloaded' | 'downloading' | 'orphan';

/** One v4 media file before it is resolved. URLs carry no userinfo. */
export type V4DownloadStagedEntry = {
  fileKey: string;
  source: V4DownloadSource;
  orphanRoot: V4FileRootKind | null;
  legacyEpisodeId: string | null;
  legacyExtension: string;
  isAddByRss: boolean;
  legacyPodcastId: string | null;
  addByRssFeedUrl: string | null;
  podcastFeedUrl: string | null;
  podcastIndexId: string | null;
  podcastGuid: string | null;
  podcastTitle: string | null;
  podcastImageUrl: string | null;
  episodeGuid: string | null;
  mediaUrl: string | null;
  episodeTitle: string | null;
  episodePubDateMs: number | null;
  episodeDurationSeconds: number | null;
  episodeMediaType: string | null;
  episodeImageUrl: string | null;
};

export type V4DownloadStateRaw = {
  downloadedPodcasts: string | null;
  downloadingEpisodes: string | null;
  sharedFolder: string | null;
};

export type V4DownloadStateParsed = {
  entries: V4DownloadStagedEntry[];
  sharedFolder: string | null;
};

export const parseV4DownloadState = (raw: V4DownloadStateRaw): V4DownloadStateParsed;
export const orphanStagedEntry = (orphan: V4OrphanFile): V4DownloadStagedEntry;
```

`V4FileRootKind` and `V4OrphanFile` are type imports from plan 20's `v4DownloadNames.ts` and
`v4DownloadFiles.ts`. Use `import type` for `V4OrphanFile` so the pure parse never loads Expo.

Rules for `parseV4DownloadState` (never throws; any thrown error inside returns
`{ entries: [], sharedFolder }`):

- Episode id: `toNonEmptyTrimmedString(episode.id)`. Skip the episode when it is null.
- Media URL: skip the episode when `episode.mediaUrl` is not a non-empty string. Without it v4
  could not name the file. `legacyExtension = v4ExtensionFromUrl(rawMediaUrl)`.
  `fileKey = v4FileKey(id, legacyExtension)`. Skip when `isSafeV4FileKey(fileKey)` is false.
- `mediaUrl` column: `httpUrlWithoutUserinfo(rawMediaUrl.trim())`, null when not http(s). The query
  is kept, because area D matches on the enclosure URL.
- `isAddByRss`: true when the podcast has a non-empty `addByRSSPodcastFeedUrl` or the episode has
  `addedByRSS === true`.
- `addByRssFeedUrl`: when `isAddByRss`, `canonicalAddByRSSFeedUrl` (from
  `@podverse/helpers-validation/client`) of `addByRSSPodcastFeedUrl`, else of the podcast `id`;
  null when that is null. Null when not Add by RSS.
- `legacyPodcastId`: the trimmed podcast `id` when not Add by RSS; null for Add by RSS (its id is
  the feed URL, already in `addByRssFeedUrl`).
- `podcastFeedUrl`: `readCachedFeedUrl(podcast)` when not Add by RSS; null for Add by RSS.
- `podcastIndexId`: a finite number as its decimal string, or a non-empty trimmed string; else null.
- `podcastGuid`, `podcastTitle`, `episodeGuid`, `episodeTitle`, `episodeMediaType`: non-empty
  trimmed strings or null (`getNonEmptyTrimmedStringProperty`).
- `podcastImageUrl`: `httpUrlWithoutUserinfo` of the trimmed `shrunkImageUrl`, else of `imageUrl`;
  null when neither is http(s). `episodeImageUrl`: the same for the episode's `imageUrl`.
- `episodePubDateMs`: `Date.parse` of a string `pubDate`; null when not a string or not finite.
- `episodeDurationSeconds`: a finite number, or a string that parses to one, floored; null when
  negative or not finite.
- `DOWNLOADED_PODCASTS` gives `source: 'downloaded'`, reading each podcast's `episodes` array (skip
  a podcast that is not a plain object or has no array). `DOWNLOADING_EPISODES` gives
  `source: 'downloading'`, with `episode.podcast` as the podcast (an absent podcast reads as `{}`).
- One entry per `fileKey`. A `downloaded` entry wins over a `downloading` one; otherwise the first
  wins. Output order: downloaded entries in input order, then downloading entries.
- `orphanRoot` is null on every parsed entry.
- `sharedFolder`: the trimmed `EXT_STORAGE_DLOAD_LOCATION` text, null when absent or empty. It is
  kept raw; plan 20's `classifyV4SharedFolder` interprets it when area D resolves roots.

`orphanStagedEntry(orphan)` returns `source: 'orphan'`, `fileKey: orphan.fileKey`,
`orphanRoot: orphan.root`, `legacyExtension: legacyExtensionOfName(orphan.fileKey)`,
`isAddByRss: false`, and null for every other field.

## SQLite: migration version 5 and `schema.ts`

Append to `MIGRATIONS` in `apps/mobile/src/data/db/migrations.ts`. If another plan in this set
already appended version 5, use the next number and adjust the tests the same way.

```sql
CREATE TABLE IF NOT EXISTS v4_download_carryover_entry (
  file_key TEXT PRIMARY KEY NOT NULL,
  source TEXT NOT NULL,
  orphan_root TEXT,
  legacy_episode_id TEXT,
  legacy_extension TEXT NOT NULL,
  is_add_by_rss INTEGER NOT NULL DEFAULT 0,
  legacy_podcast_id TEXT,
  add_by_rss_feed_url TEXT,
  podcast_feed_url TEXT,
  podcast_index_id TEXT,
  podcast_guid TEXT,
  podcast_title TEXT,
  podcast_image_url TEXT,
  episode_guid TEXT,
  media_url TEXT,
  episode_title TEXT,
  episode_pub_date_ms INTEGER,
  episode_duration_seconds INTEGER,
  episode_media_type TEXT,
  episode_image_url TEXT,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  adopted_file_name TEXT,
  updated_at INTEGER NOT NULL,
  CHECK (source IN ('downloaded', 'downloading', 'orphan')),
  CHECK (orphan_root IS NULL OR orphan_root IN ('app_external_files', 'app_documents'))
);
```

```sql
CREATE INDEX IF NOT EXISTS idx_v4_download_carryover_status
  ON v4_download_carryover_entry (status);
```

`status` has no CHECK on purpose: area D owns the status values and extends the TypeScript list.
There is no column for a feed password, a username, or an auth header.

In `schema.ts`, add `v4DownloadCarryoverEntry` (`sqliteTable('v4_download_carryover_entry', …)`)
**after** `v4CarryoverEntry`, with camelCase properties matching the columns (`fileKey` primary key,
`isAddByRss` integer, and so on), plus `V4DownloadCarryoverEntryRow` / `…Insert` types. Doc
comment: media files from a finished read of the previous app's download lists and folders; device data, so
ending a session does not delete these rows; URLs have no userinfo; `adopted_file_name` is a name
under `downloads/`, never an absolute path.

The table is device data under **mobile-account-scoped-data** (downloads are device data). Do not
add it to `clearSession`. The custom API switch already empties every schema table, including this
one and `kv_meta`; the read then runs again and re-stages rows harmlessly.

## Repository: `src/data/repositories/v4DownloadCarryoverRepository.ts`

A new file, separate from `v4CarryoverRepository.ts`, following its patterns (`initializeDatabase`,
`getDb`, a `readKv` / `writeKv` pair on `schema.kvMeta`, a `toRow` guard). Do not add it to the
`data/repositories/index.ts` barrel; callers import it by path, like the migration code does.

kv keys: `v4_download_carryover.read_at`, `v4_download_carryover.shared_folder`.
There is no read-attempt key. The `attempts` column on each row is area D's later count and starts
at 0.

```ts
export const V4_DOWNLOAD_CARRYOVER_STATUSES = ['pending'] as const;
export type V4DownloadCarryoverStatus = (typeof V4_DOWNLOAD_CARRYOVER_STATUSES)[number];

export type V4DownloadCarryoverRow = V4DownloadStagedEntry & {
  status: V4DownloadCarryoverStatus;
  attempts: number;
  adoptedFileName: string | null;
  updatedAt: number;
};

export type V4DownloadCarryoverCounts = {
  bySource: Record<V4DownloadSource, number>;
  byStatus: Record<V4DownloadCarryoverStatus, number>;
  total: number;
};
```

Methods on `v4DownloadCarryoverRepository`:

- `hasRead(): Promise<boolean>` — `read_at` present. Absent means the download read has not
  finished, including when an earlier launch threw.
- `saveRead(input: { entries: readonly V4DownloadStagedEntry[]; sharedFolder: string | null }):
  Promise<void>` — the only write of `read_at`. One transaction: insert entries in chunks of 30
  with `status: 'pending'`, `attempts: 0`, `adoptedFileName: null`, `onConflictDoNothing` on
  `fileKey`; write `shared_folder` when non-null, delete it when null; write `read_at`. Do not
  add `markRead`. The subscription repository's `markRead` records a failed subscription read as
  finished; this repository has no such method.
- `clearRead(): Promise<void>` — one transaction deleting every row and both kv keys. Area E's
  fixture calls it.
- `getSharedFolder(): Promise<string | null>`.
- `listByStatus(statuses: readonly V4DownloadCarryoverStatus[]): Promise<V4DownloadCarryoverRow[]>`
  — empty input returns `[]`.
- `setStatus(fileKey: string, status: V4DownloadCarryoverStatus): Promise<void>`.
- `bumpAttempts(fileKey: string): Promise<void>` — same read-then-update transaction as
  `v4CarryoverRepository.bumpAttempts`.
- `setAdoptedFileName(fileKey: string, fileName: string | null): Promise<void>`.
- `counts(): Promise<V4DownloadCarryoverCounts>`.

`toRow` returns null when `source` or `status` is outside its list, or when `orphanRoot` is
non-null and not a `V4FileRootKind` orphan root (`app_external_files`, `app_documents`). It maps
`isAddByRss` 0/1 to a boolean.

## Read: `src/migration/v4/readV4DownloadState.ts`

```ts
export const V4_DOWNLOAD_STATE_KEYS = {
  downloadedPodcasts: 'DOWNLOADED_PODCASTS',
  downloadingEpisodes: 'DOWNLOADING_EPISODES',
  sharedFolder: 'EXT_STORAGE_DLOAD_LOCATION',
} as const;

/** True when this call staged at least one row. Never throws. */
export const performV4DownloadRead = (): Promise<boolean>;
```

Import `listV4OrphanFiles` and `resolveV4DownloadRoots` from `./v4DownloadFiles`, and
`v4DownloadCarryoverRepository` from `../../data/repositories/v4DownloadCarryoverRepository`.

`performRead` in `readV4LocalState.ts` calls `v4CarryoverRepository.markRead()` when the subscription
read throws, so that read is not tried again. Do not copy that catch. A thrown download-list read
stays unfinished.

Steps:

1. `hasRead()` true → return false.
2. `AsyncStorage.multiGet` of the three keys only. When it throws, the read did not happen. Do not
   call `parseV4DownloadState`, `resolveV4DownloadRoots`, or `listV4OrphanFiles`. Do not call
   `saveRead`. Do not write `read_at` or `shared_folder`, and do not insert rows. Log
   `console.warn('[v4-carryover] download read failed')` in the same form as `performRead`'s catch
   (no keys, URLs, file counts, or folder values). Return false. `hasRead()` stays false, so the
   next launch of `runV4CarryoverReadOnce` tries this read again. There is no attempt limit. Repeated
   throws stay a thrown read: they are not stored as `{ entries: [], sharedFolder: null }`, and they
   do not stage orphans.
3. `parseV4DownloadState(...)`. An `entries` array of length 0 here is a finished read of a list
   that named no episode (absent keys, `[]`, or JSON that does not parse). That is not a thrown
   read. Continue.
4. `resolveV4DownloadRoots(null)` (plan 20). When it is non-null, `listV4OrphanFiles(roots, new
   Set(parsed.entries.map((entry) => entry.fileKey)))`, mapped through `orphanStagedEntry`. A thrown
   error from the root lookup or the folder listing yields no orphans and does not discard
   `parsed.entries`. The list was already read, so unnamed files from a failed listing are not
   staged and this read does not delete them.
5. `saveRead({ entries: [...parsed.entries, ...orphans], sharedFolder: parsed.sharedFolder })`.
   This is the only write of `read_at`. Saving an empty `entries` array is still correct after
   `multiGet` returns: the read finished, and area D may delete orphan rows this call staged. A
   thrown list read never reaches this step, so it never creates those rows.
6. `console.info('[v4-carryover] download read finished', counts)` with
   `eslint-disable-next-line no-console` and the same justification as the subscription read. Counts
   only: downloaded, downloading, orphan, addByRss, withMediaUrl, withSharedFolder (0 or 1). No file
   keys, URLs, or folder values. This line runs only after `saveRead` resolves.
7. Return `entries.length > 0`.

A throw from `resolveV4DownloadRoots` or `listV4OrphanFiles` stays inside step 4 and still reaches
`saveRead`. Any other throw after `multiGet` has returned, including `saveRead`, logs the same
warning and returns false. Do not write `read_at` and do not insert a substitute empty list.
`saveRead` is one transaction, so a throw there leaves no rows and no `read_at`. The next launch
tries the whole read again. This function never deletes or moves a file.

## Wiring: `readV4LocalState.ts`

Change only `runV4CarryoverReadOnce`, so both reads share the one carryover queue and the
subscription read always goes first:

```ts
export const runV4CarryoverReadOnce = (): Promise<void> =>
  enqueueV4CarryoverWork(async () => {
    await performRead();
    if (await performV4DownloadRead()) {
      notifyV4CarryoverRowsSaved();
    }
  });
```

`readV4DownloadState.ts` must not import from `readV4LocalState.ts`, so the two files do not form an
import cycle. Update `runV4CarryoverReadOnce`'s doc comment to say it reads the download lists until
that read writes `read_at`, and that a thrown download-list read leaves every file in place and is
tried again on a later launch. `notifyV4CarryoverRowsSaved` is the hook area D's job scheduling
hangs on. It runs only when `performV4DownloadRead` returns true. It is a no-op until the sync
listener is registered, as today.

Nothing here runs on the render path. `SyncProvider` already calls `runV4CarryoverReadOnce` without
awaiting it before first paint, and that call site does not change.

## Tests

- New `apps/mobile/src/migration/v4/parseV4DownloadState.test.ts` (vitest, node), added to the
  `include` list in `apps/mobile/vitest.config.ts` beside `parseV4LocalState.test.ts`, with one line
  in the header comment naming the module. Cases:
  - Malformed JSON, the wrong shapes, and all-null input give no entries. A thrown error inside the
    parse gives no entries but keeps the shared folder text.
  - A directory episode: file key from id plus extension, `legacyPodcastId`, cached feed URL,
    podcast index id from a number, image fallback to `imageUrl`, `pubDate` to milliseconds,
    string duration floored.
  - An Add by RSS episode (feed URL as podcast id, base64-style id with `/`): `isAddByRss`,
    canonical feed URL, no `legacyPodcastId`.
  - Userinfo is stripped from media, feed, and image URLs; a non-http media URL gives
    `mediaUrl: null` but still stages the file.
  - An episode without `id` or `mediaUrl`, or with an unsafe key (`../x`), is skipped.
  - The same file key in both lists keeps the downloaded entry; a downloading entry uses its
    embedded podcast.
  - `orphanStagedEntry` sets source, root, and extension, and nulls the rest.
- New `apps/mobile/src/migration/v4/readV4DownloadState.test.ts` (vitest, node), added to the
  `include` list in `apps/mobile/vitest.config.ts` beside `parseV4DownloadState.test.ts`, with one
  line in the header comment naming the module. `vi.mock` these before the import, in the style of
  `src/prefs/signInPushPromptPrefs.test.ts`, so the file never loads `expo-sqlite` or
  `expo-file-system`: `@react-native-async-storage/async-storage`,
  `../../data/repositories/v4DownloadCarryoverRepository`, and `./v4DownloadFiles`. Load
  `parseV4DownloadState` and `v4DownloadNames` for real. `hasRead` resolves false.
  `resolveV4DownloadRoots` resolves a non-null roots object.
  - `multiGet` rejects: the call resolves false; `saveRead`, `resolveV4DownloadRoots`, and
    `listV4OrphanFiles` are not called. A second call invokes `multiGet` again.
  - `multiGet` rejects on three calls in a row: `saveRead` and `listV4OrphanFiles` are still not
    called.
  - `multiGet` resolves all three values to null, and `listV4OrphanFiles` resolves
    `[{ fileKey: 'unnamed.mp3', root: 'app_documents' }]`: `saveRead` is called once with that one
    orphan entry (`source: 'orphan'`) and `sharedFolder: null`. A finished empty list still stages
    orphans. A thrown read does not.
  - `multiGet` resolves `DOWNLOADED_PODCASTS` to one podcast whose only episode is
    `{ id: 'ep1', mediaUrl: 'https://example.com/ep1.mp3', title: 'Episode' }` (podcast `id`
    `podcast1`), the other two values null, and `listV4OrphanFiles` rejects: `saveRead` is called
    once with that one downloaded entry (`fileKey` `ep1.mp3`) and no orphan.
- `apps/mobile/src/data/db/migrations.test.ts`: versions 1 to 5 with 5 the latest; every ladder test
  gains the version 5 statements and `PRAGMA user_version = 5;`; "does nothing" moves to version 5;
  the newer-version message names migration 5; a new case checks version 5 creates
  `v4_download_carryover_entry` with `file_key text primary key`, `status text not null`,
  `adopted_file_name text`, the status index, and no `password` or `username`.
- `apps/mobile/src/data/customApiLocalClearPlan.test.ts`: append `'v4_download_carryover_entry'`
  after `'v4_carryover_entry'` in `SCHEMA_TABLE_NAMES`.
- The repository's SQL methods have no unit tests; `migrations.test.ts` checks the table. Area E's
  Maestro path covers a finished read end to end. The thrown-read cases above are the unit test,
  because a device flow cannot make AsyncStorage throw.

## Release scratchpad

```markdown
## Phone records v4 downloads after the list read finishes

- Surfaces: mobile
- Change: on first launch after updating from v4, the phone reads v4's `DOWNLOADED_PODCASTS`,
  `DOWNLOADING_EPISODES`, and Android download folder setting, and records one row per media
  file in a new local table (SQLite migration 5, `v4_download_carryover_entry`). Media files in v4's
  own folders that neither list names are recorded too, and only after that read returns. When the
  read throws, nothing is recorded and a later launch tries again; those files stay on disk. The
  read does not move or delete anything; the v4 download carryover acts on these rows.
- Who notices: no listener-visible change from this entry alone
- Operator steps: none
```
