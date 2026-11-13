**Cursor model:** Opus 5.5 · **Reasoning:** medium

# 01 — Migration feed retry

## Rows

Resilience for a migration feed that hits a temporary outage.

## Runs after

none

## Problem

`v4SeedAccountCatalog` queues one `rss-slow` parse per created feed. A failure
calls `recordFeedParseFailure` (`packages/parser/src/lib/rss/feed/recordFeedParseFailure.ts`),
which bumps `feed_log.parse_errors` and sets `last_failed_parse_time`. Nothing
reads those to try again. On the rehearsal account two seeded shows failed
and have 0 items. Their 37 clips are Archived items until a later parse.

## Change

1. New job type `v4-migration-feed-retry` next to `feed-force-reparse` in
   `packages/orm/src/services/feed/`. Payload `{ feedId }`. Dedupe key
   `v4-migration-feed-retry:<feedId>`. `scheduleV4MigrationFeedRetry(feedId, runAfter)`
   upserts by dedupe key, the same way `scheduleFeedForceReparse` does.
2. Handler in `apps/workers/src/commands/orm/scheduledJob/runDue.ts`:
   - Feed missing, or `cancelledWhenFeedMayNotBeParsed` says no: cancelled.
   - `feed_log.last_finished_parse_time` is after the job's `created_at`: completed
     with no parse (an ordinary parse already succeeded).
   - Otherwise call `parsePodcastIndexFeedDirectly(feed.podcast_index_id, true, …)`
     as `handleFeedForceReparse` does. Afterward, read `feed_log` again. If the
     parse did not set `last_finished_parse_time` after `created_at`, throw so
     the job requeues. Check whether `parsePodcastIndexFeedDirectly` already throws
     on a failed parse, and do not throw twice.
3. Backoff for this type only. `runDue.ts` uses one `BASE_BACKOFF_MS` (5 minutes)
   for every type. Add a per-type delay lookup: this type uses the ladder
   1 hour, 6 hours, 24 hours, 72 hours, 168 hours by attempt number, with
   `max_attempts` 6. Every other type keeps the current exponential delay.
4. Scheduling: `v4SeedAccountCatalog` (apply) schedules one retry per created
   feed with `run_after` = now + 1 hour. If the first parse succeeds, the job
   completes without parsing (step 2).
5. Settled rule, exported for 02 and 03: a feed is settled when
   `last_finished_parse_time` is set, or its `v4-migration-feed-retry` job is
   `failed` (attempts used up) or `cancelled`. A feed with no retry job that has
   finished or failed once counts as settled, so feeds seeded before this change
   keep working.

## Files

- packages/orm/src/services/feed/v4MigrationFeedRetryScheduler.ts
- packages/orm/src/services/feed/v4MigrationFeedRetryScheduler.test.ts
- packages/orm/src/index.ts
- apps/workers/src/commands/orm/scheduledJob/runDue.ts
- apps/workers/src/commands/orm/scheduledJob/runDue.test.ts
- apps/workers/src/commands/orm/v4Catalog/seedAccountCatalog.ts
- docs/proposals/v4-to-v5-migration/05-id-mapping-and-catalog-seeding.md

## Tests

- Scheduler: dedupe key, payload parse, upsert.
- `runDue`: completed without parse when already finished; requeues with the
  ladder delay on a failed parse; other types keep the 5-minute base; marked
  failed after attempt 6.

## Release scratchpad

workers: seeded v4 feeds that fail to parse are retried after 1 h, 6 h, 24 h,
3 d, and 7 d. Ordinary feeds are unchanged. Needs `scheduledJobsRunDue` running.
