**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 31 — Local episodes through Add by RSS promotion

## Rows

R23, R21, R5

R23, this plan's slice: when a feed is promoted, a download the directory match does not name stays on that directory show's episode list and in Downloads until the listener deletes the file. The show is a directory subscription. Plan 32 owns the later refresh of the same row.

R21: a local episode keeps playing when its feed matches a directory channel. It plays from that show, not from an Add by RSS feed held back for it.

R5 (Add by RSS half): promotion does not leave a carried file off the show. The listener can play it and delete it from the episode list.

## Runs after

30, 32

## Goal

Promotion (`addByRssPromotion.promoteLocally`) moves an Add by RSS feed onto a directory channel and removes the feed. It always runs. Nothing in this plan delays it because a local episode is unmatched.

Plan 30's local episodes are already in the match inputs: `localRefsForFeedUrl` reads `getMappedFeedByUrl`, which appends local episodes, and every local episode has a download, so `localItemRefsForFeed` includes it. A local episode the directory match names moves like any downloaded episode (download row, playable row, playback). Its `add_by_rss_local_episode` row is dropped.

A local episode the match does not name stays playable on the directory show. `channelItemsRepository.keepDownloadedItem` (plan 32) writes the episode row. The download id does not change, so the playable row already stored for that download is the one the show plays. Deleting the file removes that episode. Plan 32's `downloadsRepository.remove` does that; this plan does not add a second delete.

The account paths run the same function, so they get the same episode row. `promoteFollowedDirectoryChannel` (callers: `AddByRssHomeDetailScreen.tsx` and `addByRssLoginSettle.ts`) and the `not_followed` branch of `convertAccountFeed` both call `promoteLocally`. Do not edit those callers, `syncJobs.ts`, or `addByRssSignedInRefresh.ts`.

`promoteFollowedDirectoryChannel` still returns null when the match does not return that channel. A missing map must not remove the feed. That return is unchanged.

Web has no download library. This plan does not change web, the API, or a native car module.

## Design

### Snapshot and remap — `apps/mobile/src/data/addByRssPromotionRemap.ts`

`AddByRssPromotionSnapshot` gains `localEpisodes: { downloadIdText: string; feedUrl: string }[]` (only ids; the bundle JSON is not copied into the snapshot).

`addByRssPromotionRemap` drops every local-episode entry for the promoted feed (compare with `comparableFeedUrl`) whose `downloadIdText` is in `move.items`. Entries the move does not name stay. This satisfies **add-by-rss-data-contracts** (a table that stores an Add by RSS download id belongs in this remap). The server conversion has no counterpart table, so it is unchanged.

The remap does not invent episode rows. `promoteLocally` appends unmatched local episodes onto `move.items` before calling it. An id that is not in the move still keeps its download on the old channel. The existing test that expects that stays as it is, aside from `localEpisodes: []` on `emptySnapshot()`.

New pure helper in this file:

```ts
export const promotionMovesForUnmatchedLocalEpisodes = (
  localEpisodes: readonly { downloadIdText: string; hashId: string }[],
  matchedDownloadIds: ReadonlySet<string>
): AddByRssPromotionMove['items'] =>
```

Return one item per local episode whose `downloadIdText` is non-empty and not in `matchedDownloadIds`. Each item is `{ downloadIdText, hashId, itemIdText: downloadIdText }`. The item id is the download id on purpose. `nextDownloads` then sets `channelIdText` to the directory channel and, because the item id did not change, does not put the row in `movedDownloadItemIds`. `refreshMovedPlayables` fetches `reqItemGetByIdOrIdText` and deletes the playable when that fetch throws. These rows must not go through it. Do not add a filter inside `refreshMovedPlayables`, and do not mint a new item id.

### Load and persist — `apps/mobile/src/data/repositories/addByRssPromotion.ts`

Work by symbol: `loadSnapshot`, `moveForMatch`, `promoteLocally`, `refreshMovedPlayables`. Do not read the file straight through.

- `loadSnapshot(feedUrl)` reads that feed's local-episode rows (`schema.addByRssLocalEpisode`, canonical feed URL comparison as the other tables use) and stores only `downloadIdText` and `feedUrl`.
- `promoteLocally` adds `persistLocalEpisodes(transaction, before, after)` next to the other `persist*` calls, deleting rows absent from `after`.

`removeFeed` still runs after the rewrite. It does not delete downloads. Do not switch it to `removeFeedAndDownloads`.

### Keep an unmatched download on the directory show

Inside `promoteLocally`, after `moveForMatch` and before `addByRssPromotionRemap`:

