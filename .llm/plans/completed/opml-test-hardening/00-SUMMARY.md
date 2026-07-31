# OPML Test Hardening (deferred)

Deferred follow-ups from the OPML import/export branch review. The must-fix items (MQ dedupe by
`requestId`, linear baseline regen for `0002_account_pending_following_channel`, fixture Podcast
Index short-circuit, API/unit/E2E confidence tests) were completed inline on the OPML branch. This
set captures the heavier, slower, or infra-touching test work that should not gate that branch.

## Why deferred

These require either a live ActiveMQ Artemis broker in the test harness, deliberate rate-limiter
burn-in (slow, stateful), or E2E seed/infra changes. They add breadth but are not required for the
shipped feature to be correct and are better landed as a focused testing PR.

## Scope

| # | Plan | Surface | Notes |
| - | ---- | ------- | ----- |
| 01 | HTTP 429 burn-in tests | apps/api | Exercise the enqueue rate limiters (import 10/hr, add-by-rss parse 20/hr) and assert 429 + retry semantics without flaking other tests. |
| 02 | Artemis worker integration | packages/mq, apps/workers | Real broker: enqueue `opml-import`, run the worker consumer, assert `processOpmlImportJob` runs once and `_AMQ_DUPL_ID` dedupe (by `requestId`) collapses duplicate batches. |
| 03 | OPML hourly-counter reset for E2E determinism | test infra | Flush/scope the Valkey OPML hourly counter in E2E seed so mobile/web real-backend imports stay deterministic without relying on a very high cap. |

## Related shipped work

- Dedupe fix + regression unit test: `packages/mq/src/lib/computeMqDuplicateId.ts` (+ `.test.ts`).
- Fixture Podcast Index resolver: `apps/api/src/lib/opml/e2eOpmlImportFixture.ts`.
- Feature doc: `docs/features/OPML.md`.
- Archived feature plan set: `.llm/plans/completed/opml-import-export/`.
