# Sub-Plan 07d: podcast:remoteItem, podcast:podroll, podcast:publisher (channel)

**Parent:** [07-complex-tags-implementation.md](07-complex-tags-implementation.md). Execute **last** among 07a–07d; requires generator-loop change to pass **writtenFeedInfo** (url + feedGuid per written feed) and for `buildFeed` to return the current feed’s channel GUID.

## Objective

Emit channel-level `<podcast:remoteItem>`, `<podcast:podroll>` (with child remoteItems), and `<podcast:publisher>` (with nested remoteItem medium=publisher) pointing to already-written feeds. First generated feed must not include these; only feeds 2..N may reference feeds from the current run. Parser-mapping compat for remote item, podroll, and publisher must run without error.

## Authority

- **Spec — Podroll:** [Podcast Namespace: Podroll](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/tags/podroll.md) — parent `<channel>`, count **single**. Node value: one or more `<podcast:remoteItem>` elements. Used for "creator recommendations" / "shows you might like". Minimal: `feedGuid` only; recommended: also `feedUrl` (fallback when app can't resolve GUID) and `title` for display. Not normally used with `itemGuid` (podroll links to shows, not episodes).
- **Spec — Remote Item:** [Podcast Namespace: Remote Item](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/tags/remote-item.md) — parent `<channel>`, `<podcast:podroll>`, `<podcast:valueTimeSplit>`, or `<podcast:publisher>`; count **multiple**. Attributes: **feedGuid** (required, podcast:guid of remote feed), **feedUrl** (optional, fallback), **itemGuid** (optional, for pointing to an item in the remote feed), **medium** (optional, if feed is not 'podcast'), **title** (optional, hint for display). When both feedGuid and feedUrl are present, feedGuid takes precedence.
- **Spec — Publisher:** [Podcast Namespace: Publisher](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/tags/publisher.md) — parent `<channel>`, count **single**. Must contain **exactly one** `<podcast:remoteItem medium="publisher">` pointing to the publisher feed (parent entity attesting ownership). For widest compatibility, **feedUrl** on that remoteItem is highly recommended. See also [publisher feed documentation](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/examples/publishers/publishers.md) and [medium](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/tags/medium.md).
- **Partytime:** `phase-6.ts` — `remoteItem`, `podroll` (Phase6RemoteItem: feedGuid required; itemGuid, feedUrl, medium, title optional). `phase-7.ts` — `podcastPublisher` (Phase7Publisher: from nested `<podcast:remoteItem medium="publisher">` with feedGuid, feedUrl).
- **Parser-mapping:** `packages/parser-mapping/src/compat/partytime/channel.ts` — `compatChannelRemoteItemDtos`, `compatChannelPodrollRemoteItemDtos`, `compatChannelPublisherRemoteItemDtos`.

## Feed-order constraint

- **writtenFeedInfo:** The spec requires **feedGuid** (the `<podcast:guid>` of the remote feed) for every remoteItem/podroll/publisher target. The generator must pass both URL and GUID for each previously written feed. Use `writtenFeedInfo: { url: string, guid: string }[]`: the loop accumulates this list; `buildFeed` returns `{ xml: string, channelGuid: string }` so the loop can push `{ url, guid: channelGuid }` after each write and pass `writtenFeedInfo` into each subsequent `buildFeed` call.
- **First feed:** The first feed written in the run must not include remoteItem, podroll, or publisher (writtenFeedInfo is empty).
- **Random choice:** When emitting remoteItem/podroll/publisher, choose target(s) randomly from writtenFeedInfo (use both `guid` and `url` for feedGuid and feedUrl).

## XML shapes

- Structure follows the [podroll](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/tags/podroll.md), [remote-item](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/tags/remote-item.md), and [publisher](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/tags/publisher.md) specs: one `<podcast:podroll>` per channel containing one or more `<podcast:remoteItem>`; remoteItem may also appear as direct channel children or inside `<podcast:publisher>`. Publisher: exactly one per channel, containing exactly one remoteItem.
- **remoteItem:** `<podcast:remoteItem feedGuid="..." feedUrl="..." itemGuid="..." medium="..." title="..."/>`. feedGuid required; feedUrl/title recommended for podroll; itemGuid/medium optional.
- **podroll:** Single channel child: `<podcast:podroll><podcast:remoteItem feedGuid="..." feedUrl="..." title="..."/><podcast:remoteItem .../></podcast:podroll>`.
- **publisher:** Per [publisher spec](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/tags/publisher.md): single channel child containing **exactly one** `<podcast:remoteItem medium="publisher">`. Include **feedUrl** for widest compatibility: `<podcast:publisher><podcast:remoteItem medium="publisher" feedGuid="..." feedUrl="..."/></podcast:publisher>`.

## Publisher feeds (medium=publisher)

- For feeds with `<podcast:medium>publisher</podcast:medium>`, remote items (e.g. in podcast:remoteItem or podroll) must **always have a medium tag**; the 2 (or multi count) remote items must use the **same** inline medium (e.g. both podcast, or both music). See [../10-test-data-spec.md](../10-test-data-spec.md).

### Spec context: Publisher Medium and two-way linking

- **Medium tag:** [Podcast Namespace: Medium](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/tags/medium.md) — `publisher` denotes a feed that links to other feeds the publisher owns via `<podcast:remoteItem>`. See the [publisher feed doc](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/examples/publishers/publishers.md) and [publisher tag](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/tags/publisher.md).
- **Publisher feed requirements** ([publishers.md](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/examples/publishers/publishers.md)): A feed with medium `publisher` must have in its `<channel>`: (1) `<podcast:medium>publisher</podcast:medium>`, (2) a valid `<podcast:guid>`, (3) **one or more** `<podcast:remoteItem>` linking to child podcast (or other) feeds. Each such remoteItem should include `medium` (e.g. `podcast` or `music`).
- **Two-way validation:** The publisher feed links to its child feeds via channel-level remoteItem; child feeds link back via `<podcast:publisher>` containing one `<podcast:remoteItem medium="publisher">`. If a feed points to a publisher feed but the publisher feed does not reference that feed, apps should discard the association. For test data: when generating a publisher feed (medium=publisher), it should list child feeds via remoteItem; when generating non-publisher feeds that include `<podcast:publisher>`, the target should ideally be a feed that (in the same run) lists them back—achievable if we emit a publisher-type feed first and then have later feeds point to it via `<podcast:publisher>` (and optionally have the publisher feed’s remoteItems include those later feeds only when we extend to full two-way linking).

## Implementation steps

1. **buildFeed return value:** Change `buildFeed` to return `{ xml: string, channelGuid: string }` (channelGuid is the `<podcast:guid>` emitted for this feed). The loop needs it to build writtenFeedInfo for later feeds.
2. **Generator loop:** Update the CLI loop so it maintains `writtenFeedInfo: { url: string, guid: string }[]`. Before calling `buildFeed`, pass `writtenFeedInfo` in. After writing a feed, compute this feed’s URL (e.g. `baseUrl/feeds/<filename>`), take `channelGuid` from the return value, and push `{ url, guid: channelGuid }` onto writtenFeedInfo.
3. **buildFeed:** When `writtenFeedInfo.length > 0`, optionally emit channel-level remoteItem and/or podroll (e.g. on a subset of feeds; random count and random choice of targets from writtenFeedInfo). For publisher tag, emit **exactly one** `<podcast:publisher>` with **exactly one** `<podcast:remoteItem medium="publisher" feedGuid="..." feedUrl="..."/>`; use both `guid` and `url` from the chosen writtenFeedInfo entry.
4. **Publisher feed rule:** When generating a feed with medium publisher, ensure any emitted remoteItem/podroll entries use the same medium on each remoteItem.
5. Remove or update placeholder comments for remoteItem, podroll, publisher from Sub-Plan 04 (file-header in generate-feed-cli.ts).
6. Run generate (e.g. 2 sets); parse feeds with Partytime; run compatChannelRemoteItemDtos, compatChannelPodrollRemoteItemDtos, compatChannelPublisherRemoteItemDtos where applicable; confirm no throw and DTOs match.

## Acceptance criteria

- First written feed in a run contains no remoteItem, podroll, or publisher. Subsequent feeds may contain them, pointing to previously written feeds via feedGuid and feedUrl from writtenFeedInfo.
- Partytime parses without error; compat DTOs for remote item, podroll, and publisher run without throw.
- Publisher XML: exactly one `<podcast:publisher>` per channel containing exactly one `<podcast:remoteItem medium="publisher">` with feedGuid and feedUrl. Publisher feeds use same medium for all remote items.

## Run after this plan

From repo root: `npm run generate -w podverse-test-assets -- 2 --items 20 --multi 2`. Parse generated feeds (especially feed 2+); run channel compat for remoteItem, podroll, publisher. Fix any parse or compat errors.
