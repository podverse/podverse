**Cursor model:** Codex 5.3 · **Reasoning:** high

# 31 — Podroll and publisher-feed responses read stubs, not Podcast Index

Replace the per-request Podcast Index lookups in `buildRemoteItemsFinalResult` with remote stub
reads. A reference with no parsed row and no stub is not returned (R11). The `channelsUnadded` and
`itemsUnadded` arrays carry the stub DTOs from plan 11 instead of raw Podcast Index feeds and
episodes. Web (area E) and mobile (area F) render this shape.

## Rows

R2, R11, R20, R29, R33, R44

## Runs after

11, 30

## Files

packages/helpers/src/dtos/remoteItem.ts
apps/api/src/lib/remoteItems.ts
apps/api/src/lib/remoteItems.test.ts
apps/api/src/controllers/podroll.ts
apps/api/src/controllers/publisherFeed.ts
apps/api/src/lib/e2eArtistAlbumsFixture.ts
apps/api/src/test/e2e-artist-albums-fixture.test.ts
apps/api/src/test/publisher-feed-verified.integration.test.ts
apps/api/src/test/remote-item-stubs-podroll.integration.test.ts
apps/api/openapi.yml
tools/web/seed-e2e.mjs
release-notes/scratchpad.md

## Response shape (contract for areas E and F)

`packages/helpers/src/dtos/remoteItem.ts`. Replace the two response interfaces; keep
`RemoteItemGeneric` (widened in plan 30) and the stub DTOs plan 11 appended. Drop the now-unused
imports of `EpisodeByGuidResponse` and `PodcastBatchByFeedGuidResponse` from this file.

```ts
export interface RemoteItemsResponse {
  /** Parsed Podverse channels the references point to, in feed order. */
  channelsAdded: DTOChannel[];
  /**
   * Remote stubs for channel references no parsed channel matches, in feed order, one per stub.
   * A reference with neither a parsed channel nor a stub is left out.
   */
  channelsUnadded: DTORemoteChannelStub[];
  /** Parsed Podverse items the references point to, in feed order. */
  itemsAdded: DTOItem[];
  /**
   * Remote item stubs for item references whose channel is not parsed, in feed order, one per
   * stub. Each carries its channel stub. A reference without an item stub is left out, and so is
   * an item reference whose channel is parsed but whose item is not.
   */
  itemsUnadded: DTORemoteItemStub[];
}

export interface PublisherRemoteItemsResponse extends RemoteItemsResponse {
  channel: DTOChannel;
  /** Albums verified to this publisher (both feeds reference each other), in the publisher feed's order. */
  channelsAdded: DTOChannel[];
  /** Remote stubs for albums the publisher feed lists that Podverse has not parsed. */
  channelsUnadded: DTORemoteChannelStub[];
  /** Tracks on the verified albums, plus tracks credited to this publisher alone, newest first. */
  itemsAdded: DTOItem[];
  /** Always empty. Item references in a publisher feed are not shown; nothing can verify them. */
  itemsUnadded: DTORemoteItemStub[];
}
```

The stub DTOs, as plan 11 defines them (repeated here so E and F read one place):

```ts
export interface DTORemoteChannelStub {
  is_remote_stub: true;
  index_provider: IndexProviderId; // 'podcast_index'
  provider_feed_id: string;        // Podcast Index feed id as text, e.g. '920666'
  feed_guid: string | null;
  feed_url: string;
  title: string | null;
  author: string | null;
  image_url: string | null;        // raw provider image, never shrunk
  medium_id: number | null;
}

export interface DTORemoteItemStub {
  is_remote_stub: true;
  item_guid: string;
  provider_item_id: string | null;
  title: string | null;
  image_url: string | null;
  pub_date: string | null;         // ISO 8601
  duration_seconds: number | null;
  channel_stub: DTORemoteChannelStub;
}
```

Example `GET /podroll/channel/:idOrIdText` body:

```json
{
  "channelsAdded": [{ "id_text": "abc123def", "title": "Parsed Show", "...": "DTOChannel" }],
  "channelsUnadded": [
    {
      "is_remote_stub": true,
      "index_provider": "podcast_index",
      "provider_feed_id": "920666",
      "feed_guid": "917393e3-1b1e-5cef-ace4-edaa54e1f810",
      "feed_url": "https://example.com/feed.xml",
      "title": "Stubbed Show",
      "author": "Someone",
      "image_url": "https://example.com/art.jpg",
      "medium_id": 1
    }
  ],
  "itemsAdded": [],
  "itemsUnadded": [
    {
      "is_remote_stub": true,
      "item_guid": "episode-42",
      "provider_item_id": "16795090",
      "title": "Stubbed Episode",
      "image_url": null,
      "pub_date": "2026-03-01T12:00:00.000Z",
      "duration_seconds": 3723,
      "channel_stub": { "is_remote_stub": true, "index_provider": "podcast_index", "provider_feed_id": "920666", "...": "DTORemoteChannelStub" }
    }
  ]
}
```

