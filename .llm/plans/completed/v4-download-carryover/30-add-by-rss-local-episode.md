**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 30 — Add by RSS local episode backed by a downloaded file

## Rows

R21, R22, R5, R24

R22 here is the Add by RSS half: a host that is down, or an episode that left the feed, never
removes the file or its listing while that feed remains. R24 is the exception: removing the feed
deletes its downloaded files, including an episode the feed no longer lists. R5 here is the Add by
RSS half: a carried file adopted onto an Add by RSS feed is listed on that feed and in My Library →
Downloads, and the listener can delete it. The deletion rule for files that cannot migrate is area
D's.

## Runs after

none

## Goal

A **local episode** is an episode on an Add by RSS feed that exists only on this phone, backed by a
complete download. It has no item in the feed's stored bundle (`add_by_rss_feed.mapped_feed_json`).
It:

- lists on that feed's Episodes and Downloaded sections, and on Home's Add by RSS episode rows,
  like any parsed episode;
- plays from the file (offline, host down, or never parsed);
- is deleted with the episode row's existing download control, Library → Downloads, or Settings
  "delete all downloads", and then leaves every list;
- is deleted, with every other download of that feed, when the feed is removed (R24), including
  when this episode is the one the feed no longer lists;
- survives every bundle write while the feed remains: a refresh that no longer lists it, a failed
  refresh, a 304, and a first parse of a feed that was a stub;
- becomes an ordinary feed episode when a later bundle lists the same episode (absorb).

Area D creates local episodes through one entry point, `addByRssRepository.adoptDownloadedEpisode`,
which also handles the case where the stored bundle already lists the episode.

A local episode is **device data**, like downloads and Add by RSS feeds: kept through sign-in and
sign-out, deleted when its feed is removed, and removed by the custom-API switch (which clears
every SQLite table). Adding the same feed URL again does not restore the file.

## Design

### Store

New SQLite table `add_by_rss_local_episode`, one row per local episode:

| column | type | meaning |
| --- | --- | --- |
| `download_id_text` | TEXT PRIMARY KEY NOT NULL | the download row id, `addByRssDownloadItemIdText(feedUrl, item.item, index)` of the stored item bundle |
| `feed_url` | TEXT NOT NULL | the `add_by_rss_feed.feed_url` the episode belongs to, as stored on that row |
| `item_bundle_json` | TEXT NOT NULL | one `AddByRSSMappedFeed['items'][number]` (compat item bundle) as JSON |
| `created_at` | INTEGER NOT NULL | ms |

Index `idx_add_by_rss_local_episode_feed_url` on `feed_url`.

- Migration: append the next version to `MIGRATIONS` in `apps/mobile/src/data/db/migrations.ts`
  (version 5 when no other plan in this set has added one; area B's plan 2N may add a version
  too, and the later of the two takes the next number). Forward-only, `CREATE TABLE IF NOT
  EXISTS` like version 4.
- Drizzle: `addByRssLocalEpisode` at the end of `apps/mobile/src/data/db/schema.ts`, with
  `AddByRssLocalEpisodeRow` / `AddByRssLocalEpisodeInsert` types, following `v4CarryoverEntry`.
- The item bundle is a persisted DTO (**dto-changes-are-device-data-migrations**). Never store
  credentials in it; the media URL is the enclosure URL only.

The row id is the download id, so a local episode and its download row share one key. The id is
`${feedUrl}::${guid ?? guid_enclosure_url}`; a local item always has a `guid_enclosure_url`, so the
index never enters the id and the merged position of the item does not matter.

### Pure helpers — `apps/mobile/src/lib/addByRss/localEpisode.ts` (new)

Pure, no Expo imports, unit-tested:

- `AddByRssCarriedEpisode` input type: `{ description: string | null; durationSeconds: number |
  null; guid: string | null; imageUrl: string | null; mediaUrl: string; mimeType: string | null;
  pubDate: string | null; title: string | null }`. `description` may be HTML; `pubDate` is an ISO
  string or null.
- `buildAddByRssLocalItemBundle(episode)`: a complete compat item bundle
  (`packages/parser-mapping/src/compat/partytime/compatFull.ts`). `item.guid` is the guid sliced
  the way `compatItemDto` does (`packages/parser-mapping/src/compat/partytime/item.ts`) or null;
  `item.guid_enclosure_url` is `formatGuidEnclosureUrl(mediaUrl)` (`@podverse/helpers`); one
  enclosure with one source `{ uri: mediaUrl, content_type: mimeType }` and `item_enclosure.type =
  mimeType`; `about.duration` is the seconds as a string or null; one image when `imageUrl` is set;
  `description` prepared the same way the compat item builder prepares it; every list empty and
  every optional block null. No `as` assertions: build the literal against the type.
