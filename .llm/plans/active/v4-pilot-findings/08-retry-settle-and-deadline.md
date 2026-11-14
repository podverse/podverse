# 08 — Permanent feed failures stop early, and the catalog wait has a deadline

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

## Rows

R8

## Runs after

07 (needs `feed_log.last_parse_failure_reason` and `isPermanentFeedParseFailure`)

## Why

Every migration feed whose parse fails gets six attempts over about 11 days (first delay 1h, then
1h, 6h, 1d, 3d, 7d). The catalog wait does not end until every feed's job settles, so the pilot
sat at `waiting=199` until the operator failed those jobs by hand (00-FINDINGS F10). In the pilot,
about 190 of 249 failed feeds were permanent on the first try: 404, 410, a missing host, or a page
that is not a feed. Waiting days on those helps nobody, and a full migration has roughly 600 times
the feeds.

The library copy already handles a feed that is not settled: its episodes become `waiting_parse`
pending rows, and replay finishes them when a later parse succeeds. So the wait can end on a
deadline without losing anything.

## Decision

- A permanent reason (`http_404`, `http_410`, `dns_not_found`, `not_a_feed`, `no_feed_url`) fails
  the job after its 2nd attempt.
- Other reasons keep six attempts, on a shorter ladder: first retry 15 minutes after seeding, then
  1h, 6h, 1d, 1d, 1d (about 3.3 days total).
- The catalog wait ends when nothing is waiting or after `--catalog-wait-hours` (default 24),
  whichever is first. Feeds still waiting at the deadline keep retrying in the job loop; replay
  finishes their pending rows later.

## Files

- `packages/orm/src/services/feed/v4MigrationFeedRetryScheduler.ts` and its test
- `apps/workers/src/commands/orm/scheduledJob/runDue.ts` and its test (if one exists; else a pure helper test)
- `apps/workers/src/commands/orm/v4Catalog/seedStageCatalog.ts`
- `apps/workers/src/commands/orm/v4Rehearsal/rehearsalPhaseHandlers.ts`
- `apps/workers/src/commands/orm/v4Rehearsal/runFullRehearsal.ts` (the option)
- `apps/workers/src/commands/orm/v4Rehearsal/runFullRehearsalLoop.ts` (pass it through, if the context is built there)
- the rehearsal summary writer (`rg -n "Rehearsal summary" apps/workers/src`)
- `docs/proposals/v4-to-v5-migration/` doc that describes the retry ladder (`rg -n "7 days|7d|retry ladder" docs/proposals/v4-to-v5-migration`)
- `release-notes/scratchpad.md` (only through the final message)

## 1. Scheduler

In `v4MigrationFeedRetryScheduler.ts`:

- `V4_MIGRATION_FEED_RETRY_FIRST_DELAY_MS = 15 * ONE_MINUTE_MS` (import or add `ONE_MINUTE_MS`
  from `@podverse/helpers`).
- Ladder `[ONE_HOUR_MS, 6 * ONE_HOUR_MS, ONE_DAY_MS, ONE_DAY_MS, ONE_DAY_MS]` (one entry per
  retry after attempt 1). Keep `V4_MIGRATION_FEED_RETRY_MAX_ATTEMPTS = 6`. Update the fallback in
  `getV4MigrationFeedRetryBackoffMs` to `ONE_DAY_MS`.
- `V4_MIGRATION_FEED_PERMANENT_MAX_ATTEMPTS = 2`.
- `readFeedLastParseOutcome(feedId)` returns `{ lastFinishedParseTime, lastParseFailureReason }`
  from the primary; keep `readFeedLastFinishedParseTime` as a thin wrapper if other callers use it.

## 2. Handler

Add `'failed'` to `JobHandlerResult['outcome']` in `runDue.ts` with a required `reason`, and in
the claim loop call `scheduledJobService.markFailed(job.id, result.reason)` for it (log line like
the existing "marked failed" one).

In `handleV4MigrationFeedRetry`:

- A feed with no URL to fetch: write `feed_log.last_parse_failure_reason = 'no_feed_url'` and
  return `{ outcome: 'failed', reason: 'no_feed_url' }` without parsing. Find the field the parse
  reads (`parsePodcastIndexFeedDirectly`) and use the same emptiness check it would fail on.
- After the parse, when no parse finished, read the reason and decide with a pure helper:

```ts
export function decideMigrationFeedRetry(
  attempts: number,
  reason: FeedParseFailureReason | null
): { action: 'fail'; reason: string } | { action: 'retry'; message: string };
```

  `fail` when `isPermanentFeedParseFailure(reason)` and `attempts >= V4_MIGRATION_FEED_PERMANENT_MAX_ATTEMPTS`;
  otherwise `retry` with message `Migration feed parse failed: reason=<reason ?? 'unknown'>`. The
  handler returns `{ outcome: 'failed', reason }` for `fail` and throws `new Error(message)` for
  `retry`, so the existing requeue path and its last-attempt `markFailed` keep working and the job's
  `last_error` names the reason.

## 3. Catalog deadline

- `runFullRehearsal.ts`: parse `--catalog-wait-hours <n>` (positive number, default 24; reject 0,
  negatives, and non-numbers with the command's usual argument error). Add it to the help text.
- Pass it on the run context to `seedRehearsalCatalog` and into `v4SeedStageCatalog` as
  `waitDeadlineMs` (milliseconds; the input field is optional so the standalone
  `v4_seed_account_catalog` command keeps waiting until done unless it gets the same option — add
  `--catalog-wait-hours` there too).
- In the wait loop in `seedStageCatalog.ts`, `done` is `waiting === 0 || Date.now() - startedAt >= waitDeadlineMs`.
  When it ends on the deadline, the last progress emit carries `deadlineReached: true`, and the
  result adds `waitingAtDeadline` (count).
- `catalogProgressLine` appends `deadline=reached` when set.
- Add to the result `failedByReason: Partial<Record<FeedParseFailureReason, number>>`, from
  `feed_log.last_parse_failure_reason` of the feeds counted in `failedParse` (add the column to
  `FEED_PARSE_SQL`). Counts only.
- The rehearsal summary gets a "Catalog parse failures by reason" table and the
  `waitingAtDeadline` count.

## 4. Doc

Replace the 11-day ladder text in the retry doc with § Decision, and state that feeds past the
deadline keep retrying and are finished by later replay runs.

## Tests

- scheduler test: the new ladder values and the fallback.
- `decideMigrationFeedRetry`: permanent at attempt 1 retries, permanent at attempt 2 fails,
  `timeout` at attempt 5 retries, null reason retries with `reason=unknown`.
- catalog: a pure helper for "wait is done" (`waiting`, `elapsedMs`, `deadlineMs`) if extracted;
  the `--catalog-wait-hours` parser rejects bad values.

## Release scratchpad

This prompt shares its phase with another, so put this entry in the final message under
"Release notes entry" instead of writing the file:

```markdown
## v4 migration feed retries settle sooner

- Surfaces: workers (v4 migration)
- Change: a migration feed that fails for a permanent reason (404, 410, missing host, not a feed, no feed URL) stops after 2 attempts. Other failures retry over about 3 days instead of 11. The rehearsal's catalog wait ends after `--catalog-wait-hours` (default 24); remaining feeds keep retrying and replay finishes them. The summary counts failures by reason.
- Who notices: operators running a v4 rehearsal or migration
- Operator steps: keep the scheduled job loop running after the catalog phase; rerun replay until waiting rows are gone
```
