**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# Recent-feeds exits 0 after an upstream Podcast Index error

Issue: https://github.com/podverse/podverse/issues/381

A `/recent/data` 502 after retries throws out of `recentGetData`, the recent-feeds process exits 1, and Argo marks `podverse-alpha-cron` Degraded. The cursor is already saved after each finished page, and the next run resumes. Timeouts already stop the same way and return `time_cap`. This change does that for the other retryable upstream failures.

The operator chose the clean exit only. Do not add a metric, log alert, or Prometheus rule.

## Rows

- **R1** Catch upstream 5xx and network errors from `/recent/data` after retries, log a warning, outcome `upstream_error`, exit 0. Database, queue, and cursor errors still fail the Job. `send_failed` still fails the Job.
- **R2** Repeated-failure alert — declined. Do not build it.

## Runs after

none

## Decisions

- Stop inside `PodcastIndexService.recentGetData`, the same place a deadline abort becomes `time_cap`. Do not add a try/catch around `pages.next()` in the poller. The poller already copies the generator's stop reason onto `result.outcome`.
- The boundary is `isRetryablePodcastIndexError` after the existing retry loop has given up: HTTP 429, HTTP 500–599, and the network codes in that helper (`ECONNRESET`, `ETIMEDOUT`, `ECONNABORTED`, `ERR_BAD_RESPONSE`, `EAI_AGAIN`). Check `isPodcastIndexClientAbortError` first so a deadline abort stays `time_cap`. Anything else still throws, including HTTP 4xx other than 429 and a plain `Error`.
- Leave `podcastIndexAPIRequest` as it is, including its final `logError` before rethrow. That line is shared by every Podcast Index call. The Job exits 0 because `recentGetData` no longer lets the error escape.
- Do not change `episodesGetNewestByFeedIds` or the gap sweep. A 502 there still fails the Job.
- Do not edit `apps/workers/src/commands/mq/rss/mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex.ts`. It throws only for `send_failed`. A returned `upstream_error` keeps `exitCode` at 0 in `runApp`.

## Behavior

In `recentGetData` (`packages/external-services-podcast-index/src/index.ts`), the `catch` around `podcastIndexAPIRequest` today returns `time_cap` for a client abort and otherwise rethrows. After the abort check, if `isRetryablePodcastIndexError(error)`, log one warning and `return 'upstream_error'`. Suggested warning, same shape as the timeout line:

`[recentGetData] Upstream error after retries for since=${pageSince}; stopping and resuming next run from the last completed page.`

Add `isRetryablePodcastIndexError` to the existing import from `./isRetryablePodcastIndexError.js`. It is not imported in this file today.

Update the doc comment on `recentGetData`: a deadline abort after retries returns `time_cap`; a retryable upstream error after retries returns `upstream_error`; other failures throw.

Add `'upstream_error'` to `RecentGetDataStopReason` in `packages/external-services-podcast-index/src/recentDataPage.ts`. `RecentlyUpdatedFeedsOutcome` already includes that type, so the poller union grows with it. Add a bullet to the outcome comment in `packages/mq/src/functions/mq/rss/addRecentlyUpdatedFeedsFromPodcastIndex.ts`: `upstream_error` means `/recent/data` failed after retries; the cursor stays at the last finished page.

Next to the existing `time_cap` warning in `pollRecentlyUpdatedFeeds`, when `result.outcome === 'upstream_error'`, log one warning:

`[mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex] Podcast Index stopped this run with an upstream error after retries; the next run resumes from next_since=${cursorNextSince ?? 'none'}.`

Use `LOG_PREFIX` and `result.cursorNextSince`. Do not advance the cursor in this branch. The failed request never yields a page, so the last `advance` is the previous finished page, which is what the timeout path already does.

## Files

- `packages/external-services-podcast-index/src/recentDataPage.ts` — `RecentGetDataStopReason`
- `packages/external-services-podcast-index/src/index.ts` — `recentGetData` catch and its doc comment; import `isRetryablePodcastIndexError`
- `packages/external-services-podcast-index/src/recentGetData.timeout.test.ts`
- `packages/mq/src/functions/mq/rss/addRecentlyUpdatedFeedsFromPodcastIndex.ts` — outcome comment and the warning
- `packages/mq/src/functions/mq/rss/addRecentlyUpdatedFeedsFromPodcastIndex.test.ts`
- `release-notes/scratchpad.md` — append only
- `.llm/plans/active/381-recent-feeds-upstream-exit/proposed-reply.md` — this prompt writes it

## Tests

Extend `recentGetData.timeout.test.ts`. Reuse its fake timers, `drain`, and logger. `maxRetries: 3` means 4 calls, same as the timeout case. Drive retries with `vi.runAllTimersAsync()` because the client sleeps between attempts.

- HTTP 502 (`{ message: 'Request failed with status code 502', response: { status: 502 } }`) resolves to `upstream_error`, 4 requests, one warning that mentions stopping. It does not throw.
- `ECONNRESET` (`{ message: 'socket hang up', code: 'ECONNRESET' }`) does the same.
- HTTP 404 still throws. The existing plain `Error('boom')` case stays.
- First request returns one page (`data.feeds` plus `nextSince` in the future, same shape as the timeout file's success mock). Second request rejects with 502. Drain yields that one page and resolves `upstream_error`.

In `addRecentlyUpdatedFeedsFromPodcastIndex.test.ts`, copy the time-cap test. Pass `'upstream_error'` as the fake's stop reason. The cursor stays at the yielded page's `nextSince`, `result.outcome` is `upstream_error`, and `loggerService.warn` is called with the resume text. The fake already returns a stop reason; do not make it throw.

No API integration test, Playwright spec, or Maestro flow.

## Release scratchpad

Append this entry to `release-notes/scratchpad.md`. Do not edit other entries.

```markdown
## Recent-feeds job stays up through a Podcast Index outage

- Surfaces: workers
- Change: After retries, HTTP 429, HTTP 5xx, or a network error from `/recent/data` stops the recent-feeds run with outcome `upstream_error` and exit 0. The cursor stays at the last finished page, and the next run continues from there. A deadline abort still stops as `time_cap`. Database, queue, and cursor errors still fail the Job, and `send_failed` still exits non-zero. No new alert.
- Who notices: operators of alpha and later production; one Podcast Index 502 no longer marks `worker-recent-feeds` Failed or the cron Application Degraded
- Operator steps: after this is on alpha, delete the old Failed Job for `worker-recent-feeds` if it is still listed, so Argo CD can drop Degraded
```

## Ticket reply

Write this to `proposed-reply.md` in this plan folder, and repeat it in a fenced `text` block in the final message. Do not post it.

```text
A brief Podcast Index outage on the recent-feeds poller no longer fails the Job. The run logs a warning, stops, and the next run continues from the last page it finished. A send failure, or a database or queue error, still fails the Job.

We are not adding a separate alert for repeated upstream errors. After this is on alpha, delete the old Failed Job for worker-recent-feeds if it is still listed, so Argo CD can clear Degraded.
```
