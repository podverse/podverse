---
name: recent-feeds-pagination-bounds
overview: Bound wall time and/or page count for PI recent/data pagination in the cron worker so routine runs finish within the 5-minute cadence window.
todos:
  - id: wall-time-cap
    content: Add elapsed-time guard in recentGetData pagination loop
    status: pending
  - id: log-truncation
    content: Log when pagination stops early due to cap
    status: pending
  - id: unit-tests
    content: Test cap behavior with mocked PI responses
    status: pending
isProject: false
---

# Recent feeds pagination bounds

## Problem

Investigation Job `29697260` paginated **1633** feeds in **~9 minutes** before MQ enqueue (only 3
enqueued; 1630 skipped as not in DB). With `concurrencyPolicy: Forbid`, any run **>5 minutes**
skips ticks even when healthy (`JobAlreadyActive` observed).

The worker uses `-sr 900` (15-minute PI lookback). That window is correct for product semantics; the
issue is **unbounded pagination + sequential DB lookups** over whatever PI returns.

## Implementation options (pick minimal)

Preferred: **wall-time cap inside `recentGetData`** in
[`packages/external-services-podcast-index/src/index.ts`](../../../packages/external-services-podcast-index/src/index.ts):

1. Record `startedAt = Date.now()` before pagination loop.
2. Before each recursive `fetchData` call, if `Date.now() - startedAt > MAX_RECENT_FETCH_MS`,
   log an info/warn with partial `allData.length` and return partial results (do not throw).
3. Set `MAX_RECENT_FETCH_MS` to **240000** (4 minutes) for cron safety margin under 5-minute ticks,
   or make it configurable via env validated in workers startup (only if needed).

Alternative/additive: **max page count** (e.g. stop after N `/recent/data` pages regardless of time).

Do **not** reduce `-sr` in the CronJob unless product wants a narrower lookback; bounds address
runtime, not semantics.

## Downstream behavior

[`addRecentlyUpdatedFeedsFromPodcastIndex`](../../../packages/mq/src/functions/mq/rss/addRecentlyUpdatedFeedsFromPodcastIndex.ts)
already processes whatever list is returned; partial list means partial enqueue for that tick — acceptable
because the next 5-minute run covers a fresh 15-minute window.

## Tests

Add unit tests in `external-services-podcast-index` (mock `podcastIndexAPIRequest` / inject clock):

- Pagination stops when wall cap exceeded.
- Returns partial feeds without throwing.

## Optional follow-up (out of scope unless needed)

Batch `FeedService.getByPodcastIndexId` lookups or filter PI results differently — only if caps prove
too lossy under production load.

## Verification

```bash
npm run test:unit
npm run build:packages
npm run build -w apps/workers
```

After deploy, operator watches cron Jobs complete in <5m typical case and cadence stays ~5m.
