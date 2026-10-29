**Cursor model:** Opus 5.5 · **Reasoning:** high

# 70 — Remote stub merge and id-change handling

Keep remote stubs pointing at the provider feed id that is current, so a reference whose feed
Podcast Index merged or retired keeps resolving (or stops rendering) without a per-request lookup.
This plan adds the stub-service methods the lifecycle needs and a remote stub pass to the
Podcast Index dead-feed worker. Management tooling (plans 71–73) reuses the same service methods.

## Rows

R32, R41, R46

## Runs after

10, 11, 20

## Files

packages/orm/src/services/remoteStub/remoteChannelStub.ts
packages/orm/src/services/remoteStub/remoteChannelStub.test.ts
apps/workers/src/commands/podcastIndex/deadFeeds/remoteStubMerges.ts
apps/workers/src/commands/podcastIndex/deadFeeds/remoteStubMerges.test.ts
apps/workers/src/commands/podcastIndex/deadFeeds/flagAndMerge.ts
apps/workers/.env.example
apps/workers/ENV.md
infra/k8s/base/workers/source/workers.env
packages/worker-commands/src/registry.ts
release-notes/scratchpad.md

## Where merge and id-change handling lives

A stub has no Podverse `id` or `id_text`; clients key it on `index_provider` + `provider_feed_id`
and open the provider search detail for that id. So a provider merge is a stub-layer problem,
solved on the server in three places. Nothing changes at read time or on clients.

1. **Re-parse lookup (automatic).** When a source feed is parsed, plan 20's resolver re-resolves a
   stale stub (older than 7 days). If the reference's GUID or URL now resolves to a different
   provider feed, `upsertChannelStub` (plan 11) moves the aliases to the new stub because the
   latest resolution wins. This plan adds: a stub left with **no aliases** after that move is
   deleted in the same transaction. Without that, the old stub is unreachable and is never cleaned
   up.
2. **Dead-feed worker (automatic).** `podcastIndexDeadFeedsFlagAndMerge` already downloads the
   Podcast Index dead-feed CSV (`id_to_archive → duplicate_id_to_keep`) and resolves duplicate
   chains. A new remote stub pass uses the same `targets` map: a stub whose provider id was merged
   into a live survivor is re-pointed to the survivor; a stub whose id is gone with no survivor,
   or whose survivor Podverse already parses, is deleted. This catches merges where the survivor
   has a different GUID and URL, which the re-parse lookup cannot see.
3. **Management (manual).** Plans 71–73: re-check a stub now, re-point it to a provider id an
   admin enters, or delete it.

Unchanged, on purpose:

- `apps/api/src/controllers/helpers/mergedInto.ts` (`sendMergedInto`, the 410 `merged_into` body)
  and `apps/mobile/src/lib/mergeRedirect.ts` handle Podverse channel and item merges by `id_text`.
  Stubs carry no `id_text`, so no 410 applies to them and no client redirect is added. The read
  path (plans 31, 32) keeps trusting the alias table.
- Between a Podcast Index merge and the next dead-feed run (cron `15 * * * *`,
  `infra/k8s/base/cron/worker-dead-feeds-merge.cronjob.yaml`), a stub may still name the old id.
  Opening it shows the provider page for that id, as today's unadded rows do.

## Stub service additions — `remoteChannelStub.ts`

Plan 11 owns the file and the `RemoteChannelStubService` class. Add, keeping its conventions
(reads on `getDataSourceRead()`, writes on `getDataSourceReadWrite()`, callers pass raw values):

```ts
export type RemoteChannelStubWithRelations = RemoteChannelStub & {
  aliases: RemoteChannelStubAlias[];
  item_stubs: RemoteItemStub[];
};

export class RemoteChannelStubService {
  // existing plan 11 methods …
  getByIdWithRelations(id: number): Promise<RemoteChannelStubWithRelations | null>;
  listProviderFeedIds(indexProvider: IndexProviderId): Promise<string[]>;
  repointToFeed(fromStubId: number, feed: IndexProviderFeed): Promise<RemoteChannelStub | null>;
}
```

Use the entity relations plan 11 declares (`aliases`, `item_stubs`) rather than a new type if
TypeORM's loaded entity already satisfies the shape; the type alias above is only the contract.

### Orphan cleanup inside `upsertChannelStub`

In the same transaction as plan 11's steps 1–3:

- Before the alias upsert, read the distinct `remote_channel_stub_id` values that currently own any
  of the alias keys being written, excluding the stub id just upserted (`previousOwnerIds`).
- After the alias upsert, `DELETE FROM remote_channel_stub s WHERE s.id = ANY($1) AND NOT EXISTS
  (SELECT 1 FROM remote_channel_stub_alias a WHERE a.remote_channel_stub_id = s.id)`. Item stubs
  cascade. The resolver's item step (plan 20 step 7) writes fresh item stubs on the new stub in
  the same run, because `getItemStubsForRefs` now finds none for those refs.
