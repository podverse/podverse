**Cursor model:** Codex 5.3 · **Reasoning:** high

# 10 — Index provider abstraction, Podcast Index first

Add a provider-neutral contract for "resolve a remote reference by feed GUID or feed URL", "look
up a provider feed id", and "resolve an item", with Podcast Index as the first and only
implementation. Nothing calls it yet; areas B (parser stub path), C (API read path), D (search
detail and Add by RSS), and G (re-check, merges) build on these exact names.

## Rows

R18

## Runs after

none

## Files

packages/helpers/src/lib/indexProvider.ts
packages/helpers/src/index.ts
packages/external-services-podcast-index/src/index.ts
packages/external-services-podcast-index/src/podcastIndexProvider.ts
packages/external-services-podcast-index/src/podcastIndexProvider.test.ts
apps/api/src/factories/indexProvider.ts
apps/workers/src/factories/indexProvider.ts

## Contract — `packages/helpers/src/lib/indexProvider.ts` (new)

Types only plus two tiny values, so the file is safe for the mobile barrel import. Export from
`packages/helpers/src/index.ts` next to `export * from './lib/remoteItem.js';`.

```ts
export const INDEX_PROVIDER_IDS = ['podcast_index'] as const;
export type IndexProviderId = (typeof INDEX_PROVIDER_IDS)[number];

export function isIndexProviderId(value: unknown): value is IndexProviderId;

/** A remote reference as it appears in a source feed. At least one key is non-null. */
export type IndexProviderFeedRef = {
  feedGuid: string | null;
  feedUrl: string | null;
};

export type IndexProviderFeed = {
  indexProvider: IndexProviderId;
  /** Provider's own feed id, always a string so non-numeric providers fit. */
  providerFeedId: string;
  /** Lowercased, trimmed; null when the provider reports none. */
  feedGuid: string | null;
  feedUrl: string;
  title: string | null;
  author: string | null;
  description: string | null;
  imageUrl: string | null;
  /** Raw medium string as the provider reports it (`podcast`, `music`, …). */
  medium: string | null;
  isDead: boolean;
};

export type IndexProviderItemRef = {
  providerFeedId: string;
  feedGuid: string | null;
  itemGuid: string;
};

export type IndexProviderItem = {
  indexProvider: IndexProviderId;
  providerFeedId: string;
  providerItemId: string | null;
  itemGuid: string;
  title: string | null;
  imageUrl: string | null;
  pubDate: Date | null;
  durationSeconds: number | null;
};

export type IndexProviderLookup<T> =
  | { status: 'found'; value: T }
  | { status: 'not_found' }
  | { status: 'unavailable' };

export interface IndexProvider {
  readonly id: IndexProviderId;
  resolveFeed(ref: IndexProviderFeedRef): Promise<IndexProviderLookup<IndexProviderFeed>>;
  resolveFeedsByGuid(
    feedGuids: readonly string[]
  ): Promise<IndexProviderLookup<ReadonlyMap<string, IndexProviderFeed>>>;
  getFeedById(providerFeedId: string): Promise<IndexProviderLookup<IndexProviderFeed>>;
  resolveItem(ref: IndexProviderItemRef): Promise<IndexProviderLookup<IndexProviderItem>>;
}
```

Semantics every caller relies on (put them in short doc comments on the interface):

- `not_found` means the provider answered and does not know the feed or item. `unavailable` means
  the lookup failed (network, 5xx, auth, retries exhausted). Callers never delete or overwrite an
  existing stub on `unavailable`.
- `resolveFeed` tries `feedGuid` first, then `feedUrl`. It returns `not_found` only when every
  key it tried was a clean miss; any failed request makes the result `unavailable`.
- `resolveFeedsByGuid` returns `found` with a map keyed by lowercased, trimmed GUID. GUIDs the
  provider does not know are absent from the map. It never returns `not_found`. Any failed chunk
  makes the whole result `unavailable`.
- Methods never throw for provider responses; they log unexpected failures through the service's
  `loggerService` and return `unavailable`.

## Podcast Index implementation — `podcastIndexProvider.ts` (new)

`export class PodcastIndexProvider implements IndexProvider`, constructor
`(service: PodcastIndexService)`, `readonly id = 'podcast_index'`. Re-export it from
`packages/external-services-podcast-index/src/index.ts` (`export * from './podcastIndexProvider.js';`
at the end of the file). Import `PodcastIndexService` as a type only to avoid a runtime cycle.

The existing `podcastGetByGuid`, `podcastGetById`, `podcastGetByFeedUrl`, and `episodeGetByGuid`
swallow every error into `null`, so they cannot tell a miss from a failure. The provider calls
`service.podcastIndexAPIRequest(url, config, { expectedMissStatuses: [400, 404] })` directly and
classifies:

- resolved with a usable feed or episode object → `found`
- resolved without one (missing `feed` / `episode`, missing positive `id`) → `not_found`
- rejected with HTTP status 400 or 404 → `not_found`
- any other rejection → `unavailable`

