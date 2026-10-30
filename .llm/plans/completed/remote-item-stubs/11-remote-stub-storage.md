**Cursor model:** Opus 5.5 · **Reasoning:** high

# 11 — Remote stub storage, services, and DTO

Add dedicated **remote stub** tables for remote item feeds (and their items) that the index
provider knows but Podverse has not fully parsed, the ORM entities and upsert/lookup services
every later area calls, and the stub DTO clients render. No caller changes here: area B writes
stubs from the parser, C reads them in the API, D creates them from Add by RSS, G manages them.

## Rows

R1, R4, R7, R9, R13, R20, R21, R26, R27, R31, R42

## Runs after

10

## Files

infra/k8s/base/ops/source/database/linear-migrations/app/0002_remote_stubs.sql
infra/k8s/base/ops/kustomization.yaml
infra/k8s/base/api/source/api.env
infra/k8s/base/db/source/bootstrap/0004_app_linear_baseline.sql.gz
infra/k8s/base/db/source/bootstrap/0005_management_linear_baseline.sql.gz
packages/orm/src/entities/remoteStub/remoteChannelStub.ts
packages/orm/src/entities/remoteStub/remoteChannelStubAlias.ts
packages/orm/src/entities/remoteStub/remoteItemStub.ts
packages/orm/src/db/entities.ts
packages/orm/src/index.ts
packages/orm/src/services/remoteStub/remoteChannelStub.ts
packages/orm/src/services/remoteStub/remoteChannelStub.test.ts
packages/orm/src/services/remoteStub/remoteItemStub.ts
packages/orm/src/services/remoteStub/remoteItemStub.test.ts
packages/orm/src/services/remoteStub/remoteStubDto.ts
packages/helpers/src/dtos/remoteItem.ts
release-notes/scratchpad.md

## Background: how remote items work today (R1, R4)

Research answer for the operator, from the code on this branch:

- **Parser.** `packages/parser-mapping/src/compat/partytime/channel.ts` (~234, ~308) and
  `value.ts` (~78) drop any `podcast:remoteItem` without a `feedGuid`. The rest are stored only
  as reference rows in `channel_remote_item`, `channel_podroll_remote_item`,
  `channel_publisher_remote_item`, and `item_value_time_split_remote_item` (feed GUID, optional
  feed URL, item GUID, title, medium). When `config.parser.addRemoteItemsToMQ` is on,
  `handleAllRemoteItemsFeedParsing` in `packages/parser/src/lib/rss/remoteItemParser.ts` looks each
  feed GUID up in Podcast Index and queues a **full parse** of every feed it knows. Nothing stores
  a minimal placeholder.
- **API.** `buildRemoteItemsFinalResult` in `apps/api/src/lib/remoteItems.ts` matches references
  to parsed channels and items, then calls Podcast Index **per request** (batch by GUID, optional
  enrichment by feed URL for publisher albums, `episodes/byguid` for items), cached in Valkey under
  `pi:feed:<guid>` and `pi:episode:<item>:<feed>`. Used by the podroll and publisher-feed
  controllers. Nothing is written to the database.
- **Web.** Podroll (`apps/web/src/components/Content/Podroll/`) already renders `channelsUnadded`
  and `itemsUnadded`; artist albums render unadded albums; both link to
  `/podcast-index/feed/<id>`.
- **Mobile.** `ArtistDetailScreen.tsx` shows unadded albums through
  `unparsedPodcastIndexFeedTarget`. `toPodrollEntries` in
  `apps/mobile/src/screens/podcast/sections/PodcastPodrollSection.tsx` keeps only
  `channelsAdded` / `itemsAdded`, so unadded podroll entries never show on mobile. Mobile does
  not persist remote item DTOs in `apps/mobile/src/data/db/schema.ts` (only section chrome flags).
- **No UI at all:** plain channel `podcast:remoteItem` lists (only the publisher-album subset of
  `channel_remote_item` is read) and value time split references.

So the gap is real but narrower than "not shown": web shows unadded podroll and album rows
through live Podcast Index calls on every request, mobile shows albums but drops podroll, and
channel remote item lists show nowhere. Stubs replace the per-request lookups with stored rows.

## Storage model (R7, R9, R13, R21)

Dedicated tables, not a flag on `feed` / `channel` / `item`. Reasons, from the code:

- A `channel` needs a `feed` row (`feed.url` unique, `feed.podcast_index_id` unique NOT NULL).
  Every `feed` row is picked up by `mqRSSAddAll` (`packages/mq/src/functions/mq/rss/addAll.ts`)
  and by the recently-updated Podcast Index sync, so a flagged stub would be fully parsed by
  scheduled jobs, which is exactly the storage R3 wants to avoid.
- About 20 files query `channel` directly, about 14 query `item`, and about 12 query `feed` with
  query builders or raw SQL. A flag means an exclusion in each, now and in every future query.
