**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 10 — API channel and item directory Top returns ranked rows only

Global and category Top for channels and items return only rows whose count for the chosen range
is above zero. An all-zero range is an empty `data` array. A short ranked page is not padded with
Recent rows. Live-item global and category Top keep today's `fillTopPage` pad, so a short page and
an all-zero range still include rows whose count is zero. Subscribed Top and a channel's episode
Top keep that same pad.

## Rows

R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R14, R17

## Runs after

none

## Files

apps/api/src/controllers/channel.ts
apps/api/src/controllers/item.ts
apps/api/src/test/category-channel-item-read.test.ts
apps/api/openapi.yml

## Findings (answers to R1–R5 and the area A part of R8)

These answer the request's questions from the code as it stands before this plan.

- **R1. How Browse reads channels and items.** Web `/browse` and mobile Browse call
  `reqChannelGetMany` / `reqItemGetMany` in `@podverse/helpers-requests` with `type: 'global'` or
  `type: 'category'`. The helper maps `sort: 'recent'` to `/channel|item/global|category/recent`
  and `sort: 'top'` plus `range` to `/channel|item/global|category/top`. Live items have the same
  four routes under `/live-item/`. `LiveItemController.getManyGlobalTop` and `getManyCategoryTop`
  only validate `liveItemType` and call `ItemController.getManyGlobalTop` / `getManyCategoryTop`.
- **R2. Recent versus popularity.** Recent orders channels by `channel_about.last_pub_date DESC`,
  items by `pub_date DESC`, and live items by `live_item.start_time DESC`. Top reads
  `stats_popularity_channel` / `stats_popularity_item`, ordered by the range column
  (`getStatsOrder(range)` → `STATS_POPULARITY_COUNT_FIELDS`) descending, then the entity id. The
  reads pass `minCountField`, so `MoreThan(0)` already drops rows whose count for the range is zero.
  Web Browse defaults to Recent. Mobile Browse always sends Top (area D adds Recent there).
- **R3. Everything at zero.** The refresh job resets windows to zero rather than deleting rows, so
  zero rows exist. With every count at zero the ranked page is empty, `inferRankedCount(0, 0)` is
  `0`, `planTopPageFill` returns `{ mode: 'recent' }`, and `fillTopPage` returns the Recent page
  under the Top route. On a later page with no ranked rows it calls `countRanked`, gets `0`, and
  returns Recent from that offset.
- **R4. Does it fall back to Recent.** Yes, for channels, episodes, and live items, on global,
  category, and subscribed Top. When 1–500 rows rank (`TOP_STATS_PAD_MAX_RANKED`), a short last
  ranked page is also padded with Recent rows that exclude the ranked ids. Clip, playlist, and
  profile Top do not fall back (area B).
- **R5.** Settled by the operator answers: an all-zero range is an empty list, and Recent is a
  separate sort, never a fallback inside Top.
- **R6, R9.** Channel and item ranked reads already exclude zero counts. The zero content that
  reaches the Top list comes only from the Recent fallback and pad, which this plan removes for
  directory lists.
- **R8 gaps in this area.** (1) Global and category Top for channels and items fall back to and pad
  with Recent; this plan fixes it. (2) Live-item global and category Top share the item handlers.
  They keep the fill (R17): `itemType === 'live-item'` stays on `loadFilledTopItems`, the same
  loader subscribed Top uses. Browse Livestreams (`LiveItemController.getManyGlobalUpcoming` in
  `apps/api/src/controllers/liveItem.ts`) are not a popularity list; this plan does not edit them.
  (3) The OpenAPI descriptions for the four channel and item directory Top routes say nothing about
  zero counts; this plan adds it. The two live-item Top descriptions stay as they are. (4)
  `docs/features/POPULARITY-AND-TASTE-PROFILE.md` § Public range sorts documents the pad; plan 11
  rewrites it. (5) The web and mobile E2E seed writes no `stats_popularity_*` rows, so after this
  plan every Browse Top list in E2E is empty; areas C and D own that.

## Decisions

- **Live-item directory Top keeps the fill.** `LiveItemController.getManyGlobalTop` and
  `getManyCategoryTop` only validate `liveItemType` and call `ItemController.getManyGlobalTop` /
  `getManyCategoryTop`. Those handlers already set `itemType` to `'live-item'` when `liveItemType`
  is present and `'normal'` otherwise. `'live-item'` calls `loadFilledTopItems`. `'normal'` calls
  `loadRankedTopItems`. That is the same loader split subscribed Top and a channel's episode Top
  already use. `apps/api/src/controllers/liveItem.ts` does not change. The ranked slice inside the
  fill still passes `minCountField`. `fillTopPage` then pads a short page with recent live items
  and, when the ranked page is empty, returns the recent page. Those recent rows are how a zero
  count stays on `/live-item/global/top` and `/live-item/category/top`. No web or mobile screen
  calls those two routes today; `reqLiveItemGetMany` is only called with `sort: 'recent'`,
  `type: 'subscribed'`.
