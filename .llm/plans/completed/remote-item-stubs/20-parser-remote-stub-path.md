**Cursor model:** Opus 5.5 · **Reasoning:** high

# 20 — Parser remote stub path

Make remote stubs the parser's default handling of remote item references. After a source feed
is parsed, collect its remote item references (channel `podcast:remoteItem`, podroll, publisher,
value time splits), resolve them through the index provider, and write channel stubs and item
stubs through plan 11's services. Never queue a full parse on this path. When a stubbed feed is
later fully parsed (user add or admin promotion), delete its stubs. `PARSER_ADD_REMOTE_ITEMS_TO_MQ`
stays the opt-in full recursive parse, and when it is on no stubs are written.

The resolve core is exported from `@podverse/parser` with the provider passed in, so the API (Add
by RSS click, area D) and stub re-checks (area G) can reuse it.

## Rows

R3, R5, R8, R12, R17, R19, R25, R26, R27, R30, R31, R33, R34, R43

## Runs after

10, 11

## Files

packages/parser/src/context.ts
packages/parser/src/factory.ts
packages/parser/src/index.ts
packages/parser/src/lib/rss/remoteItemRefs.ts
packages/parser/src/lib/rss/remoteItemRefs.test.ts
packages/parser/src/lib/rss/remoteItemStubs.ts
packages/parser/src/lib/rss/remoteItemStubs.test.ts
packages/parser/src/lib/rss/remoteItemParser.ts
packages/parser/src/lib/rss/parser.ts
packages/parser/src/lib/rss/parser.parseRSSFeedAndSaveToDatabase.hash-and-failure.test.ts
packages/parser/src/lib/rss/parser.parseRSSFeedAndSaveToDatabase.conditions.test.ts
packages/parser/src/lib/rss/parser.noopLockLoser.test.ts
packages/parser/src/lib/rss/parser.tlsProtocolError.test.ts
apps/workers/.env.example
apps/workers/ENV.md
release-notes/scratchpad.md

## What the code does today

- `parseRSSFeedAndSaveToDatabase` in `packages/parser/src/lib/rss/parser.ts` ends with
  `if (config.parser?.addRemoteItemsToMQ) { … handleAllRemoteItemsFeedParsing(channel, …) }`,
  after the `try/catch/finally`. Nothing happens for remote items when the flag is off (the
  default: `PARSER_ADD_REMOTE_ITEMS_TO_MQ=` in `infra/k8s/base/workers/source/workers.env`).
- `handleAllRemoteItemsFeedParsing` in `remoteItemParser.ts` reads the reference rows through
  `ChannelPodrollService` + `ChannelPodrollRemoteItemService`, `ChannelPublisherService` +
  `ChannelPublisherRemoteItemService`, `ChannelRemoteItemService`, and (when
  `channel.has_value_time_splits`) `ItemService.getManyByChannel` with the
  `item_values.item_value_time_splits.item_value_time_split_remote_item` relation. For each feed
  GUID it calls `podcastGetByGuid` and returns full-parse queue messages for feeds Podcast Index
  knows. Callers (`packages/mq/src/functions/mq/rss/runParser.ts`,
  `apps/workers/src/commands/parser/rss/parseFeed.ts`) enqueue them on `rss-slow`.
