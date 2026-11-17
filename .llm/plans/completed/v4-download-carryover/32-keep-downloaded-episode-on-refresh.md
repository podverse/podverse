**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 32 — A download that leaves its feed stays on the show

## Rows

R23, R21, R22, R5

R23: every finished download whose episode leaves its feed stays on that show's episode list and in
Downloads until the listener deletes the file. Play uses the local file only. Deleting the file
removes that local row, and the list is then whatever the server still returns. A directory show
stays a directory subscription. This is not an Add by RSS follow.

R21 and R22: the Add by RSS half. A carried file adopted as a feed episode (plan 30) that a later
refresh no longer lists stays on that feed. The host being down, or the episode having left the
feed, does not delete the file.

R5: the file stays listed on its show, not only in Library → Downloads.

## Runs after

30

## Goal

One rule for every finished download, v4 or v5. When a refresh no longer lists an episode this
phone has finished downloading, that episode stays on the show's episode list and in Downloads.
Play loads the local file and does not fall back to the remote enclosure. Deleting the file
removes the local row. Episodes the server still lists stay as server rows.

Add by RSS and directory shows use different stores. Do not turn a directory subscription into an
Add by RSS follow to keep the file.

Web has no download library. This plan does not change web, the API, or a native car module. Car
playback already prefers the completed download file, and removing the download row updates the
car index through the existing projection.

## Design

### Add by RSS — keep the local episode on refresh

Unchanged from the first pass, which D10 confirmed. All of this still runs in `upsertFeed` in
`apps/mobile/src/data/repositories/addByRssRepository.ts` (large file: find the symbol
`upsertFeed`; do not read the file whole) and the pure helper in
`apps/mobile/src/lib/addByRss/localEpisode.ts` (created by plan 30).

#### Pure helper — `planKeptLocalEpisodes`

Add to `apps/mobile/src/lib/addByRss/localEpisode.ts`:

```ts
export const planKeptLocalEpisodes = (params: {
  completeDownloadIds: ReadonlySet<string>;
  existingLocalIds: ReadonlySet<string>;
  feedUrl: string;
  next: AddByRSSMappedFeed;
  previous: AddByRSSMappedFeed;
}): { downloadIdText: string; itemBundle: AddByRSSMappedFeed['items'][number] }[]
```

- Compute the download id of every item in `next` with `addByRssDownloadItemIdText(feedUrl,
  bundle.item, index)`.
- For each item in `previous` (with its index), compute its download id the same way. Keep it when
  all are true:
  - the id is in `completeDownloadIds`;
  - the id is not among `next`'s ids;
  - the id is not in `existingLocalIds`;
  - `bundle.item.guid` or `bundle.item.guid_enclosure_url` is non-null (an index-based id would
    change with position, so it cannot be kept).
- Return the kept items with the `previous` item bundle unchanged. The download id of a kept item
  is the same before and after, so no download row moves.

#### `upsertFeed`

In the branch `if (mappedFeed !== undefined)`, when `mappedFeed !== null`, **before** the
`insert … onConflictDoUpdate` that writes `mappedFeedJson`:

1. Select the feed's complete download ids directly:
   `getDb().select({ itemIdText: schema.download.itemIdText }).from(schema.download).where(and(eq(schema.download.status, 'complete'), eq(schema.download.channelIdText, record.feedUrl)))`.
2. When that list is empty, skip to the bundle write. This keeps the common path (no downloads)
   free of an extra JSON parse.
3. Otherwise read the stored `mappedFeedJson` for `record.feedUrl`. When it is null or does not
   parse (`safeJsonParse`), skip.
4. Read the feed's local-episode ids with `addByRssLocalEpisodeRepository.listByFeedUrl`.
5. Run `planKeptLocalEpisodes` and `addByRssLocalEpisodeRepository.upsert` each result with
   `feedUrl: record.feedUrl`.

Wrap steps 1–5 in one `try … catch` that logs the way this file already does:
`console.warn('[add-by-rss] keep downloaded episodes failed', classifySyncError(error).code)`, then
continues to the bundle write. Do not log the feed URL. A failure here must never fail the parse
store.

