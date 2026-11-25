**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 61 — Command that adds the allowlisted feeds

Plan 60 stops workers from adding anything off the allowlist, but nothing adds the listed shows.
Trending and the recently-updated poller only reach listed ids by chance. This plan adds one
workers command, `mqRSSAddCatalogAllowlist`, that enqueues every listed Podcast Index id that is
not stored yet. When Podcast Index merged a listed id into another show, it enqueues the surviving
show (R55). A suspended manual CronJob runs it in k8s.

## Rows

R52, R55

## Runs after

60, 13

## Files

- apps/workers/src/lib/catalog/collectCatalogAllowlistAddTargets.ts (new)
- apps/workers/src/lib/catalog/collectCatalogAllowlistAddTargets.test.ts (new)
- apps/workers/src/commands/mq/rss/mqRSSAddCatalogAllowlist.ts (new)
- apps/workers/src/commands/index.ts
- apps/workers/src/lib/startup/categoriesForCommand.ts
- apps/workers/src/lib/startup/categoriesForCommand.test.ts
- apps/workers/ENV.md
- infra/k8s/base/ops/mq-rss-add-catalog-allowlist.cronjob.yaml (new)
- infra/k8s/base/ops/kustomization.yaml
- release-notes/scratchpad.md

## Settled decisions

Transcribe these. Do not reopen them.

- **One manual command, run by the operator after setting or changing the allowlist.** No
  schedule. The k8s CronJob is suspended with `podverse-schedule: manual`, like the trending
  jobs. Running it again is safe: stored ids are skipped and the parser gate admits only listed
  feeds.
- **Stored ids are skipped.** "Stored" means `FeedService().listPodcastIndexIds()` contains the
  id. A stored listed show keeps refreshing through the normal pollers; this command does not
  refresh it.
- **Merges come from the Podcast Index dead-feed CSV.** `podcasts/byfeedid` does not report
  `duplicateOf`; the CSV does. The CSV is downloaded once per run, and only when at least one
  listed id is dead or not found. Chains are walked with `resolveDeadFeedDuplicateChains`.
- **The survivor carries its listed source id.** The message sets
  `catalogAllowlistSourcePodcastIndexId` to the listed id so plan 60's gate admits the survivor.
  A survivor that is already stored or is itself listed is not enqueued again.
- **Unavailable lookups are skipped and logged**, not fatal. The operator reruns the command.
  The command throws at the end only when an enqueue failed, so the Job shows failure for
  broker problems.
- **Queue:** `-q` defaults to `rss-normal`, like the trending command.
- **Open mode:** with the allowlist blank, the command logs that there is nothing to add and
  returns.

## `apps/workers/src/lib/catalog/collectCatalogAllowlistAddTargets.ts` (new)

Pure of MQ and config so it is unit-testable; the command wires the services in.

```typescript
import { resolveDeadFeedDuplicateChains } from '@podverse/external-services-podcast-index';
import type { IndexProvider } from '@podverse/helpers';

export type CatalogAllowlistAddTarget = {
  podcastIndexId: number;
  feedUrl: string;
  /** The listed id this target stands for; differs from `podcastIndexId` after a merge. */
  sourcePodcastIndexId: number;
};

export type CatalogAllowlistAddPlan = {
  targets: CatalogAllowlistAddTarget[];
  /** Listed ids whose lookup failed; a later run retries them. */
  unavailable: number[];
  /** Listed ids that are dead or unknown with no live surviving show. */
  unresolved: number[];
};

type CollectCatalogAllowlistAddTargetsParams = {
  allowlist: readonly number[];
  storedPodcastIndexIds: ReadonlySet<number>;
  indexProvider: Pick<IndexProvider, 'getFeedById'>;
  /** Dead-feed CSV rows: archived id to the id it was merged into, or null. */
  loadDeadFeedTargets: () => Promise<ReadonlyMap<number, number | null>>;
  sleepBetweenLookups: () => Promise<void>;
};

export async function collectCatalogAllowlistAddTargets({
  allowlist,
  storedPodcastIndexIds,
  indexProvider,
  loadDeadFeedTargets,
  sleepBetweenLookups,
}: CollectCatalogAllowlistAddTargetsParams): Promise<CatalogAllowlistAddPlan> {
  const listed = new Set(allowlist);
  const targets: CatalogAllowlistAddTarget[] = [];
  const unavailable: number[] = [];
  const unresolved: number[] = [];
  const needsSurvivor: number[] = [];
  const queued = new Set<number>();
  let lookups = 0;

  const lookUp = async (podcastIndexId: number) => {
    if (lookups > 0) {
      await sleepBetweenLookups();
    }
    lookups += 1;
    return indexProvider.getFeedById(String(podcastIndexId));
  };

  for (const podcastIndexId of listed) {
    if (storedPodcastIndexIds.has(podcastIndexId)) {
      continue;
    }
    const lookup = await lookUp(podcastIndexId);
    if (lookup.status === 'unavailable') {
      unavailable.push(podcastIndexId);
    } else if (lookup.status === 'found' && !lookup.value.isDead) {
      targets.push({
        podcastIndexId,
        feedUrl: lookup.value.feedUrl,
        sourcePodcastIndexId: podcastIndexId,
      });
      queued.add(podcastIndexId);
    } else {
      needsSurvivor.push(podcastIndexId);
    }
  }

  if (needsSurvivor.length === 0) {
    return { targets, unavailable, unresolved };
  }

  const survivors = resolveDeadFeedDuplicateChains(await loadDeadFeedTargets());
  for (const sourcePodcastIndexId of needsSurvivor) {
    const survivorId = survivors.get(sourcePodcastIndexId);
    if (survivorId === undefined) {
      unresolved.push(sourcePodcastIndexId);
      continue;
    }
    if (storedPodcastIndexIds.has(survivorId) || listed.has(survivorId) || queued.has(survivorId)) {
      continue;
    }
    const lookup = await lookUp(survivorId);
    if (lookup.status === 'unavailable') {
      unavailable.push(sourcePodcastIndexId);
    } else if (lookup.status === 'found' && !lookup.value.isDead) {
      targets.push({ podcastIndexId: survivorId, feedUrl: lookup.value.feedUrl, sourcePodcastIndexId });
      queued.add(survivorId);
    } else {
      unresolved.push(sourcePodcastIndexId);
    }
  }

  return { targets, unavailable, unresolved };
}
```

