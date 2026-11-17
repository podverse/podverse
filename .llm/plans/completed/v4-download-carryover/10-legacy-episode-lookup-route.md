# 10 — Public legacy episode lookup route

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

`POST /legacy/episode/lookup` takes what a v4 phone stored for each downloaded directory episode
(v4 episode id, v4 podcast id, guid, media URL) and answers each with the v5 item and its
channel, the channel alone, the v4 feed URL, `blocked`, or `not_here`. Signed-out phones call it
during the v4 download carryover (area D, plans 40–49). It is the episode-level sibling of
`POST /legacy/podcast/lookup` and reuses that service's channel resolution, so a show resolves to
the same channel on both routes.

Extra high because area D and area E build on this contract and the set runs tests only at the
end. It also refactors the shipped podcast lookup service, whose behavior must not change.

## Rows

R3

## Runs after

none

## Files

- `packages/helpers/src/dtos/legacy/legacyEpisodeLookup.ts` (new)
- `packages/helpers/src/dtos/index.ts`
- `packages/orm/src/services/legacy/legacyPodcastLookup.ts`
- `packages/orm/src/services/legacy/legacyEpisodeLookup.ts` (new)
- `packages/orm/src/services/legacy/legacyEpisodeLookup.test.ts` (new)
- `packages/orm/src/services/item/item.ts`
- `packages/orm/src/index.ts`
- `apps/api/src/controllers/legacy.ts`
- `apps/api/src/routes/legacy.ts`
- `apps/api/src/config/index.ts`
- `apps/api/src/lib/startup/validation.ts`
- `apps/api/.env.example`
- `apps/api/ENV.md`
- `infra/k8s/base/api/source/api.env`
- `dev/env-overrides/local/rate-limit.env.example`
- `scripts/local-env/setup.sh`
- `packages/helpers-config/src/podverseTestEnv.ts`
- `apps/api/openapi.yml`
- `apps/api/src/test/legacy-episode-lookup.integration.test.ts` (new)
- `packages/helpers-requests/src/api/legacy/legacyEpisodeLookup.ts` (new)
- `packages/helpers-requests/src/api/_request.ts`
- `release-notes/scratchpad.md`

## Scope

Only directory-origin v4 downloads use this route: the v4 podcast id is a v4 database id
(1–14 characters). A v4 Add by RSS download has the feed URL as its podcast id and a hash as its
episode id, so it carries no v4 database id. Those already have a public route:
`POST /channel/add-by-rss-match` (`ChannelController.matchAddByRSS`) maps a feed URL plus each
item's guid and enclosure URL to a directory channel and item. Area D sends Add by RSS-origin
downloads there. This plan does not change that route.

Read-only. Never queues a parse, never writes `legacy_id_map`.

## Why episode rows alone are not enough

`legacy_id_map` allows `legacy_kind = 'episode'` rows (`v5_kind = 'item'`), but the v4 library
copy writes them only for episodes in a copied account's library
(`resolvedMappings` in `apps/workers/src/commands/orm/v4Library/copyAccountLibraryApply.ts`,
the `legacyKind: 'episode'` push). Most signed-out downloads have no episode row, so the route
falls back to a guid-then-media-URL match inside the channel the podcast id resolves to. The
library copy itself matches the same way (`resolveItemId` in that file: guid, then
`guid_enclosure_url_digest`).

## 1. DTOs

New file `packages/helpers/src/dtos/legacy/legacyEpisodeLookup.ts`, exported from
`packages/helpers/src/dtos/index.ts` next to `./legacy/legacyPodcastLookup.js` (line 73). The
barrel reaches mobile through `@podverse/helpers/dto`.