Plan 30's absorb runs after the bundle write and handles the reverse case (a kept episode that a
later bundle lists again). Do not change it.

Do not touch the failure, 304, or followed-list merge paths. They do not replace the bundle.

A local episode row is the local content reference. Plan 30 already deletes that row from
`downloadsRepository.remove` and `downloadsRepository.clear`. Do not add a second delete. While
the row exists, play is the local file only (below). After the row is gone, the feed list is the
stored bundle.

#### Downloaded section comment

`apps/mobile/src/screens/home/addByRss/AddByRssDownloadedSection.tsx`: plan 30 rewrote the doc
comment for carried local episodes. Make it state the general rule: a finished download whose
episode left the feed stays on the feed as a local episode, plays from the file, and leaves the
list when that file is deleted.

### Directory — keep the episode on the same show

`channel_item` is the directory episode list (podcast episodes, album tracks, and artist tracks
all read it). A finished download whose episode leaves that list stays as a `channel_item` row
flagged `kept_for_download = 1`. The show stays in `subscribed_channel`. Nothing in this path
creates or follows an Add by RSS feed.

The flag means: the last finished window walk did not return this episode, and the row exists
only so the finished download can stay on the show and play. It is not an Add by RSS item. A row
with `kept_for_download = 0` is a server row. Update the table comment in `schema.ts` to say that.

#### Column and migration

On `schema.channelItem`:

```ts
keptForDownload: integer('kept_for_download').notNull().default(0),
```

`0` / `1`. Existing rows are server rows.

Append the next integer to `MIGRATIONS` in `apps/mobile/src/data/db/migrations.ts`. Plans 21 and
30 each append a version. Read the array at implementation time and use one higher than its last
`version`. One statement:

```sql
ALTER TABLE channel_item ADD COLUMN kept_for_download INTEGER NOT NULL DEFAULT 0;
```

Forward-only. Do not edit an earlier version. Update `apps/mobile/src/data/db/migrations.test.ts`
the same way those plans extend it: the latest-version assertion, the "does nothing when already
at the latest" case, and the "rejects a newer user_version" message all name this new version. Add
one case that the new version's statement adds `kept_for_download`. No new table, so
`customApiLocalClearPlan.test.ts` stays as it is. An API-address switch already empties
`channel_item`.

#### Who counts as having left the feed

`reconcileChannelItems` in `apps/mobile/src/data/repositories/channelItemWindow.ts` deletes two
kinds of stored rows: episodes the server no longer returns, and episodes newer publishes pushed
past the window. Only the first kind is "left the feed". A finished download pushed past the
window stays in Downloads (the download row is already independent of `channel_item`) and does
not stay on the episode list. The window ceiling still applies to server rows.

Add this pure helper beside `reconcileChannelItems`. Do not change `reconcileChannelItems`.

```ts
export const selectKeptDownloadItemIds = (params: {
  alreadyKeptIds: ReadonlySet<string>;
  completeDownloadIds: ReadonlySet<string>;
  isFeedExhausted: boolean;
  keep: readonly { itemIdText: string; pubDateMs: number | null }[];
  stored: readonly { itemIdText: string; pubDateMs: number | null }[];
}): string[]
```

Return the stored ids that are **not** in `keep` and must remain in `channel_item`. For each
stored id missing from `keep`:

1. The id is not in `completeDownloadIds` → omit it. Only `status === 'complete'` counts. A
   queued, downloading, paused, or failed row does not pin the episode.
2. The id is in `alreadyKeptIds` and in `completeDownloadIds` → return it. A row already kept
   stays across later walks until the file is gone or the server lists the episode again. This is
   what makes a carryover row (below) survive the next sync even when its publish date is older
   than the window.