What clients rely on:

- Stable React/list key: `${index_provider}:${provider_feed_id}` for a channel stub, plus
  `:${item_guid}` for an item stub. Stubs carry no Podverse `id` or `id_text`.
- Click target for a channel stub and an item stub alike is the provider search detail for the
  **channel**: `index_provider` + `provider_feed_id` (for an item stub, from `channel_stub`). Area
  D owns the route; today it is `/podcast-index/feed/<provider_feed_id>` on web and the
  Podcast Index preview screen on mobile.
- Image: `image_url` as is (no `channel_images` / `item_images` arrays).
- An item stub row shows the item (title, image falling back to `channel_stub.image_url`,
  `pub_date`, `duration_seconds`) with the channel stub's title as its subtitle (R29).
- No live status, description, or enclosure. An item stub cannot be played.
- An empty response (all four arrays empty) means render nothing, even when the channel's raw
  `channel_podroll_remote_items` count was non-zero.

## `apps/api/src/lib/remoteItems.ts` (rewrite)

The file shrinks to one function. Remove `isLocalFeedUrl`, `FinalRemoteItemsResult`,
`BuildRemoteItemsFinalResultOptions`, `podcastIndexFeedCacheKey`, `isPositivePodcastIndexId`,
`enrichMissedChannelsUnaddedByFeedUrl`, `cachePodcastIndexFeed`, `lookupPodcastIndexFeedByUrl`, and
the imports of `config`, `podcastIndexService`, `cacheGetJson` / `cacheSetJson`, and the E2E
fixture finders.

```ts
export async function buildRemoteItemsFinalResult(args: {
  channelsAdded: DTOChannel[];
  channelRefsUnmatched: readonly RemoteItemGeneric[];
  itemsAdded: DTOItem[];
  itemRefsUnmatched: readonly RemoteItemGeneric[];
}): Promise<RemoteItemsResponse>;
```

- Channel stubs: when `channelRefsUnmatched` is non-empty, call
  `new RemoteChannelStubService().getChannelStubsForRefs(refs.map((r) => ({ feedGuid: r.feed_guid, feedUrl: r.feed_url })))`.
  Walk the aligned result in order, skip nulls, skip a stub whose `id` was already emitted, map
  with `toDTORemoteChannelStub`.
- Item stubs: keep refs with a non-empty trimmed `item_guid`; when any remain, call
  `new RemoteItemStubService().getItemStubsForRefs(refs.map((r) => ({ feedGuid: r.feed_guid, feedUrl: r.feed_url, itemGuid: r.item_guid })))`.
  Skip nulls and repeated stub ids; map with `toDTORemoteItemStub(stub, stub.remote_channel_stub)`.
- Empty inputs make no service call (the category read test mocks `@podverse/orm` and relies on
  this).
