# Feed poller catch-up — execution order

Prompts and models: [COPY-PASTA.md](COPY-PASTA.md).

## Phase 1 (parallel; disjoint files)

- 01 — Poller cursor. Owns `packages/mq/src/functions/mq/rss/addRecentlyUpdatedFeedsFromPodcastIndex.ts`,
  `packages/external-services-podcast-index/src/**`, the new ORM entity/service, the new linear
  migration and regenerated baselines.
- 03 — Workers Add by RSS key scope. Owns `apps/workers/src/lib/startup/**`, `apps/workers/ENV.md`.

## Phase 2 (parallel; disjoint files)

- 02 — Gap catch-up sweep (after 01, which adds the cursor table and page processing).
- 04 — Exit code 78 and k8s env contract test (after 03, which narrows the Add by RSS category the
  test checks). Owns `apps/workers/src/index.ts`, `apps/workers/src/lib/startup/**`,
  `apps/management-api/src/index.ts`, `apps/management-api/src/lib/startup/**`.

02 must not touch `apps/workers/src/lib/startup/**` beyond adding its new command's category entry
in `categoriesForCommand.ts`; 04 must not touch that entry.

## Close

Scratchpad, archive, verification.

## Relation to the other sets

- `cron-health-alerting` (separate worktree, runs at the same time) owns `infra/k8s/**` manifests,
  rules, and examples. Shared contract: exit code 78 means bad startup config.
