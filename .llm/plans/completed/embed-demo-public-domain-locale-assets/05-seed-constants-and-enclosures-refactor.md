# Phase 05 — Seed, constants, and enclosures refactor

## Tasks

1. Add `tools/web/embed-demo-locale-catalog.mjs` + TS mirror.
2. Refactor [`seed-embed-sample-fixtures.mjs`](../../../tools/web/seed-embed-sample-fixtures.mjs) to seed all four locales.
3. Update [`insert-embed-demo-enclosures.mjs`](../../../tools/web/insert-embed-demo-enclosures.mjs) for per-locale alt URLs.
4. Sync [`embed-fixture-constants.mjs`](../../../tools/web/embed-fixture-constants.mjs),
   [`embedFixtureIds.ts`](../../../apps/web/src/lib/embed/embedFixtureIds.ts),
   [`seedConstants.ts`](../../../apps/web/e2e/helpers/seedConstants.ts).

## E2E IDs

Keep en-US canonical IDs for existing specs; add suffixed IDs for other locales.
