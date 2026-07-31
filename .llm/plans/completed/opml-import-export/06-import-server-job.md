# 06 — OPML Import: async server job

**Phase 2 capstone.** Depends on **04** (PI by-feed-URL) and **05** (pending follow).

## Scope

Async OPML import mirroring the add-by-RSS parse job: upload OPML → enqueue MQ job → worker
processes each feed with 3-tier resolution → Valkey progress/report → client polls. Per-feed
failures are isolated. 50 new feeds/hour rate limit.

## OPML parse lib (server)

1. `apps/api/src/lib/opml/parseOpml.ts` (pure, unit-testable): parse OPML XML → list of
   `{ title?, feedUrl }` from `<outline xmlUrl=...>` (recurse nested folders). Tolerant: skip
   malformed outlines, dedupe by canonical URL. Use an XML parser already in the repo if available
   (check `@podverse/parser` deps / `fast-xml-parser`); otherwise add one to `apps/api`.

## MQ job + worker

2. **Queue**: add `opml-import` queue constant in
   [packages/helpers/src/lib/mq/mqConstants.ts](/packages/helpers/src/lib/mq/mqConstants.ts)
   (mirror `add-by-rss-on-demand`, 66-75). Enqueue helper in
   [packages/mq/src/functions/mq/rss/](/packages/mq/src/functions/mq/rss/addByRSS.ts) style:
   message `{ accountId, requestId, feeds: {title?, feedUrl}[] }`.
3. **Valkey status/report** cache: new `apps/api/src/lib/opmlImportCache.ts` (mirror
   [addByRSSParseCache.ts](/apps/api/src/lib/addByRSSParseCache.ts)). Shape:
   `{ requestId, accountId, status: 'queued'|'processing'|'completed'|'failed',
   totals: {total, subscribed, enqueuedIndexed, addedByRss, failed, skippedExisting},
   rateLimited?: { limit, retryAfterSeconds }, results: PerFeedResult[], updatedAt }`.
   `PerFeedResult = { feedUrl, title?, outcome: 'subscribed'|'enqueued_indexed'|'added_by_rss'
   |'already_subscribed'|'rate_limited'|'failed', error? }`.
4. **Worker** `apps/workers/src/commands/mq/rss/runOpmlImport.ts` (mirror
   [runAddByRSSParser.ts](/apps/workers/src/commands/mq/rss/runAddByRSSParser.ts)):
   set `processing`; for each feed run the resolution below; update Valkey after each feed so the
   client sees incremental progress; set `completed` at end. Add K8s deployment(s) mirroring
   `parser-add-by-rss-ondemand*` under `infra/k8s/base/workers/` (note in plan; operator applies).

## Per-feed resolution (in worker)

For each feed URL (canonicalize via `canonicalHttpOrHttpsUrl`):

1. **DB lookup** `FeedService.getByUrl` (http/https, prefer https).
   - Found → if already followed → `already_subscribed`; else `AccountFollowingChannelService.followChannel`
     → `subscribed`. **Does not** consume rate-limit budget.
2. Not in DB → **rate-limit gate** (see below). If budget remains:
   - **Podcast Index** `podcastGetByFeedUrl` (from **04**).
     - Found → enqueue indexed on-demand parse (reuse the `rss-on-demand` enqueue path used by
       [mq.ts](/apps/api/src/controllers/mq/mq.ts)) + `addPendingFollow` (from **05**) →
       `enqueued_indexed`. Consumes 1 unit.
     - Not found → **add-by-RSS**: `AccountFollowingAddByRSSChannelService.addOrUpdateRSSChannel`
       + enqueue `add-by-rss` parse → `added_by_rss`. Consumes 1 unit.
   - If no budget remains → mark this and all remaining new feeds `rate_limited`; set
     `rateLimited { limit, retryAfterSeconds }` on the report; continue (so already-in-DB feeds later
     in the list still get subscribed) — but since budget is per new feed, stop consuming.
3. Wrap each feed in try/catch → `failed` with `error`; never abort the run.

## Rate limit (50 new feeds/hour per account)

5. Config `OPML_IMPORT_MAX_FEEDS_PER_HOUR` (default 50) in
   [apps/api/src/config/index.ts](/apps/api/src/config/index.ts) + `.env.example` + startup
   validation ([apps/workers/src/lib/startup/validation.ts](/apps/workers/src/lib/startup/validation.ts)
   and api). Enforce with a Valkey hourly counter keyed
   `opml:import:hourly:<accountId>:<bucket>` (copy the `cacheGetJson`/`cacheSetJson` pattern in
   [mq.ts](/apps/api/src/controllers/mq/mq.ts) 62-75, TTL 3600). Compute `retryAfterSeconds` from
   the current hour bucket boundary. **Only tier-2/tier-3 (new work) increments** the counter.

## Endpoints + shared req helpers

6. **Routes** in [apps/api/src/routes/account.ts](/apps/api/src/routes/account.ts):
   - `POST /account/opml/import` (auth) — accept the OPML (raw text body or multipart file). Validate
     size/format, parse count, enqueue job, return `201 { request_id }`.
   - `GET /account/opml/import/status/:request_id` (auth) — return the Valkey report.
   Add an enqueue rate limit too (e.g. `rateLimitAuthEndpoint`, a few imports/hour) to prevent job
   spam (separate from the 50-feed content limit).
7. Controllers `apps/api/src/controllers/account/accountOpmlImport.ts` (mirror
   [accountAddByRSSParse.ts](/apps/api/src/controllers/account/accountAddByRSSParse.ts), including its
   E2E-fixtures synchronous path if `config.e2e.fixturesEnabled`).
8. Shared req helpers `reqAccountOpmlImport` + `reqAccountOpmlImportStatus` in
   `@podverse/helpers-requests` + `ApiRequestService` methods
   ([_request.ts](/packages/helpers-requests/src/api/_request.ts)). Used by web (07) and mobile (08).
9. OpenAPI entries in [apps/api/openapi.yml](/apps/api/openapi.yml).

## Tests (api-testing skill)

- Unit: `parseOpml` (nested folders, malformed outlines, dedupe).
- Integration: seeded OPML with (a) a feed already in DB → `subscribed`; (b) a feed only in PI
  (mock `podcastGetByFeedUrl`) → `enqueued_indexed` + pending follow; (c) an unknown feed →
  `added_by_rss`; (d) one malformed feed → `failed`, run still completes; (e) exceed 50 new feeds →
  remaining `rate_limited` with `retryAfterSeconds`.

## Verification (operator)

```bash
npm run build:packages
npm run test -w @podverse/helpers
npm run test:e2e:api
```
