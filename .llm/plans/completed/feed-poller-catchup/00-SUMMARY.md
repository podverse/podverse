# Feed poller catch-up — summary

Prompts and models: [COPY-PASTA.md](COPY-PASTA.md). Order: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).

## Why this set exists

On alpha, `worker-recent-feeds` (the Podcast Index `/recent/data` poller) was suspended by hand with
`kubectl patch` on 2026-10-30 15:10 UTC during a queue purge and never resumed. Argo CD did not
undo it because the base manifest does not set `spec.suspend`, so Argo never compares that field.
For two days no feed update signals reached the parser. The Podcasting 2.0 feed missed episode 277.
Nothing alerted.

The same investigation found more scheduled work silently broken on alpha:

- `worker-account-content-log-purge`, `worker-account-session-purge`, and
  `worker-notifications-purge` fail every night at startup:
  `ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY (required): Missing or empty`. The workers ORM
  validator (`apps/workers/src/lib/startup/validation.ts`, the `validateRequired('ADD_BY_RSS_…')`
  line in the ORM category) requires it for every command, and those CronJobs do not mount
  `podverse-workers-add-by-rss-opaque`.
- `management-api-admin-session-purge` has one Job stuck in Running since 2026-10-25. That pod's
  image predated the `adminSessionPurge` exit branch in `apps/management-api/src/index.ts`, so it
  started the full API server and never exited. `concurrencyPolicy: Forbid` with no
  `activeDeadlineSeconds` means every later night was skipped.
- Most base CronJobs have no `activeDeadlineSeconds` (only `worker-recent-feeds` and the two
  `worker-stats-recommendations-refresh*` jobs set it).

## Locked decisions (operator answers)

- **Gap over 24 hours:** catch up automatically. Check every feed we have against Podcast Index in
  batches and queue only feeds that changed, and log at error level so alerting sees it.
- **No `suspend: false` in base manifests.** Operators sometimes pause jobs on purpose. Monitoring
  catches a forgotten suspend instead (an alert on scheduled CronJobs that stay suspended). An
  intentional pause is an Alertmanager silence with an end time, which re-alerts when it expires.
- **Monitoring is a separate set in this repo:** `.llm/plans/active/cron-health-alerting/` (CronJob
  deadlines, labels, alert rules, and copy-and-adapt alerting examples that deliver through ntfy
  only, with no chat bot or LLM agent in the path). This set holds only application code. Shared contract: **exit code 78** means startup configuration
  is missing or invalid (plan 04 here emits it; the alert rule there matches it).
- **Podping is not added as a second update signal.**

## Podcast Index facts the plans rely on (checked 2026-11-01)

- `/recent/data` returns only what the index added in the **past 24 hours**. Paging is forward with
  `since` and the response's top-level `nextSince` (Unix seconds). `max` counts feeds plus items.
- Events are keyed by when the index found the episode (`episodeAdded`), not the publish date, so
  the stream is linear by discovery time. Each response carries `data.position`, which increased in
  the sample. The docs do not promise rows are never inserted behind the cursor; keep an overlap.
- Every `feedId` in `data.items` also appears in `data.feeds`, so reading `data.feeds` sees every
  updated feed.
- `https://tracking.podcastindex.org/current` with `previousTrackingUrl` walks back further, but one
  block was about 2 minutes and 17 MB. Not used here.
- `/episodes/byfeedid?id=<up to 200 comma-separated ids>&newest` returns the newest episode per
  feed. `/podcasts/batch/byguid` (already wrapped by `PodcastIndexService`) returns feed objects by
  podcast GUID.
- A duplicate parse is cheap but not free: the parser downloads and parses the XML, compares
  `getParsedFeedMd5Hash` with `feed.last_parsed_file_hash`, and stops with
  `FeedNoChangesSinceLastParsedError` without writes.

## Requirement ledger

- **R1** "if possible, we look for a time that the fire hose read happened successfully. And the
  next time the fire hose request for data happens, it should request data from that timestamp
  forward" — Plan: 01
- **R2** "a process that can allow us to query deeper to make up for misses that have happened" —
  Plan: 02
- **R3** "I am concerned about how I was unaware that the parser and potentially other workers
  were not running this whole time" — set `cron-health-alerting`
- **R4** Nightly purge jobs failing on a missing Add by RSS key (found during investigation) —
  Plan: 03
- **R5** Stuck CronJob runs blocking later runs — set `cron-health-alerting`
- **R6** "this is a type of failure that we would like our bot to notify us about" (startup env
  failures) — Plan: 04 (exit code 78 and a contract test that prevents the gap); the alert, sent to
  ntfy by Alertmanager rather than a bot, is in `cron-health-alerting`

## Areas and files

| Plan | Area | Main files |
| --- | --- | --- |
| 01 | Poller cursor | `packages/mq/src/functions/mq/rss/addRecentlyUpdatedFeedsFromPodcastIndex.ts`, `packages/external-services-podcast-index/src/index.ts`, ORM entity/service, new linear migration |
| 02 | Gap catch-up | same mq function, new PI batch method, workers command |
| 03 | Workers env scope | `apps/workers/src/lib/startup/validation.ts`, `categoriesForCommand.ts`, `apps/workers/ENV.md` |
| 04 | Config exit code and env contract | `apps/workers/src/index.ts`, `apps/workers/src/lib/startup/**`, `apps/management-api/src/index.ts`, new contract test |

## Operator steps already done or outside this set

- Resume `worker-recent-feeds` (done; last success 2026-11-01 21:26 UTC).
- Queue alpha's 4 feeds once (`mqRSSAddAll -q rss-normal`) to pick up episode 277.
- Delete the stuck Job so the admin session purge can run again:
  `kubectl --context al -n podverse-alpha delete job management-api-admin-session-purge-29882025`