- **A channel's episode Top keeps padding.** `ItemController.getManyByChannelTop`
  (`/item/channel/top/:channelIdOrIdText`, the Top sort on podcast and album pages and embeds)
  keeps `loadFilledTopItems`. A show with no listens in the range still lists its episodes.
- **Subscribed Top keeps padding** for channels, items, and live items (R14).

## Design

`fillTopPage` and its tests in `packages/helpers/src/lib/topListFill.ts` stay as they are. Channel
global and category handlers, and item global and category handlers when `itemType` is `'normal'`,
stop calling the fill wrappers and call a new ranked-page loader instead. That loader is the body
of today's `loadStatsPage` callback, so the fill wrappers reuse it and nothing is duplicated.
Live-item global and category Top, subscribed Top, and a channel's episode Top keep calling the
fill wrappers.

### `apps/api/src/controllers/channel.ts`

1. Add a private static method directly above `loadFilledTopChannels`:

```typescript
  /**
   * One page of channels whose count for the range is above zero. Directory Top returns this page
   * as is, so a range with no count above zero is an empty list and a short page stays short.
   */
  private static async loadRankedTopChannels(args: {
    category_id: number | null;
    channelIds?: number[];
    limit: number;
    medium: QueryParamsMedium;
    offset: number;
    orderField: StatsPopularityCountField;
  }): Promise<Channel[]> {
    const { category_id, channelIds, limit, medium, offset, orderField } = args;
    const topConfig: FindManyOptions<StatsPopularityChannel> = {
      order: { [orderField]: 'DESC', channel_id: 'ASC' },
      skip: offset,
      take: limit,
      relations: subChannelGetManyRelations,
    };
    const statsResults = await ChannelController.statsPopularityChannelService.getMany(
      topConfig,
      medium,
      category_id,
      { channelIds, minCountField: orderField }
    );
    return statsResults.map((row: { channel: Channel }) => row.channel).filter(Boolean);
  }
```

2. In `loadFilledTopChannels`, replace the whole `loadStatsPage: async () => { … },` property with:

```typescript
      loadStatsPage: () => ChannelController.loadRankedTopChannels(args),
```

   `args` has exactly the loader's shape, so pass it through. Add this JSDoc above
   `loadFilledTopChannels`:

```typescript
  /**
   * Subscribed Top: the ranked page, padded with the account's recent followed channels when it
   * is short (`fillTopPage`).
   */
```

3. In `getManyGlobalTop` and `getManyCategoryTop`, change `ChannelController.loadFilledTopChannels(`
   to `ChannelController.loadRankedTopChannels(`. The argument objects stay the same.
4. `getManySubscribedTop` keeps `loadFilledTopChannels`. The `fillTopPage` and
   `TOP_STATS_PAD_MAX_RANKED` imports stay.

### `apps/api/src/controllers/item.ts`

1. Add a private static method directly above `loadFilledTopItems`:

```typescript
  /**
   * One page of items whose count for the range is above zero. Directory Top returns this page as
   * is, so a range with no count above zero is an empty list and a short page stays short.
   */
  private static async loadRankedTopItems(args: {
    category_id: number | null;
    channelIds?: number[];
    includeChannel: boolean;
    itemType: 'normal' | 'live-item';
    limit: number;
    liveItemType: 'pending' | 'live' | 'ended' | null;
    medium: QueryParamsMedium | null;
    offset: number;
    orderField: StatsPopularityCountField;
  }): Promise<Item[]> {
    const {
      category_id,
      channelIds,
      includeChannel,
      itemType,
      limit,
      liveItemType,
      medium,
      offset,
      orderField,
    } = args;
    const config: FindManyOptions<StatsPopularityItem> = {
      order: { [orderField]: 'DESC', item_id: 'ASC' },
      skip: offset,
      take: limit,
      relations: includeChannel ? subItemGetManyRelationsWithChannel : subItemGetManyRelations,
    };
    const statsResults = await ItemController.statsPopularityItemService.getMany(
      config,
      medium,
      category_id,
      itemType,
      liveItemType,
      { channelIds, minCountField: orderField }
    );
    return statsResults.map((stat: { item: Item }) => stat.item).filter(Boolean);
  }
```