- `buildAddByRssLocalOnlyMappedFeed(feed: MobileAddByRSSFeedRecord)`: an `AddByRSSMappedFeed` with
  no items, no live items, and a channel whose title and image come from the feed record. Used
  when a feed has local episodes but no stored bundle (a stub whose host was down).
- `mergeAddByRssLocalEpisodes(params: { feed; stored: AddByRSSMappedFeed | null; localItems:
  item bundles })`: returns `null` when `stored` is null and `localItems` is empty; otherwise the
  stored bundle (or the local-only bundle) with each local item appended after the stored items,
  skipping a local item whose download id equals a stored item's download id (that stored row
  already shows the download). Never mutates its input.
- `findParsedItemForLocalEpisode(items, localItem)`: the index of the stored item that is the same
  episode, or null. Guid first (both non-null and equal), then `guid_enclosure_url` equality.
  Same precedence as `addByRssPromotionRemap.ts` and directory matching.
- `planAddByRssDownloadAdoption(params: { feedUrl; stored: AddByRSSMappedFeed | null; episode;
  existingDownloadIds: ReadonlySet<string> })`: returns `{ kind: 'feed_episode'; downloadIdText;
  itemBundle; itemIndex }`, `{ kind: 'local_episode'; downloadIdText; itemBundle }`, or `{ kind:
  'already_downloaded'; downloadIdText }`. A stored item found by
  `findParsedItemForLocalEpisode` wins over a local episode.
- `planLocalEpisodeAbsorb(params: { feedUrl; items: stored items; local: { downloadIdText;
  itemBundle }[]; existingDownloadIds })`: for each local episode that a stored item now lists,
  one of `{ kind: 'drop_local_row'; downloadIdText }` (same download id), `{ kind:
  'move_download'; fromDownloadIdText; toDownloadIdText; itemBundle; itemIndex }` (different id,
  no row at the target), or `{ kind: 'drop_duplicate'; downloadIdText }` (a download already
  exists at the target). Unlisted local episodes are untouched.

### Repository — `apps/mobile/src/data/repositories/addByRssLocalEpisodeRepository.ts` (new)

Thin SQLite access, following the repository style (`initializeDatabase`, `getDb`, `safeJsonParse`):
`listByFeedUrl(feedUrl)` → `{ downloadIdText; itemBundle }[]` (rows with unreadable JSON are
skipped), `upsert({ downloadIdText; feedUrl; itemBundle })`, `remove(downloadIdText)`.

### Reads — `addByRssRepository.ts`

- `getMappedFeedDetailByUrl(feedUrl): Promise<{ hasParsedBundle: boolean; mappedFeed:
  AddByRSSMappedFeed | null }>`: stored bundle plus local episodes that **have a download row**
  (any status; join on `download.item_id_text`), merged with `mergeAddByRssLocalEpisodes`. The
  feed record for the local-only bundle is the row read by URL.
- `getMappedFeedByUrl` returns `(await getMappedFeedDetailByUrl(feedUrl)).mappedFeed`. Every
  current caller (feed screen, Home rows, item and track detail, artist albums, Full Player, now
  playing sections, `localResourceData`, auto-download evaluation, promotion refs) then sees local
  episodes with no further change. Update its doc comment: stored bundle plus this phone's local
  episodes.
- Auto-download evaluation sees local episodes as items; `downloadManager.enqueue` already no-ops
  on a complete row, so nothing re-downloads. Confirm, do not change.
- Car: the downloads index already lists every complete download; Add by RSS feeds have no
  per-feed car library rows (`reprojectLibraryChildrenAll` skips them). No native change.

### Entry point — `addByRssRepository.adoptDownloadedEpisode`

```ts
adoptDownloadedEpisode(input: {
  episode: AddByRssCarriedEpisode;
  feedUrl: string;
  /** File name already inside documentDirectory/downloads/; stored on the row as is. */
  fileName: string;
  fileSizeBytes: number | null;
}): Promise<
  | { kind: 'feed_episode'; downloadIdText: string }
  | { kind: 'local_episode'; downloadIdText: string }
  | { kind: 'already_downloaded'; downloadIdText: string }
  | { kind: 'no_feed' }
>
```

