**Cursor model:** Codex 5.3 · **Reasoning:** high

# 40 — Add by RSS remote item lookup and resolve endpoints

Two authenticated API endpoints the Add by RSS surfaces call for the remote item references in a
device-stored feed, plus the shared DTOs and route builder every later plan in areas D, E, and F
uses.

- **Lookup** (database only, batch) answers "what is each reference already?" for list display:
a public parsed directory channel or item, a stored remote stub (channel or item), or nothing.
  It takes channel references and item references, from both lists an Add by RSS feed shows
  (podroll and the channel's `podcast:remoteItem` list).
- **Resolve** (one reference, on click) runs the R35 flow: a directory channel wins; otherwise the
  index provider is asked through plan 20's stub core, which creates or reuses a normal stub; the
  client then opens the provider search detail. When the provider does not know the feed, the
  client opens the Add by RSS search detail (plans 42 and 44). Resolve takes only the feed's keys,
  for an item reference too: a click on an item opens its channel (R28).

Add by RSS feeds are never stored in Postgres. Neither endpoint writes anything except a remote
stub for a feed the provider knows, which is the same row the parser would write (R14).

## Operator decisions this plan follows

First review, D24 (R45): "Add by RSS shows podroll, including episode rows, and the channel remote
item list, matching a directory feed. Value time splits stay without a new screen." Value time
split references in the Add by RSS bundle get no lookup, no list, and no screen (R34).

First review, D29 (R47), in the operator's words: "I think we want to go through the normal
podcast index process, but we want to be absolutely sure in our ad by RSS with password process
that we never, ever accidentally send that username and password to a different domain than the
one feed URL that we have it set for with the ad by RSS. So remote items should not inherit that
username and password."

So a tap on a remote item in a password-protected Add by RSS feed still resolves through Podcast
Index. The username and password are sent only to the domain of the feed URL they were saved for.
Remote items do not inherit them. The Podcast Index call sends only the remote feed GUID or feed
URL. § Credentials (R47) lists what this plan enforces.

## Rows
R14, R18, R35, R45, R47

## Runs after

10, 11, 20

## Files

packages/helpers/src/dtos/remoteItemResolve.ts
packages/helpers/src/dtos/index.ts
packages/helpers/src/lib/appRoutes.ts
packages/helpers/src/lib/appRoutes.test.ts
packages/helpers-requests/src/api/account/addByRSSRemoteItem.ts
packages/helpers-requests/src/api/_request.ts
apps/api/src/controllers/account/accountAddByRSSRemoteItem.ts
apps/api/src/lib/addByRSSE2eRemoteItemFixture.ts
apps/api/src/controllers/account/accountAddByRSSParse.ts
apps/api/src/routes/account.ts
apps/api/src/config/index.ts
apps/api/src/lib/startup/validation.ts
apps/api/.env.example
apps/api/ENV.md
infra/k8s/base/api/source/api.env
dev/env-overrides/local/rate-limit.env.example
scripts/local-env/setup.sh
apps/api/openapi.yml
apps/api/src/test/account-add-by-rss-remote-item.integration.test.ts
apps/api/src/test/api-key-routes-account-subscriptions-add-by-rss.integration.test.ts
packages/parser-mapping/src/addByRSS/remoteItemRefs.ts
packages/parser-mapping/src/addByRSS/remoteItemRefs.test.ts
packages/parser-mapping/src/index.ts
packages/i18n-catalog/consumer/originals/en-US.json
packages/i18n-catalog/consumer/originals/es.json
packages/i18n-catalog/consumer/originals/fr.json
packages/i18n-catalog/consumer/originals/el-GR.json
release-notes/scratchpad.md

## DTOs — `packages/helpers/src/dtos/remoteItemResolve.ts` (new)

A new file, not `remoteItem.ts`, so this plan does not edit the file plans 30 and 31 change. It
imports `DTORemoteItemStub` from there as a type only.
Export it from `packages/helpers/src/dtos/index.ts` on the line after `export * from './remoteItem.js';`.

```ts
import type { IndexProviderId } from '../lib/indexProvider.js';
import type { DTOChannelDirectoryMatch } from './channel/channelDirectoryMatch.js';
import type { DTORemoteItemStub } from './remoteItem.js';

/**
* One remote feed reference from a device-stored Add by RSS feed. At least one key is set. The
 * resolve body is exactly this shape: the remote feed's own keys and nothing else.
 */
export type AddByRSSRemoteItemRef = {
  feed_guid: string | null;
  feed_url: string | null;
};

/** One lookup reference. A non-empty `item_guid` makes it an item reference. */
export type AddByRSSRemoteItemLookupRef = AddByRSSRemoteItemRef & {
item_guid: string | null;
};

/**
 * What the provider search detail needs to open and paint its first frame. A
 * `DTORemoteChannelStub` satisfies this type, so list rows pass a stub straight to the route
 * builders.
 */
export type DTOIndexProviderFeedTarget = {
  index_provider: IndexProviderId;
provider_feed_id: string;
  feed_url: string;
  title: string | null;
  author: string | null;
  image_url: string | null;
};

/** A public parsed directory item an item reference names. */
export type DTOAddByRSSDirectoryItemMatch = {
  id_text: string;
title: string | null;
  /** The item's channel; its `medium_id` picks the episode or track route. */
  channel: DTOChannelDirectoryMatch;
};

export type DTOAddByRSSRemoteItemLookupResult =
  | { kind: 'channel'; channel: DTOChannelDirectoryMatch }
  | { kind: 'item'; item: DTOAddByRSSDirectoryItemMatch }
  | { kind: 'provider_feed'; provider_feed: DTOIndexProviderFeedTarget }
  | { kind: 'item_stub'; item_stub: DTORemoteItemStub }
| { kind: 'none' };

export type DTOAddByRSSRemoteItemLookupResponse = {
  /** Aligned with the request's `refs`. */
  results: DTOAddByRSSRemoteItemLookupResult[];
};

export type DTOAddByRSSRemoteItemResolveResult =
  | { kind: 'channel'; channel: DTOChannelDirectoryMatch }
  | { kind: 'provider_feed'; provider_feed: DTOIndexProviderFeedTarget }
/** The provider does not know the feed (or reports it as no longer updating). Open the Add by RSS search detail. */
  | { kind: 'not_found' }
  /** Podverse has a feed row for it that is not a public parsed channel (parsing, hidden, or blocked). */
  | { kind: 'directory_unavailable' };

export const ADD_BY_RSS_REMOTE_ITEM_LOOKUP_MAX_REFS = 100;
```

Which lookup kinds a reference can get:

| Reference | Possible results, in priority order |
| --- | --- |
| Channel (no `item_guid`) | `channel`, `provider_feed`, `none` |
| Item (`item_guid` set) | `item`, `channel`, `item_stub`, `provider_feed`, `none` |

An item reference gets `channel` when its channel is in the directory but the item is not, and
`provider_feed` when its feed has a channel stub but no item stub. Both open the channel, which is
where R28 sends a click on an item Podverse cannot show.

## Route builder — `packages/helpers/src/lib/appRoutes.ts`
Add next to `buildPodcastIndexFeedPath`, importing `IndexProviderId` as a type from
`./indexProvider.js`:

```ts
/** Web path of the provider search detail for one provider feed. */
export const buildIndexProviderFeedPath = (
  indexProvider: IndexProviderId,
  providerFeedId: string
): string => {
switch (indexProvider) {
    case 'podcast_index':
      return buildPodcastIndexFeedPath(providerFeedId);
    default: {
      const unhandled: never = indexProvider;
      return unhandled;
    }
  }
};
```
`buildPodcastIndexFeedPath(podcastIndexId: string)` already takes a string. `appRoutes.test.ts`:
one case,
`buildIndexProviderFeedPath('podcast_index', '920666') === '/podcast-index/feed/920666'`.

This builder is the single place a new provider's web route is added (R18). Areas E and the web
plans below call it; nothing builds `/podcast-index/feed/` by string concatenation for a stub or
target.

## API — `apps/api/src/controllers/account/accountAddByRSSRemoteItem.ts` (new)
`AccountAddByRSSRemoteItemController` with two static handlers. Model the auth and validation on
`accountAddByRSSChaptersTranscript.ts` (`ensureAuthenticated(req, res, () => validateBodyObject(…), { apiKeyAccess })`)
and errors on `handleGenericErrorResponse`.

Joi schemas. `feedUrlSchema` rejects a URL that carries userinfo: a custom check that fails when
`splitFeedUrlUserinfo(value)` from `@podverse/helpers` returns a non-null `username` or
`password`.

```ts
const feedUrlSchema = Joi.string()
  .trim()
  .uri({ scheme: ['http', 'https'] })
  .max(2048)
  .custom(rejectUrlUserinfo)
  .allow(null);

const refSchema = Joi.object({
  feed_guid: Joi.string().trim().max(64).allow(null),
  feed_url: feedUrlSchema,
})
  .or('feed_guid', 'feed_url')
  .unknown(false);

const lookupRefSchema = Joi.object({
  feed_guid: Joi.string().trim().max(64).allow(null),
  feed_url: feedUrlSchema,
  item_guid: Joi.string().trim().max(DATABASE_CONSTANTS.varchar_uri).allow(null),
})
  .or('feed_guid', 'feed_url')
.unknown(false);
```

Treat an empty trimmed string as null before use. `DATABASE_CONSTANTS` comes from
`@podverse/helpers`.

Shared mappers (module-private):

```ts
const toIndexProviderFeedTarget = (stub: DTORemoteChannelStub): DTOIndexProviderFeedTarget => ({
index_provider: stub.index_provider,
  provider_feed_id: stub.provider_feed_id,
  feed_url: stub.feed_url,
  title: stub.title,
  author: stub.author,
  image_url: stub.image_url,
});
```

`DTOChannelDirectoryMatch` from an `AddByRSSDirectoryChannelMatchRow`: `{ id_text: row.channelIdText, title: row.title, medium_id: row.mediumId }`,
the mapping `ChannelController.getDirectoryMatch` inlines in `apps/api/src/controllers/channel.ts`
(near line 203). Inline it here too as a module-private `toDirectoryMatchDto`.

### `lookup` — `POST /account/add-by-rss/remote-item/lookup`

Body `{ refs: AddByRSSRemoteItemLookupRef[] }`, `Joi.array().items(lookupRefSchema).min(1).max(ADD_BY_RSS_REMOTE_ITEM_LOOKUP_MAX_REFS).required()`.
`apiKeyAccess: { resource: 'add_by_rss', action: 'read' }`. No rate limit, the same as
`GET /channel/directory-match`, which does the same reads.

A reference is an item reference when its trimmed `item_guid` is non-empty. Steps, each one query
at most, skipped when its input is empty:

1. Directory channels: `new ChannelAddByRSSDirectoryMatchService().getForListedFeeds(...)` over
   every ref that has a `feed_guid`, channel and item refs alike (`{ feedGuid, feedUrl }`). Read
   each ref's match with `matches.get(feed_guid.trim().toLowerCase())`. URL-only refs skip this
   step (the service keys by GUID).
2. Directory items: for the item refs with a channel match, one
   `new ItemService().getManyByPodcastGuidAndItemGuid(params, { relations: { channel: true } })`,
   `params` deduped, each `{ podcast_guid: feed_guid.trim().toLowerCase(), item_guid: item_guid.trim() }`.
   The method already limits rows to active items. Key the rows by
`${row.channel.id_text}||${row.guid}` and read a ref's row with
   `${match.channelIdText}||${item_guid.trim()}`, so an item counts only when its channel is the
   public directory match from step 1. Map a row to
   `{ id_text: row.id_text, title: row.title, channel: toDirectoryMatchDto(match) }`.
3. Item stubs: one `new RemoteItemStubService().getItemStubsForRefs(...)` over the item refs with
   no channel match, `{ feedGuid: feed_guid, feedUrl: feed_url, itemGuid: item_guid }` (raw; the
   service normalizes). The result aligns with its input. Map with
   `toDTORemoteItemStub(stub, stub.remote_channel_stub)`, the call plan 31 makes.
4. Channel stubs: one `new RemoteChannelStubService().getChannelStubsForRefs(...)` over the channel
   refs with no channel match and the item refs with neither a channel match nor an item stub,
`{ feedGuid: feed_guid, feedUrl: feed_url }`. The result aligns with its input.
5. Respond `200 { results }` aligned with the request, by the table in § DTOs:
   - channel ref: `channel` (step 1), else `provider_feed` from
     `toIndexProviderFeedTarget(toDTORemoteChannelStub(stub))` (step 4), else `none`;
   - item ref: `item` (step 2), else `channel` when step 1 matched, else `item_stub` (step 3),
     else `provider_feed` (step 4), else `none`.

No provider call, no write. A ref with an `item_guid` never reaches the provider here or in
resolve.

### `resolve` — `POST /account/add-by-rss/remote-item/resolve`

Body: one `refSchema` object. A body with `item_guid` is a 400: a click on an item reference
resolves its feed, and the client sends only the feed's keys. Wrapped in a per-account limiter,
exported from the controller file the way `addByRssParseEnqueueRateLimit` is:

```ts
export const addByRssRemoteItemResolveRateLimit = rateLimitAuthEndpoint({
  windowMs: config.rateLimits.accountAddByRssRemoteItemResolve.windowMs,
  max: config.rateLimits.accountAddByRssRemoteItemResolve.max,
apiKeyAccess: { resource: 'add_by_rss', action: 'read' },
});
```

The action is `read`: nothing of the account changes, and the stub it may write is a shared
cache row the parser writes anyway.

Steps, in this order:

1. E2E: when `config.e2e.fixturesEnabled` and `isE2eRemoteItemNotFoundRef(ref)` (below), respond
`200 { kind: 'not_found' }` with no provider call.
2. Directory: `getForListedFeeds([{ feedGuid: feed_guid ?? '', feedUrl: feed_url }])`, read with
   `matches.get((feed_guid ?? '').trim().toLowerCase())` (a single URL-only ref is keyed `''`).
   A match → `200 { kind: 'channel', channel }`.
3. Stub core from `@podverse/parser` (plan 20):

   ```ts
   const { outcomes } = await resolveRemoteStubsForRefs(
     indexProvider,
     [{ feedGuid: feed_guid, feedUrl: feed_url, itemGuid: null }],
{ rateLimitDelayMs: 0, maxSingleLookups: 1, refreshAfterMs: REMOTE_STUB_REFRESH_AFTER_MS }
   );
   ```

   `indexProvider` from `@api/factories/indexProvider.js` (plan 10). `itemGuid` is always null, so
   the provider is asked about the feed only. Map `outcomes[0]`:
   - `stub` → `200 { kind: 'provider_feed', provider_feed: toIndexProviderFeedTarget(toDTORemoteChannelStub(outcome.channelStub)) }`.
     This covers both a fresh stub reused without a provider call and one written now (R35
     "create or reuse").
   - `parsed` → `200 { kind: 'directory_unavailable' }` (step 2 found no public parsed channel, yet
Podverse has the feed).
   - `not_found` and `skipped` → `200 { kind: 'not_found' }`.
   - `unavailable` → `503 { message: 'Index provider unavailable' }`. Nothing is written or
     deleted (the core guarantees it).

The handler never calls `parseRSSFeedAndSaveToDatabase` or queues MQ work. It sends the
reference's GUID or URL to the provider only on this explicit click; the lookup endpoint never
does.

### Credentials (R47)
The guarantees below hold for every Add by RSS feed, password-protected or not. Plans 45 and 46
hold the client half (§ Credentials in each).

- Neither endpoint accepts, reads, or forwards Add by RSS credentials. Both bodies are validated
  with `.unknown(false)` before any read, so a `username`, `password`, `credentials`, or envelope
  key is a 400. The handlers never call `sealAddByRssCredentialsForParse` or open an envelope,
  and never log a request body.
- A `feed_url` with userinfo (`https://user:pass@host/feed.xml`) is a 400 on both endpoints.
  Clients strip userinfo from bundle references before sending (`getAddByRSSRemoteItemRefs`
below), so a publisher-written URL with userinfo still resolves by its plain URL.
- The provider call carries only the remote feed's GUID, or its feed URL when it has no GUID.
  `itemGuid` is null, and the source feed's URL, title, and account are never part of the call
  or the body.
- A protected source feed changes nothing here: the request names only the remote feed, so the
  API cannot tell, and does not need to tell, whether the feed that listed it needs credentials.

### E2E fixture — `apps/api/src/lib/addByRSSE2eRemoteItemFixture.ts` (new)

```ts
/** Fixtures only. A remote item reference the index provider never knows; keeps the not-found path offline. */
export const E2E_ADD_BY_RSS_REMOTE_ITEM_NOT_FOUND_FEED_GUID = 'e2e0a5f0-0000-4000-8000-0000000000f1';
export const E2E_ADD_BY_RSS_REMOTE_ITEM_NOT_FOUND_FEED_URL =
  'https://e2e-seed-addbyrss.example/remote-not-found.xml';

export const isE2eRemoteItemNotFoundRef = (ref: AddByRSSRemoteItemRef): boolean => …;
```

True when the trimmed lowercased GUID equals the GUID constant or the trimmed URL equals the URL
constant.
### E2E remote items feed — `apps/api/src/controllers/account/accountAddByRSSParse.ts`

The web and mobile tests (plans 45 and 46) add one fixture feed whose podroll and channel remote
item list cover every row kind. In the fixture block:

- `E2eParsedFeedFixture` gains
  `podroll?: Array<{ feedGuid: string; feedUrl?: string; itemGuid?: string; title?: string }>;`
  (doc comment: "Channel-level `podcast:podroll` remote items."). `remoteItems` already exists
  and `buildE2eParsedFeedPayload` already maps it; leave that mapping as it is.
- `buildE2eParsedFeedPayload` spreads
  `...(source.podroll !== undefined ? { podroll: source.podroll.map((ref) => ({ ...ref })) } : {})`
  into the fixture object, beside `podcastPublisher` (partytime's key; parser-mapping's
  `compatChannelPodrollRemoteItemDtos` reads `parsedFeed.podroll`, including `itemGuid`).
- New constants `E2E_ADD_BY_RSS_PODROLL_FEED_URL = 'https://e2e-seed-addbyrss.example/podcast-podroll.xml'`
  and `E2E_DIRECTORY_MUSIC_TRACK_ONE_GUID = 'https://e2e-seed-music.example/album.xml#track-one'`
  (doc comment: "Sync with tools/web/seed-e2e.mjs: `${E2E_MUSIC_FEED_URL}#track-one`, the seeded
  track 'E2E Music Track One'."), and fixture `E2E_ADD_BY_RSS_PODROLL_PARSED_FEED`, built from
  `E2E_DEFAULT_PARSED_FEED` with `channelTitle: 'E2E Add-by-RSS Podroll Channel'`,
  `itemTitle: 'E2E Add-by-RSS Podroll Episode'`,
`itemGuid: 'https://e2e-seed-addbyrss.example/item-guid/podroll'`, and no `medium` (a podcast).
- Its `podroll`, in order:
  1. `{ feedGuid: E2E_DIRECTORY_MUSIC_ALBUM_PODCAST_GUID, feedUrl: E2E_DIRECTORY_MUSIC_FEED_URL, title: 'E2E Music Album' }`
     (the seeded directory album → a directory channel row);
  2. `{ feedGuid: E2E_ARTIST_NOT_YET_ADDED_ALBUM_PODCAST_GUID, feedUrl: E2E_ARTIST_NOT_YET_ADDED_ALBUM_FEED_URL }`
     (imported from `@api/lib/e2eArtistAlbumsFixture.js`; plan 31 seeds its stub → a stub row
     titled "E2E Not Yet Added Album");
  3. `{ feedGuid: E2E_ADD_BY_RSS_REMOTE_ITEM_NOT_FOUND_FEED_GUID, feedUrl: E2E_ADD_BY_RSS_REMOTE_ITEM_NOT_FOUND_FEED_URL, title: 'E2E Remote Not Found Feed' }`
     (→ a row that resolves to `not_found`);
  4. `{ feedGuid: E2E_DIRECTORY_MUSIC_ALBUM_PODCAST_GUID, feedUrl: E2E_DIRECTORY_MUSIC_FEED_URL, itemGuid: E2E_DIRECTORY_MUSIC_TRACK_ONE_GUID, title: 'E2E Music Track One' }`
(→ a directory item row).
- Its `remoteItems`, in order:
  1. `{ feedGuid: E2E_DIRECTORY_MUSIC_ALBUM_PODCAST_GUID, feedUrl: E2E_DIRECTORY_MUSIC_FEED_URL, itemGuid: E2E_DIRECTORY_MUSIC_TRACK_ONE_GUID, medium: 'music', title: 'E2E Music Track One' }`
     (→ a directory item row);
  2. `{ feedGuid: E2E_ARTIST_NOT_YET_ADDED_ALBUM_PODCAST_GUID, feedUrl: E2E_ARTIST_NOT_YET_ADDED_ALBUM_FEED_URL, itemGuid: 'https://e2e-seed-addbyrss.example/item-guid/not-yet-added-track', medium: 'music', title: 'E2E Not Yet Added Track' }`
     (no item stub, but its feed has plan 31's channel stub → a `provider_feed` row);
  3. `{ feedGuid: E2E_ADD_BY_RSS_REMOTE_ITEM_NOT_FOUND_FEED_GUID, feedUrl: E2E_ADD_BY_RSS_REMOTE_ITEM_NOT_FOUND_FEED_URL, itemGuid: 'https://e2e-seed-addbyrss.example/item-guid/remote-not-found', title: 'E2E Remote Not Found Episode' }`
     (→ an item reference that resolves its feed to `not_found`).
- Register it in `E2E_PARSED_FEEDS_BY_URL`.

### Route — `apps/api/src/routes/account.ts`

Import the controller and limiter. Right after the `'/add-by-rss/parse/status/:request_id'` route:

```ts
router.post(
  '/add-by-rss/remote-item/lookup',
  asyncHandler(AccountAddByRSSRemoteItemController.lookup)
);
router.post(
'/add-by-rss/remote-item/resolve',
  addByRssRemoteItemResolveRateLimit,
  asyncHandler(AccountAddByRSSRemoteItemController.resolve)
);
```

### Rate-limit env var

`ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_MAX_PER_MINUTE`, default `30`, per account per minute.
Add it in every file where `ACCOUNT_ADD_BY_RSS_CHAPTERS_TRANSCRIPT_MAX_PER_MINUTE` appears, right
after that key, in the same style:

- `apps/api/src/config/index.ts`: type `accountAddByRssRemoteItemResolve: { windowMs: number; max: number }`
  and `parseCountPerWindowEnvFromKey({ envValue: process.env.ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_MAX_PER_MINUTE, key: 'ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_MAX_PER_MINUTE', defaultMax: 30 })`.
- `apps/api/src/lib/startup/validation.ts`: `validateOptional(…, 'Add-by-RSS', 'Use Default (30)')`.
- `apps/api/.env.example`, `infra/k8s/base/api/source/api.env`,
  `dev/env-overrides/local/rate-limit.env.example`, `scripts/local-env/setup.sh`, `apps/api/ENV.md`:
  the value `30` and a one-line description ("Add by RSS remote item resolve calls per account
  per minute; each may ask the index provider").

## OpenAPI — `apps/api/openapi.yml`

Add both paths after `/account/add-by-rss/chapters-transcript` (near line 6445), modeled on it:
`tags`, `security` with the session and `apiKeyAuth` entries, and
`x-api-key-permission: add_by_rss:read` written the way the chapters-transcript path writes it.
`operationId`s `apiPostAccountAddByRSSRemoteItemLookup` and
`apiPostAccountAddByRSSRemoteItemResolve`.

Schemas (components, alphabetical with their neighbors): `AddByRSSRemoteItemRef` (resolve body:
`feed_guid`, `feed_url`, `additionalProperties: false`), `AddByRSSRemoteItemLookupRef` (adds
`item_guid`, `additionalProperties: false`), `AddByRSSRemoteItemLookupRequest` (`refs`,
`maxItems: 100`), `IndexProviderFeedTarget` (`index_provider` as `type: string` +
`enum: [podcast_index]`), `AddByRSSDirectoryItemMatch` (`id_text`, `title`, `channel`),
`AddByRSSRemoteItemLookupResult` and `AddByRSSRemoteItemResolveResult` (`oneOf` on `kind` with a
`discriminator`; the channel branch references the existing directory match schema
`apiGetChannelDirectoryMatch` returns; the `item_stub` branch references plan 31's
`RemoteItemStub`), `AddByRSSRemoteItemLookupResponse`. Both `feed_url` properties say a URL with
userinfo is rejected.

Responses: lookup 200, 400, 401; resolve 200, 400, 401, 429, 503. Descriptions state that lookup
reads only and resolve may ask the index provider, with only the remote feed's GUID or URL, and
store a remote stub.

## Request helpers — `packages/helpers-requests`

`src/api/account/addByRSSRemoteItem.ts` (new), modeled on `addByRSSChaptersTranscript.ts`:

```ts
export async function reqAccountAddByRSSRemoteItemLookup(
  api: ApiRequestService,
refs: AddByRSSRemoteItemLookupRef[]
) // POST /account/add-by-rss/remote-item/lookup, body { refs } → DTOAddByRSSRemoteItemLookupResponse

export async function reqAccountAddByRSSRemoteItemResolve(
  api: ApiRequestService,
  ref: AddByRSSRemoteItemRef
) // POST /account/add-by-rss/remote-item/resolve, body { feed_guid, feed_url } → DTOAddByRSSRemoteItemResolveResult
```

The resolve helper builds its body from `ref.feed_guid` and `ref.feed_url` by name, not by
spreading `ref`, so a caller holding a wider object cannot send extra keys. The lookup helper maps
each ref the same way, with `item_guid`.

Wire both into `ApiRequestService` in `_request.ts` (import block and class methods beside
`reqAccountAddByRSSChaptersTranscript`, or beside the other account Add by RSS methods if that one
is not on the class).

## Remote item references of a stored bundle — `packages/parser-mapping/src/addByRSS/remoteItemRefs.ts` (new)

Web (plan 45) and mobile (plan 46) both read an Add by RSS feed's podroll and channel remote item
list from its stored mapped bundle. One pure module, exported from
`packages/parser-mapping/src/index.ts` with `export * from './addByRSS/remoteItemRefs.js';` after
the `./addByRSS/itemIndex.js` line (mobile already imports this package's entry).
`AddByRSSMappedFeed` comes from `./types.js`; `splitFeedUrlUserinfo` from `@podverse/helpers`;
`AddByRSSRemoteItemRef` and `AddByRSSRemoteItemLookupRef` as types from `@podverse/helpers`.

```ts
/** `podroll` is `podcast:podroll`; `remote_items` is the channel's own `podcast:remoteItem` list. */
export type AddByRSSRemoteItemList = 'podroll' | 'remote_items';

export type AddByRSSBundleRemoteRef = {
  /** Trimmed and lowercased, or null. */
  feedGuid: string | null;
  /** Trimmed with userinfo removed, or null. */
  feedUrl: string | null;
  /** Trimmed, case kept, or null. Set for an item reference. */
  itemGuid: string | null;
  /** The reference's own `title` attribute, trimmed, or null. */
  title: string | null;
};
/**
 * References of one list in the bundle, in feed order. Channel and item references are both kept.
 * Deduped by feed key (GUID, else URL) plus item GUID. A reference with neither feed key, or one
 * naming the feed itself (`own.feedGuid` / `own.feedUrl`, compared the same way), is skipped.
 */
export const getAddByRSSRemoteItemRefs = (
  mappedFeed: AddByRSSMappedFeed | null | undefined,
  own: { feedGuid: string | null; feedUrl: string },
  list: AddByRSSRemoteItemList
): AddByRSSBundleRemoteRef[];

/** Lookup body entry: the reference's feed keys and item GUID. */
export const toAddByRSSRemoteItemLookupRef = (
  ref: AddByRSSBundleRemoteRef
): AddByRSSRemoteItemLookupRef;

/** Resolve body: the reference's feed keys only, for an item reference too. */
export const toAddByRSSRemoteItemResolveRef = (
  ref: AddByRSSBundleRemoteRef
): AddByRSSRemoteItemRef;
```

- `podroll` reads `mappedFeed?.channel?.podrollRemoteItems ?? []`; `remote_items` reads
  `mappedFeed?.channel?.remoteItems ?? []`. Both hold `{ feed_guid, feed_url, item_guid, title, medium_id }`.
  Publisher references (`publisherRemoteItems`) and value time split references are not read
  (R34).
- `feedUrl` is `splitFeedUrlUserinfo(raw).feedUrl` (the userinfo is dropped, not kept anywhere),
  or null when the raw value is blank.
- An empty trimmed `item_guid` is null.
Test file `packages/parser-mapping/src/addByRSS/remoteItemRefs.test.ts`: feed order kept for both
lists; each list reads only its own bundle field; item references kept with their `itemGuid`; a
channel reference and an item reference on the same feed are both kept; GUID dedupe is
case-insensitive; URL-only dedupe; a ref with neither key skipped; a ref to the feed itself
skipped; blank titles → null; a null bundle → `[]`; a feed URL with `user:pass@` comes back
without it; `toAddByRSSRemoteItemResolveRef` returns an object whose keys are exactly
`feed_guid` and `feed_url` for an item reference; `toAddByRSSRemoteItemLookupRef` adds
`item_guid` and nothing else.

## Copy for the area D screens

Plans 42–46 run on web and mobile, partly at the same time, so this plan adds every new string
they use, once, in `packages/i18n-catalog/consumer/originals/*.json` under the existing
`features.add_by_rss` object (after `login_prompt`). Sentence case; translate for `es`, `fr`, and
`el-GR`. Do not edit `overrides/`.

| Key | en-US |
| --- | --- |
| `remote_feed_explanation` | This feed is not in our directory or the Podcast Index. Add it by RSS to follow it in your Add by RSS library. |
| `remote_item_lookup_failed` | Could not look up this feed. Please try again later. |
| `remote_item_directory_unavailable` | This feed is not available right now. |
| `remote_item_not_found` | This feed could not be found. |

Existing keys the later plans reuse: `features.add_by_rss.label` ("Add by RSS"),
`features.add_feed.rss_link`, `info.podroll`, `misc.untitled`, `media.podcast.podcast_image`.
The Remote Items label is `info.remote_items`, which plan 52 adds for the directory section
(plan 62 adds `info.no_remote_items_found`); plans 45 and 46 reuse them and run after those plans.

## Reuse
- `ChannelAddByRSSDirectoryMatchService.getForListedFeeds` (the directory rule the publisher
  fan-out and `GET /channel/directory-match` use).
- `ItemService.getManyByPodcastGuidAndItemGuid` (existing; active items by channel GUID and item
  GUID).
- Plan 11: `RemoteChannelStubService.getChannelStubsForRefs`, `RemoteItemStubService.getItemStubsForRefs`,
  `toDTORemoteChannelStub`, `toDTORemoteItemStub`.
- Plan 20: `resolveRemoteStubsForRefs`, `REMOTE_STUB_REFRESH_AFTER_MS` (same parsed-wins, inactive-feed,
  alias, and freshness rules as the parser).
- Plan 10: the API `indexProvider` factory. No direct Podcast Index call.
- `splitFeedUrlUserinfo` (`@podverse/helpers`), the userinfo splitter the Add by RSS add flows use.

## Tests

`apps/api/src/test/account-add-by-rss-remote-item.integration.test.ts` (new). Real database,
`startTestApp`, `authHeaders`. Seed a parsed public channel with one active item the way
`channel-add-by-rss-directory-match.integration.test.ts` seeds the channel, a channel stub with
`RemoteChannelStubService.upsertChannelStub`, and an item stub on it with
`RemoteItemStubService.upsertItemStub`. Mock `../factories/indexProvider.js` with a hand-written
provider whose `resolveFeedsByGuid`, `resolveFeed`, `getFeedById`, and `resolveItem` are hoisted
`vi.fn()`s, set per case. Per-run random GUIDs and provider ids; delete seeded rows in
`afterAll`.

- Lookup, three channel refs (directory GUID, stubbed GUID, unknown GUID) → `channel`,
  `provider_feed` with the seeded `provider_feed_id`, `none`, in that order; no provider mock was
  called.
- Lookup, five item refs, in this order → results in the same order, no provider mock called:
  1. the directory channel's GUID and its item's GUID → `item` with that `id_text` and
     `channel.id_text`;
  2. the directory channel's GUID and an unknown item GUID → `channel`;
3. the stubbed feed's GUID and the item stub's GUID → `item_stub` with that `item_guid` and
     `channel_stub.provider_feed_id`;
  4. the stubbed feed's GUID and an unknown item GUID → `provider_feed` with the seeded
     `provider_feed_id`;
  5. an unknown GUID and an item GUID → `none`.
- Lookup with 101 refs → 400. Lookup without a session → 401.
- Resolve a directory GUID → `channel`; no provider call.
- Resolve a GUID the provider batch returns `found` → `provider_feed`; a stub row now exists for
  it (read back with `getChannelStubsForRefs`). The provider was asked with exactly that GUID:
  assert the arguments of the one provider call hold the GUID and no other value, and
`resolveItem` was never called.
- Resolve the stubbed GUID again → `provider_feed` and the provider mock was not called (fresh
  stub reused).
- Resolve where the provider returns `not_found` → `not_found`, no stub row. A `found` feed with
  `isDead: true` → `not_found`, no stub row.
- Resolve where the provider returns `unavailable` → 503, no stub row.
- Resolve with neither key → 400.
- Credentials (R47), each a 400 with no provider call and no stub row: resolve with an extra
  `username` and `password`; resolve with `item_guid`; resolve with a `feed_url` of
  `https://user:secret@feeds.example.com/feed.xml`; lookup with a ref carrying `credentials`;
lookup with a userinfo `feed_url`.

`api-key-routes-account-subscriptions-add-by-rss.integration.test.ts`: add both routes to the
table after `/account/add-by-rss/parse/status/…`:
`route('post', '/account/add-by-rss/remote-item/lookup', 'add_by_rss', 'read', { body: { refs: [{ feed_guid: <placeholder guid>, feed_url: null, item_guid: null }] } })`
and the resolve route with one ref body. Mock the index provider in that file so resolve never
leaves the process if the table's runner reaches the handler.

The parser-mapping and `appRoutes` unit tests are listed above.

## Release scratchpad

```markdown
## Add by RSS remote item lookup and resolve endpoints

- Surfaces: api, k8s base env
- Change: `POST /account/add-by-rss/remote-item/lookup` (up to 100 references, database reads
  only) tells a client what each podroll or `podcast:remoteItem` reference in a device-stored Add
  by RSS feed is: a public directory channel or item, a stored remote stub (channel or item), or
  neither. Item references are supported. `POST /account/add-by-rss/remote-item/resolve` handles a
click on one reference by its feed: a directory channel wins; otherwise it asks the index
  provider with only the remote feed's GUID or URL and creates or reuses a remote stub, or answers
  `not_found` (open the Add by RSS search detail) or `directory_unavailable`. Both need a session
  or an API key with `add_by_rss:read`. Neither accepts credentials or extra fields, and a feed
  URL carrying a username and password is rejected with 400. Resolve answers 503 when the
  provider is unreachable and never queues a parse. New env var
  `ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_MAX_PER_MINUTE` (default 30, per account).
- Who notices: Add by RSS listeners (through the podroll and remote item rows in later changes);
  API key users
- Operator steps: none; set the env var only to change the default limit
```