2. In `loadFilledTopItems`, replace the whole `loadStatsPage: async () => { … },` property with:

```typescript
      loadStatsPage: () =>
        ItemController.loadRankedTopItems({
          category_id,
          channelIds,
          includeChannel: recentByChannel === undefined,
          itemType,
          limit,
          liveItemType,
          medium,
          offset,
          orderField,
        }),
```

   This keeps today's relation choice: `subItemGetManyRelations` when `recentByChannel` is set,
   `subItemGetManyRelationsWithChannel` otherwise. Add this JSDoc above `loadFilledTopItems`:

```typescript
  /**
   * Subscribed Top, a channel's episode Top, and live-item global and category Top: the ranked
   * page, padded with recent items from the same scope when it is short (`fillTopPage`). An empty
   * ranked page is that recent page, so rows whose count is zero stay in the list.
   */
```

3. In `getManyGlobalTop` and `getManyCategoryTop`, replace the `ItemController.loadFilledTopItems({
   … })` call with this branch. `orderField` is `getStatsOrder(range)` in both handlers.
   `category_id` is `null` in `getManyGlobalTop` and the category enum value in
   `getManyCategoryTop`. `loadFilledTopItems` has no `includeChannel` argument; relations stay as
   that method already chooses them.

```typescript
        const orderField = getStatsOrder(range);
        const items =
          itemType === 'live-item'
            ? await ItemController.loadFilledTopItems({
                category_id,
                itemType,
                limit,
                liveItemType,
                medium,
                offset,
                orderField,
              })
            : await ItemController.loadRankedTopItems({
                category_id,
                includeChannel: true,
                itemType,
                limit,
                liveItemType,
                medium,
                offset,
                orderField,
              });
```

   `attachVerifiedPublishers({ items })` and the response stay as they are.
4. `getManySubscribedTop` and `getManyByChannelTop` keep `loadFilledTopItems` with no `itemType`
   branch. Imports do not change. `apps/api/src/controllers/liveItem.ts` does not change.

### `apps/api/openapi.yml`

Large file: Grep each `operationId`, then Read a few lines around it. Append these two sentences
to the end of the `description:` value of each of the four operations below, on the same line,
after one space:

`Only rows whose count for the range is above zero are returned, so a range with none returns an empty data array. A short page is not padded with recent rows.`

| `operationId` | Path |
| --- | --- |
| `apiGetChannelGlobalTop` | `/channel/global/top` |
| `apiGetChannelCategoryTop` | `/channel/category/top` |
| `apiGetItemGlobalTop` | `/item/global/top` |
| `apiGetItemCategoryTop` | `/item/category/top` |

Confirm each `operationId` with Grep before editing. If one is named differently, edit the
operation under that path. Do not touch the subscribed Top or `/item/channel/top/{…}` operations.
Do not edit `apiGetLiveItemGlobalTop` (`/live-item/global/top`) or `apiGetLiveItemCategoryTop`
(`/live-item/category/top`). Those two keep today's fill, and their descriptions stay as they are.
Request and response schemas do not change.

## Tests

API integration, mock-based: `apps/api/src/test/category-channel-item-read.test.ts`. The mocks in
that file already cover every service these routes call; `beforeEach` resets call history, so
`not.toHaveBeenCalled()` is safe per test. `range=week` maps to `week_count`.

In `describe('channel', …)`:

- Replace `it('GET /channel/global/top pads recent rows after a short ranked page', …)` with
  `it('GET /channel/global/top returns only ranked channels and does not pad a short page with recent channels', …)`.
  Expect status 200, `data` ids `['st-ch']`, `statsChGetManyMock` called with
  `(expect.anything(), 'podcasts', null, expect.objectContaining({ minCountField: 'week_count' }))`,
  and `channelGetManyMock`, `statsChCountRankedMock`, `statsChGetRankedChannelIdsMock` not called.
- Replace `it('GET /channel/global/top uses recent when no ranked rows exist', …)` with
  `it('GET /channel/global/top returns an empty list when no channel has a count above zero', …)`.
  `statsChGetManyMock.mockResolvedValueOnce([])`; expect status 200, `data` `[]`, and
  `channelGetManyMock` not called.
- Add `it('GET /channel/category/top returns only ranked channels for the category', …)` using
  `categoryQTop`: `data` ids `['st-ch']`, `channelGetManyMock` not called.
- Add `it('GET /channel/category/top returns an empty list when no channel has a count above zero', …)`:
  `statsChGetManyMock.mockResolvedValueOnce([])`; `data` `[]`, `channelGetManyMock` not called.
