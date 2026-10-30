**Cursor model:** Codex 5.3 · **Reasoning:** high

# 30 — Shared matching of remote item references to parsed channels and items

One ORM helper that takes a list of remote item references (feed GUID, feed URL, item GUID) and
splits them into parsed Podverse channels, parsed items, and the references nothing parsed
matches. Podroll and the new channel remote item list (plan 32) use it; the publisher feed reuses
its channel loaders. Plan 31 then turns the unmatched references into stubs.

No API response shape changes here. The behavior change is that podroll now also matches parsed
channels by feed URL, requires a channel to be parsed (has `channel_about`), and returns
references in feed order.

## Rows

R2, R33

## Runs after

none

## Files

packages/helpers/src/dtos/remoteItem.ts
packages/orm/src/services/remoteItemReference/remoteItemReference.ts
packages/orm/src/services/remoteItemReference/remoteItemReference.helpers.ts
packages/orm/src/services/remoteItemReference/remoteItemReference.helpers.test.ts
packages/orm/src/services/channel/channelPodroll.ts
packages/orm/src/services/publisherFeed.ts
packages/orm/src/index.ts
release-notes/scratchpad.md

## Background

- `ChannelPodrollService.getPodrollForChannel` (`packages/orm/src/services/channel/channelPodroll.ts`)
  matches channel references by `podcast_guid` only and item references by
  `(podcast_guid, item.guid)`. It does not check `channel_about`, does not sort, and drops any
  reference without a `feed_guid`.
- `PublisherFeedService` (`packages/orm/src/services/publisherFeed.ts`) has private
  `loadParsedChannelIdsByGuid` (GUID → parsed channel id, requires `channel_about`) and
  `loadParsedChannelIdsByFeedUrl` (feed URL → `feed.url` → channel with `channel_about`).
- "Parsed" everywhere in the API means `channel_about` exists
  (`ChannelController.isParsedReadyChannel` in `apps/api/src/controllers/channel.ts`).
- The reference tables store `feed_guid uuid NOT NULL` today. Area B may relax that for URL-only
  references (R5). This plan treats `feed_guid` as possibly null or empty so it works either way.

## Reference type — `packages/helpers/src/dtos/remoteItem.ts`

Widen the existing type; it is the input type for every read path in area C:

```ts
export type RemoteItemGeneric = {
  feed_guid: string | null;
  feed_url: string | null;
  item_guid: string | null;
};
```

Every ORM reference entity (`ChannelRemoteItem`, `ChannelPodrollRemoteItem`, …) stays assignable.
Leave `RemoteItemsResponse` and `PublisherRemoteItemsResponse` alone; plan 31 changes them.

## Pure helpers — `remoteItemReference.helpers.ts` (new)

No database access, so tests run without mocks. Import `PublisherAlbumMatchMaps` as a type from
`../publisherFeed.helpers.js` (same two maps: lowercased trimmed GUID → channel id, trimmed URL →
channel id).

```ts
/** Lowercased trimmed feed GUID, or '' when absent. */
export function remoteRefGuidKey(ref: RemoteItemGeneric): string;
/** Trimmed feed URL, or '' when absent. */
export function remoteRefFeedUrlKey(ref: RemoteItemGeneric): string;
/** Trimmed item GUID, or '' when absent. A non-empty value makes the ref an item reference. */
export function remoteRefItemGuidKey(ref: RemoteItemGeneric): string;

/** Parsed channel id for the ref: GUID match first, then feed URL, else undefined. */
export function parsedChannelIdForRef(
  ref: RemoteItemGeneric,
  matches: PublisherAlbumMatchMaps
): number | undefined;

/** Unique trimmed feed URLs of refs whose GUID did not match, in ref order. */
export function feedUrlsForUnmatchedRefs(
  refs: readonly RemoteItemGeneric[],
  parsedChannelIdByGuid: ReadonlyMap<string, number>
): string[];

export type RemoteItemRefPartition<T extends RemoteItemGeneric> = {
  /** Parsed channel ids for channel refs, ref order, deduped. */
  addedChannelIds: number[];
  /** Channel refs with no parsed channel, ref order, deduped by guid key else url key. */
  unmatchedChannelRefs: T[];
  /** Parsed item ids for item refs, ref order, deduped. */
  addedItemIds: number[];
  /** Item refs whose channel is not parsed, ref order, deduped by channel key + item guid. */
  unmatchedItemRefs: T[];
};

/**
 * Splits refs (already in feed order). A ref with neither a GUID nor a URL is skipped.
 * An item ref whose channel is parsed but whose item is not in `parsedItemIdByKey` is dropped:
 * a fully parsed channel wins over any stub, and no item stub exists without a channel stub.
 */
export function partitionRemoteItemRefs<T extends RemoteItemGeneric>(args: {
  refs: readonly T[];
  matches: PublisherAlbumMatchMaps;
  /** Key `${channelId}||${itemGuid}` (item GUID trimmed, case kept) → parsed item id. */
  parsedItemIdByKey: ReadonlyMap<string, number>;
}): RemoteItemRefPartition<T>;

export function parsedItemKey(channelId: number, itemGuid: string): string;
```

Item GUIDs keep their case (they are arbitrary strings, matched exactly as `item.guid` is today).

## Service — `remoteItemReference.ts` (new)

Move the two private loaders out of `PublisherFeedService` and export them here, plus the
orchestrating class:

