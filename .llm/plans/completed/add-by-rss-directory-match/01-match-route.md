# 01 — Public Add by RSS directory match route

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

A batch route that answers, for each Add by RSS feed URL, which directory channel it is (or none),
and which directory episode each listed Add by RSS episode is. Every later plan calls it.

## Rows

R1, R2, R3

## Runs after

Nothing in this set. If `v4-flagged-feed-block` prompt 02 has landed, leave its blocked-feed
check where it is; this plan does not touch it.

## Files

- `packages/helpers-validation/src/addByRSSFeedUrl.ts`
- `packages/helpers-validation/src/addByRSSFeedUrl.test.ts` (create if missing; search for an
  existing test of `canonicalAddByRSSFeedUrl` first and extend that file instead)
- `packages/helpers-validation/src/client.ts`
- `packages/helpers/src/dtos/channel/channelAddByRSSMatch.ts` (new)
- the `packages/helpers` DTO barrel that exports `DTOChannelDirectoryMatch` (find it with
  `rg -n "DTOChannelDirectoryMatch" packages/helpers/src`)
- `packages/orm/src/services/channel/channelAddByRSSDirectoryMatch.ts`
- `apps/api/src/routes/channel.ts`
- `apps/api/src/controllers/channel.ts` (the file holding `ChannelController.getDirectoryMatch`)
- `apps/api/src/lib/rateLimiter.ts`
- `apps/api/src/config/index.ts`
- `apps/api/src/lib/startup/validation.ts`
- `apps/api/.env.example`, `apps/api/ENV.md`
- `infra/k8s/base/api/source/api.env`
- `dev/env-overrides/local/rate-limit.env.example`
- `scripts/local-env/setup.sh` (the rate-limit `for v in …` list near L543)
- `packages/helpers-config/src/podverseTestEnv.ts`
- `apps/api/openapi.yml`
- `apps/api/src/test/channel-add-by-rss-match.integration.test.ts` (new)
- `packages/helpers-requests/src/api/channel/channel.ts`
- `packages/helpers-requests/src/api/_request.ts`
- `tools/web/seed-e2e.mjs` and `apps/web/e2e/helpers/seedConstants.ts` (one fixture channel)
- `release-notes/scratchpad.md`

## 1. URL variants helper

In `addByRSSFeedUrl.ts` add:

```ts
export function addByRSSDirectoryMatchUrlVariants(feedUrl: string): string[]
```

- Return `[]` when `feedUrl` has userinfo (`splitFeedUrlUserinfo(feedUrl)` reports credentials)
  or when `canonicalAddByRSSFeedUrl(feedUrl)` is `null`.
- Parse the canonical URL with `new URL`. Drop `hash`. `URL` already lowercases the host and
  drops a default port.
- Path forms: when `pathname` is `/`, only the host root `https://host/` form. Otherwise both
  the form without the trailing slash and the form with it.
- Schemes: `https` first, then `http`.
- Keep `search` exactly as it is. Keep `www.` exactly as it is.
- Return unique strings in this order: https no-slash, https slash, http no-slash, http slash.

Export it from `client.ts` beside the other `addByRSSFeedUrl.js` exports (L51–55) so mobile can
import it from `@podverse/helpers-validation/client`. `index.ts` already re-exports the file.

Tests: http/https, host case, default port, fragment, trailing slash, host root, query kept,
`www.` kept, userinfo returns `[]`, invalid returns `[]`.

## 2. DTOs and limits

`packages/helpers/src/dtos/channel/channelAddByRSSMatch.ts`:

```ts
export const ADD_BY_RSS_DIRECTORY_MATCH_MAX_FEEDS = 100;
export const ADD_BY_RSS_DIRECTORY_MATCH_MAX_ITEMS = 500;

export type DTOAddByRSSMatchItemRef = { guid: string | null; enclosure_url: string | null };
export type DTOAddByRSSMatchFeedRef = {
  feed_url: string;
  feed_guid: string | null;
  items: DTOAddByRSSMatchItemRef[];
};
export type DTOAddByRSSMatchItem = DTOAddByRSSMatchItemRef & { item_id_text: string | null };
export type DTOAddByRSSMatchFeed = {
  feed_url: string;
  channel: DTOChannelDirectoryMatch | null;
  items: DTOAddByRSSMatchItem[];
};
export type DTOAddByRSSMatchResponse = { matches: DTOAddByRSSMatchFeed[] };
```

Export from the barrel that exports `DTOChannelDirectoryMatch`.

## 3. ORM

In `ChannelAddByRSSDirectoryMatchService` add two methods. Reuse the channel filters of
`getForListedFeeds` (`channel_about` present, `feed_policy.public_visible`, lifecycle Active or
PendingArchive) by extracting the shared `where` / join pieces into a private helper; do not copy
them.

```ts
async getForFeedUrls(
  refs: readonly { feedUrl: string; feedGuid: string | null }[]
): Promise<Map<string, { channel: Channel; match: DTOChannelDirectoryMatch }>>
```

- Key the map by the input `feedUrl` as given.
- Build all variants with `addByRSSDirectoryMatchUrlVariants`, query `feed.url IN (...)` once, and
  join to the channel.
- When more than one feed row matches one input, take the one whose URL comes first in that
  input's variant order.