3. Otherwise the episode left the feed when either:
   - `isFeedExhausted` is true (the walk saw the end of the feed), or
   - `pubDateMs` is non-null, the oldest non-null `pubDateMs` among `keep` is non-null, and this
     row's `pubDateMs` is **strictly newer** than that oldest keep date (it belonged inside this
     window and the server did not return it).
   A tie with the oldest keep date is not proof. A null publish date is proof only when the feed
   is exhausted. When `keep` is empty and the feed is not exhausted, return nothing from rule 3.
4. Otherwise omit it (pushed past the window, or not proven).

#### `commitChannelWindow`

In `apps/mobile/src/data/repositories/channelItemsRepository.ts` (large file: find
`commitChannelWindow`, `syncChannel`, `extendWindow`, and `updateStoredItem`; do not read the
file whole).

`syncChannel` and `extendWindow` already know `isFeedExhausted` from `fetchChannelItemWindow`.
Pass that boolean into `commitChannelWindow`. Both call sites pass it. A partial walk still never
reaches `commitChannelWindow`.

After `reconcileChannelItems` and **before** the delete of `removeIdTexts`:

1. When `removeIdTexts` is empty, skip the keep query.
2. Otherwise select `itemIdText`, `pubDateMs`, and `keptForDownload` for this channel's stored
   rows (the select today loads only `itemIdText`; widen it).
3. Load complete download ids for those remove ids only:
   `schema.download.itemIdText` where `status = 'complete'` and `itemIdText` is in the remove
   ids. Chunk with the file's existing `chunked` / `inArray` helper (`DELETE_CHUNK_SIZE`) so a
   long id list stays under SQLite's bind limit. Match on item id, not `channelIdText`. A
   download that is not stamped with the channel yet still protects its episode.
   `attachChannelToDownloads` stays where it is, after the write.
4. `alreadyKeptIds` is the stored rows whose `keptForDownload === 1`.
5. `selectKeptDownloadItemIds(...)`.

Then:

- Delete `removeIdTexts` that are **not** in the helper's return. Retained ids are not deleted.
- For each retained id, `UPDATE channel_item SET kept_for_download = 1` (chunked). Do not replace
  `payload_json`. The last server payload is what the episode screen and the list still show.
- The existing insert of `keep` sets `keptForDownload: 0` on the insert values and in the
  `onConflictDoUpdate` `set` (add `kept_for_download` to that `set`, as `0`, next to the other
  excluded columns). A server row that comes back clears the flag. The download row stays on the
  same `item_id_text`. There is no id rewrite.

`listByChannel`, `listSubscribed`, album tracks, artist tracks, and the car library projection
read `channel_item` with no flag filter. A kept row shows on those lists in the same sort as any
other stored row, until the file is deleted. Do not add a screen-specific filter. Do not count
kept rows toward window depth: `commitChannelWindow` still returns `keep.length`, and `hasMore`
still comes from `isFeedExhausted`.

Wrap steps 1–5 and the flag update in `try … catch`. On failure log
`console.warn('[channel-items] keep downloaded episodes failed', classifySyncError(error).code)`
(import `classifySyncError` from `../../sync/syncErrorClassification`, the same helper
`addByRssRepository.ts` uses). Do not log a channel id or an item id. On failure, do **not**
delete a remove id that has a complete download; delete the other remove ids as today. The next
finished walk classifies again. A thrown keep must not fail the window commit.

`updateStoredItem`: when it writes a payload, also set `keptForDownload: 0`. A server detail
response means the server lists the episode again. The download row stays.

`removeChannel` and `retainChannels` stay as they are. Unsubscribing still drops that show's
`channel_item` rows, including kept ones, and still does not delete download files. `retainChannels`
still keeps a channel that has a finished download.

#### Entry point for a file whose episode was never in the window

```ts
keepDownloadedItem: async (params: {
  channelIdText: string;
  item: DTOItem;
}): Promise<'kept' | 'server_listed' | 'skipped'>
```

On `channelItemsRepository`:

- Trim `item.id_text`. Empty → `'skipped'` and write nothing.
- Build the row with `toChannelItemRecord(channelIdText, item)`. Null → `'skipped'`.
- When a `channel_item` row for that id already has `keptForDownload === 0`, return
  `'server_listed'` and do not write. The server copy wins. The caller attaches the download to
  that same item id.
