# 07 — A failed feed parse records why, and the log never prints a page body

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

## Rows

R7

## Runs after

none. This plan owns migration `0013`.

## Why

`recordFeedParseFailure` (`packages/parser/src/lib/rss/feed/recordFeedParseFailure.ts`) stores a
count, a time, and an HTTP status when there was one. A missing host, a web page instead of a
feed, a cancel, and our own database error all look the same afterward, and every migration retry
job carries the same message `Migration feed parse did not finish`. The real cause is only in the
parser terminal, which also prints whole HTML pages (00-FINDINGS F7). Plan 08 needs the reason to
stop retrying permanent failures; plan 09 needs `body_too_large`.

## Decision

`feed_log.last_parse_failure_reason text`, one of:

`http_404`, `http_410`, `http_403`, `http_4xx`, `http_5xx`, `body_too_large`, `dns_not_found`,
`tls_error`, `timeout`, `connection_error`, `not_a_feed`, `no_feed_url`, `db_value_out_of_range`,
`db_error`, `parse_error`, `unknown`.

Written on every recorded failure; set to null when a parse finishes.

## Files

- `infra/k8s/base/ops/source/database/linear-migrations/app/0013_feed_log_parse_failure_reason.sql` (new)
- `infra/k8s/base/db/source/bootstrap/0004_app_linear_baseline.sql.gz` (generated)
- `infra/k8s/base/db/source/bootstrap/0005_management_linear_baseline.sql.gz` (generated)
- `infra/k8s/base/api/source/api.env`, `infra/k8s/base/ops/kustomization.yaml` (readiness marker)
- `packages/helpers/src/lib/feed/feedParseFailureReason.ts` (new; the closed list and type) and `packages/helpers/src/index.ts`
- `packages/orm/src/entities/feed/feedLog.ts`
- `packages/parser/src/lib/rss/feed/classifyFeedParseFailure.ts` (new) and its test
- `packages/parser/src/lib/rss/feed/recordFeedParseFailure.ts` and its test
- `packages/parser/src/lib/rss/feed/feed.ts`
- `packages/parser/src/lib/rss/parser.ts`
- `release-notes/scratchpad.md` (only through the final message)

## 1. Migration

```sql
-- last_parse_failure_reason is why the latest recorded parse failed. A finished parse clears it.

ALTER TABLE public.feed_log
  ADD COLUMN last_parse_failure_reason text;

ALTER TABLE public.feed_log
  ADD CONSTRAINT feed_log_last_parse_failure_reason_check
  CHECK (
    last_parse_failure_reason IS NULL
    OR last_parse_failure_reason IN (
      'http_404', 'http_410', 'http_403', 'http_4xx', 'http_5xx', 'body_too_large',
      'dns_not_found', 'tls_error', 'timeout', 'connection_error', 'not_a_feed', 'no_feed_url',
      'db_value_out_of_range', 'db_error', 'parse_error', 'unknown'
    )
  );
```

Readiness marker `0013_feed_log_parse_failure_reason.sql` in both files, then
`make db_regen_linear_baseline` and `make db_verify_linear_baseline`.

## 2. Helpers and entity

`feedParseFailureReason.ts` exports `FEED_PARSE_FAILURE_REASONS` (as const, same order as the
SQL), `FeedParseFailureReason`, and `isPermanentFeedParseFailure(reason)` — true for `http_404`,
`http_410`, `dns_not_found`, `not_a_feed`, `no_feed_url`. Add
`last_parse_failure_reason: FeedParseFailureReason | null` to `FeedLog`.

## 3. Classifier

`classifyFeedParseFailure(error: unknown): FeedParseFailureReason`, pure, first match wins:

1. `isMaxResponseSizeError(error)` → `body_too_large`
2. HTTP status from `getStatusCodeFromError(error)`: 404, 410, 403, other 4xx, 5xx
3. Error `code` (walk `cause` up to 3 levels): `ENOTFOUND`, `EAI_AGAIN` → `dns_not_found`;
   `ETIMEDOUT`, `ECONNABORTED`, `UND_ERR_*_TIMEOUT`, an abort or cancel error → `timeout`;
   `ECONNREFUSED`, `ECONNRESET`, `EHOSTUNREACH`, `ENETUNREACH`, `EPIPE` → `connection_error`
4. `isTlsOrProtocolError(error)` or a `CERT_`/`ERR_TLS_`/`ERR_SSL_` code → `tls_error`
5. A Postgres error (has a 5-character `code` and a `routine` or is a TypeORM `QueryFailedError`):
   `22003` → `db_value_out_of_range`; anything else → `db_error`
6. The no-data path in `feed.ts` (`parsedFeed no data found`) and XML or partytime parse errors on
   a body that is not RSS or Atom → `not_a_feed`. Prefer a typed error thrown at that site over
   matching message text; add `FeedNotAFeedError` to `../errors.js` if needed.
7. Any other parser error → `parse_error`; a non-Error → `unknown`.

`no_feed_url` is written by plan 08 for a migration feed with no URL; the classifier never
returns it.

Build the test table from real shapes: an axios-style 404, a fetch `TypeError` with
`cause.code = 'ENOTFOUND'`, an `AbortError`, a TLS error, a pg 22003, a pg 23505, an HTML body
fed to the XML parser, and a plain string.

## 4. Record it

- `recordFeedParseFailure(feed, feedLogService, extras)` takes
  `extras.last_parse_failure_reason` (required) beside `last_http_status`.
- `feed.ts`: both calls pass `classifyFeedParseFailure(error)` and, for the no-data path,
  `'not_a_feed'`.
- `parser.ts` catch block: pass `classifyFeedParseFailure(error)`.
- On success, the `feedLogService.update(feed, { last_finished_parse_time: new Date() })` in
  `parser.ts` also sets `last_parse_failure_reason: null`.

## 5. Logs carry no page body

In the `parser.ts` catch block, replace the `loggerService.logError('parseRSSFeedAndSaveToDatabase',
error)` and the TLS warning with one warning line:
`Feed parse failed: feed_id=<id> podcast_index_id=<n> reason=<reason> http_status=<n|none>`
plus, only for `db_error`, `db_value_out_of_range`, `parse_error`, and `unknown`, the error's
first line cut to 200 characters with every `<…>` span removed, and the stack at debug level.
Never log the response body or `error.response`.

Then find any other place the parser or `http-request-core` logs a response body on failure
(`rg -n "response\.(data|body)|responseText" packages/parser/src packages/http-request-core/src`)
and drop the body from those messages. Keep the status and URL.

## Tests

- `classifyFeedParseFailure.test.ts`: the table in § 3.
- `recordFeedParseFailure.test.ts`: the reason is written with the count and time.
- A `parser.ts`-level test only if the file already has one for the catch block; otherwise the two
  unit tests cover it.

## Release scratchpad

Phase 1 runs prompts together, so put this entry in the final message under
"Release notes entry" instead of writing the file:

```markdown
## Feed parse failures record a reason

- Surfaces: parser, workers, database
- Change: migration `0013` adds `feed_log.last_parse_failure_reason` (HTTP class, body too large, DNS, TLS, timeout, connection, not a feed, database error, parse error). A finished parse clears it. Parser failure logs are one line with the reason and never include the response body.
- Who notices: operators reading parser logs or feed logs
- Operator steps: apply linear migrations
```