A listed survivor (`listed.has(survivorId)`) is skipped here because the first loop already
handled it as its own listed id.

## `apps/workers/src/commands/mq/rss/mqRSSAddCatalogAllowlist.ts` (new)

Model it on `mqRSSAddTrendingPodcastsFromPodcastIndex.ts` in the same folder (same `-q` parsing,
`MQ_QUEUES[key]`, `getActiveMQArtemisService()`, `closeAfterSend: false`, and closing Artemis in
`finally`). Log prefix `[mqRSSAddCatalogAllowlist]`.

1. Parse `-q` exactly as the trending command does (default `rss-normal`, same validation error).
2. `const { podcastIndexIdAllowlist } = getCatalogConfig();` (from `@workers/config/index.js`).
   When null, `logger.info('[mqRSSAddCatalogAllowlist] CATALOG_PODCAST_INDEX_ID_ALLOWLIST is blank; nothing to add.')`
   and return.
3. `const storedPodcastIndexIds = new Set(await new FeedService().listPodcastIndexIds());`
   (`FeedService` from `@podverse/orm`).
4. Call `collectCatalogAllowlistAddTargets` with:
   - `indexProvider: getIndexProvider()` from `@workers/factories/indexProvider.js`;
   - `sleepBetweenLookups: sleepRateLimit` from `@workers/lib/podcastIndex/collectTrendingFeedIds.js`;
   - `loadDeadFeedTargets`: an inline async function that builds a `Map<number, number | null>`
     by calling `getPodcastIndexService().deadFeedsDownloadAndExtractCSV((row) => { … })` with no
     conditional headers, where each row goes through `extractDeadFeedCsvRow(row)` (from
     `@podverse/external-services-podcast-index`) and a non-null result sets
     `map.set(parsed.id_to_archive, parsed.duplicate_id_to_keep)`.
5. For each target, `mqRSSAdd` (imported as `mqRSSAddFunction` from `@podverse/mq`, as trending
   does) with `{ ...MQ_QUEUES[key], feedUrl: target.feedUrl, podcast_index_id: target.podcastIndexId, closeAfterSend: false }`
   and options:

```typescript
          {
            forceParse: false,
            onDemandParserEvent: { accountId: null, type: null, remoteParentPodcastIndexId: null },
            ...(target.sourcePodcastIndexId !== target.podcastIndexId
              ? { catalogAllowlistSourcePodcastIndexId: target.sourcePodcastIndexId }
              : {}),
          }
```

   Log each surviving-show target at info level:
   `listed podcast_index_id=${source} was merged into ${survivor}; adding ${survivor}`.
   Count `enqueued` and `failed`; log a failed enqueue with `logger.error` like trending.
6. Log one summary line: listed count, already stored count, enqueued, failed, and the
   `unavailable` and `unresolved` id lists (comma-joined). Log the unresolved list with
   `logger.warn` when it is non-empty.
7. After the `finally` that closes Artemis, `throw new Error(...)` naming the failed count when
   `failed > 0`.

## `apps/workers/src/commands/index.ts`

Import `mqRSSAddCatalogAllowlist` next to the `mqRSSAddTrendingPodcastsFromPodcastIndex` import and
add it to the default export object directly after `mqRSSAddTrendingPodcastsFromPodcastIndex`.