- A previous owner that still has another alias (a URL that did not move) stays.

Concurrency: two source feeds may resolve the same keys at once. If another transaction inserts an
alias for a stub this one is deleting, that insert fails its foreign key and the resolver's caller
logs it (plan 20's channel wrapper never throws); the next parse retries. Do not add advisory
locks.

### `getByIdWithRelations`

One read of the stub with `aliases` and `item_stubs` loaded; null when missing. Used by plans 71
and 72's actions.

### `listProviderFeedIds`

`SELECT provider_feed_id FROM remote_channel_stub WHERE index_provider = $1`, returned as strings.

### `repointToFeed`

One transaction. Returns the target stub, or null when `fromStubId` no longer exists.

1. `SELECT … FROM remote_channel_stub WHERE id = $1 FOR UPDATE`; none → return null.
2. Upsert the target row for `feed` with the same `INSERT … ON CONFLICT (index_provider,
   provider_feed_id) DO UPDATE` and truncation rules as `upsertChannelStub` step 1. Extract that
   SQL into one private helper both methods call; do not copy it.
3. When the target id equals `fromStubId` (the provider returned the same feed), stop here and
   return the refreshed row.
4. `UPDATE remote_channel_stub_alias SET remote_channel_stub_id = $to WHERE
   remote_channel_stub_id = $from`.
5. Write the provider's own `feedGuid` / `feedUrl` aliases for the target with the same
   `ON CONFLICT (key_kind, key_value) DO UPDATE` as `upsertChannelStub` step 2.
6. Move item stubs as stale rows: `INSERT INTO remote_item_stub (remote_channel_stub_id, item_guid,
   provider_item_id, title, image_url, pub_date, duration_seconds, resolved_at) SELECT $to,
   item_guid, NULL, title, image_url, pub_date, duration_seconds, 'epoch' FROM remote_item_stub
   WHERE remote_channel_stub_id = $from ON CONFLICT (remote_channel_stub_id, item_guid) DO
   NOTHING`. `provider_item_id` is cleared because episode ids change across a provider merge;
   `resolved_at = 'epoch'` makes the next resolver run refresh them.
7. `DELETE FROM remote_channel_stub WHERE id = $from` (remaining item stubs cascade).
8. Return the target row by id.

## Dead-feed remote stub pass — `remoteStubMerges.ts` (new)

```ts
export const REMOTE_STUB_MERGE_MAX_LOOKUPS_PER_RUN = 500;
export const REMOTE_STUB_MERGE_MAX_DELETES_PER_RUN = 1000;

export type RemoteStubMergePlan = {
  /** Stub provider id → live survivor provider id Podverse does not parse. */
  repoint: { fromPodcastIndexId: number; toPodcastIndexId: number }[];
  /** Stub provider ids whose survivor Podverse already parses. */
  deleteSurvivorParsed: number[];
  /** Stub provider ids the list retires with no live survivor. */
  deleteRetired: number[];
};

export function planRemoteStubMerges(params: {
  targets: ReadonlyMap<number, number | null>;
  stubPodcastIndexIds: ReadonlySet<number>;
  heldPodcastIndexIds: ReadonlySet<number>;
}): RemoteStubMergePlan;

export async function applyRemoteStubMerges(params: {
  targets: ReadonlyMap<number, number | null>;
  heldPodcastIndexIds: ReadonlySet<number>;
  mode: 'dry_run' | 'apply';
  provider: IndexProvider;
  rateLimitDelayMs: number;
}): Promise<void>;
```

`planRemoteStubMerges` is pure. Reuse the helpers `flagAndMerge.ts` already imports from
`@podverse/external-services-podcast-index`:

- `deadFeedPairsWeHold(resolveDeadFeedDuplicateChains(targets), stubPodcastIndexIds)` gives the
  stub ids with a live survivor. A pair whose `toPodcastIndexId` is in `heldPodcastIndexIds` goes
  to `deleteSurvivorParsed`; the rest go to `repoint`.
- `podcastIndexIdsToRetire(targets, stubPodcastIndexIds)` gives stub ids the list retires with no
  resolvable survivor → `deleteRetired`.
- Sort each list ascending so runs are deterministic.

`applyRemoteStubMerges`:

1. `new RemoteChannelStubService().listProviderFeedIds('podcast_index')`, keep values that parse to
   a positive integer, build the set. Empty → log nothing and return.
2. Build the plan. In `dry_run`, one `console.warn` with the three counts and return.
3. Repoint, at most `REMOTE_STUB_MERGE_MAX_LOOKUPS_PER_RUN` entries, `sleep(rateLimitDelayMs)` from
   `@podverse/helpers` before every lookup after the first: load the stub with
   `getByProviderFeedId('podcast_index', String(from))` (gone → skip), then
   `provider.getFeedById(String(to))`:
   - `found` and not `isDead` → `repointToFeed(stub.id, feed)`.
   - `found` with `isDead`, or `not_found` → `deleteById(stub.id)`.
   - `unavailable` → leave it; the next run retries.
4. Delete `deleteSurvivorParsed` then `deleteRetired`, together at most
   `REMOTE_STUB_MERGE_MAX_DELETES_PER_RUN`, each by `getByProviderFeedId` + `deleteById`. The cap
   bounds a bad CSV; stubs are placeholders and are written again on the next parse of a source
   feed when the provider still lists the feed.
5. One summary `console.warn`: repointed, deleted (survivor parsed), deleted (retired), unavailable,
   and how many were left for the next run by the caps. Match the neighbouring messages' style.

Deleting a stub whose survivor is parsed hides a reference whose GUID and URL do not match the
parsed channel; that follows plan 30's rule that the read path matches parsed rows by GUID then URL
only.

## `flagAndMerge.ts`

- In the modified-download branch, inside `if (duplicateMergeMode !== 'off')`, after the pair loop,
  call `applyRemoteStubMerges({ targets, heldPodcastIndexIds: held, mode: duplicateMergeMode,
  provider: getIndexProvider(), rateLimitDelayMs: getPodcastIndexConfig().rateLimitDelay ?? 0 })`.
  `getIndexProvider` comes from `@workers/factories/indexProvider.js` (plan 10). Reuse the `held`
  set already built there.
- Wrap that one call in `try/catch` and `console.error('Remote stub merge pass failed.', error)`,
  so a stub failure never stops `verifyAndApplyDuplicateMerges` or the retire pass that follow.
- The function already uses "stub" for feed rows without a channel. Rename so the two never read as
  one thing: `STUB_DELETE_MAX_PER_RUN` → `CHANNELLESS_FEED_DELETE_MAX_PER_RUN`, `logOrDeleteStubs`
  → `logOrDeleteChannellessFeeds`, and "stub feeds" → "feeds without a channel" in its two log
  messages. No behavior change.
- Update the function's doc comment to mention the remote stub pass.

## Env docs (no new env var)

`PODCAST_INDEX_DUPLICATE_MERGE_MODE` now also governs the remote stub pass (`off` skips it,
`dry_run` logs counts, `apply` re-points and deletes). State that in:

- `apps/workers/ENV.md` § the `PODCAST_INDEX_DUPLICATE_MERGE_MODE` bullet (one sentence).
- The comment above `PODCAST_INDEX_DUPLICATE_MERGE_MODE` in `apps/workers/.env.example` and in
  `infra/k8s/base/workers/source/workers.env` (line 12). Values stay `off`.
- `packages/worker-commands/src/registry.ts`, the `podcastIndexDeadFeedsFlagAndMerge` description:
  add "and re-point or remove remote stubs for merged feeds".

## Tests

- `remoteChannelStub.test.ts` (extend plan 11's file, same `@orm/context.js` mock):
  - `upsertChannelStub` deletes a previous owner left with no aliases and keeps one that still has
    an alias (assert the delete statement and its id parameter).
  - `repointToFeed` returns null when the source row is missing; with the same provider id it only
    refreshes; otherwise it moves aliases, copies item stubs with `provider_item_id` null and
    `resolved_at` epoch, deletes the source, and returns the target.
  - `listProviderFeedIds` filters by provider.
- `remoteStubMerges.test.ts` (mock `@podverse/orm`, a hand-written fake `IndexProvider`, and
  `sleep`):
  - `planRemoteStubMerges`: survivor not held → `repoint`; survivor held → `deleteSurvivorParsed`;
    no survivor → `deleteRetired`; a stub id absent from `targets` is untouched; a two-hop chain
    resolves to the final survivor.
  - `applyRemoteStubMerges` in `dry_run` writes nothing.
  - `apply`: `found` survivor → `repointToFeed`; `isDead` or `not_found` → `deleteById`;
    `unavailable` → neither; the lookup cap leaves the rest; `sleep` runs between lookups.

No API routes change, so no API integration tests.

## Release scratchpad

```markdown
## Remote stubs follow Podcast Index merges

- Surfaces: workers (dead-feed job, parser), orm
- Change: when a remote stub's feed is merged in Podcast Index, the hourly dead-feed job re-points
  the stub (its lookup keys and item rows) to the surviving feed, and removes stubs whose feed is
  retired with no survivor or whose survivor Podverse already parses. When a source feed's
  re-parse resolves a reference to a different feed, the old stub is removed once nothing points
  to it. `PODCAST_INDEX_DUPLICATE_MERGE_MODE` controls the stub pass too (`off`, `dry_run` logs
  counts, `apply` writes). Log lines about deleting "stub feeds" now say "feeds without a channel".
- Who notices: operators reading dead-feed job logs; listeners see podroll and album rows for
  merged feeds open the surviving feed
- Operator steps: none; the pass runs only where `PODCAST_INDEX_DUPLICATE_MERGE_MODE` is
  `dry_run` or `apply`
```