```ts
import type { DTOLegacyPodcastLookupChannel } from './legacyPodcastLookup.js';

/** One lookup accepts at most this many episodes. */
export const LEGACY_EPISODE_LOOKUP_MAX_EPISODES = 200;

/** What a v4 phone stored for one downloaded directory episode. */
export type DTOLegacyEpisodeLookupRef = {
  episode_id: string;
  podcast_id: string;
  guid: string | null;
  media_url: string | null;
};

export type DTOLegacyEpisodeLookupAnswer =
  | {
      episode_id: string;
      kind: 'item';
      item_id_text: string;
      channel: DTOLegacyPodcastLookupChannel;
    }
  | { episode_id: string; kind: 'channel'; channel: DTOLegacyPodcastLookupChannel }
  | { episode_id: string; kind: 'feed_url'; feed_url: string }
  | { episode_id: string; kind: 'blocked' }
  | { episode_id: string; kind: 'not_here' };

export type DTOLegacyEpisodeLookupResponse = { answers: DTOLegacyEpisodeLookupAnswer[] };
```

Kinds:

- `item` — a v5 directory item. `channel` is that item's channel (after merges), which is the
  channel the phone writes on the download row.
- `channel` — the show resolves to a directory channel, but no item in it matches the guid or
  media URL. Area D decides what the file becomes.
- `feed_url` — the show has no directory channel; the v4 feed URL is returned so the phone can
  save it as an Add by RSS feed, as the podcast lookup does.
- `blocked` — the podcast row is `dropped` (spam or takedown). The file is unmigratable.
- `not_here` — no podcast row resolves and no episode row maps.

The answer carries no item title, enclosure, or artwork. The phone already has those from v4
`DOWNLOADED_PODCASTS`; the server answer is the identity and the channel.

`DTOLegacyEpisodeLookupRef` is a request shape only. No mobile SQLite column stores it.

## 2. Podcast lookup refactor (`legacyPodcastLookup.ts`)

Make the per-id ordering and the channel resolution reusable without changing what
`POST /legacy/podcast/lookup` returns. `legacyPodcastLookup.test.ts` and
`legacy-podcast-lookup.integration.test.ts` must pass unchanged.

1. Make the channel maps type generic with a default:

   ```ts
   export type LegacyPodcastLookupChannelMaps<TChannel = DTOLegacyPodcastLookupChannel> = {
     byIdText: ReadonlyMap<string, TChannel>;
     byPodcastIndexId: ReadonlyMap<string, TChannel>;
     byFeedUrl: ReadonlyMap<string, TChannel>;
   };
   ```

2. Add the resolution type and move the body of `answerForId` into a generic exported function:

   ```ts
   export type LegacyPodcastResolution<TChannel> =
     | { kind: 'channel'; channel: TChannel }
     | { kind: 'feed_url'; feed_url: string }
     | { kind: 'blocked' }
     | { kind: 'not_here' };

   export function resolveLegacyPodcastAnswer<TChannel>(
     podcastId: string,
     rowsByLegacyId: ReadonlyMap<string, LegacyPodcastLookupRow>,
     channels: LegacyPodcastLookupChannelMaps<TChannel>
   ): LegacyPodcastResolution<TChannel>
   ```

   Same order as today: no row → `not_here`; `dropped` → `blocked`; `byIdText` by `v5IdText`;
   `byPodcastIndexId` by `resolveKey`; `byFeedUrl` by `v4FeedUrl`, else `feed_url`; else
   `not_here`. `answerForId` becomes a `switch` on the resolution's `kind` that adds
   `podcast_id` (no spread of the union, no `as`).

3. Export one constant for the channel relations the eligibility check needs, renaming
   `LOOKUP_RELATIONS`:

   ```ts
   export const LEGACY_LOOKUP_CHANNEL_RELATIONS: FindOptionsRelations<Channel> = { ... };
   ```

4. Replace `toLookupChannel`, `toDtoMap`'s artwork argument, and the module-private
   `listArtworkByChannelId` call site with one exported helper both services use:

   ```ts
   /** List-artwork DTO for each channel, keyed by channel primary key. One artwork query. */
   export async function legacyLookupChannelDtos(
     channels: readonly Channel[]
   ): Promise<Map<number, DTOLegacyPodcastLookupChannel>>
   ```

   It calls `listArtworkByChannelId` (stays module-private) and builds the DTO the way
   `toLookupChannel` does. `toDtoMap` then maps each hit through the returned map.

