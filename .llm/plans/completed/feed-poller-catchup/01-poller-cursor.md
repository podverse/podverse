**Cursor model:** Opus 5.5 · **Reasoning:** high

# 01 — Poller resumes from a saved cursor

## Rows

R1

## Runs after

none

## Goal

`mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex` stops using a fixed look-back window. It saves how
far it got in the Podcast Index `/recent/data` stream and starts the next run from there, so a
skipped tick, a failed run, or a run cut short by the time cap loses nothing.

## Current behavior

- `apps/workers/src/commands/mq/rss/mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex.ts` requires
  `-sr <seconds>` (the CronJob passes `900`) and calls the `@podverse/mq` function.
- `packages/mq/src/functions/mq/rss/addRecentlyUpdatedFeedsFromPodcastIndex.ts` calls
  `podcastIndexService.recentGetData(sinceRange)`, which pages
  `/recent/data?max=5000&since=…` forward with `nextSince` until it reaches now or the
  `RECENT_GET_DATA_MAX_FETCH_MS` (240 s) cap, then returns every feed at once. Only then does the
  function look each feed up (`FeedService.getByPodcastIndexId`, one query per feed) and enqueue.
- When the cap stops pagination, the newest pages are dropped. The next run starts at
  `now - 900` again, so coverage depends on the overlap.
- A failed `sendMessage` is counted and skipped; that feed's signal is lost.

## Decisions

1. **Storage: the app database.** Add a small table through a forward-only linear migration under
   `infra/k8s/base/ops/source/database/linear-migrations/app/` (next free number). Shape, adjusted
   to the repo's naming rules (**database-schema-naming**, **linear-sql-greenfield-only**):
   `podcast_index_stream_cursor (stream_key varchar PK, next_since bigint not null,
   position bigint null, updated_at server_time_with_default)`. One row, `stream_key =
   'recent_data'`. Valkey was rejected: a flush would silently reset the cursor, and the cron does
   not mount the Valkey secret.
2. **Run start.**
   - Cursor row exists and is within `PODCAST_INDEX_RECENT_DATA_MAX_LOOKBACK_SECONDS` (23 hours,
     a named constant beside `RECENT_GET_DATA_MAX_FETCH_MS`): `since = next_since - 60`
     (overlap constant `RECENT_DATA_CURSOR_OVERLAP_SECONDS = 60`).
   - No row, or the row is older than 23 hours: this plan uses `since = now - sinceRange` and logs
     at **error** level with the gap size. Plan 02 replaces this branch with the catch-up sweep.
3. **Page-by-page processing.** Change `recentGetData` (or add a sibling such as
   `recentGetDataPages`) into an async generator or callback that yields one page
   (`feeds`, `nextSince`, `position`) at a time. The mq function, for each page:
   1. Batch-looks-up the page's `feedId`s in one query (add a `FeedService` method that takes an
      id array and returns the feed plus lifecycle state, so the per-feed query loop goes away).
   1. Enqueues every matching feed whose lifecycle state allows parsing, as today.
   1. If every send succeeded, upserts the cursor to that page's `nextSince` (and `position`).
   1. If any send failed, stops without advancing the cursor, logs the failures, and makes the
      command exit non-zero so the Job is marked Failed (alerting sees repeated failures). The MQ
      dedupe window absorbs the re-sent messages on the next run.
4. **Time cap.** Keep the 240 s cap. When it stops, the cursor already points at the last finished
   page, so the next run resumes there. Log at warn level with how far behind now the cursor is.
5. **Concurrency.** The CronJob uses `concurrencyPolicy: Forbid`, but an operator can start a
   manual Job from it. Take a Postgres advisory lock (or `SELECT … FOR UPDATE` on the cursor row)
   for the whole run; a second run that cannot get the lock logs and exits 0.
6. **`-sr` stays** and means "look-back when there is no usable cursor". No CronJob manifest change.
7. Never move the cursor backwards: the upsert keeps the greater `next_since`.

## Files

- `infra/k8s/base/ops/source/database/linear-migrations/app/<next>_podcast_index_stream_cursor.sql`
- `infra/k8s/base/ops/source/database/` regenerated `0004_app_linear_baseline.sql.gz` (via
  `make db_regen_linear_baseline`; never hand-edit) and the API readiness marker, per
  **migration-readiness-marker-sync** and `AGENTS.md` § Linear SQL migrations
- `packages/orm/src/entities/**` — new entity for the table, registered where entities are listed
- `packages/orm/src/services/**` — cursor service (get, advance) and the batch feed lookup
- `packages/external-services-podcast-index/src/index.ts` — page-yielding `recentGetData`
- `packages/external-services-podcast-index/src/recentGetDataLimits.ts` — new constants
- `packages/mq/src/functions/mq/rss/addRecentlyUpdatedFeedsFromPodcastIndex.ts`
- `apps/workers/src/commands/mq/rss/mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex.ts` — non-zero
  exit on unsent pages
- `docs/RSS-ARCHIVE-DELETE-LIFECYCLE.md` — the `worker-recent-feeds` paragraph describes the cursor

## Tests

- Update `packages/external-services-podcast-index/src/recentGetData.paginationBounds.test.ts` and
  `recentGetData.timeout.test.ts` for the page-yielding shape.
- New unit test for the mq function: resumes from cursor minus overlap; advances only after a page
  is fully sent; does not advance when a send fails; cap stop leaves the cursor at the last full
  page; no cursor falls back to `sinceRange`; cursor never moves backwards.
- ORM integration test for the cursor service upsert and the batch feed lookup (API integration
  tier, per **api-testing** where ORM tests live).

## Release scratchpad

Surfaces: workers, k8s (migration). The recent-feeds poller saves its position in the Podcast Index
stream and resumes from it, so skipped or failed runs no longer drop feed updates. Migration
`<next>_podcast_index_stream_cursor.sql`; API readiness waits on it. Operators: apply app
migrations through that file.
