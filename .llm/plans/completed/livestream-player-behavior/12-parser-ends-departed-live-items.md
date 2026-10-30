**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 12 — Parser marks a live item ended when it leaves the feed

## Rows

R30

## Runs after

none

## What the code does today (R30 answer)

The request suspected "the ended signal should have been sent already". The code path for that
signal works:

1. `packages/mq/src/functions/mq/rss/runLiveItemListener.ts` listens to the podping websocket.
   A podping whose id matches `^pp_(.*)_(live|liveEnd)$` and whose reason is `live` or `liveEnd`
   enqueues each IRI that is a feed in the database with a Podcast Index id onto `rss-live`, with
   `forceParse: true`. `rss-live` has no dedupe window (`MQ_QUEUES['rss-live'].dedupeCacheTimeMS`
   is `null`), so a `liveEnd` right after `live` is not dropped.
1. `forceParse` skips the unchanged-file-hash check (`packages/parser/src/lib/rss/feed/feed.ts`).
1. `handleParsedLiveItems` (`packages/parser/src/lib/rss/liveItem/liveItem.ts`) maps each
   `podcast:liveItem` `status` through `getLiveItemStatusEnumValue` and writes it with
   `LiveItemService.update`. A feed that says `status="ended"` is stored as Ended.

Gaps where the stored status stays Live after the stream ended:

- **The feed removes the live item instead of marking it ended.** When other live items remain,
  the departed one is flagged `PendingArchive` but its status stays Live; the item detail
  endpoint (`ItemController.getByIdOrIdText`) does not filter by flag and `DTOItem` carries no
  serialized flag (the `Item` entity has the relation only), so a device restoring it sees Live.
- **The feed removes its last live item.** partytime omits `podcastLiveItems` when the feed has
  no `podcast:liveItem`, and `parser.ts` calls `handleParsedLiveItems` only
  `if (parsedFeed.podcastLiveItems)`. The departed live item is neither archived nor ended, and
  stays Live indefinitely.
- **The live item is republished as a regular `<item>` with the same guid.** The regular pass
  (`handleParsedItems`, which runs first) matches the row by guid (`ItemService.getByGuid` does not
  filter live items) and re-activates it; the live pass then flags the same row `PendingArchive`.
  Every later parse flips it back and forth, and its status stays Live.

Not fixed by this set (named for the operator):

- A feed in the database with no Podcast Index id is never enqueued by the listener; it picks up
  `ended` on its next scheduled parse.
- A podping that arrives before the publisher's feed (or its CDN) shows `ended` re-parses the old
  file. The next podping or scheduled parse corrects it.
- A live item republished as a regular `<item>` keeps its `live_item` row, so it is still
  excluded from regular episode lists (`ItemService.getManyByChannel` requires
  `live_item IS NULL`). This plan marks it ended; turning it into a regular episode is separate
  work.

## Change

A live item that leaves the feed's live set is stored as Ended. A row the regular item pass
updated in the same parse is not archived.

## Files

packages/parser/src/lib/rss/liveItem/liveItemArchive.ts
packages/parser/src/lib/rss/liveItem/liveItemArchive.test.ts
packages/parser/src/lib/rss/liveItem/liveItem.ts
packages/parser/src/lib/rss/item/item.ts
packages/parser/src/lib/rss/parser.ts
packages/parser/src/lib/rss/parser.parseRSSFeedAndSaveToDatabase.hash-and-failure.test.ts
packages/parser/src/lib/rss/parser.parseRSSFeedAndSaveToDatabase.conditions.test.ts
packages/orm/src/services/liveItem/liveItem.ts

## Step 1 — pure decision in `liveItemArchive.ts`

Replace `liveItemIdsToArchive` with one function that returns both lists:

```typescript
import { LiveItemStatusEnum } from '@podverse/helpers';

type ExistingLiveItemRef = {
  guid: string | null;
  itemId: number;
  statusId: number;
};

export type LiveItemsLeavingFeed = {
  /** Item ids to flag PendingArchive. */
  itemIdsToArchive: number[];
  /** Item ids whose live item status becomes Ended. */
  itemIdsToMarkEnded: number[];
};

/**
 * Existing live items that left the feed's live set in this parse.
 *
 * A guid skipped for an invalid status stays. An id the live pass updated stays. Every other row
 * left the live set: its status becomes Ended unless it already is, and it is archived unless the
 * regular item pass updated the same row in this parse.
 */
export const resolveLiveItemsLeavingFeed = (params: {
  existing: readonly ExistingLiveItemRef[];
  liveUpdatedItemIds: readonly number[];
  skippedGuids: ReadonlySet<string>;
  regularUpdatedItemIds: readonly number[];
}): LiveItemsLeavingFeed => { … };
```

Rules for each row in `existing`:

1. `guid !== null && skippedGuids.has(guid)` → neither list.
1. `liveUpdatedItemIds.includes(itemId)` → neither list.
1. Otherwise the row left the live set:
   - add to `itemIdsToMarkEnded` when `statusId !== LiveItemStatusEnum.Ended`;
   - add to `itemIdsToArchive` when `!regularUpdatedItemIds.includes(itemId)`.