- Apply `urlMatchGuidAllowed` with `feedGuid`.
- `match` is built the same way `getForListedFeeds` builds `DTOChannelDirectoryMatch`.

```ts
async getItemIdTextsForChannel(
  channel: Channel,
  items: readonly { guid: string | null; enclosureUrl: string | null }[]
): Promise<(string | null)[]>
```

- Return one entry per input, same order.
- Drop a guid when `isDeviceLocalAddByRSSGuid(guid, channel.id_text)` is true.
- First `ItemService.getManyByGuid(channel, guids)`, then for the rest
  `ItemService.getManyByGuidEnclosureUrl(channel, enclosures.map(formatGuidEnclosureUrl))`.
  Both already filter to Active items. Read `formatGuidEnclosureUrl` in
  `packages/helpers/src/lib/item/item.ts` to confirm its input.

## 4. API route

`POST /channel/add-by-rss-match` in `apps/api/src/routes/channel.ts`, beside
`/directory-match`. Public with optional auth, the same way the remote-item resolve route
(`/add-by-rss/remote-item/resolve` in `routes/account.ts` L217) is wired. No `apiKeyAccess`: the
route reads public catalog data and writes nothing.

Rate limit with two env vars, mirroring `ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_MAX_PER_MINUTE`
and `ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_ANON_MAX_PER_MINUTE` in every file that lists those two:

| Env var | Default | Key |
| --- | --- | --- |
| `CHANNEL_ADD_BY_RSS_MATCH_MAX_PER_MINUTE` | `60` | signed-in account |
| `CHANNEL_ADD_BY_RSS_MATCH_ANON_MAX_PER_MINUTE` | `120` | IP |

Test env (`podverseTestEnv.ts`): `CHANNEL_ADD_BY_RSS_MATCH_ANON_MAX_PER_MINUTE: '10'` only if the
integration test checks a 429; otherwise use a value high enough that tests never hit it.

Joi body:

- `feeds`: array, min 1, max `ADD_BY_RSS_DIRECTORY_MATCH_MAX_FEEDS`, required.
- each feed: `feed_url` string max 2048 required; `feed_guid` string max 255, allow null,
  default null; `items` array default `[]`.
- each item: `guid` string max 2048 allow null default null; `enclosure_url` string max 4096
  allow null default null.

The controller returns 400 when the item total across feeds is over
`ADD_BY_RSS_DIRECTORY_MATCH_MAX_ITEMS`. It returns 200 `DTOAddByRSSMatchResponse` with one entry
per input feed, in input order. `items` is `[]` when `channel` is null; otherwise it echoes each
input item with its `item_id_text`.

Log once per request at info with counts only: feeds asked, feeds matched, items asked, items
matched. No URLs.

OpenAPI: add the path beside `apiGetChannelDirectoryMatch` (L14100–14127), `security: []`, with
request and response schemas.

## 5. Request client

In `packages/helpers-requests/src/api/channel/channel.ts` add `reqChannelAddByRSSMatch(api, body:
{ feeds: DTOAddByRSSMatchFeedRef[] }): Promise<DTOAddByRSSMatchResponse>` (POST, data in body), and
the matching method on `ApiRequestService` in `_request.ts` beside `reqChannelGetDirectoryMatch`
(L1158).

## 6. E2E fixture channel

Later plans need one directory channel whose feed URL can be typed into Add by RSS. In
`tools/web/seed-e2e.mjs` add a public, Active channel with `channel_about`, two Active items with
known guids and enclosure URLs, and the feed URL
`http://localhost:2111/feeds/directory-match-podcast.rss`. Use the same insert style as the
other seeded channels. Add the constants (`E2E_DIRECTORY_MATCH_CHANNEL_ID_TEXT`,
`E2E_DIRECTORY_MATCH_FEED_URL`, the two item id_texts and guids) to
`apps/web/e2e/helpers/seedConstants.ts`. Id texts follow **e2e-seed-nano-id-limits** (7–15 chars).
Do not add the RSS file under `tools/test-assets`: a match never fetches the feed.

## Tests

`apps/api/src/test/channel-add-by-rss-match.integration.test.ts`, following
`channel-add-by-rss-directory-match.integration.test.ts` and its `seedChannel()`:

- https input matches a channel stored with `http://` and a trailing slash.
- Query string difference does not match.
- Differing `feed_guid` does not match.
- A channel without `public_visible` does not match.
- URL with userinfo returns `channel: null`.
- Items: one matched by guid, one by enclosure URL, one unmatched; order preserved.
- 101 feeds returns 400; 501 items total returns 400.

Unit tests for the URL helper as listed in section 1.

## Release scratchpad

```markdown
## Public Add by RSS directory match route

- Surfaces: api, k8s base env
- Change: new `POST /channel/add-by-rss-match` takes up to 100 feed URLs (and up to 500 episode
  references) and returns the parsed directory channel each URL belongs to, plus the directory
  episode for each reference. URLs match after ignoring http/https, host case, default port,
  fragment, and a trailing slash; a different `podcast:guid` is not a match.
- Who notices: no one directly; clients use it to turn Add by RSS feeds into subscriptions
- Operator steps: optional env `CHANNEL_ADD_BY_RSS_MATCH_MAX_PER_MINUTE` (default 60) and
  `CHANNEL_ADD_BY_RSS_MATCH_ANON_MAX_PER_MINUTE` (default 120)
```