1. Find the feed row by URL, then by `canonicalAddByRSSFeedUrl` when the exact URL has no row.
   Ignore session visibility (a signed-out-owned feed counts while signed in). No row →
   `no_feed`. Every id below uses the row's stored `feed_url`.
2. Read the **stored** bundle only (not the merge) and the existing download ids for the feed;
   run `planAddByRssDownloadAdoption`.
3. `already_downloaded` → return it; write nothing. The caller deletes the carried file.
4. `local_episode` → upsert the local-episode row **first**, so a crash between the two writes
   leaves a hidden local row (re-adopted on retry) rather than a download with no listing.
5. Write a `complete` download row with `downloadsRepository.upsert`: `itemIdText` =
   `downloadIdText`; `channelIdText` = feed URL; `channelTitle` = feed title, else bundle channel
   title, else feed URL; `filePath` = `fileName`; `byteSize` and `bytesDownloaded` =
   `fileSizeBytes` (0 when null); `enclosureUri` = media URL; `enclosureUrlHash` =
   `hashEnclosureUri`; `enclosureMime`, `fileExtension`, `mediaType` from `isItemDownloadable` on
   `addByRssDownloadItem(feedUrl, itemBundle, itemIndex)` (for a local episode, its index in the
   merged list is irrelevant to the id; pass the stored item count), falling back to the file
   name's extension and `video/` prefix → `video`, else `audio`; `title` and `artworkUrl` from the
   bundle; `dismissedFromList: false`.
6. `playableItemRepository.put('download', addByRssDownloadItem(...))`, the same playable row
   `downloadManager.enqueue` writes.
7. `homeFeedRefresh.notify()`.

The entry point does not touch `downloadStore`; the caller hydrates it once after a batch
(`downloadStore.hydrate(await downloadsRepository.list())`, as `addByRssPromotion.promoteLocally`
does). It never renames or deletes files.

### Absorb on every bundle write — `upsertFeed`

After the bundle write in `upsertFeed` (the `mappedFeed !== undefined` branch, non-null bundle),
list the feed's local episodes; when there are any, run `planLocalEpisodeAbsorb` against the new
items and apply it:

- `drop_local_row` → remove the local row.
- `move_download` → in one transaction insert a copy of the download row under the new id and
  delete the old row (the pattern in `persistDownloads`, `addByRssPromotion.ts`), remove the local
  row; then `playableItemRepository.remove('download', from)` and `put('download', …)` for the new
  id, and `downloadStore.hydrate(await downloadsRepository.list())`.
- `drop_duplicate` → delete the local episode's file (`downloadsRepository.deleteStoredFile`),
  `downloadsRepository.remove(from)`, remove the local row.

Wrap it so an absorb failure is logged in the file's existing style (`console.warn('[add-by-rss]
… failed', classifySyncError(error).code)`, no feed URL) and never fails the bundle write. A failed absorb leaves a duplicate row, never a hidden file; the next
bundle write retries. Playback position stored under the local episode's hash is not moved (the
carryover writes none).

### Delete

Two actions. One file, or the whole feed.

**One file, feed still there.** `downloadsRepository.remove(itemIdText)` also deletes the
`add_by_rss_local_episode` row with that id (use `schema.addByRssLocalEpisode` directly; no import
of the new repository, to keep `downloadsRepository` free of a cycle) and calls
`homeFeedRefresh.notify()` when it deleted one. `downloadsRepository.clear()` deletes every
local-episode row and notifies. The episode row's download control, Library → Downloads, and
Settings "delete all downloads" already call these.

**The feed is removed (R24).** Delete every download that belongs to that feed, then remove the
feed. That set includes an episode the feed no longer lists. Do not walk the stored bundle to
decide: a local episode is not in the bundle, and its download row uses the stored feed URL as
`channelIdText`, the same as an episode the bundle still lists. Every status goes (complete,
downloading, queued, paused, failed). An in-flight transfer is cancelled so it cannot finish into
a file with no feed. The file delete is best-effort, the same as `eraseDownload`; a failed file
delete still drops the row and still removes the feed.

`downloadManager` imports the repository barrel, so do not import it at the top of
`addByRssRepository.ts`. Load it with `await import('../../downloads/downloadManager')`.

`deleteDownloadsForFeed(storedFeedUrl)`:

1. `downloadManager.removeAllForChannel(storedFeedUrl)`.
2. Delete any `add_by_rss_local_episode` row with that `feed_url` that step 1 did not remove
   (`schema.addByRssLocalEpisode` directly). Call `homeFeedRefresh.notify()` when this step
   deletes a row. Step 1 already notifies for each row it removes.

`removeFeedAndDownloads(feedUrl)`:

1. Resolve the feed row the way `adoptDownloadedEpisode` does (exact URL, then
   `canonicalAddByRSSFeedUrl`). The id used below is that row's stored `feed_url`, or the passed
   URL when no row exists.
2. `deleteDownloadsForFeed` for that id.
3. `removeFeed` for the URL the caller passed, so listings, credentials, and album prune stay as
   they are today.

Call `removeFeedAndDownloads` from:

- `unfollowFeed`, only in the branch that today calls `removeFeed` (nothing on the device still
  lists the feed). The `'listed'` branch (`setFollowed(false)`) does not delete downloads. The
  feed row stays, so an episode that has left the feed stays playable.
- `AddByRssCredentialsScreen` `handleRemove`, in place of `removeFeed`.
- `carrySignedOutFeedsIntoNewAccount` in `addByRssLoginSettle.ts`, the loop over `remove`, in
  place of `removeFeed`. Those feeds did not fit the new account's cap.

`pruneListedOnlyFeeds` calls `deleteDownloadsForFeed(feedUrl)` and then `deleteStoredFeed(feedUrl)`
for each album it removes. `removeFeedAndDownloads` on an artist does not see those album URLs;
the prune does. Do not call `removeFeedAndDownloads` from the prune (it would call `removeFeed`
again).

`removeFeed` and `deleteStoredFeed` do not delete downloads. `addByRssPromotion.promoteLocally`
keeps calling `removeFeed` after it has rewritten matched downloads onto the directory channel. A
file that promotion keeps is not deleted here.

**While the feed remains (R21, R22).** An episode that leaves the feed stays on that feed,
playable from the local file, until the listener deletes that file. Do not delete it from
`upsertFeed`, a failed refresh, a 304, or absorb. Absorb still leaves an unlisted local episode
untouched. This is every download on that feed, not only a carried file. Directory unsubscribe is
not this function: `subscriptionsRepository.unsubscribeLocal` keeps its downloads, and this plan
does not change it. Web has no downloaded media files, so this delete is mobile-only. That
difference is intentional.

Do not change the credentials confirm copy. It already says the username and password are deleted.
No new string.

### Screens

- `AddByRssHomeDetailScreen.tsx`: `loadDetail` reads `getMappedFeedDetailByUrl`; subscribe to
  `homeFeedRefresh` and call `reloadDetailSilently`, so a deleted local episode leaves the list and
  an adopted one appears.
- `addByRssHomeDetailData.ts`: `AddByRssHomeDetailData` gains `hasParsedBundle: boolean`;
  `buildAddByRssHomeDetailData(feed, mappedFeed, options?: { hasParsedBundle?: boolean })`
  defaults it to `mappedFeed !== null`, so the other callers stay as they are.
