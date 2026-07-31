# 01 — HTTP 429 burn-in tests (enqueue rate limiters)

## Goal

Add API integration coverage for the **HTTP-level** enqueue rate limiters that protect the async
job endpoints, distinct from the soft in-body OPML feed cap (already covered):

- `POST /account/opml/import` — `enqueueRateLimit` = 10 requests / hour.
- `POST /account/add-by-rss/parse` — `enqueueRateLimit` = 20 requests / hour (optional, same pattern).

## Why

The soft feed cap (50/hr, surfaced as `rateLimited` inside a 201 body) is covered by
`apps/api/src/test/opml-import.test.ts` and `packages/mq/.../processOpmlImport.test.ts`. The
express-rate-limit wrappers that return an actual HTTP 429 are currently unverified.

## Tasks

1. In `apps/api/src/test/opml-import.test.ts` (or a new `opml-import-rate-limit.test.ts`), add a
   test that posts the import endpoint 11 times for the same account within the window and asserts
   the 11th response is HTTP 429.
   - Keep the OPML body tiny (one already-subscribed feed) so per-request work is trivial.
   - The rate limiter keys on account/IP; ensure the test account/token is stable across the loop.
2. Make it robust against store state:
   - Prefer configuring the limiter store so the test window/store is isolated, OR flush the
     limiter key in `beforeEach` (see how other rate-limited API tests handle this, e.g.
     add-by-rss parse dedupe tests).
   - If isolation is not feasible, assert "at least one 429 after N calls" rather than an exact
     index.
3. Assert the 429 body/headers match the app's rate-limit contract (message shape; `Retry-After`
   if the limiter sets it). Follow the `rate-limit-message` skill for user-facing copy.

## Out of scope

- The soft 50/hr feed cap (already covered).
- Documenting 429 in `openapi.yml`: the spec currently omits 429 for every rate-limited endpoint
  (including add-by-rss parse). Only add it here if the team decides to document 429 spec-wide in a
  separate consistency pass.

## Operator verification

```bash
make test_deps
npm run test:e2e:api
```