- Otherwise upsert the row with `keptForDownload: 1` and the scalars from `toChannelItemRecord`
  (`onConflictDoUpdate` updates title, image, pub date, payload, `updatedAt`, and sets
  `kept_for_download = 1`). Return `'kept'`.
- Do not insert `subscribed_channel`. Do not create an Add by RSS feed. Do not write a download
  row or a playable item. The caller writes those. Either order is safe: a kept row with no
  complete download is deleted by the next finished window walk (rule 1 above).

Later plans call this. This plan does not call it from the v4 pass.

### Play is the local file only

A kept row plays the finished file. It does not fall back to the remote enclosure. A server row
keeps today's rule: local file when the download is complete, otherwise the remote enclosure,
and no remote while Offline Mode is on.

Add to `apps/mobile/src/lib/playback/resolvePlaybackUrl.ts`:

```ts
export const playbackUrlForEpisode = (params: {
  localFileOnly: boolean;
  localUrl: string | null;
  offlineMode: boolean;
  remoteUrl: string | null;
}): string | null => {
  if (params.localUrl !== null) {
    return params.localUrl;
  }
  if (params.localFileOnly || params.offlineMode) {
    return null;
  }
  return params.remoteUrl;
};
```

`downloadsRepository.isLocalFileOnlyPlayback(itemIdText)` returns true when either:

- `channel_item.kept_for_download = 1` for that id, or
- an `add_by_rss_local_episode` row exists whose `download_id_text` is that id (plan 30's table;
  read `schema.addByRssLocalEpisode` directly, the same way plan 30's `remove` does, so
  `downloadsRepository` does not import the local-episode repository).

`resolvePlaybackUrl` (directory, album, artist, episode detail, Home — every caller already goes
through this function):

1. `const localFileOnly = await downloadsRepository.isLocalFileOnlyPlayback(item.id_text)`.
2. `const localUrl = await resolveLocalDownloadPlaybackUrl(item.id_text)`.
3. When `localUrl` is null and `localFileOnly` is true, `await downloadsRepository.remove(item.id_text)`
   and use remote `null`. The file is already gone (`resolveLocalDownloadPlaybackUrl` has marked
   the row failed). `remove` deletes that failed row and the local content row, so the episode
   screen does not offer a re-download of an episode the server does not list.
4. Otherwise `playbackUrlForEpisode({ localFileOnly, localUrl, offlineMode: isOfflineModeEnabled(), remoteUrl })`
   with `remoteUrl` from the existing enclosure resolution (skipped when step 3 already decided
   null).

`startAddByRssPlayback` in `apps/mobile/src/playback/PlaybackProvider.tsx` (large file: find the
symbol `startAddByRssPlayback`; do not read the file whole) is the other play path. Replace the
inline `localUrl ?? remote` choice with the same three steps, using
`options.localDownloadItemIdText` (when it is undefined, `localFileOnly` is false and `localUrl`
is null) and `resolveAddByRssPlaybackUrl(resourceData)` as `remoteUrl`. Do not edit the other
play functions in that file. They call `startAddByRssPlayback` or `resolvePlaybackUrl`.

`downloadManager.markFileMissing` stays the "mark failed so a server episode can be downloaded
again" path. The kept-row removal is the `remove` in step 3, not a change to `markFileMissing`.

### Delete removes the local row