## `apps/workers/src/lib/startup/categoriesForCommand.ts`

Add `'mqRSSAddCatalogAllowlist'` to `BASE_ORM_MQ_PODCAST_INDEX_COMMANDS` after
`'mqRSSAddTrendingPodcastsFromPodcastIndex'`. Plan 12's rule then adds `CATEGORY_CATALOG`.

## `apps/workers/ENV.md`

- In `### Command groups and env categories`, the `Base + ORM + MQ + Podcast Index` row lists
  `mqRSSAdd`; change its commands cell to `mqRSSAdd, mqRSSAddCatalogAllowlist`. Plan 12 has
  already appended `, Catalog` to that row's categories cell. Leave the table unpadded.
- In the `## Catalog` section plan 12 adds, append after the
  `CATALOG_PODCAST_INDEX_ID_ALLOWLIST` bullet: "After setting or changing the allowlist, run
  `mqRSSAddCatalogAllowlist` (k8s: create a Job from the suspended
  `mq-rss-add-catalog-allowlist` CronJob). It enqueues each listed id that is not stored yet, or
  the surviving show when Podcast Index merged a listed id, and logs ids it could not resolve.
  Running it again is safe."

## `infra/k8s/base/ops/mq-rss-add-catalog-allowlist.cronjob.yaml` (new)

Copy `mq-rss-add-trending-podcast-index-50.cronjob.yaml` and change only:

- The two header comments: "Manual only: suspended CronJob. Create a one-off job from it to
  enqueue the catalog allowlist's unstored Podcast Index feeds to rss-normal." and
  `# kubectl create job --from=cronjob/mq-rss-add-catalog-allowlist mq-rss-add-catalog-allowlist-$(date +%s) -n <ns>`.
- `metadata.name: mq-rss-add-catalog-allowlist`.
- The command args: `"mqRSSAddCatalogAllowlist"`, `"-q"`, `"rss-normal"` (drop `-n` and `50`).
- In `envFrom`, directly after the `podverse-workers-config` entry, add:

```yaml
                - configMapRef:
                    name: podverse-catalog-config
```

Plan 13's contract test in `k8sEnvContract.test.ts` checks this mount for every workload whose
command has `CATEGORY_CATALOG`; it fails if the mount is missing.

## `infra/k8s/base/ops/kustomization.yaml`

Add `- mq-rss-add-catalog-allowlist.cronjob.yaml` after
`- mq-rss-add-trending-podcast-index-1000.cronjob.yaml`.

## Tests

- `apps/workers/src/lib/catalog/collectCatalogAllowlistAddTargets.test.ts` (new). A fake
  `indexProvider.getFeedById` backed by a `Map<string, IndexProviderLookup<…>>`, a
  `loadDeadFeedTargets` spy, and `sleepBetweenLookups: async () => {}`. Cases:
  - Stored listed ids are skipped and not looked up.
  - A live unstored listed id becomes a target with `sourcePodcastIndexId` equal to its id; the
    CSV is not loaded.
  - A dead listed id 10 merged into 20 (CSV map `10 → 20`, 20 live): one target
    `{ podcastIndexId: 20, sourcePodcastIndexId: 10 }`.
  - A chain `10 → 20 → 30` with 30 live: the target is 30 with source 10.
  - A survivor that is already stored, or itself listed, adds no extra target.
  - Two listed ids merged into the same survivor produce one target.
  - A listed id that is `not_found` with no CSV row lands in `unresolved`.
  - An `unavailable` lookup lands in `unavailable`, and the CSV is not loaded when nothing else
    needs a survivor.
- `apps/workers/src/lib/startup/categoriesForCommand.test.ts`: add `mqRSSAddCatalogAllowlist`
  to plan 12's "adds Catalog to commands that parse feeds or read Podcast Index" list, and expect
  its categories to equal `mqRSSAddTrendingPodcastsFromPodcastIndex`'s.

## Release scratchpad

```markdown
## Command to add the allowlisted Podcast Index feeds

- Surfaces: workers, k8s
- Change: new workers command `mqRSSAddCatalogAllowlist` and suspended ops CronJob
  `mq-rss-add-catalog-allowlist`. It enqueues every id in `CATALOG_PODCAST_INDEX_ID_ALLOWLIST`
  that is not stored yet. When Podcast Index merged a listed id into another show (read from the
  dead-feed CSV), it enqueues the surviving show instead, and the parser admits it on behalf of
  the listed id. Ids it cannot resolve are logged. Blank allowlist: it does nothing.
- Who notices: operators of narrowed instances
- Operator steps: after setting or changing the allowlist, create a Job from the
  `mq-rss-add-catalog-allowlist` CronJob (or run `mqRSSAddCatalogAllowlist` locally)
```
