# 02 — Public legacy podcast lookup route

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

`POST /legacy/podcast/lookup` takes up to 2,000 v4 podcast ids and answers each with `channel`,
`feed_url`, `blocked`, or `not_here`. Signed-out phones use it after the v4 carryover read; old
`/podcast/:id` links can use it later (doc 11).

## Rows

R1, R2, R3, R4

## Runs after

01 (`v4_feed_url` column and rows).

## Files

- `packages/helpers/src/dtos/legacy/legacyPodcastLookup.ts` (new) and its barrel export
- `packages/orm/src/services/legacy/legacyPodcastLookup.ts` (new)
- `packages/orm/src/services/legacy/legacyPodcastLookup.test.ts` (new, pure ordering only)
- the ORM services barrel
- `apps/api/src/routes/legacy.ts` (new; copy the structure of `apps/api/src/routes/remoteItem.ts`
  and register it wherever `remoteItem` routes are registered)
- `apps/api/src/controllers/legacy.ts` (new)
- `apps/api/src/lib/rateLimiter.ts`
- the same env files plan `add-by-rss-directory-match/01` edited for its two limits:
  `apps/api/src/config/index.ts`, `apps/api/src/lib/startup/validation.ts`, `apps/api/.env.example`,
  `apps/api/ENV.md`, `infra/k8s/base/api/source/api.env`,
  `dev/env-overrides/local/rate-limit.env.example`, `scripts/local-env/setup.sh`,
  `packages/helpers-config/src/podverseTestEnv.ts`
- `apps/api/openapi.yml`
- `apps/api/src/test/legacy-podcast-lookup.integration.test.ts` (new)
- `packages/helpers-requests/src/api/legacy/legacyPodcastLookup.ts` (new) and `_request.ts`
- `release-notes/scratchpad.md`

## 1. DTOs

```ts
export const LEGACY_PODCAST_LOOKUP_MAX_IDS = 2000;
export const LEGACY_INSTALL_ID_HEADER = 'x-podverse-install-id';

export type DTOLegacyPodcastLookupChannel = DTOChannelDirectoryMatch & { image_url: string | null };

export type DTOLegacyPodcastLookupAnswer =
  | { podcast_id: string; kind: 'channel'; channel: DTOLegacyPodcastLookupChannel }
  | { podcast_id: string; kind: 'feed_url'; feed_url: string }
  | { podcast_id: string; kind: 'blocked' }
  | { podcast_id: string; kind: 'not_here' };
export type DTOLegacyPodcastLookupResponse = { answers: DTOLegacyPodcastLookupAnswer[] };
```

## 2. ORM service

`LegacyPodcastLookupService.lookup(podcastIds: readonly string[]):
Promise<DTOLegacyPodcastLookupAnswer[]>`, one answer per input in input order, duplicates
answered once each.

1. Load the `legacy_id_map` rows with `legacy_kind = 'podcast'` and `legacy_id = ANY($1)` in one
   query.
2. `dropped` → `blocked`. No row → `not_here`.
3. For the rest, find a channel in three batched passes, stopping per id at the first hit:
   1. `v5_id_text` (rows the library copy mapped);
   2. `resolve_key` as a Podcast Index id;
   3. `v4_feed_url` through `ChannelAddByRSSDirectoryMatchService.getForFeedUrls` (no guid).
   Passes 1 and 2 follow merges the way `ChannelController.getbyPodcastIndexId` does
   (`mergeRedirects.survivorIdTextForPodcastIndexId`, then the survivor by id_text), and keep
   only channels that pass the directory-match eligibility (`channel_about`, `public_visible`,
   Active or PendingArchive). Add batched variants (`...ForPodcastIndexIds`, `getManyByIdText`)
   where only single-id versions exist; do not loop 2,000 single queries.
4. A channel → `channel` with `DTOLegacyPodcastLookupChannel` (`image_url` is the channel's
   first image URL, the same one the channel list DTOs show; null when it has none). The phone
   builds its local subscription row from this, so it needs no second request per show. No
   channel and `v4_feed_url` set →
   `feed_url`. Otherwise `not_here`.

Put the per-id ordering (step 2–4 given the three lookups' results) in an exported pure function
for the unit test.

## 3. Route

`POST /legacy/podcast/lookup`, public, no `apiKeyAccess` (reads public catalog data, writes
nothing). Body: `podcast_ids` array of strings (each 1–14 chars, trimmed), min 1, max
`LEGACY_PODCAST_LOOKUP_MAX_IDS`. Response 200 `DTOLegacyPodcastLookupResponse`.

Two limiters, both applied:

| Env var | Default | Key |
| --- | --- | --- |
| `LEGACY_PODCAST_LOOKUP_MAX_PER_MINUTE` | `30` | IP |
| `LEGACY_PODCAST_LOOKUP_INSTALL_MAX_PER_MINUTE` | `10` | `X-Podverse-Install-Id` header (skip this limiter when the header is missing or not 16–64 characters of `[A-Za-z0-9_-]`) |

Read how `rateLimiter.ts` builds its limiters and add a key option if it has none. Log counts
only: ids asked and answers by kind.

OpenAPI: path, `security: []`, request, response, and the header parameter.

## 4. Request client

`reqLegacyPodcastLookup(api, { podcast_ids, install_id }): Promise<DTOLegacyPodcastLookupResponse>`
sending the install id header, plus the `ApiRequestService` method.

## Tests

`legacy-podcast-lookup.integration.test.ts`: insert `legacy_id_map` rows directly and seed
channels the way `channel-add-by-rss-directory-match.integration.test.ts` does. Cover each answer
kind, a mapped row whose channel was merged (survivor returned), a Podcast Index id whose channel
is not `public_visible` but whose `v4_feed_url` matches another eligible channel, input order with
duplicates, 2,001 ids → 400.

## Release scratchpad

```markdown
## Public legacy podcast lookup

- Surfaces: api, k8s base env
- Change: new `POST /legacy/podcast/lookup` answers up to 2,000 v4 podcast ids with the v5 channel,
  the v4 feed URL when v5 has not parsed the show, `blocked` for spam and takedown, or `not_here`.
  Read-only; never queues a parse.
- Who notices: no one directly; signed-out phones upgrading from v4 use it
- Operator steps: optional env `LEGACY_PODCAST_LOOKUP_MAX_PER_MINUTE` (default 30) and
  `LEGACY_PODCAST_LOOKUP_INSTALL_MAX_PER_MINUTE` (default 10)
```
