**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

# 63 — OPML import treats off-list Podcast Index feeds as unindexed

An OPML import enqueues a directory add and saves a pending follow for every unstored feed that
Podcast Index knows. Under the allowlist, plan 60's gate refuses an off-list feed in the worker,
so the pending follow would never resolve and the import would report "enqueued". This plan
makes the import treat an off-list Podcast Index feed as not indexed. It then takes the same Add
by RSS path as any other unindexed feed, the way a manual Add by RSS of that URL already works.

## Rows

R52

## Runs after

12

## Files

- packages/mq/src/functions/mq/rss/processOpmlImport.ts
- packages/mq/src/functions/mq/rss/processOpmlImport.test.ts
- apps/workers/src/commands/mq/rss/runOpmlImport.ts
- apps/api/src/controllers/account/accountOpmlImport.ts
- release-notes/scratchpad.md

## Settled decisions

Transcribe these. Do not reopen them.

- **Off-list indexed means unindexed.** When the allowlist is set and an unstored feed's Podcast
  Index id is not listed, the import skips the blocked-by-id check, the pending follow, and the
  directory enqueue. It continues into the existing Add by RSS branch. Add by RSS ignores the
  allowlist; only the Add by RSS switch controls it. When step 11 makes that branch refuse while
  Add by RSS is off, the refusal applies here unchanged.
- **Stored feeds are unchanged.** A feed with a stored channel still subscribes, listed or not.
- **Listed feeds are unchanged.** They take the indexed path as today.
- **Music off is not checked here.** A music feed is enqueued; the worker refuses it (plan 60) and
  its pending follow stays unresolved, as it does for any feed the worker cannot add.
- **No new outcome value.** The existing outcomes cover every path, so the DTO and the web and
  mobile result screens do not change.

## `packages/mq/src/functions/mq/rss/processOpmlImport.ts`

- `ProcessOpmlImportJobParams`: add after `enforceAddByRssLimit`:

```typescript
  /** When set, an unstored feed whose Podcast Index id is not listed is treated as unindexed. */
  catalogPodcastIndexIdAllowlist?: readonly number[] | null;
```

- Directly after `const enforceAddByRssLimit = params.enforceAddByRssLimit !== false;`, add
  `const catalogPodcastIndexIdAllowlist = params.catalogPodcastIndexIdAllowlist ?? null;`
- In the indexed branch, keep the existing `const podcastIndexId = …` expression as it is, and
  add directly below it:

```typescript
            const indexedPodcastIndexId =
              podcastIndexId !== null &&
              (catalogPodcastIndexIdAllowlist === null ||
                catalogPodcastIndexIdAllowlist.includes(podcastIndexId))
                ? podcastIndexId
                : null;
```

  Then change `if (podcastIndexId !== null) {` to `if (indexedPodcastIndexId !== null) {`, and
  inside that block use `indexedPodcastIndexId` in place of `podcastIndexId` (the
  `findBlockedFeed` call, `addPendingFollow`, and `mqRSSAdd`). The `else if
  (reachedAddByRssLimit !== null)` and Add by RSS branches below are unchanged.

## `apps/workers/src/commands/mq/rss/runOpmlImport.ts`

- Add `getCatalogConfig` to the `@workers/config/index.js` import (it already imports
  `getOpmlImportConfig`).
- In the `processOpmlImportJob({ … })` call, add after `enqueueDownstreamJobs: true,`:
  `catalogPodcastIndexIdAllowlist: getCatalogConfig().podcastIndexIdAllowlist,`

`mqOpmlImportRun` has `CATEGORY_PODCAST_INDEX`, so plan 12 gives it `CATEGORY_CATALOG` and plan 13
mounts the keys on `parser-opml-import`.

## `apps/api/src/controllers/account/accountOpmlImport.ts`

In the synchronous `processOpmlImportJob({ … })` call (inside `if (config.e2e.fixturesEnabled)`),
add after `enforceAddByRssLimit: false,`:
`catalogPodcastIndexIdAllowlist: config.catalog.podcastIndexIdAllowlist,`

## Tests

`packages/mq/src/functions/mq/rss/processOpmlImport.test.ts`, inside the existing
`describe('processOpmlImportJob')`, after "adds by RSS when not in DB and not in PI":

- "treats an off-list Podcast Index feed as unindexed and adds it by RSS": `podcastGetByFeedUrl`
  returns `{ podcast_index_id: 12345 }`, `catalogPodcastIndexIdAllowlist: [999]`. Expect outcome
  `added_by_rss`, `addPendingFollowMock` and `mqRSSAddMock` not called, `findBlockedFeedMock` not
  called with `podcastIndexId: 12345`, and `addOrUpdateRSSChannelMock` called with the feed URL
  and title.
- "keeps the indexed path for a listed Podcast Index feed": same lookup,
  `catalogPodcastIndexIdAllowlist: [12345]`. Expect outcome `enqueued_indexed` and
  `addPendingFollowMock` called with `podcast_index_id: 12345`.
- "subscribes a stored feed whatever the allowlist": `feedGetByUrlMock` resolves
  `{ channel: { id_text: 'ch-1' } }`, `catalogPodcastIndexIdAllowlist: [999]`. Expect outcome
  `subscribed` and `podcastGetByFeedUrl` not called.

The existing tests pass no allowlist and keep their expectations.

## Release scratchpad

```markdown
## OPML import follows the catalog allowlist

- Surfaces: workers, api
- Change: while `CATALOG_PODCAST_INDEX_ID_ALLOWLIST` is set, an OPML import treats an unstored
  feed whose Podcast Index id is not listed as unindexed: no directory add and no pending follow;
  it goes through the same Add by RSS path as any unindexed feed. Listed feeds and feeds already
  stored import as before.
- Who notices: listeners importing OPML on narrowed instances
- Operator steps: none beyond the catalog keys
```