5. Split `LegacyPodcastLookupService.lookup` in two:

   ```ts
   export type LegacyPodcastChannelResolution = {
     rowsByLegacyId: ReadonlyMap<string, LegacyPodcastLookupRow>;
     channels: LegacyPodcastLookupChannelMaps<Channel>;
   };

   async resolveChannels(podcastIds: readonly string[]): Promise<LegacyPodcastChannelResolution>
   ```

   `resolveChannels` is today's `loadRows` plus the three batched passes
   (`channelsForMappedIdTexts`, `channelsForPodcastIndexIds`, `channelsForFeedUrls`).
   `lookup` calls `resolveChannels`, then `legacyLookupChannelDtos` over every channel in the
   three maps, then `orderLegacyPodcastLookupAnswers` with the DTO maps.

Update the class doc comment only where it names a moved helper. No comment may cite this plan.

## 3. Item batch read (`packages/orm/src/services/item/item.ts`)

Add next to `getManyByGuidEnclosureUrl` (around line 470):

```ts
/** Active items for these id_texts, with the relations the caller names. Missing ids are omitted. */
async getManyActiveByIdText(
  idTexts: readonly string[],
  relations: FindOptionsRelations<Item> = {}
): Promise<Item[]>
```

Dedupe and drop empty strings like `ChannelService.getManyByIdText`
(`packages/orm/src/services/channel/channel.ts`, line 283). Filter
`item_flag_status: { id: ItemFlagStatusStatusEnum.Active }`. One query.

## 4. Episode lookup service (`legacyEpisodeLookup.ts`)

New file `packages/orm/src/services/legacy/legacyEpisodeLookup.ts`, exported from
`packages/orm/src/index.ts` next to line 301.

### Pure ordering (unit-tested)

```ts
export type LegacyEpisodeMappedItem = {
  itemIdText: string;
  channel: DTOLegacyPodcastLookupChannel;
};

export type LegacyEpisodeLookupInputs = {
  /** Keyed by v4 podcast id. A podcast id with no entry is not_here. */
  podcastAnswers: ReadonlyMap<string, LegacyPodcastResolution<DTOLegacyPodcastLookupChannel>>;
  /** Keyed by v4 episode id, from mapped episode rows. */
  mappedItems: ReadonlyMap<string, LegacyEpisodeMappedItem>;
  /** Per input index, the item the guid-then-media-URL pass found. Null when none ran or none hit. */
  matchedItemIdTexts: readonly (string | null)[];
};

export function orderLegacyEpisodeLookupAnswers(
  refs: readonly DTOLegacyEpisodeLookupRef[],
  inputs: LegacyEpisodeLookupInputs
): DTOLegacyEpisodeLookupAnswer[]
```

One answer per ref, in input order; a duplicate episode id is answered once per copy. For ref
`i`, with `podcast = podcastAnswers.get(ref.podcast_id) ?? { kind: 'not_here' }`:

1. `podcast.kind === 'blocked'` → `blocked`. A blocked show wins over a mapped episode row,
   because a dropped show never migrates.
2. `mappedItems.get(ref.episode_id)` exists → `item` with that item id and its channel.
3. `podcast.kind === 'channel'`: `matchedItemIdTexts[i]` non-null → `item` with
   `podcast.channel`; otherwise → `channel` with `podcast.channel`.
4. `podcast.kind === 'feed_url'` → `feed_url`.
5. Otherwise → `not_here`.

### Service

```ts
export class LegacyEpisodeLookupService {
  async lookup(refs: readonly DTOLegacyEpisodeLookupRef[]): Promise<DTOLegacyEpisodeLookupAnswer[]>
}
```

Constructor creates `LegacyPodcastLookupService`, `ItemService`, `ChannelMergeRedirectService`,
and `ChannelAddByRSSDirectoryMatchService`.