```ts
export async function loadParsedChannelIdsByGuid(
  refs: readonly RemoteItemGeneric[]
): Promise<Map<string, number>>;

/** feedUrls: already trimmed and unique (callers build the list). */
export async function loadParsedChannelIdsByFeedUrls(
  feedUrls: readonly string[]
): Promise<Map<string, number>>;

export type PartitionedRemoteItemReferences = {
  /** Parsed channels (channel_about, channel_images loaded), ref order. */
  channelsAdded: Channel[];
  channelRefsUnmatched: RemoteItemGeneric[];
  /** Parsed active items (channel.channel_images, item_images loaded), ref order. */
  itemsAdded: Item[];
  itemRefsUnmatched: RemoteItemGeneric[];
};

export class RemoteItemReferenceService {
  partition(refs: readonly RemoteItemGeneric[]): Promise<PartitionedRemoteItemReferences>;
}
```

- `loadParsedChannelIdsByGuid` / `loadParsedChannelIdsByFeedUrls`: the bodies move from
  `publisherFeed.ts` unchanged in behavior (GUID query through
  `ChannelService.getAllByPodcastGuids` with `channel_about`, URL lookups through
  `FeedService.getByUrl` then `ChannelService.get` with `channel_about`). The URL loader takes the
  URL list instead of computing it, so the publisher feed keeps its album-only
  `feedUrlsForPublisherAlbumUrlLookup` and podroll uses `feedUrlsForUnmatchedRefs`. Skip blank
  GUIDs (`remoteRefGuidKey(ref) === ''`) in the GUID query.
- `RemoteItemReferenceService` has a no-argument constructor that touches no data source; it
  creates `ChannelService` / `FeedService` and repositories inside `partition`. API tests that
  mock `@podverse/orm` with `...actual` instantiate it for real.
- `partition(refs)`:
  1. Empty input → all four arrays empty, no query.
  2. `parsedChannelIdByGuid = await loadParsedChannelIdsByGuid(refs)`;
     `parsedChannelIdByFeedUrl = await loadParsedChannelIdsByFeedUrls(feedUrlsForUnmatchedRefs(refs, parsedChannelIdByGuid))`.
  3. For item refs with a parsed channel, query items once with `AppDataSourceRead`:
     `where` = `{ channel: { id: In(channelIds), channel_about: { id: Not(IsNull()) } }, guid: In(itemGuids), item_flag_status: { id: ItemFlagStatusStatusEnum.Active } }`,
     relations `{ channel: { channel_images: true }, item_images: true }` (the relations podroll
     uses today). Build `parsedItemIdByKey` from the rows. Skip the query when there are no such
     refs.
  4. `partitionRemoteItemRefs(...)`.
  5. Load channels for `addedChannelIds` with
     `{ id: In(ids), channel_about: { id: Not(IsNull()) } }`, relations
     `{ channel_about: true, channel_images: true }`; order them by `addedChannelIds`. Items come
     from step 3, ordered by `addedItemIds`.

## Callers

- **`channelPodroll.ts`**: `getPodrollForChannel(idOrIdText)` loads the channel as today, sorts
  `channel_podroll_remote_items` by `id` ascending (feed order), calls
  `new RemoteItemReferenceService().partition(refs)`, and returns the same four keys:

  ```ts
  {
    podrollChannelsAdded: Channel[];
    podrollChannelsUnadded: RemoteItemGeneric[];
    podrollItemsAdded: Item[];
    podrollItemsUnadded: RemoteItemGeneric[];
  }
  ```

  Delete the now-unused private `getPodrollChannels` and `getPodrollItems` methods. Leave
  `ItemService.getManyByPodcastGuidAndItemGuid` in place (exported service API).
- **`publisherFeed.ts`**: delete the private `loadParsedChannelIdsByGuid` /
  `loadParsedChannelIdsByFeedUrl` methods and the local `albumGuidKey`; call the exported loaders
  (`loadParsedChannelIdsByFeedUrls(feedUrlsForPublisherAlbumUrlLookup(unmatched))`). The verified
  partition (`partitionPublisherAlbumRefs`) and the result shape stay exactly as they are.
- **`packages/orm/src/index.ts`**: export `./services/remoteItemReference/remoteItemReference.js`
  next to the `publisherFeed` service export. The helpers file stays internal.

## What stays true

- The API responses keep their current shape and still look up unmatched references in Podcast
  Index until plan 31 lands.
- The publisher feed's verified and Not Yet Added results are unchanged (same loaders, same
  partition).
- A ref matching a parsed channel never lands in an unmatched list, so it can never be shown as a
  stub, whatever stub rows exist.

## Tests

`remoteItemReference.helpers.test.ts` (Vitest, no mocks), modeled on
`packages/orm/src/services/publisherFeed.helpers.test.ts`:

- GUID match wins over URL match; a URL-only match is used when the GUID misses; GUID keys are
  case-insensitive and trimmed.
- A ref with a null or blank GUID and a URL matches by URL; a ref with neither is skipped.
- Channel refs keep feed order and dedupe (two refs to the same parsed channel → one id; two
  unmatched refs with the same GUID → one ref).
- An item ref whose channel is parsed and whose item is in the map → `addedItemIds`; whose channel
  is parsed but item missing → dropped from every list; whose channel is not parsed →
  `unmatchedItemRefs`.
- `feedUrlsForUnmatchedRefs` skips refs whose GUID matched and dedupes URLs.

The podroll and publisher-feed API integration tests in plan 31 cover the database paths.

## Release scratchpad

```markdown
## Podroll matches parsed feeds by URL and keeps feed order

- Surfaces: api
- Change: `GET /podroll/channel/:idOrIdText` now matches a podroll reference to a parsed Podverse
  channel by feed URL when its feed GUID does not match, counts a channel as added only once it
  is fully parsed (has About data), and returns entries in the order the source feed lists them.
  Item references whose podcast is parsed but whose episode is not are left out.
- Who notices: listeners viewing podrolls that reference feeds by URL, or feeds still being parsed
- Operator steps: none
```