Keep the existing ordering (input order). `liveItemIdsToArchive` has no other caller; delete it.

## Step 2 — `LiveItemService.markEndedByItemIds`

In `packages/orm/src/services/liveItem/liveItem.ts`:

```typescript
async markEndedByItemIds(itemIds: readonly number[]): Promise<void> {
  if (itemIds.length === 0) {
    return;
  }
  await this.repositoryReadWrite
    .createQueryBuilder()
    .update(LiveItem)
    .set({ live_item_status_id: LiveItemStatusEnum.Ended })
    .where('item_id IN (:...itemIds)', { itemIds: [...itemIds] })
    .execute();
}
```

`LiveItemStatusEnum` is imported as a type today (`import type { LiveItemStatusEnum } from
'@orm/entities/liveItem/liveItemStatus.js'`). Change it to a value import from the same module,
since the method uses `.Ended`. Leave `start_time` and `end_time` untouched: the parser does not
invent an end time.

## Step 3 — expose the regular pass's updated ids

In `packages/parser/src/lib/rss/item/item.ts`, add to `HandleParsedItemsResult`:

```typescript
/** Item ids the regular item pass created or updated in this parse. */
updatedItemIds: number[];
```

and return the existing local `updatedItemIds` array from `handleParsedItems`.

## Step 4 — `handleParsedLiveItems`

In `packages/parser/src/lib/rss/liveItem/liveItem.ts`:

- Add a trailing parameter `regularUpdatedItemIds: readonly number[] = []` after
  `itemKeysToSkip`.
- Replace the `liveItemIdsToArchive(...)` call with `resolveLiveItemsLeavingFeed({ existing,
  liveUpdatedItemIds: updatedLiveItemItemIds, skippedGuids, regularUpdatedItemIds })`, where
  `existing` maps `existingLiveItems` to `{ guid: liveItem.item.guid ?? null, itemId:
  liveItem.item.id, statusId: liveItem.live_item_status_id }`.
- Before `itemService.updateManyFlagStatus(...)`, call
  `await liveItemService.markEndedByItemIds(itemIdsToMarkEnded)`.
- Build `itemsToArchive` from `itemIdsToArchive` as today.
- `handleParsedLiveItems([])` must work: `compatLiveItemsDtos([])` yields nothing,
  `markChannelMayHaveLiveItems` writes nothing for a zero count, and every existing live item
  leaves the live set.

## Step 5 — reconcile when the feed has no live items

In `packages/parser/src/lib/rss/parser.ts` at the `if (parsedFeed.podcastLiveItems)` block
(after `handleParsedItems`):

- Keep the `HandleParsedItemsResult` in `newItemIdentifiers` as today; pass
  `newItemIdentifiers.updatedItemIds` as `regularUpdatedItemIds`.
- Call `handleParsedLiveItems` when `parsedFeed.podcastLiveItems` is present **or**
  `channel.may_have_live_items === true`, passing `parsedFeed.podcastLiveItems ?? []`. A channel
  whose feed never carried a live item keeps skipping the call, so ordinary feeds pay no extra
  query.
- Notifications are unchanged: an empty live set produces no pending or live guids.

## Tests

- `packages/parser/src/lib/rss/liveItem/liveItemArchive.test.ts`: rename the `describe` to
  `resolveLiveItemsLeavingFeed` and port the four existing cases (each now also asserts
  `itemIdsToMarkEnded`; existing rows default to `statusId: LiveItemStatusEnum.Live`). Add:
  - a departed Live row → in both lists;
  - a departed Pending row → in both lists;
  - a departed row already Ended → archived, not in `itemIdsToMarkEnded`;
  - a departed Live row whose id is in `regularUpdatedItemIds` → marked ended, not archived;
  - a row the live pass updated, also in `regularUpdatedItemIds` → neither list.
- `parser.parseRSSFeedAndSaveToDatabase.hash-and-failure.test.ts` and
  `parser.parseRSSFeedAndSaveToDatabase.conditions.test.ts`: add `updatedItemIds: []` to every
  `handleParsedItemsMock` resolved value. In the hash-and-failure suite add two cases:
  - parsed feed without `podcastLiveItems`, channel mock with `may_have_live_items: true` →
    `handleParsedLiveItemsMock` called with `[]` as its first argument and the regular pass's
    `updatedItemIds` as its last.
  - parsed feed without `podcastLiveItems`, channel mock with `may_have_live_items: false` →
    `handleParsedLiveItemsMock` not called.
  The channel comes from `ChannelService.getOrCreateByFeed` in that file's `@podverse/orm` mock;
  give those two cases their own resolved channel value.

## Release scratchpad

```markdown
## Livestreams that leave a feed are stored as ended

- Surfaces: workers (RSS parser), api (item and livestream reads)
- Change: when a feed drops a `podcast:liveItem`, including its last one, the parser stores that
  live item as ended instead of leaving it live. A live item republished as a regular item with
  the same guid is marked ended and is no longer archived and reactivated on every parse.
- Who notices: listeners whose player restored a stream that had already finished; livestream
  pages and lists for feeds that remove live items after the stream
- Operator steps: none
```