- No Podcast Index call, no Valkey read or write, no `config.e2e.fixturesEnabled` branch. Errors
  from the stub services propagate (the controllers' `asyncHandler` returns 500), like the parsed
  lookups beside them.
- Existing `pi:feed:*` and `pi:episode:*` Valkey keys are left to expire.

## Controllers

- `apps/api/src/controllers/podroll.ts`:
  `buildRemoteItemsFinalResult({ channelsAdded: result.podrollChannelsAdded as unknown as DTOChannel[], channelRefsUnmatched: result.podrollChannelsUnadded, itemsAdded: result.podrollItemsAdded as unknown as DTOItem[], itemRefsUnmatched: result.podrollItemsUnadded })`.
  Keep the existing entity-to-DTO cast pattern and its comment style from `publisherFeed.ts`.
- `apps/api/src/controllers/publisherFeed.ts`: same call with `result.verifiedAlbums`,
  `result.notYetAddedAlbumRefs`, `result.tracks`, `[]`; drop the
  `enrichUnaddedChannelsByFeedUrl` option. Merge 410, `attachVerifiedPublishers`, and the
  `channel` field stay.

## E2E fixtures

- `apps/api/src/lib/e2eArtistAlbumsFixture.ts`: remove `buildE2eArtistNotYetAddedAlbumFeed`,
  `findE2eArtistAlbumFeedByGuid`, `findE2eArtistAlbumFeedByUrl`, `guidsMatch`, and the
  `PodcastBatchByFeedGuidResponse` import. Keep the constants and
  `buildE2eArtistNotYetAddedAlbumByIdResponse` (the Podcast Index preview endpoint in
  `apps/api/src/controllers/externalServices/podcastIndex.ts` still serves it). Rewrite the
  header comment to say the fixture backs the Podcast Index preview of the seeded artist's Not
  Yet Added album, whose list row comes from a seeded stub.
- `tools/web/seed-e2e.mjs`: right after the `channel_remote_item` insert for the music artist
  (the block listing `E2E Not Yet Added Album` and `E2E Unknown Album`, near line 2190), seed the
  stub the artist page reads. Keep the existing reference rows. Add constants beside
  `E2E_ARTIST_NOT_YET_ADDED_ALBUM_FEED_URL` (top of file, near line 213):
  `E2E_ARTIST_NOT_YET_ADDED_ALBUM_PODCAST_INDEX_ID = 2147483631`,
  `E2E_ARTIST_NOT_YET_ADDED_ALBUM_TITLE = 'E2E Not Yet Added Album'`,
  `E2E_ARTIST_NOT_YET_ADDED_ALBUM_IMAGE_URL = 'http://localhost:2111/e2e/images/e2e-embed-channel-art-1400.png'`,
  with the "Must match … e2eArtistAlbumsFixture.ts" comment covering them. Then:

  ```sql
  DELETE FROM remote_channel_stub
  WHERE index_provider = 'podcast_index' AND provider_feed_id = $1;

  INSERT INTO remote_channel_stub (
    index_provider, provider_feed_id, feed_guid, feed_url, title, author, image_url, medium_id
  ) VALUES (
    'podcast_index', $1, $2, $3, $4, 'E2E Music Artist', $5,
    (SELECT id FROM medium WHERE value = 'music' LIMIT 1)
  ) RETURNING id;

  INSERT INTO remote_channel_stub_alias (remote_channel_stub_id, key_kind, key_value)
  VALUES ($1, 'feed_guid', $2), ($1, 'feed_url', $3)
  ON CONFLICT (key_kind, key_value)
  DO UPDATE SET remote_channel_stub_id = EXCLUDED.remote_channel_stub_id;
  ```

  with `provider_feed_id = String(E2E_ARTIST_NOT_YET_ADDED_ALBUM_PODCAST_INDEX_ID)`, the GUID
  lowercased, and the URL as is. No stub for `E2E_ARTIST_UNKNOWN_ALBUM_PODCAST_GUID`, so the
  Unknown album stays hidden. `apps/web/e2e/artist-page-albums-and-tracks.spec.ts` and the mobile
  `artist.yaml` flow keep passing once E and F render stubs; this plan does not edit them.

## OpenAPI — `apps/api/openapi.yml`

- Replace `RemoteItemGeneric` (near line 5606; no other reference) with two schemas,
  `RemoteChannelStub` and `RemoteItemStub`, matching the DTOs above: every property listed as
  `required`, nullable fields with `nullable: true`, `is_remote_stub` as
  `type: boolean` + `enum: [true]`, `index_provider` as `type: string` + `enum: [podcast_index]`,
  `feed_guid` with `format: uuid`, `pub_date` with `format: date-time`, `channel_stub` as a `$ref`.
  Give each a short `description` ("Minimal placeholder for a remote feed the index provider knows
  but Podverse has not parsed. Open the provider search detail for the feed." / the item
  equivalent naming the channel stub).
- `RemoteItemsResultResponse`: `channelsUnadded.items` → `RemoteChannelStub`, `itemsUnadded.items`
  → `RemoteItemStub`, and a `description` stating feed order and that references with neither a
  parsed row nor a stub are left out.
- `PublisherFeedRemoteItemsResponse.description`: replace "as Podcast Index feeds. References
  Podcast Index does not know are left out." with "as remote stubs. References with no stub are
  left out."
- `/publisher-feed/channel/{id_or_id_text}` description (near line 20029): replace "(Podcast Index
  data)" with "(remote stubs)".
- `/podroll/channel/{id_or_id_text}` description (near line 19457): "Public endpoint. Returns
  podroll channels and items: parsed ones, and remote stubs for the rest. References with neither
  are left out."

## Usual endpoints stay stub-free (R20)