- `imageShrink` backfill scans `channel_image` / `item_image`; stubs store a raw `image_url` and
  never reach it (R19).

With separate tables, "stubs never appear in browse, search, category, top, recent,
subscriptions, sitemaps, or scheduled parses" (R20) holds by construction: no code path in this
plan writes a `feed`, `channel`, `item`, `live_item`, `channel_image`, or `item_image` row, and
nothing outside the read paths areas C, D, and G add reads the stub tables. No ORM-level
exclusion work is needed. Episode and track pages stay queries on `item`. Podroll and channel
remote item lists return the whole reference list in one response (plans 32 and 62). They are
not paged together with `item` (R42).

Names: **remote stub** (R21). Tables `remote_channel_stub`, `remote_channel_stub_alias`,
`remote_item_stub`.

## Migration — `0002_remote_stubs.sql` (new)

Greenfield forward SQL per **linear-sql-greenfield-only** (no `IF NOT EXISTS`). Mirror the
`channel_merge` style in `0001_app_schema.sql` (`GENERATED BY DEFAULT AS IDENTITY`, `text` +
named `CHECK` for enums, `timestamp with time zone DEFAULT now() NOT NULL`, named constraints and
`idx_` indexes). Use the domains from `0000_init_helpers.sql`. No `GRANT` statements: the
bootstrap script `infra/k8s/base/db/source/bootstrap/0001_create_app_db_users.sh` sets
`ALTER DEFAULT PRIVILEGES` for tables and sequences the migrator creates, and role names differ
per environment.

`remote_channel_stub`:

| column | type | notes |
| --- | --- | --- |
| id | integer identity | PK |
| index_provider | text NOT NULL | `CHECK (index_provider IN ('podcast_index'))` |
| provider_feed_id | public.varchar_short NOT NULL | provider's feed id as text |
| feed_guid | uuid NULL | provider-reported GUID |
| feed_url | public.varchar_url NOT NULL | provider-reported URL |
| title | public.varchar_normal NULL | |
| author | public.varchar_normal NULL | |
| image_url | public.varchar_uri NULL | raw provider image; never shrunk |
| medium_id | integer NULL | FK `medium(id)` |
| resolved_at | timestamptz NOT NULL DEFAULT now() | last successful provider lookup |
| created_at / updated_at | timestamptz NOT NULL DEFAULT now() | |

Constraint `remote_channel_stub_provider_feed_key UNIQUE (index_provider, provider_feed_id)`;
indexes `idx_remote_channel_stub_feed_guid`, `idx_remote_channel_stub_feed_url`.

`remote_channel_stub_alias` — every reference key that resolved to a stub, so a reference whose
GUID or URL differs from the provider's canonical values still finds its stub:

| column | type | notes |
| --- | --- | --- |
| id | integer identity | PK |
| remote_channel_stub_id | integer NOT NULL | FK `remote_channel_stub(id) ON DELETE CASCADE` |
| key_kind | text NOT NULL | `CHECK (key_kind IN ('feed_guid', 'feed_url'))` |
| key_value | public.varchar_uri NOT NULL | normalized (below) |
| created_at | timestamptz NOT NULL DEFAULT now() | |

Constraint `remote_channel_stub_alias_key_kind_key_value_key UNIQUE (key_kind, key_value)`;
index `idx_remote_channel_stub_alias_remote_channel_stub_id`.

`remote_item_stub` — `remote_channel_stub_id NOT NULL` makes R31 a schema rule:

| column | type | notes |
| --- | --- | --- |
| id | integer identity | PK |
| remote_channel_stub_id | integer NOT NULL | FK `remote_channel_stub(id) ON DELETE CASCADE` |
| item_guid | public.varchar_uri NOT NULL | GUID as referenced |
| provider_item_id | public.varchar_short NULL | |
| title | public.varchar_normal NULL | |
| image_url | public.varchar_uri NULL | |
| pub_date | timestamptz NULL | |
| duration_seconds | integer NULL | `CHECK (duration_seconds IS NULL OR duration_seconds > 0)` |
| resolved_at, created_at, updated_at | timestamptz NOT NULL DEFAULT now() | |

Constraint `remote_item_stub_channel_item_guid_key UNIQUE (remote_channel_stub_id, item_guid)`.

No description, enclosure, `id_text`, or live-status columns: stubs only render a list row and
open the provider search detail, which fetches its own details. Live item references (R27) get an
ordinary item stub when the provider resolves the GUID; no live status is stored or shown.

Wiring, per **migration-readiness-marker-sync**:

- `infra/k8s/base/ops/kustomization.yaml`: change the literal
  `API_EXPECTED_MIGRATION_FILENAME=0001_app_schema.sql` (under `podverse-ops-migration-scripts`)
  to `0002_remote_stubs.sql`; add
  `- source/database/linear-migrations/app/0002_remote_stubs.sql` after the `0001_app_schema.sql`
  line under `podverse-ops-app-linear-migrations`.