- Image shrinking (R19): the only producers of shrink hints are `imageHints` in
  `parseRSSFeedAndSaveToDatabase` (built from the parsed feed's own channel and item images) and
  the `imageShrink` backfill, which scans `channel_image` / `item_image`. Stubs live in their own
  tables with a raw `image_url` (plan 11), so R19 holds as long as this path never pushes to
  `imageHints` and never writes `channel_image` / `item_image`. Tests below pin that.
- References without a `feedGuid` (R5): `podverse-partytime` (an npm dependency) drops every
  `podcast:remoteItem` without `feedGuid` in `remoteItem.nodeTransform` (`dist/parser/phase/phase-6.js`),
  for channel lists, podroll, and value time splits alike. The four reference tables have
  `feed_guid uuid NOT NULL`. So every reference the parser stores has a feed GUID, optionally a
  feed URL, item GUID, title, and medium. A GUID-only reference (nothing else) is fully supported
  here: resolution needs only the GUID and the stub takes its title, author, image, and medium
  from the provider, never from the reference's own hint attributes. URL-only references stay
  out of scope (see Decisions in the step's final message); the resolve core still accepts a
  null GUID so API callers can resolve by URL.
- `podcast:remoteItem` nested inside `podcast:liveItem` is parsed by partytime but not mapped or
  stored by `packages/parser-mapping`, so there is nothing to stub. Live items count for R27 only
  as the target of an item reference (an `itemGuid` that names a live item in the remote feed):
  `resolveItem` handles it like any episode, and no live status is stored (plan 11).

## Parser context wiring

`packages/parser/src/context.ts`:

- Add `indexProvider?: IndexProvider` (type import from `@podverse/helpers`) to the `_context`
  type and to the `setParserContext` parameter.
- Add:

```ts
/** Null in test-assets mode and when the parser has no Podcast Index config. */
export function getOptionalIndexProvider(): IndexProvider | null {
  return getParserContext().indexProvider ?? null;
}
```

`packages/parser/src/factory.ts`:

- Add `indexProvider?: IndexProvider` to `ParserContext`.
- Build the real `PodcastIndexService` only when `!config.testAssetsMode && config.podcastIndex`
  (same constructor arguments as today). `podcastIndexService` stays
  `createMockPodcastIndexService()` in test-assets mode, else the real one, else undefined.
- `indexProvider = realService ? new PodcastIndexProvider(realService) : undefined`, importing
  `PodcastIndexProvider` from `@podverse/external-services-podcast-index` (plan 10). The mock
  service never backs a provider, so test-assets runs write no stubs.
- Pass `indexProvider` into the context object.

The API also calls `createParserContext` (`apps/api/src/index.ts`), so it gets a provider in the
parser context too. No app code changes are needed for that.

## Reference collector — `remoteItemRefs.ts` (new)

Move the reference reading out of `remoteItemParser.ts` so the stub path and the full-parse path
read the same list.

```ts
export type RemoteItemRefSource = 'podroll' | 'publisher' | 'channel_remote_item' | 'value_time_split';

export type CollectedRemoteItemRef = {
  source: RemoteItemRefSource;
  feedGuid: string;
  feedUrl: string | null;
  itemGuid: string | null;
};

/** Every stored remote item reference of the channel, in source order, duplicates kept. */
export async function collectRemoteItemRefs(channel: Channel): Promise<CollectedRemoteItemRef[]>;
```

Source order is podroll, publisher, channel remote items, value time splits, reading through the
same services and relations `remoteItemParser.ts` uses today (value time splits only when
`channel.has_value_time_splits`). The caller passes a freshly loaded channel.

## Full-parse path — `remoteItemParser.ts`

Behavior stays the opt-in full recursive parse (R25). Refactor only:

- `handleAllRemoteItemsFeedParsing(channel, params)` reloads the channel with
  `channelService.get(channel.id)` as today, calls `collectRemoteItemRefs`, dedupes feed GUIDs
  case-insensitively keeping the first spelling, and calls `handleRemoteItemsFeedParsing(guids,
  params)` once.
- Delete `handleRemoteItemsPodrollParsing`, `handleRemoteItemsPublisherParsing`,
  `handleRemoteItemsChannelParsing`, and `handleRemoteItemsItemValueTimeSplitParsing`.
- `handleRemoteItemsFeedParsing` is unchanged (it still only queues feeds Podcast Index returns,
  which is R12 for this path). The monthly on-demand remote item limit is now checked once per
  source feed instead of once per source list; duplicate GUIDs are no longer looked up twice.

## Stub resolution — `remoteItemStubs.ts` (new)

Two layers: a provider-injected core other apps can call, and the parser's channel wrapper.

### Core

```ts
export const REMOTE_STUB_REFRESH_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
export const REMOTE_STUB_MAX_SINGLE_LOOKUPS_PER_RUN = 100;

/** At least one of feedGuid / feedUrl is non-null. Raw values; services normalize. */
export type RemoteStubRef = {
  feedGuid: string | null;
  feedUrl: string | null;
  itemGuid: string | null;
};

export type ResolveRemoteStubsOptions = {
  /** Pause before every single-key provider call after the first in a run. */
  rateLimitDelayMs: number;
  /** Cap on single-key provider calls (URL fallbacks and item lookups) per run. */
  maxSingleLookups: number;
  /** A stub resolved more recently than this is reused without a provider call. 0 re-resolves every ref. */
  refreshAfterMs: number;
  /** Feed GUIDs never stubbed, such as the source feed's own GUID. */
  excludeFeedGuids?: readonly string[];
};

export type RemoteStubRefOutcome =
  | { status: 'parsed' }
  | { status: 'stub'; channelStub: RemoteChannelStub }
  | { status: 'not_found' }
  | { status: 'unavailable' }
  | { status: 'skipped' };

export type ResolveRemoteStubsResult = {
  /** Aligned with the input refs. */
  outcomes: RemoteStubRefOutcome[];
  channelStubsWritten: number;
  itemStubsWritten: number;
  lookupCapReached: boolean;
};

export async function resolveRemoteStubsForRefs(
  provider: IndexProvider,
  refs: readonly RemoteStubRef[],
  options: ResolveRemoteStubsOptions
): Promise<ResolveRemoteStubsResult>;
```

Outcome meanings, which callers rely on:

- `parsed` — Podverse already has the feed (a `channel` with that `podcast_guid`, a `feed` with
  that URL, or a `feed` with the provider's feed id). No stub is written; read paths use the parsed
  row.
- `stub` — a channel stub exists for the ref after this run (written now, or a fresh existing one).
- `not_found` — the provider answered and does not know the feed. Nothing is written and nothing
  is remembered, so the next run asks again (R12, R17).
- `unavailable` — the lookup failed or the single-lookup cap was reached. Nothing is written or
  deleted; the next run asks again. An existing stale stub stays as it is and is still returned
  as `stub` when one exists (so the ref keeps rendering).
- `skipped` — no usable key after normalization, the feed GUID is in `excludeFeedGuids`, or the
  provider reports the feed dead (`isDead`).

Algorithm (keep it in this order; each step only touches refs still undecided):

1. Normalize each ref with `normalizeRemoteStubFeedGuid` / `normalizeRemoteStubFeedUrl` from
   `@podverse/orm` (plan 11). A ref with neither key is `skipped`. Group refs into **feed groups**
   keyed by normalized GUID, or by `url:<normalized url>` when the GUID is null. A group holds its
   GUID, its distinct URLs in order, and its distinct item GUIDs. Groups whose GUID is in the
   normalized `excludeFeedGuids` are `skipped`.
2. **Parsed check before any provider call.** GUID groups: one
   `new ChannelService().getAllByPodcastGuids({ select: { id: true, podcast_guid: true } }, guids)`;
   compare lowercased. URL-only groups: `new FeedService().getByUrl({ url })` per URL. Matches are
   `parsed` and get no item stubs.
3. **Existing stubs.** One `getChannelStubsForRefs` call with `{ feedGuid, feedUrl: firstUrl }` per
   remaining group. A stub whose `resolved_at` is within `refreshAfterMs` of now is **fresh**: the
   group is `stub` with that entity and makes no feed lookup. Others (no stub, or stale) need
   resolution; remember the stale entity.
4. **Batch by GUID.** One `provider.resolveFeedsByGuid(guids)` for the GUID groups that need
   resolution (the provider chunks). `unavailable` marks every one of those groups `unavailable`
   (falling back to the stale stub as `stub` when there is one) and skips step 5 for them.
5. **Single-key fallback.** For each group still unresolved that has URLs (a GUID group missing
   from the batch map, or a URL-only group): `provider.resolveFeed({ feedGuid: null, feedUrl })`
   for each URL in order until one is `found`. Each call counts toward `maxSingleLookups`, with
   `sleep(rateLimitDelayMs)` from `@podverse/helpers` before every call after the first single
   call of the run. When the cap is reached, set `lookupCapReached` and mark the remaining groups
   `unavailable`. A GUID group missing from the batch map with no URLs is `not_found`. All URLs
   `not_found` is `not_found`; any `unavailable` with no `found` is `unavailable`.
6. **Write channel stubs** for each group with a `found` feed, in group order:
   - `feed.isDead` → `skipped`; leave any existing stub for area G.
   - When `feed.indexProvider === 'podcast_index'` and
     `new FeedService().getByPodcastIndexId(Number(feed.providerFeedId))` returns a feed →
     `parsed`.
   - Otherwise `upsertChannelStub(feed, refKeys)` where `refKeys` is one `{ feedGuid, feedUrl }`
     per group URL (or a single `{ feedGuid, feedUrl: null }` when the group has none), so every
     key the source feed used becomes an alias. The group is `stub`; count it in
     `channelStubsWritten`.
7. **Item stubs** (R26, R27, R31). For every group that is `stub` and has item GUIDs: one
   `getItemStubsForRefs` call over those `{ feedGuid, feedUrl, itemGuid }` refs. For each item GUID
   with no item stub, or one whose `resolved_at` is older than `refreshAfterMs`:
   `provider.resolveItem({ providerFeedId: channelStub.provider_feed_id, feedGuid:
   channelStub.feed_guid, itemGuid })`, under the same cap and delay as step 5. `found` →
   `upsertItemStub(channelStub, item)` and count it. `not_found` / `unavailable` → nothing; the
   channel stub stays. An item stub is only ever written with its channel stub in hand, and groups
   that are `parsed` never get item stubs.
8. Map group outcomes back onto the input refs in order.

The core never calls `parseRSSFeedAndSaveToDatabase`, never queues MQ work, never touches
`imageHints`, and never writes `feed`, `channel`, `item`, `live_item`, `channel_image`, or
`item_image` rows. It does not catch errors from ORM calls; provider methods do not throw
(plan 10).

### Channel wrapper

```ts
/** Writes stubs for the channel's remote item references. Never throws. */
export async function resolveRemoteItemStubsForChannel(channel: Channel): Promise<void>;
```

- `getOptionalIndexProvider()`; null → return without reading anything.
- Reload the channel with `new ChannelService().get(channel.id)`; null → return.
- `collectRemoteItemRefs(latest)`; empty → return.
- Call the core with `rateLimitDelayMs: config.podcastIndex?.rateLimitDelay ?? 0`,
  `maxSingleLookups: REMOTE_STUB_MAX_SINGLE_LOOKUPS_PER_RUN`,
  `refreshAfterMs: REMOTE_STUB_REFRESH_AFTER_MS`, `excludeFeedGuids` = the channel's
  `podcast_guid` when set.
- One `loggerService.info` line: channel id, ref count, counts per outcome status,
  `channelStubsWritten`, `itemStubsWritten`, `lookupCapReached`.
- Catch everything and log with `loggerService.logError('resolveRemoteItemStubsForChannel', …)`,
  narrowing to `Error` the way nearby parser code does.

### Stub replacement on full parse (R30)

```ts
/** Deletes stubs for a feed that just finished a full parse. Never throws. */
export async function deleteRemoteStubsForParsedFeed(feed: Feed, channelId: number): Promise<void>;
```

- Reload the channel with `new ChannelService().get(channelId)` to read the saved `podcast_guid`
  (the `channel` variable in the parser predates `handleParsedChannel`).
- `new RemoteChannelStubService().deleteForParsedFeed({ podcastIndexId: feed.podcast_index_id,
  podcastGuid: latest?.podcast_guid ?? null, feedUrl: feed.url })`. Aliases and item stubs cascade
  (plan 11).
- Log the deleted count at info when it is above 0. Catch and `logError` on failure.

## Call sites — `parser.ts`

- Add `let parseSkippedNoChanges = false;` next to `parseSucceeded`, and set it to `true` in the
  `FeedNoChangesSinceLastParsedError` branch of the `catch`.
- In the `try`, right before `const feedLogService = new FeedLogService();` on the success path,
  `await deleteRemoteStubsForParsedFeed(feed, channel.id);`. Only a full successful parse replaces
  stubs; a parse that stops partway leaves them.
- Replace the closing block after `finally` with:

```ts
if (config.parser?.addRemoteItemsToMQ) {
  if (channel) {
    const remoteItems = await handleAllRemoteItemsFeedParsing(channel, {
      accountId: onDemandParserEvent?.accountId || null,
      remoteParentPodcastIndexId: podcast_index_id,
    });
    return { remoteItemsToParse: remoteItems, imageHints };
  }
} else if (channel && (parseSucceeded || parseSkippedNoChanges)) {
  await resolveRemoteItemStubsForChannel(channel);
}

return { remoteItemsToParse: [], imageHints };
```

The opt-in branch keeps today's gating. The stub branch runs after a successful parse and after a
no-changes skip, so a reference that was not in the index is asked again on every parse attempt of
its source feed (R17), and never after a spam, policy, lifecycle, or lock-loser stop (the lock
loser already returns early). Stub resolution runs in the parser worker after the feed's own
writes and its parsing lock are released.

## Exports — `packages/parser/src/index.ts`

Export `resolveRemoteStubsForRefs`, `REMOTE_STUB_REFRESH_AFTER_MS`,
`REMOTE_STUB_MAX_SINGLE_LOOKUPS_PER_RUN`, and the types `RemoteStubRef`,
`ResolveRemoteStubsOptions`, `RemoteStubRefOutcome`, `ResolveRemoteStubsResult` from
`./lib/rss/remoteItemStubs.js`. The channel wrapper and the delete helper stay internal.

## Env docs

- `apps/workers/.env.example`, the comment above `PARSER_ADD_REMOTE_ITEMS_TO_MQ=`: empty or false
  (default) writes remote stubs (minimal placeholder rows for referenced feeds the index provider
  knows) and parses nothing else; true instead queues a full parse of every referenced feed the
  provider knows, recursively, and writes no stubs.
- `apps/workers/ENV.md` § Parser Configuration, the `PARSER_ADD_REMOTE_ITEMS_TO_MQ` bullet: same
  meaning in a sentence or two.

No new env vars; the refresh window and lookup cap are code constants.

## Reuse

- Reference reading: the services `remoteItemParser.ts` already uses, moved into the collector
  and shared by both paths.
- Storage: plan 11's `RemoteChannelStubService` (`upsertChannelStub`, `getChannelStubsForRefs`,
  `deleteForParsedFeed`), `RemoteItemStubService` (`upsertItemStub`, `getItemStubsForRefs`), and
  the normalizers. Callers never normalize keys themselves beyond grouping.
- Provider: plan 10's `IndexProvider` (`resolveFeedsByGuid`, `resolveFeed`, `resolveItem`) and
  `PodcastIndexProvider`.
- Existing ORM lookups: `ChannelService.getAllByPodcastGuids`, `ChannelService.get`,
  `FeedService.getByUrl`, `FeedService.getByPodcastIndexId`.

## Tests

Unit tests (vitest, `npm run test -w @podverse/parser`), mocking `@podverse/orm`,
`@parser/context.js`, `@parser/config/index.js`, `@parser/factories/loggerService.js`, and
`sleep` from `@podverse/helpers` the way `parser.parseRSSFeedAndSaveToDatabase.hash-and-failure.test.ts`
does. Use a hand-written fake `IndexProvider` (an object with `vi.fn()` methods) in the core tests.

`remoteItemRefs.test.ts`:

- Collects podroll, publisher, channel remote item, and value time split refs in that order with
  `source`, `feedGuid`, `feedUrl`, `itemGuid`.
- Skips the item query when `has_value_time_splits` is false; returns publisher refs only when the
  channel has a publisher row.

`remoteItemStubs.test.ts` (core):

- GUID-only ref (no URL, item, title) found by the batch → one `upsertChannelStub` with the
  provider feed and `[{ feedGuid, feedUrl: null }]`; outcome `stub`; no single-key calls (R5).
- Batch miss with a feed URL → `resolveFeed({ feedGuid: null, feedUrl })`; `found` writes a stub;
  `not_found` writes nothing and the outcome is `not_found` (R12).
- Batch `unavailable` → no upsert, no delete call, outcomes `unavailable`; with a stale existing
  stub the outcome is `stub` with that stub.
- A GUID already held by a parsed channel → no provider call for it, outcome `parsed`. A found
  feed whose provider id matches an existing `feed` → `parsed`, no upsert.
- A fresh existing stub → no provider call; a stale one → re-resolved through the batch and
  upserted.
- `isDead` → `skipped`, no upsert. A ref whose GUID is in `excludeFeedGuids` → `skipped`.
- Item ref with a channel stub and no item stub → `resolveItem` with the stub's provider feed id →
  `upsertItemStub(channelStub, item)`. Item `not_found` → no item stub, channel stub still written
  (R31). A `parsed` group never calls `resolveItem`.
- Two refs to the same GUID (one with a URL, one without) → one batch entry, one upsert whose
  ref keys include both.
- `maxSingleLookups: 1` with two URL-only refs → the second is `unavailable`, `lookupCapReached`
  is true; `sleep` is called with `rateLimitDelayMs` before the second single call when the cap
  allows it.
- Nothing in the core calls an MQ or image-shrink function (assert the only writes are the stub
  upserts).

`remoteItemStubs.test.ts` (wrappers):

- `resolveRemoteItemStubsForChannel` with `getOptionalIndexProvider()` returning null reads no
  refs and calls no service.
- It passes the channel's `podcast_guid` as an excluded GUID, and a thrown ORM error is logged,
  not rethrown.
- `deleteRemoteStubsForParsedFeed` passes `podcast_index_id`, the reloaded `podcast_guid`, and
  `feed.url` to `deleteForParsedFeed`, and swallows a thrown error after logging it.

Parser tests:

- In all four existing parser test files listed under Files, add
  `vi.mock('@parser/lib/rss/remoteItemStubs.js', () => ({ resolveRemoteItemStubsForChannel: …,
  deleteRemoteStubsForParsedFeed: … }))` with hoisted `vi.fn()` mocks, so their current
  assertions keep passing.
- In `parser.parseRSSFeedAndSaveToDatabase.hash-and-failure.test.ts`, make the
  `@parser/config/index.js` mock read `addRemoteItemsToMQ` from a hoisted mutable object, then add:
  - Flag off, successful parse → `resolveRemoteItemStubsForChannel` called once with the channel,
    `handleAllRemoteItemsFeedParsing` not called, `remoteItemsToParse` is `[]`, and `imageHints`
    hold only the parsed feed's channel and item images (R19).
  - Flag on → `handleAllRemoteItemsFeedParsing` called and the stub resolver not called (R25).
  - `FeedNoChangesSinceLastParsedError` → stub resolver called (R17).
  - A non-skip failure (for example `handleParsedChannel` rejecting) → stub resolver not called.
  - Successful parse → `deleteRemoteStubsForParsedFeed` called with the feed and channel id; a
    failed parse → not called (R30).

No API routes change, so no API integration tests. No UI changes.

## Release scratchpad

```markdown
## Parser writes remote stubs instead of ignoring remote items

- Surfaces: workers (parser), api (parser context)
- Change: after a feed parses (or is skipped because it has not changed), the parser resolves
  every `podcast:remoteItem` it references (channel remote item lists, podroll, publisher and
  artist album references, value time splits) through the index provider and stores remote stubs:
  minimal channel rows, plus item rows when the reference names an item the provider knows. Feeds
  the provider does not know get nothing and are asked about again on the next parse of the source
  feed. Stubs never queue a full parse or an image shrink. A stub is deleted when its feed is later
  fully parsed. Stubs are refreshed from the provider after seven days; each parse makes at most
  100 single-feed or item lookups and leaves the rest for the next parse.
  `PARSER_ADD_REMOTE_ITEMS_TO_MQ=true` keeps the old behavior (queue a full parse of every
  referenced feed the provider knows) and then writes no stubs.
- Who notices: operators (more Podcast Index lookups per parse of feeds with remote items); users
  once the API and clients read stubs
- Operator steps: none; leave `PARSER_ADD_REMOTE_ITEMS_TO_MQ` empty for the stub path
```