1. **Podcasts.** `podcastLookup.resolveChannels(refs.map((ref) => ref.podcast_id))`. For each
   unique podcast id, `resolveLegacyPodcastAnswer` with the `Channel` maps, giving
   `LegacyPodcastResolution<Channel>` per podcast id.
2. **Episode rows.** One query:

   ```sql
   SELECT legacy_id, v5_id_text
   FROM legacy_id_map
   WHERE legacy_kind = 'episode'
     AND status = 'mapped'
     AND v5_id_text IS NOT NULL
     AND legacy_id = ANY($1::text[])
   ```

   over the unique episode ids, read through `AppDataSourceRead.manager.query` and the same
   `rowsOf` / `textOrNull` style the podcast service uses (copy the two small readers; do not
   export them from the podcast file).
3. **Item merges.** `mergeRedirects.itemMoves(itemIdTexts)`; the target id is the survivor
   `to_id_text` when present, else the mapped id.
4. **Mapped items.** `itemService.getManyActiveByIdText(targets, { channel:
   LEGACY_LOOKUP_CHANNEL_RELATIONS })`. Keep an item only when `channel` is loaded and
   `channelPassesDirectoryMatchEligibility(item.channel)` is true. Build
   `episodeId → { itemIdText, channel: Channel }`. A mapped item that is missing, not Active,
   or on an ineligible channel is simply absent, so that episode falls through to the guid pass.
5. **Guid then media URL.** Collect the indexes that are not blocked, have no mapped item, and
   whose podcast resolution is `channel`. Group them by `channel.id_text`. For each group, one
   call to `directoryMatch.getItemIdTextsForChannel(channel, group.map((ref) => ({ guid:
   ref.guid, enclosureUrl: ref.media_url })))`. That method already does guid first (skipping
   device-local Add by RSS guids), then `formatGuidEnclosureUrl` on the media URL against
   `guid_enclosure_url_digest`, Active items only. Write each result into
   `matchedItemIdTexts[index]`; every other index is null. At most one call per distinct channel,
   so at most 200 per request (two indexed queries each), the same per-feed loop
   `matchAddByRSS` runs.
6. **DTOs.** `legacyLookupChannelDtos` over every distinct `Channel` in the podcast
   resolutions and mapped items. Convert the podcast resolutions and mapped items to their DTO
   forms by channel primary key, then return `orderLegacyEpisodeLookupAnswers`.

Doc comment on the class: one answer per input in input order; blocked show first; then a
mapped episode row; then guid, then media URL inside the show's channel; reads only and does
not queue a parse.

## 5. Route and controller

`apps/api/src/controllers/legacy.ts`, beside `LegacyPodcastLookupController`:

- Joi schema:

  ```ts
  const episodeLookupBodySchema = Joi.object({
    episodes: Joi.array()
      .items(
        Joi.object({
          episode_id: Joi.string().trim().min(1).max(14).required(),
          podcast_id: Joi.string().trim().min(1).max(14).required(),
          guid: Joi.string().trim().max(2048).allow(null, '').required(),
          media_url: Joi.string().trim().max(2048).allow(null, '').required(),
        })
      )
      .min(1)
      .max(LEGACY_EPISODE_LOOKUP_MAX_EPISODES)
      .required(),
  });
  ```

  Guid and media URL are not URI-validated: v4 stored whatever the feed had, and a value that
  matches nothing simply answers `channel`.

- `readEpisodeRefs(body: unknown): DTOLegacyEpisodeLookupRef[] | null`, the same type-guard
  style as `readPodcastIds`, after validation. An empty-string `guid` or `media_url` becomes
  `null`.
- Two limiters built like the podcast pair, reusing `installIdFromRequest`:
  `legacyEpisodeLookupIpRateLimit` (`config.rateLimits.legacyEpisodeLookup`) and
  `legacyEpisodeLookupInstallRateLimit` (`config.rateLimits.legacyEpisodeLookupInstall`, same
  `keyGenerator` and `skip`).