`downloadsRepository.remove(itemIdText)`, after the existing download-row delete (and after plan
30's delete of `add_by_rss_local_episode`):

- Delete `channel_item` where `item_id_text` matches **and** `kept_for_download = 1`.
- Do not delete a server row (`kept_for_download = 0`). That episode stays because the server
  still lists it. Play then uses the remote enclosure, which is the existing path.

`downloadsRepository.clear()` deletes every `channel_item` with `kept_for_download = 1`, and
still deletes every local-episode row (plan 30). It does not delete server `channel_item` rows.

Listener delete, quota auto-delete, and "delete all" already call `remove` or `clear`. They pick
up this rule. Do not add a second delete on the episode screen. Dismissing a row from the
Downloads monitor (`dismissedFromList`) is not a delete; the kept row stays.

After the delete, a directory list is the server `channel_item` rows, and an Add by RSS list is
the stored bundle. That is "whatever the server still lists."

## Files

apps/mobile/src/lib/addByRss/localEpisode.ts
apps/mobile/src/lib/addByRss/localEpisode.test.ts
apps/mobile/src/data/repositories/addByRssRepository.ts
apps/mobile/src/screens/home/addByRss/AddByRssDownloadedSection.tsx
apps/mobile/src/data/db/schema.ts
apps/mobile/src/data/db/migrations.ts
apps/mobile/src/data/db/migrations.test.ts
apps/mobile/src/data/repositories/channelItemWindow.ts
apps/mobile/src/data/repositories/channelItemWindow.test.ts
apps/mobile/src/data/repositories/channelItemsRepository.ts
apps/mobile/src/data/repositories/downloadsRepository.ts
apps/mobile/src/lib/playback/resolvePlaybackUrl.ts
apps/mobile/src/lib/playback/resolvePlaybackUrl.test.ts
apps/mobile/src/playback/PlaybackProvider.tsx

## Tests

`apps/mobile/src/lib/addByRss/localEpisode.test.ts`, new `describe('planKeptLocalEpisodes')`:

- an episode with a complete download that `next` drops is kept, with the previous bundle;
- an episode `next` still lists is not kept;
- an episode with no complete download is not kept;
- an episode already a local episode is not kept again;
- an episode with neither guid nor `guid_enclosure_url` is not kept.

`apps/mobile/src/data/repositories/channelItemWindow.test.ts`, new
`describe('selectKeptDownloadItemIds')`:

- feed exhausted, complete download, missing from `keep` → kept;
- feed exhausted, no complete download → not kept;
- feed not exhausted, publish date strictly newer than the oldest keep date, complete download,
  missing from `keep` → kept;
- feed not exhausted, publish date older than the oldest keep date, complete download → not kept
  (pushed past the window);
- feed not exhausted, publish date equal to the oldest keep date → not kept;
- feed not exhausted, null publish date, complete download → not kept;
- feed exhausted, null publish date, complete download → kept;
- an id that is in `keep` is not returned;
- an id already kept, with a complete download, missing from `keep`, feed not exhausted, older
  than the window → still returned;
- an id already kept, without a complete download → not returned;
- `keep` empty and feed not exhausted → nothing from the left-the-feed rule.

`apps/mobile/src/lib/playback/resolvePlaybackUrl.test.ts`:

- `playbackUrlForEpisode` returns the local URL when it is set, for both `localFileOnly` true and
  false;
- `localFileOnly` true and no local URL returns null even when a remote URL is set and offline
  mode is off;
- `localFileOnly` false and no local URL returns the remote URL;
- offline mode and no local URL returns null.
- The file's existing `resolvePlaybackUrl` cases mock `downloadsRepository.isLocalFileOnlyPlayback`
  to resolve `false`, so they keep today's remote fallback. Add one case: the mock resolves
  `true`, the local file is missing, `remove` is called with the item id, and the remote
  enclosure helper is not called.

`apps/mobile/src/data/db/migrations.test.ts`: the new version is the latest, and its statement
adds `kept_for_download`.

No Maestro flow in this plan. Listing and play of a carried file are area E's flow. The keep
rules are pure and belong in the tests above.

## Release scratchpad

## Downloaded episodes stay on their show

- Surfaces: mobile
- Change: when a refresh no longer lists an episode this phone has finished downloading, the
  episode stays on that show's episode list and in Downloads and plays from the local file. This
  applies to directory subscriptions and to Add by RSS feeds, including downloads made in v5. A
  directory show stays a directory subscription. Deleting the file removes that local episode.
  The list then shows what the server still returns. New SQLite column
  `channel_item.kept_for_download` (forward migration).
- Who notices: listeners whose shows drop episodes they have downloaded, including people updating
  from v4
- Operator steps: none