To read the status, change `function httpStatusFromUpstreamError` in
`packages/external-services-podcast-index/src/index.ts` to `export function` and import it. Leave
the existing service methods unchanged; their callers keep today's behavior.

Endpoints (all under `service.baseUrl`, same URL shapes the service already builds):

- `resolveFeed`: GUID → `GET /podcasts/byguid?guid=<encodeURIComponent(guid)>` reading `.feed`.
  URL → `GET /podcasts/byfeedurl?url=<encoded>` for the https variant, then the http variant,
  built from `canonicalHttpOrHttpsUrl` (`@podverse/helpers-validation`) the same way the private
  `deriveHttpsAndHttpUrlsFromInput` does. Skip the URL step when the GUID step found the feed.
- `resolveFeedsByGuid`: dedupe and lowercase input, `chunkArray(guids, 100)` from
  `@podverse/helpers`, `POST /podcasts/batch/byguid` with `{ method: 'POST', data: chunk }` per
  chunk, read `.feeds`. Empty input → `found` with an empty map, no request.
- `getFeedById`: reject a non-numeric or non-positive id as `not_found` without a request; else
  `GET /podcasts/byfeedid?id=<id>` reading `.feed`. Do not use the Lighthouse test-id mock in
  `podcastGetById`; stub resolution never sees those ids.
- `resolveItem`: `GET /episodes/byguid?guid=<encoded itemGuid>&feedid=<providerFeedId>`, reading
  `.episode`.

Mapping, as exported pure functions in the same file so tests cover them without HTTP:

- `toIndexProviderFeed(raw: unknown): IndexProviderFeed | null` — narrow with type guards (no
  `any`, no `as`). Requires a positive finite numeric `id` (number or numeric string) and a `url`
  that `canonicalHttpOrHttpsUrl` accepts; otherwise null. `providerFeedId = String(id)`,
  `feedGuid` from `podcastGuid` lowercased and trimmed (empty → null), `title` / `author` /
  `description` trimmed (empty → null), `imageUrl = podcastIndexFeedListImageUrl(raw)` from
  `@podverse/helpers` (image, then artwork), `medium` trimmed or null, `isDead = dead === 1`.
- `toIndexProviderItem(raw: unknown, providerFeedId: string): IndexProviderItem | null` — requires
  a non-empty `guid`. `providerItemId` from a positive `id`, else null. `title` trimmed or null.
  `imageUrl` = trimmed `image`, else trimmed `feedImage`, else null. `pubDate` from
  `datePublished` (unix seconds) when positive. `durationSeconds` from `itunes_duration`: a
  numeric string is seconds; `hh:mm:ss` / `mm:ss` goes through `hhmmssToSecondsNumber` from
  `@podverse/helpers`; anything else or ≤ 0 → null.

Live items get no special handling: whatever `/episodes/byguid` returns for a live item GUID is
mapped like any episode, and a miss is `not_found`.

## App factories (new)

- `apps/api/src/factories/indexProvider.ts`:
  `export const indexProvider: IndexProvider = new PodcastIndexProvider(podcastIndexService);`
  importing `podcastIndexService` from `./podcastIndexService.js`.
- `apps/workers/src/factories/indexProvider.ts`: `export function getIndexProvider(): IndexProvider`
  that lazily builds and caches `new PodcastIndexProvider(getPodcastIndexService())` from
  `./podcastIndexService.js`. No change to `apps/workers/src/index.ts`; the PI service is already
  set there before any command runs.

Parser-context wiring (`packages/parser/src/context.ts`) belongs to area B; management-api has no
Podcast Index service today and area G adds one if its re-check route needs it.

## Reuse

- `PodcastIndexService.podcastIndexAPIRequest` for auth headers, retries, and backoff.
- `podcastIndexFeedListImageUrl` for image preference, matching today's unadded rows.
- `canonicalHttpOrHttpsUrl`, `chunkArray`, `hhmmssToSecondsNumber`.

## Tests

`packages/external-services-podcast-index/src/podcastIndexProvider.test.ts`, mocking
`@podverse/helpers-requests` `requestWithUserAgent` exactly as `podcastGetByFeedUrl.test.ts` does
and building the service with `maxRetries: 0`:

- `resolveFeed` with a GUID that byguid finds → `found`, mapped fields, no byfeedurl request.
- `resolveFeed` GUID miss (200 without `feed.id`) then URL hit on the http variant → `found`.
- `resolveFeed` where both keys miss with 400/404 → `not_found`.
- `resolveFeed` where byguid rejects with 500 → `unavailable`.
- `resolveFeedsByGuid` with 150 GUIDs → two POST requests; map keyed by lowercased GUID; a 500 on
  either chunk → `unavailable`; empty input → no request.
- `getFeedById('abc')` → `not_found` with no request.
- `resolveItem` hit → `found` with `durationSeconds` from `"01:02:03"` = 3723 and `pubDate`.
- `toIndexProviderFeed` rejects a missing id, a non-http url, and maps `dead: 1` to `isDead`.

## Release scratchpad

none
