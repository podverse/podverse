**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 52 — OPML import saves no Add by RSS feed when Add by RSS is off

OPML import is a way to add feeds. For a feed that is not stored and that Podcast Index does not
know, it saves an Add by RSS follow and queues an Add by RSS parse. When Add by RSS is off, that
feed is reported as failed with a reason, and nothing is saved. Feeds that are stored or that
Podcast Index knows import as today.

Both places that run the import read the switch: the workers command (`mqOpmlImportRun`) and the
API's synchronous fixtures path. Web and mobile already show a failed row with its error text,
so no client changes.

## Rows

R74

## Runs after

12, 51

## Files

- packages/mq/src/functions/mq/rss/processOpmlImport.ts
- packages/mq/src/functions/mq/rss/processOpmlImport.test.ts
- apps/workers/src/commands/mq/rss/runOpmlImport.ts
- apps/workers/.env.example
- apps/workers/ENV.md
- apps/api/src/controllers/account/accountOpmlImport.ts
- apps/api/src/test/opml-import.test.ts
- release-notes/scratchpad.md

## Settled decisions

Transcribe these. Do not reopen them.

- The outcome is the existing `'failed'` with `error: ADD_BY_RSS_DISABLED_MESSAGE` (from
  `@podverse/helpers`, added by plan 51). No new outcome value, so `OpmlImportFeedOutcome`, the
  totals, the web `SettingsOpml` labels, and the mobile `MoreOpmlScreen` labels do not change.
  Web already prints `result.error` beside a failed row.
- The check sits where the import would save the Add by RSS follow, after the
  already-followed and hourly-budget checks and after the Podcast Index lookup. A feed already
  followed as Add by RSS still reports `already_subscribed`. A refused feed does not use hourly
  budget.
- `addByRSSEnabled` is an optional param with default true, like `enqueueDownstreamJobs` and
  `enforceAddByRssLimit` in the same type. Both callers in this plan pass it explicitly.
- Workers read `getCatalogConfig()` per message, not once at startup (plan 12's rule).
  `mqOpmlImportRun` is already in the Catalog category (plan 12), and its k8s deployment already
  mounts the catalog ConfigMap (plan 13), so no category, contract, or k8s change here.

## `packages/mq/src/functions/mq/rss/processOpmlImport.ts`

Anchors: `export type ProcessOpmlImportJobParams`, `const enforceAddByRssLimit =`, and the
`} else if (reachedAddByRssLimit !== null) {` branch.

- Add to `ProcessOpmlImportJobParams`, after `enforceAddByRssLimit`:

```typescript
  /** When false, a feed that would be saved as Add by RSS is reported failed and nothing is saved. Default true. */
  addByRSSEnabled?: boolean;
```

- After `const enforceAddByRssLimit = …`, add `const addByRSSEnabled = params.addByRSSEnabled !== false;`.
- Insert a branch directly before `} else if (reachedAddByRssLimit !== null) {`:

```typescript
            } else if (!addByRSSEnabled) {
              outcome = 'failed';
              error = ADD_BY_RSS_DISABLED_MESSAGE;
```

- Add `ADD_BY_RSS_DISABLED_MESSAGE` to the existing `@podverse/helpers` import list, in
  alphabetical position (before `addByRssFeedLimitReachedMessage`).

## `apps/workers/src/commands/mq/rss/runOpmlImport.ts`

- Add `getCatalogConfig` to the existing `import { getOpmlImportConfig } from '@workers/config/index.js';`.
- In the `processOpmlImportJob({ … })` call inside the message handler, add
  `addByRSSEnabled: getCatalogConfig().addByRSSEnabled,` after `enqueueDownstreamJobs: true,`.

## `apps/api/src/controllers/account/accountOpmlImport.ts`

In the fixtures-path `processOpmlImportJob({ … })` call (the one with
`enforceAddByRssLimit: false`), add `addByRSSEnabled: config.catalog.addByRSSEnabled,` after
`enforceAddByRssLimit: false,`. The non-fixtures path only enqueues the message; the worker reads
the switch.

## Workers env docs

Plan 12 wrote that workers take no action on `CATALOG_ADD_BY_RSS_DISABLED`. Replace those lines:

- `apps/workers/.env.example`, the comment above `CATALOG_ADD_BY_RSS_DISABLED=` in the
  `##### Catalog` section: `# "true" makes OPML import skip feeds it would save as Add by RSS. The API refuses the rest.`
- `apps/workers/ENV.md`, `## Catalog` section, the `CATALOG_ADD_BY_RSS_DISABLED` bullet:
  "`"true"` makes OPML import (`mqOpmlImportRun`) report a feed it would save as Add by RSS as
  failed and save nothing. Stored follows stay. The API refuses Add by RSS parses and new
  follows."

Do not edit `apps/api/ENV.md` or `apps/api/.env.example`; their wording ("refuses Add by RSS
parse requests and new Add by RSS follows") already covers an import that creates a follow.

## Tests

- `packages/mq/src/functions/mq/rss/processOpmlImport.test.ts` — two cases in the existing
  `describe('processOpmlImportJob')`, using its `createMemoryCache` and mocks:
  - `reports a feed Podcast Index does not know as failed when Add by RSS is off` —
    `podcastGetByFeedUrl: async () => null`, `addByRSSEnabled: false`,
    `enqueueDownstreamJobs: true`. The result's only row has `outcome: 'failed'` and
    `error: ADD_BY_RSS_DISABLED_MESSAGE`; `totals.failed` is 1; `addOrUpdateRSSChannelMock` and
    `mqAddByRSSAddMock` were not called.
  - `still enqueues a feed Podcast Index knows when Add by RSS is off` — the same setup as the
    existing `enqueues indexed parse + pending follow when PI finds the feed` case, plus
    `addByRSSEnabled: false`. Outcome `enqueued_indexed`, `addPendingFollowMock` called,
    `addOrUpdateRSSChannelMock` not called.
- `apps/api/src/test/opml-import.test.ts` — one case after
  `imports subscribed + PI-indexed + add-by-RSS + failed isolation via fixtures sync path`,
  named `reports the add-by-RSS feed as failed via the fixtures sync path when Add by RSS is off`.
  Same `feedGetByUrlMock` and OPML as that case without the `boom` feed. Set
  `config.catalog = { ...previous, addByRSSEnabled: false }` before the request and restore
  `previous` in `finally` (import `config` from `@api/config/index.js` if the file does not
  already). Outcomes are `['subscribed', 'enqueued_indexed', 'failed']`; the third row's `error`
  is `ADD_BY_RSS_DISABLED_MESSAGE`; `addOrUpdateRSSChannelMock` was not called.

## Release scratchpad

```markdown
## OPML import saves no Add by RSS feed when Add by RSS is off

- Surfaces: workers, api
- Change: with `CATALOG_ADD_BY_RSS_DISABLED=true`, OPML import reports a feed that is not stored
  and not in Podcast Index as failed, with "Add by RSS is turned off on this server.", and saves
  no Add by RSS follow. Stored and Podcast Index feeds import as before. Blank keeps today's
  behavior.
- Who notices: listeners importing OPML on an instance with Add by RSS off
- Operator steps: set the key on the workers that run `mqOpmlImportRun` with the same value as
  the API
```