- `LegacyEpisodeLookupController.lookup`: validate, read refs, call
  `LegacyEpisodeLookupService.lookup`, log `'Legacy episode lookup'` with `episodesAsked` and
  `answers` counted by kind (`item`, `channel`, `feed_url`, `blocked`, `not_here`), respond
  `DTOLegacyEpisodeLookupResponse`. Counts only; never log ids, guids, or URLs.
  `handleGenericErrorResponse` on error.

`apps/api/src/routes/legacy.ts`:

```ts
router.post(
  '/episode/lookup',
  legacyEpisodeLookupIpRateLimit,
  legacyEpisodeLookupInstallRateLimit,
  asyncHandler(LegacyEpisodeLookupController.lookup)
);
```

Public, no `ensureAuthenticated`, no `apiKeyAccess` (public catalog data, no account data, no
writes), so no `api-key-routes-*` table entry.

### Rate limits

| Env var | Default | Key |
| --- | --- | --- |
| `LEGACY_EPISODE_LOOKUP_MAX_PER_MINUTE` | `30` | IP |
| `LEGACY_EPISODE_LOOKUP_INSTALL_MAX_PER_MINUTE` | `10` | `X-Podverse-Install-Id` when 16–64 characters of `[A-Za-z0-9_-]`; skipped otherwise |

Add each beside its `LEGACY_PODCAST_LOOKUP_*` sibling, same format:

- `apps/api/src/config/index.ts`: type entries `legacyEpisodeLookup` and
  `legacyEpisodeLookupInstall` after `legacyPodcastLookupInstall` (line 55), and
  `parseCountPerWindowEnvFromKey` entries after the podcast pair (ends line 364) with
  `defaultMax: 30` and `defaultMax: 10`.
- `apps/api/src/lib/startup/validation.ts`: two `validateOptional` pushes after line 341,
  category `'Legacy episode lookup'`, `'Use Default (30)'` and `'Use Default (10)'`.
- `apps/api/.env.example` after line 83 (double-quoted values).
- `apps/api/ENV.md` after line 135, worded like the podcast pair with "legacy episode lookup".
- `infra/k8s/base/api/source/api.env` after line 39 (unquoted).
- `dev/env-overrides/local/rate-limit.env.example` after line 23.
- `scripts/local-env/setup.sh` line 543: append both names to the `for v in …` list right after
  `LEGACY_PODCAST_LOOKUP_INSTALL_MAX_PER_MINUTE`.
- `packages/helpers-config/src/podverseTestEnv.ts` after line 130, both `'1000'`.

## 6. OpenAPI (`apps/api/openapi.yml`)

- Path `/legacy/episode/lookup` directly after the `/legacy/podcast/lookup` block (that block
  ends just before `/live-item/category/recent`, around line 17535). `operationId:
  apiPostLegacyEpisodeLookup`, tag `legacy`, `security: []`, parameter
  `$ref: "#/components/parameters/LegacyInstallIdHeader"`, responses 200 / 400 / 429 / 500 with
  the same schema refs the podcast path uses. Description: public; for each downloaded v4
  directory episode returns the v5 item and channel, the channel alone when no item matches the
  guid or media URL, the v4 feed URL when v5 has not parsed the show, blocked for spam and
  takedown, or not_here; at most 200 episodes; rate limited per IP and per install id; reads
  only and does not queue a parse.
- Schemas `ApiPostLegacyEpisodeLookupRequest` and `ApiPostLegacyEpisodeLookupResponse200`
  directly after `ApiPostLegacyPodcastLookupResponse200` (starts line 4139). The response is a
  `oneOf` of the five answer shapes; the channel object matches the podcast schema's channel
  (`id_text`, `title`, `medium_id`, `image_url`). Request example:

  ```yaml
  example:
    episodes:
      - episode_id: ep123
        podcast_id: pod123
        guid: "https://example.com/episodes/1"
        media_url: "https://cdn.example.com/episode-1.mp3"
  ```

## 7. Request client

`packages/helpers-requests/src/api/legacy/legacyEpisodeLookup.ts`, copying
`legacyPodcastLookup.ts`:

```ts
export async function reqLegacyEpisodeLookup(
  api: ApiRequestService,
  body: { episodes: DTOLegacyEpisodeLookupRef[]; install_id: string | null }
): Promise<DTOLegacyEpisodeLookupResponse>
```

Sends `LEGACY_INSTALL_ID_HEADER` when `install_id` is non-empty and `{ episodes }` as the body to
`/legacy/episode/lookup`. In `_request.ts`, import it beside `reqLegacyPodcastLookup` (line 240)
and add `reqLegacyEpisodeLookup(body)` under `/* LEGACY */` after `reqLegacyPodcastLookup`
(line 1313).

## Tests

**Unit** — `packages/orm/src/services/legacy/legacyEpisodeLookup.test.ts`, pure
`orderLegacyEpisodeLookupAnswers` only, with DTO fixtures like `legacyPodcastLookup.test.ts`:

- input order kept and a duplicate episode id answered once per copy;
- blocked podcast wins over a mapped item;
- mapped item wins over a guid-pass hit and returns the mapped item's channel;
- podcast `channel` plus a non-null match → `item` with the podcast channel; null match →
  `channel`;
- `feed_url` and missing podcast entry → `feed_url` and `not_here`.

`legacyPodcastLookup.test.ts` stays as is and must still pass.

**API integration** — `apps/api/src/test/legacy-episode-lookup.integration.test.ts`. Copy the
setup of `legacy-podcast-lookup.integration.test.ts` (mocked `CategoryService`, `seedChannel`,
`insertMapRow`, `setLifecycle`, cleanup of `channel_merge`, `legacy_id_map`, `feed`) and the
`seedItem` helper of `channel-add-by-rss-match.integration.test.ts` (Active item with guid and
`guid_enclosure_url`). `insertMapRow` takes `legacyKind: 'podcast' | 'episode'` and `v5Kind`;
cleanup deletes both kinds by the seeded legacy ids. Use a distinct id prefix (`le${runKey}…`)
so it never collides with the podcast test. Cases:

1. Every kind in one request, in input order: an episode row mapped to an item → `item` with
   that channel's `image_url`; no episode row, podcast mapped, guid matches → `item`; guid
   absent, media URL equals the item's enclosure → `item`; neither matches → `channel`;
   podcast row with only `v4_feed_url` → `feed_url`; podcast `dropped` while an episode row is
   mapped → `blocked`; no rows → `not_here`.
2. Guid wins: the guid matches item A and the media URL matches item B in the same channel →
   item A.
3. Merged item: an episode row mapped to an item on an absorbed channel, with a
   `channel_merge` (applied, absorb) and an `item_merge_map` row to the survivor item, the
   absorbed feed set to `merged` → `item` with the survivor item and survivor channel.
4. Mapped item not usable: the episode row's item is `ItemFlagStatusStatusEnum.Archived`, and
   the podcast row maps to an eligible channel holding an Active item with the ref's guid →
   `item` for that guid match.
5. Validation: 201 episodes → 400; an episode missing `podcast_id` → 400.

No Playwright or Maestro change in this plan; area E covers the end-to-end path.

## Release scratchpad

```markdown
## Public legacy episode lookup

- Surfaces: api, k8s base env
- Change: new `POST /legacy/episode/lookup` answers up to 200 downloaded v4 directory episodes
  (v4 episode id, v4 podcast id, guid, media URL). Each answer is the v5 item and its channel,
  the channel alone when no item matches, the v4 feed URL when v5 has not parsed the show,
  `blocked` for spam and takedown, or `not_here`. A mapped v4 episode wins; otherwise the guid,
  then the media URL, is matched inside the show's channel. Read-only; never queues a parse.
  `POST /legacy/podcast/lookup` answers are unchanged.
- Who notices: no one directly; signed-out phones upgrading from v4 use it to keep downloaded
  episodes
- Operator steps: optional env `LEGACY_EPISODE_LOOKUP_MAX_PER_MINUTE` (default 30) and
  `LEGACY_EPISODE_LOOKUP_INSTALL_MAX_PER_MINUTE` (default 10)
```