- `AddByRssSettingsPane.tsx` (`lastFinishedParseTime`) and `AddByRssEpisodesSection.tsx`
  (`emptyMessageKey`'s `status_processing` branch) use `detail.hasParsedBundle` instead of
  `detail.mappedFeed !== null`, so a stub with only local episodes does not claim a parse.
- `AddByRssDownloadedSection.tsx`: rewrite the doc comment. While the feed remains, a download
  whose episode left the feed is listed as a local episode. Removing the feed deletes that file.
  Behavior of the section is otherwise unchanged.

Reuse and parity: rows, playback, and delete reuse the parsed-episode path end to end
(`buildAddByRssHomeDetailData`, `addByRssDownloadItem`, `buildAddByRssFeedWalk` /
`resolveLocalDownloadPlaybackUrl`, `downloadManager.remove`). The directory parity source,
`PodcastDownloadedSection`, lists downloads with no `channel_item` but cannot play them; this plan
does better for Add by RSS because the local item bundle is a real playable item.

### Guidance

`.cursor/rules/add-by-rss-data-contracts.mdc`: under step 2 or 4, add that
`add_by_rss_local_episode` holds device-only item bundles backed by a download, that
`getMappedFeedByUrl` appends them, that removing the feed deletes those rows and their files, and
that they have no server counterpart, so the server conversion is unchanged for this table.

`apps/mobile/src/downloads/README.md`: one short paragraph on local episodes (what they are, the
entry point, absorb, delete of one file, and delete of every file for the feed when the feed is
removed). The doc comments this plan adds state the rule as it stands. Do not cite a plan number
or a review label in them.

## Files

apps/mobile/src/data/db/schema.ts
apps/mobile/src/data/db/migrations.ts
apps/mobile/src/data/db/migrations.test.ts
apps/mobile/src/data/customApiLocalClearPlan.test.ts
apps/mobile/src/lib/addByRss/localEpisode.ts
apps/mobile/src/lib/addByRss/localEpisode.test.ts
apps/mobile/src/data/repositories/addByRssLocalEpisodeRepository.ts
apps/mobile/src/data/repositories/addByRssRepository.ts
apps/mobile/src/data/repositories/addByRssLoginSettle.ts
apps/mobile/src/data/repositories/downloadsRepository.ts
apps/mobile/src/screens/rss/AddByRssCredentialsScreen.tsx
apps/mobile/src/screens/home/AddByRssHomeDetailScreen.tsx
apps/mobile/src/screens/home/addByRssHomeDetailData.ts
apps/mobile/src/screens/home/addByRssHomeDetailData.test.ts
apps/mobile/src/screens/home/addByRss/AddByRssSettingsPane.tsx
apps/mobile/src/screens/home/addByRss/AddByRssEpisodesSection.tsx
apps/mobile/src/screens/home/addByRss/AddByRssDownloadedSection.tsx
apps/mobile/src/downloads/README.md
.cursor/rules/add-by-rss-data-contracts.mdc

`addByRssRepository.ts` is large: work by symbol (`getMappedFeedByUrl`, `upsertFeed`,
`getFeedByUrl`, `unfollowFeed`, `removeFeed`, `pruneListedOnlyFeeds`, `deleteStoredFeed`), not by
reading it whole. `homeFeedRefresh` is `../../lib/home/homeFeedRefresh`.

## Tests

- `apps/mobile/src/lib/addByRss/localEpisode.test.ts` (new, vitest node):
  - the local bundle's download id equals `addByRssDownloadItemIdText` for the guid and the
    no-guid case, and its playback media id (`addByRssPlaybackMediaId` over
    `toAddByRssItemPlaybackResourceData`) does not change with its position in the merge;
  - `addByRssDownloadItem` on the local bundle passes `isItemDownloadable` for an `audio/mpeg`
    and a `video/mp4` episode;
  - merge: null with nothing; local-only bundle for a stub; appended after stored items; skipped
    when a stored item has the same download id;
  - `findParsedItemForLocalEpisode`: guid wins over enclosure; enclosure matches after
    `formatGuidEnclosureUrl` normalization; no match → null;
  - adoption plan: feed episode, local episode, already downloaded;
  - absorb plan: drop row, move download, drop duplicate, untouched when unlisted. The untouched
    case is the lock that a refresh does not delete an episode that left the feed. Do not add a
    case that drops it.
- No repository harness and no Maestro flow in this plan. Which removal deletes files is which
  function runs (`removeFeedAndDownloads` and the prune helper, not `removeFeed`). Area E still
  proves adopt, list, play, and delete of one file while the feed stays.
- `apps/mobile/src/screens/home/addByRssHomeDetailData.test.ts`: a local-only bundle gives one
  episode row whose `downloadItemIdText` is the local download id and `hasParsedBundle` false
  when passed.
- `apps/mobile/src/data/db/migrations.test.ts`: the new version and `LATEST` bump.
- `apps/mobile/src/data/customApiLocalClearPlan.test.ts`: append `add_by_rss_local_episode` to
  `SCHEMA_TABLE_NAMES` in schema order.
- Device proof (adopt, list, play offline, delete) is area E's Maestro flow.

## Release scratchpad

## Add by RSS local episodes on mobile

- Surfaces: mobile
- Change: an Add by RSS feed can hold episodes that exist only on this phone, backed by a
  downloaded file (used by the v4 download carryover). They list on the feed's Episodes and
  Downloaded sections and on Home, play from the file offline or when the host is down, and are
  deleted with the normal download controls. While the feed remains, an episode that leaves the
  feed stays playable until the listener deletes that file. Removing the feed deletes its
  downloaded files, including those episodes. A later refresh that lists the same episode turns it
  into a normal feed episode. New SQLite table `add_by_rss_local_episode` (forward migration).
- Who notices: listeners updating from v4 whose downloaded episodes are no longer in the feed, or
  whose feed host is down, and listeners who remove an Add by RSS feed that still has downloads
- Operator steps: none