1. Read this feed's local episodes with `addByRssLocalEpisodeRepository.listByFeedUrl`. No rows means there is nothing to keep; continue the promotion as it works today.
2. Build hashes with `localItemRefsForFeed(record, mappedFeed, referencedKeys)` and **without** the `ADD_BY_RSS_DIRECTORY_MATCH_MAX_ITEMS` slice `localRefsForFeedUrl` applies. `getMappedFeedByUrl` already includes local episodes. `hashId` for a row is the ref with the same `downloadIdText`, or the download id when the ref is missing.
3. `const matched = new Set(move.items.map((item) => item.downloadIdText))`.
4. `const unmatched = promotionMovesForUnmatchedLocalEpisodes(...)`.
5. For each unmatched item, build the `DTOItem` and call `channelItemsRepository.keepDownloadedItem({ channelIdText: move.channelIdText, item })`. Keep the `{ item, outcome }` pairs. The playable write below uses that list; do not call `keepDownloadedItem` a second time.
   - `addByRssDownloadItem(feedUrl, bundle, 0)` is the item. Pass `0`: a local item always has `guid_enclosure_url`, so the index is not part of the id, and that id is the download id.
   - Then `keptDirectoryItem(downloaded, channelIdText, channelTitle)` in this file. Copy the download item and set `channel` to `{ ...downloaded.channel, id_text: channelIdText, title: channelTitle }` when `channel` is present. No new `as`. The assertion already lives inside `addByRssDownloadItem`. Do not fill `DTOItemImage` (`id` and `item_id` are server columns this phone does not have). The row can show the placeholder cover.
   - `'kept'` and `'server_listed'` both mean this `id_text` is the episode. Push that unmatched move item onto `move.items` once. `'server_listed'` means a `channel_item` with that id already exists and `kept_for_download` is 0; `keepDownloadedItem` does not overwrite it. The download is already that id, and the remap points its channel at the directory show.
   - `'skipped'`, or a null result from `addByRssDownloadItem`: do not push, do not delete the file, and do not drop that local-episode row. Promotion still removes the feed.
6. A thrown `keepDownloadedItem` fails the promotion the same way a thrown transaction does. Do not catch it. The next match run calls it again; the upsert is safe to repeat.

`keepDownloadedItem` does not write the download, the playable item, or a subscription, and it does not create an Add by RSS feed. `subscribeDirectoryChannel` has already subscribed. Do not subscribe again.

After the transaction and after `refreshMovedPlayables`:

- For `'kept'`, `playableItemRepository.put('download', item)` with the directory-channel item. This is after persist so the transaction does not write the pre-promotion payload back. Same item id, source `download`: the playable row the download already had.
- For `'server_listed'`, `channelItemsRepository.getByIdText(item.id_text)` and put that item when it is non-null. Do not replace a stored server payload with the download item.
- Do not call `reqItemGetByIdOrIdText` for these ids.

Hydrate the download store when any unmatched item was pushed, including when `movedDownloadItemIds` is empty. The existing hydrate condition stays; add this case to it.

The episode list reads `channel_item`. A `'kept'` row has `kept_for_download = 1`, so plan 32's `isLocalFileOnlyPlayback` plays the local file only. A later window leaves that row in place while the download is complete. This plan does not merge it onto a server episode that arrives later under a different id. Both rows can be on the list until the listener deletes the file. Deleting the file removes the kept row and leaves whatever the server still lists.

The episode screen may ask the directory for this id and get a not-found. The stored payload stays, because `updateStoredItem` runs only after a successful fetch. Do not edit `EpisodeDetailScreen.tsx`.

### Comment

On `promoteLocally`, state that an episode the match does not name stays on the directory channel under its download id, and that a promotion the account already recorded uses this same function. Do not cite a plan or a review label.

### Error log

No new event. Promotion that runs writes the existing promoted row. `move.items.length` includes the kept episodes.

## Files

apps/mobile/src/data/addByRssPromotionRemap.ts
apps/mobile/src/data/addByRssPromotionRemap.test.ts
apps/mobile/src/data/repositories/addByRssPromotion.ts

## Tests

- `apps/mobile/src/data/addByRssPromotionRemap.test.ts`: add `localEpisodes: []` on `emptySnapshot()`. The test that leaves an id out of the move still expects that download to keep the feed URL as its channel. Do not retarget that case.
- Same file, `promotionMovesForUnmatchedLocalEpisodes`: a matched download id is omitted; an unmatched id is returned with `itemIdText` equal to `downloadIdText`; an empty download id is omitted; an empty list returns an empty list.
- Same file, remap when the move contains `{ downloadIdText, hashId, itemIdText: downloadIdText }` for a local episode of this feed:
  - that download's channel becomes the directory channel and its item id is unchanged;
  - `movedDownloadItemIds` does not contain it;
  - its local-episode entry is gone, and another feed's entry remains even when that other row's download id is also in the move;
  - playback stored under `hashId` as `add_by_rss` is retargeted to `item` with that same download id.
- No repository harness and no Maestro flow. Which function runs is the proof that both promotion paths share the row: they already call `promoteLocally`. Area E's flow covers promotion when it has one.

## Release scratchpad

## Add by RSS promotion keeps local episodes

- Surfaces: mobile
- Change: when an Add by RSS feed matches a directory channel, the show is promoted. Local episodes the directory knows move onto the directory episode. A download the directory does not know stays on that show's episode list and plays from the file until the listener deletes it. A promotion the account already made does the same. New behavior uses the existing `channel_item.kept_for_download` column; this change adds no migration.
- Who notices: listeners whose Add by RSS feeds match the directory, including people carrying v4 downloads the directory has no episode for
- Operator steps: none
