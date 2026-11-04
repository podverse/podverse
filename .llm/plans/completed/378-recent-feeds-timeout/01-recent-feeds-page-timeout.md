**Cursor model:** Codex 5.3 · **Reasoning:** high

# Recent-feeds page timeout

Issue: https://github.com/podverse/podverse/issues/378

`/recent/data` and `/episodes/byfeedid` abort at `DEFAULT_HTTP_TIMEOUT_MS` (5 seconds). `shouldRetryPodcastIndexRequest` treats any passed abort as a caller cancel, so that deadline is not retried. `recentGetData` then throws, and the recent-feeds Job exits non-zero. A wall-clock stop already returns `time_cap`, and the worker command exits 0 for that outcome. The cursor stays on the last finished page.

The abort controller is created once at the call site. After `abort()`, that signal stays aborted, so a retry on the same controller would fail immediately. Each attempt needs its own controller.

Leave `failedJobsHistoryLimit` at 5. Do not edit CronJob manifests.

## Rows

- **R1** Raise the per-request deadline for `recentGetData` and `episodesGetNewestByFeedIds` to 30 seconds, retry that deadline, and when retries are exhausted stop the recent-feeds run the way `time_cap` already does so the Job exits 0.

## Runs after

none

## Files

- packages/external-services-podcast-index/src/recentGetDataLimits.ts
- packages/external-services-podcast-index/src/index.ts
- packages/external-services-podcast-index/src/isRetryablePodcastIndexError.ts
- packages/external-services-podcast-index/src/isRetryablePodcastIndexError.test.ts
- packages/external-services-podcast-index/src/recentGetData.timeout.test.ts
- packages/mq/src/functions/mq/rss/catchUpFeedsFromPodcastIndex.ts
- packages/mq/src/functions/mq/rss/catchUpFeedsFromPodcastIndex.test.ts
- release-notes/scratchpad.md
- .llm/plans/active/378-recent-feeds-timeout/proposed-reply.md

## Behavior

Do not change `DEFAULT_HTTP_TIMEOUT_MS`.

Add `PODCAST_INDEX_PAGE_REQUEST_TIMEOUT_MS = 30_000` in `recentGetDataLimits.ts`. Use it as `abort.timeoutMs` for `recentGetData` and `episodesGetNewestByFeedIds` only. 30 seconds times 4 attempts, plus the existing backoff (base 5 seconds, three waits), is about 155 seconds. That stays inside `RECENT_GET_DATA_MAX_FETCH_MS` (240 seconds), the gap-sweep cap (8 minutes), and the CronJob `activeDeadlineSeconds` (600). Do not use 60 seconds.

Add `retryDeadlineAbort?: boolean` on `PodcastIndexAPIRequestExtraParams` in `index.ts`. Set it true only on those two methods.

In `podcastIndexAPIRequest`, when `extraParams.abort.timeoutMs` is set, each loop attempt builds a new `AbortController` and passes `{ controller, timeoutMs }` to `requestWithUserAgent`. Do not reuse the caller's controller across attempts.

`shouldRetryPodcastIndexRequest` takes `retryDeadlineAbort`. When that flag is true and `isPodcastIndexClientAbortError` matches (including `CanceledError` and `ERR_CANCELED`), return true. When `clientAbortRequested` is true and the flag is false, keep today's fail-fast. The call in `podcastIndexAPIRequest` sets `clientAbortRequested` only when an abort was passed and `retryDeadlineAbort` is not true. HTTP 4xx other than 429, and errors that are not a deadline abort, stay as they are. The separate retry loop in the dead-feeds download stays `clientAbortRequested: false`.

`recentGetData`: when `podcastIndexAPIRequest` throws a deadline abort after retries, log a warning that names the page `since` and return `'time_cap'`. Do not throw. Any other error still throws. Update the doc comment that currently says a failed request throws. The poller and `apps/workers/src/commands/mq/rss/mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex.ts` stay as they are. `time_cap` already exits 0, and the cursor is only advanced after a page is enqueued.

`episodesGetNewestByFeedIds` still throws after retries, including a deadline abort. In `sweepFeedsAgainstPodcastIndex`, catch that around `sweepChunk`. If `isPodcastIndexClientAbortError`, set `result.outcome` to `'time_cap'`, log a warning that names `afterFeedId`, and break. Do not call `cursorService.replace` or `clear` for that chunk. Any other error still throws. `send_failed` still exits non-zero.

## Tests

Update `recentGetData.timeout.test.ts`. The per-page abort `timeoutMs` is `PODCAST_INDEX_PAGE_REQUEST_TIMEOUT_MS`. A `CanceledError` / `ERR_CANCELED` rejection is tried `maxRetries + 1` times, each call gets a distinct `AbortController`, and `drain` resolves to `'time_cap'` (warn once, no rejection). A non-abort failure still rejects and does not become `time_cap`.

Update `isRetryablePodcastIndexError.test.ts`. `retryDeadlineAbort: true` retries a `CanceledError`. `clientAbortRequested: true` with the flag omitted still does not retry.

Add one case in `catchUpFeedsFromPodcastIndex.test.ts`. `episodesGetNewestByFeedIds` rejects with a client-abort error. The sweep outcome is `time_cap`, and the gap-sweep cursor is not moved past that chunk.

No API integration tests. No Playwright specs. No Maestro flows.

## Release scratchpad

Append to `release-notes/scratchpad.md`:

```markdown
## Recent-feeds survives a Podcast Index page timeout

- Surfaces: workers
- Change: `/recent/data` and `/episodes/byfeedid` wait 30 seconds and retry a deadline abort. If the page still times out, `worker-recent-feeds` stops cleanly and the next run resumes from the last finished page or gap-sweep chunk.
- Who notices: alpha operators watching `podverse-alpha-cron` and the recent-feeds CronJob
- Operator steps: after the new workers image is on alpha, delete the old Failed Jobs in `podverse-alpha` so Argo CD drops Degraded. `failedJobsHistoryLimit` stays 5.
```

## Ticket reply

Write this to `proposed-reply.md` and repeat it in a fenced `text` block in the final message. Do not post it. The operator pastes it on the issue after the change is on `develop`.

```text
Podcast Index page requests from the recent-feeds job now wait 30 seconds and retry a timeout. If the page still does not answer, the job stops cleanly and the next run continues from the last finished page, instead of failing.

Failed-job history is unchanged. After this is on alpha, delete the old Failed Jobs in podverse-alpha so Argo CD drops the Degraded status.
```