- Add `it('GET /channel/subscribed/top still pads a short ranked page with recent followed channels', …)`
  with `.set(auth())` and `listQueryTop`: status 200, `data` ids `['st-ch', 'ch-1']`,
  `statsChGetRankedChannelIdsMock` and `channelGetManyMock` called.

In `describe('item', …)`:

- Replace `it('GET /item/global/top pads recent rows after a short ranked page', …)` with
  `it('GET /item/global/top returns only ranked episodes and does not pad a short page with recent episodes', …)`.
  Expect `data` ids `['st-it']`, `statsItGetManyMock` called with
  `(expect.anything(), 'podcasts', null, 'normal', null, expect.objectContaining({ minCountField: 'week_count' }))`,
  and `itemGetManyMock`, `statsItCountRankedMock`, `statsItGetRankedItemIdsMock` not called.
- Add `it('GET /item/global/top returns an empty list when no episode has a count above zero', …)`:
  `statsItGetManyMock.mockResolvedValueOnce([])`; `data` `[]`, `itemGetManyMock` not called.
- Add `it('GET /item/category/top returns only ranked episodes for the category', …)` using
  `categoryQTop`: `data` ids `['st-it']`, `itemGetManyMock` not called.
- Add `it('GET /item/subscribed/top still pads a short ranked page with recent episodes from followed channels', …)`
  with `.set(auth())` and `listQueryTop`: `data` ids `['st-it', 'sub-it']`,
  `itemGetManyByChannelsMock` called.
- Add `it('GET /item/channel/top/:channelId still pads a short ranked page with the channel recent episodes', …)`:
  `GET ${itemBase}/channel/top/ch-1` with `.query({ page: 1, range: 'week' })`; `data` ids
  `['st-it', 'ch-it']`, `itemGetManyByChannelMock` called.

In `describe('live-item', …)` the default mocks already return one ranked item (`st-it`, id 10)
and one recent item (`it-1`). `inferRankedCount(0, 0)` is `0`, so an empty stats page takes the
recent path without calling `statsItCountRankedMock`.

- Add `it('GET /live-item/global/top still pads a short ranked page with recent live items', …)`
  beside `it('GET /live-item/global/top returns 200', …)`. Same URL as that test
  (`${liveItemBase}/global/top?${listQueryTop}&liveItemType=pending`). Expect status 200, `data`
  ids `['st-it', 'it-1']`, `statsItGetManyMock` called with
  `(expect.anything(), 'podcasts', null, 'live-item', 'pending', expect.objectContaining({ minCountField: 'week_count' }))`,
  and `itemGetManyMock` and `statsItGetRankedItemIdsMock` called.
- Add `it('GET /live-item/global/top returns recent live items when no live item has a count above zero', …)`:
  `statsItGetManyMock.mockResolvedValueOnce([])`; same URL; status 200, `data` ids `['it-1']`,
  `itemGetManyMock` called.
- Add `it('GET /live-item/category/top still pads a short ranked page with recent live items', …)`:
  `GET ${liveItemBase}/category/top?${categoryQTop}&liveItemType=ended`. Expect status 200, `data`
  ids `['st-it', 'it-1']`, `statsItGetManyMock` called with
  `(expect.anything(), 'podcasts', expect.any(Number), 'live-item', 'ended', expect.objectContaining({ minCountField: 'week_count' }))`,
  and `itemGetManyMock` called.

`packages/helpers/src/lib/topListFill.test.ts` and
`apps/api/src/test/stats-popularity-readers.integration.test.ts` stay as they are: the filler
still serves subscribed and per-channel Top, and the readers test already covers the above-zero
filter against a real database.

## Release scratchpad

```markdown
## Browse Top for podcasts and episodes lists only content with listens in the range

- Surfaces: api; web and mobile Browse read it
- Change: `GET /channel/global/top`, `/channel/category/top`, `/item/global/top`, and
  `/item/category/top` return only entities whose count for the chosen range is above zero. A range
  with nothing above zero returns an empty `data` array instead of the Recent list, and a short
  ranked page is no longer padded with Recent rows. `GET /live-item/global/top` and
  `/live-item/category/top` keep the recent pad, so a short page and an all-zero range still include
  live items whose count is zero. Subscribed Top (`/channel|item|live-item/subscribed/top`) and a
  channel's episode Top (`/item/channel/top/:channelIdOrIdText`) still pad a short page with recent
  rows. Recent routes and Browse Livestreams are unchanged.
- Who notices: Browse users on web and mobile on an instance with little listening data, where Top
  for podcasts and episodes shows fewer rows or an empty list; API clients of those four routes
- Operator steps: none
```
