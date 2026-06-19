---
name: podcast-index-http-timeouts
overview: Add per-request HTTP timeouts only in recentGetData pagination so worker-recent-feeds fails fast on stalls without affecting other Podcast Index callers.
todos:
  - id: recent-fetch-timeout
    content: Pass abort timeout to requestWithUserAgent inside recentGetData fetchData only
    status: pending
  - id: recent-fetch-tests
    content: Add tests for recentGetData timeout behavior (new or extended test file)
    status: pending
isProject: false
---

# Podcast Index HTTP timeouts (recentGetData only)

## Problem

Inside [`recentGetData`](../../../packages/external-services-podcast-index/src/index.ts), paginated
`/recent/data` calls use `podcastIndexAPIRequest` → `requestWithUserAgent` **without** an abort
timeout. A stalled page can block a cron Job for hours (`concurrencyPolicy: Forbid`).

## Scope — do NOT change global `podcastIndexAPIRequest`

`podcastIndexAPIRequest` is shared by **many** worker commands:

- `deadFeedsDownloadAndExtractCSV` (streaming CSV — needs long/no tight timeout)
- `trendingGetPodcasts`, `podcastGetById`, `valueGetByPodcastIds`, etc.

Adding `DEFAULT_HTTP_TIMEOUT_MS` (5s) to **all** PI requests would risk breaking those paths. Only
**`recentGetData`** is on the recent-feeds cron hot path (`recentGetData` has a single caller:
[`addRecentlyUpdatedFeedsFromPodcastIndex`](../../../packages/mq/src/functions/mq/rss/addRecentlyUpdatedFeedsFromPodcastIndex.ts)).

## Implementation

In `recentGetData`'s inner `fetchData` loop only:

1. Import `DEFAULT_HTTP_TIMEOUT_MS` from `@podverse/helpers`.
2. Before each `this.podcastIndexAPIRequest(...)` call in that loop, create an `AbortController` and
   pass abort options into `podcastIndexAPIRequest`.

**Requires a small API extension:** add an optional parameter to `podcastIndexAPIRequest` (or a
package-private overload) so callers can pass `{ controller, timeoutMs }` through to
`requestWithUserAgent` — default **unchanged** (no timeout) for all existing call sites.

3. Timeout errors in the recent-feeds path should **not** retry through the full PI retry loop if
   that would multiply wall time; prefer fail-fast for abort/timeout on cron (verify
   `isRetryablePodcastIndexError` — treat timeout as non-retryable or handle in `fetchData`).

Per-page timeout: start with **`DEFAULT_HTTP_TIMEOUT_MS` (5000)**. Investigation showed pages
usually complete in 1–3s. If alpha still sees false timeouts, add
`PODCAST_INDEX_RECENT_DATA_TIMEOUT_MS` env (workers validation) — only if needed.

## Tests

- New or extended tests in `external-services-podcast-index`: `recentGetData` passes abort to
  underlying request; timeout fails without unbounded hang.
- Regression: existing `podcastIndexAPIRequest.retry.test.ts` behavior unchanged for call sites that
  omit abort.

## Verification

```bash
npm run test:unit
npm run build:packages
```

No E2E required.

## MQ hangs (out of scope here)

MQ `connect`/`sendMessage` can still hang. Prompt 1 `activeDeadlineSeconds` is the safety net for
this CronJob. Do not add global MQ timeouts in this prompt unless a separate plan is opened.
