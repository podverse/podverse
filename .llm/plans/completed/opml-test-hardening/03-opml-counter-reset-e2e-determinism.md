# 03 — OPML hourly-counter reset for E2E determinism

## Goal

Make real-backend OPML import E2E fully deterministic regardless of how many times the suite runs
within the same wall-clock hour, without relying on an inflated feed cap.

## Status note (partial credit already landed)

The **API integration layer** is already deterministic: `apps/api/src/test/opml-import.test.ts`
clears the OPML hourly counter (`buildOpmlImportHourlyKey`, current plus adjacent hour buckets) in
`beforeEach`, so same-hour Vitest re-runs stay stable. This plan is now scoped to the **E2E seed /
device** layer (Maestro mobile + Playwright web), which still relies on the inflated
`apiMobileE2e` cap.

## Background

The OPML feed cap is enforced by a per-account hourly counter in Valkey
(`buildOpmlImportHourlyKey(accountId, hourBucket)`, 1h TTL) in
`packages/mq/src/functions/mq/rss/processOpmlImport.ts`. The E2E seed does **not** flush Valkey, so
the counter accumulates across same-hour reruns. As an interim mitigation, the `apiMobileE2e`
profile sets `OPML_IMPORT_MAX_FEEDS_PER_HOUR=100000`
(`packages/helpers-config/src/podverseTestEnv.ts`) so the mobile import outcomes
(`enqueued_indexed` + `added_by_rss`) stay stable. This plan replaces that mitigation with a proper
reset so the cap can stay realistic in E2E.

## Tasks

1. Add a targeted Valkey reset to the E2E seed/setup for the OPML hourly counter (and any related
   OPML report keys) for the seeded account(s). Prefer a scoped delete of the known key prefix over
   a global `FLUSHALL` so unrelated cache-backed E2E state is untouched.
   - Locate the seed entrypoint used by `make mobile_e2e_seed` / `make e2e_seed` and the web E2E
     API bring-up, and clear the counter there.
2. Once the reset is in place, lower `OPML_IMPORT_MAX_FEEDS_PER_HOUR` for `apiMobileE2e` back to a
   realistic value (e.g. `50`, matching the base) and confirm the mobile E2E still asserts
   `enqueued_indexed` + `added_by_rss` deterministically.
3. Consider enabling a real-backend web import E2E once the counter is reset and fixtures are
   available on `apiWebE2e` (currently the web import spec is intentionally mocked via `page.route`;
   the real backend import is covered by API integration + mobile E2E).

## Operator verification

```bash
# Mobile Metro / Mobile E2E API must be up (see apps/mobile/e2e/HOW-TO-RUN.md)
npm run mobile:e2e:test -- opml
make e2e_test_web_report_spec SPEC=e2e/settings-opml-export.spec.ts
```