- `infra/k8s/base/api/source/api.env` line 46: `API_EXPECTED_MIGRATION_FILENAME=0002_remote_stubs.sql`.
- Management chain and `MANAGEMENT_API_EXPECTED_MIGRATION_FILENAME` are unchanged.
- Run `make db_regen_linear_baseline` then `make db_verify_linear_baseline` from the repo root
  (agent-run per that skill; needs Docker) and leave the regenerated `0004_` / `0005_` archives
  in the tree. If Docker is unavailable, stop and report it as blocked rather than hand-editing
  the archives.

## Entities (new, `packages/orm/src/entities/remoteStub/`)

`RemoteChannelStub`, `RemoteChannelStubAlias`, `RemoteItemStub`, modeled on
`packages/orm/src/entities/channel/channelMerge.ts` (`@PrimaryGeneratedColumn('identity')`,
`@Unique` / `@Index` / `@Check` with the SQL names above, `Relation<>` with string entity names,
`DATABASE_CONSTANTS` lengths). Type `index_provider` as `IndexProviderId` and `key_kind` as
`RemoteStubAliasKeyKind = 'feed_guid' | 'feed_url'` (exported from the alias entity file).
`RemoteChannelStub` has `aliases` and `item_stubs` one-to-many relations; the two other entities
have `remote_channel_stub` many-to-one with `onDelete: 'CASCADE'`.

Register all three in the `entities` array in `packages/orm/src/db/entities.ts` and export the
entity files and the three service files from `packages/orm/src/index.ts`, next to the
`channelMerge` exports.

## Services (new, `packages/orm/src/services/remoteStub/`)

Class services like `ChannelRemoteItemService`. Reads use `getDataSourceRead()`, writes
`getDataSourceReadWrite()` from `@orm/context.js`. Callers pass raw reference values; the
services normalize, so B, C, D, and G never normalize keys themselves.

`remoteChannelStub.ts`:

```ts
export type RemoteStubRefKeys = { feedGuid: string | null; feedUrl: string | null };

/** Trim + lowercase; null unless `isValidReliableUUID`. */
export function normalizeRemoteStubFeedGuid(value: string | null | undefined): string | null;
/** Trim; null when empty or longer than DATABASE_CONSTANTS.varchar_uri. Case is kept. */
export function normalizeRemoteStubFeedUrl(value: string | null | undefined): string | null;

export class RemoteChannelStubService {
  upsertChannelStub(
    feed: IndexProviderFeed,
    refKeys: readonly RemoteStubRefKeys[]
  ): Promise<RemoteChannelStub>;
  getChannelStubsForRefs(refs: readonly RemoteStubRefKeys[]): Promise<(RemoteChannelStub | null)[]>;
  getByProviderFeedId(
    indexProvider: IndexProviderId,
    providerFeedId: string
  ): Promise<RemoteChannelStub | null>;
  deleteForParsedFeed(params: {
    podcastIndexId: number | null;
    podcastGuid: string | null;
    feedUrl: string | null;
  }): Promise<number>;
  deleteById(id: number): Promise<boolean>;
}
```

- **`upsertChannelStub`** — one transaction, safe under concurrent parses of different source
  feeds that reference the same remote feed:
  1. `INSERT … ON CONFLICT (index_provider, provider_feed_id) DO UPDATE` setting every metadata
     column from `EXCLUDED`, `resolved_at = now()`, `updated_at = now()`, `RETURNING id`. Title
     and author are cut to `varchar_normal`; an image URL longer than `varchar_uri` is stored as
     null; `medium_id = feed.medium === null ? null : getMediumEnumValue(feed.medium)`;
     `feed_guid` is `normalizeRemoteStubFeedGuid(feed.feedGuid)`.
  2. Alias keys = the normalized GUID and URL of every `refKeys` entry plus the provider's own
     `feedGuid` and `feedUrl`, deduped, nulls dropped. One multi-row `INSERT … ON CONFLICT
     (key_kind, key_value) DO UPDATE SET remote_channel_stub_id = EXCLUDED.remote_channel_stub_id`.
     The latest resolution wins, which is how a key moves to a new stub after a provider merge.
  3. Return the stub row by id.
- **`getChannelStubsForRefs`** — one query over aliases joined to stubs, then an array the same
  length and order as `refs`: the stub matched by GUID, else by URL, else null.
- **`deleteForParsedFeed`** — the stub-replacement contract (R30, used by B): after a full parse
  saves a channel, delete stubs where `(index_provider = 'podcast_index' AND provider_feed_id =
  String(podcastIndexId))` or `feed_guid` equals the normalized `podcastGuid` or `feed_url`
  equals the trimmed `feedUrl`. Aliases and item stubs cascade. Returns the deleted count.