Stubs live only in the `remote_*_stub` tables (plan 11), and nothing in the channel, item, live
item, search, category, top, recent, subscription, or sitemap paths reads them. The read paths in
this plan and plan 32 are the API's only readers. No change to those endpoints. The integration
test below pins one of them.

## Tests

- `apps/api/src/lib/remoteItems.test.ts` (rewrite; drop the `enrichMissedChannelsUnaddedByFeedUrl`
  cases): `vi.mock('@podverse/orm')` with `RemoteChannelStubService`, `RemoteItemStubService`,
  and pass-through mappers; mock `@api/factories/podcastIndexService.js` with functions that throw.
  Cases: stubs come back in ref order and nulls are dropped; two refs resolving to one stub
  produce one entry; item refs without `item_guid` are not sent to the item service; empty
  inputs make no service call; the Podcast Index mock is never called.
- `apps/api/src/test/remote-item-stubs-podroll.integration.test.ts` (new), structured like
  `publisher-feed-verified.integration.test.ts` (real database, `startTestApp`, mocked
  `CategoryService`, a throwing `../factories/podcastIndexService.js` mock). Seed a source channel
  with a `channel_podroll` and these `channel_podroll_remote_item` rows, in this id order:
  1. a parsed channel by GUID;
  2. a parsed channel by URL only (random `feed_guid`, `feed_url` = the parsed feed's URL);
  3. a channel stub (seeded with `RemoteChannelStubService.upsertChannelStub`, ref keys = the
     row's GUID and URL);
  4. an unknown GUID with no stub;
  5. an item ref on the stubbed feed with an item stub (`RemoteItemStubService.upsertItemStub`);
  6. an item ref on the stubbed feed with no item stub;
  7. an item ref on the parsed GUID channel whose item is not parsed.
  Assert `channelsAdded` = [1, 2] by `id_text`; `channelsUnadded` = one entry with
  `is_remote_stub: true` and the seeded `provider_feed_id`; `itemsAdded` = []; `itemsUnadded` =
  one entry with the seeded `item_guid` and `channel_stub.provider_feed_id`; the Podcast Index mock
  was never called. Then the R20 pin: `GET /channel/podcast-index/<stub provider_feed_id>` returns
  200 with a `null` body. Use provider ids in a per-run range that cannot collide with seeded
  feeds, and delete the seeded feeds and stubs in `afterAll`.
- `apps/api/src/test/publisher-feed-verified.integration.test.ts`: drop the
  `podcastsBatchByFeedGuid` / `podcastGetByFeedUrl` fixture logic; make every mocked Podcast Index
  function throw. In `beforeAll`, seed a stub for `knownUnparsedGuid` with
  `upsertChannelStub({ indexProvider: 'podcast_index', providerFeedId: '880001', feedGuid: knownUnparsedGuid, feedUrl: <Album C url>, title: 'Known unparsed album', … }, [{ feedGuid: knownUnparsedGuid, feedUrl: <Album C url> }])`
  and delete it in `afterAll`. Replace `lowerPodcastGuids` with a helper reading `feed_guid`.
  Both `channelsUnadded` assertions become "one entry whose `feed_guid` is the known GUID and
  `is_remote_stub` is true". Album D (no stub) stays absent.
- `apps/api/src/test/e2e-artist-albums-fixture.test.ts`: delete the second test ("resolves only
  the fixture album …") and the now-unused imports; the preview endpoint test stays.
- `apps/api/src/test/category-channel-item-read.test.ts` needs no edit: its podroll and publisher
  mocks return no refs, so no stub service runs. Confirm the two shape assertions still hold.

## Release scratchpad

```markdown
## Remote item lists show stored stubs instead of live Podcast Index lookups

- Surfaces: api, web, mobile (response consumers)
- Change: `GET /podroll/channel/:idOrIdText` and `GET /publisher-feed/channel/:idOrIdText` no
  longer call Podcast Index on each request. `channelsUnadded` and `itemsUnadded` now hold remote
  stub objects (`is_remote_stub`, `index_provider`, `provider_feed_id`, `feed_url`, `title`,
  `author`, `image_url`, `medium_id`; item stubs add `item_guid`, `pub_date`,
  `duration_seconds`, and `channel_stub`) instead of raw Podcast Index feeds and episodes. A
  reference with no parsed row and no stored stub is left out of the response. The `pi:feed:*`
  and `pi:episode:*` cache keys are no longer written.
- Who notices: listeners see podroll and Not Yet Added album rows only for feeds the parser has
  stubbed; API clients reading the old Podcast Index fields must switch to the stub fields
- Operator steps: none for the API itself; existing references show again once their source feed
  is parsed again and stubs are written
```