- **`deleteById`** — for G; returns whether a row was deleted.

`remoteItemStub.ts`:

```ts
export type RemoteItemStubRef = RemoteStubRefKeys & { itemGuid: string };

export class RemoteItemStubService {
  upsertItemStub(channelStub: RemoteChannelStub, item: IndexProviderItem): Promise<RemoteItemStub>;
  getItemStubsForRefs(refs: readonly RemoteItemStubRef[]): Promise<(RemoteItemStub | null)[]>;
}
```

- **`upsertItemStub`** takes the channel stub entity so an item stub cannot be written without
  one (R31). Throw an `Error` when `item.indexProvider !== channelStub.index_provider` or
  `item.providerFeedId !== channelStub.provider_feed_id`. `INSERT … ON CONFLICT
  (remote_channel_stub_id, item_guid) DO UPDATE`, same truncation rules, `resolved_at = now()`.
- **`getItemStubsForRefs`** — resolve channel stubs with the same alias lookup, then fetch item
  stubs by `(remote_channel_stub_id, item_guid)`; return an array aligned with `refs`, each with
  `remote_channel_stub` loaded.

`remoteStubDto.ts`:

```ts
export function toDTORemoteChannelStub(stub: RemoteChannelStub): DTORemoteChannelStub;
export function toDTORemoteItemStub(
  stub: RemoteItemStub,
  channelStub: RemoteChannelStub
): DTORemoteItemStub;
```

`pub_date` serializes with `toISOString()`.

## Stub DTO — `packages/helpers/src/dtos/remoteItem.ts`

Append; leave the existing `RemoteItemsResponse`, `RemoteItemGeneric`, and
`PublisherRemoteItemsResponse` untouched (area C owns response shapes). Import `IndexProviderId`
from `../lib/indexProvider.js` as a type.

```ts
export interface DTORemoteChannelStub {
  is_remote_stub: true;
  index_provider: IndexProviderId;
  provider_feed_id: string;
  feed_guid: string | null;
  feed_url: string;
  title: string | null;
  author: string | null;
  image_url: string | null;
  medium_id: number | null;
}

export interface DTORemoteItemStub {
  is_remote_stub: true;
  item_guid: string;
  provider_item_id: string | null;
  title: string | null;
  image_url: string | null;
  pub_date: string | null;
  duration_seconds: number | null;
  channel_stub: DTORemoteChannelStub;
}
```

The database id is not exposed. A stable client key is `${index_provider}:${provider_feed_id}`
(plus `:${item_guid}` for items). `is_remote_stub` lets web and mobile tell a stub from a
`DTOChannel` / `DTOItem` without shape checks.

## What stays true

- Stubs are written only for feeds the provider resolved (`IndexProviderLookup` status `found`).
  No negative cache: a reference with no stub is looked up again on the next parse (R17, area B).
- A fully parsed channel always wins over a stub; read paths match parsed rows first and fall
  back to stubs only for unmatched references (area C).
- Stub writes never queue a parse, an image shrink, or a notification.

## Tests

- `remoteChannelStub.test.ts` (mock `@orm/context.js` as
  `packages/orm/src/services/base/baseRemoteItemsService.test.ts` does): GUID and URL
  normalization; `getChannelStubsForRefs` prefers a GUID match over a URL match, returns null for
  unmatched refs, and keeps input order; `upsertChannelStub` issues the provider-key `ON CONFLICT`
  upsert and one alias upsert containing ref keys plus provider keys, deduped;
  `deleteForParsedFeed` with all-null params deletes nothing and issues no query.
- `remoteItemStub.test.ts`: `upsertItemStub` throws on a provider or feed id mismatch;
  `getItemStubsForRefs` aligns results with input; `toDTORemoteChannelStub` /
  `toDTORemoteItemStub` set `is_remote_stub: true` and serialize `pub_date`.
- The schema is checked by `make db_verify_linear_baseline` (run in this plan). No API route
  changes, so no API integration tests.

## Release scratchpad

```markdown
## Remote stub tables

- Surfaces: api (database), k8s base env, ops migration job
- Change: new app migration `0002_remote_stubs.sql` adds `remote_channel_stub`,
  `remote_channel_stub_alias`, and `remote_item_stub`, which hold minimal placeholder rows for
  `podcast:remoteItem` feeds and items the index provider knows but Podverse has not fully
  parsed. Nothing writes or reads them yet in this change. `API_EXPECTED_MIGRATION_FILENAME` is
  now `0002_remote_stubs.sql`.
- Who notices: operators; no user-visible change on its own
- Operator steps: existing databases run the app linear migration job before the API rolls out;
  overlays that override `API_EXPECTED_MIGRATION_FILENAME` point it at `0002_remote_stubs.sql`
```
