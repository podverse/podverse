# Plan 03 — Move tests and exports

**Steps:** 1.7, 1.8
**Model:** Opus 4.8

## Detail references

- [026-move-playback-core-tests](/docs/proposals/mobile/_master-plan_/details/026-move-playback-core-tests.md)
- [027-playback-core-index-exports](/docs/proposals/mobile/_master-plan_/details/027-playback-core-index-exports.md)

## Tasks

1. Move Vitest suites from `apps/web/src/lib/playback/__tests__/` and
   `apps/web/src/lib/queue/__tests__/combineQueueNowPlayingAndUpcoming.test.ts` into
   `packages/playback-core/src/__tests__/`.
2. Fix test imports for package paths and `.js` specifiers.
3. Implement `packages/playback-core/src/index.ts` public exports (mirror former web barrel).
4. Remove moved tests from web.

## On completion

Mark steps **1.7, 1.8** as `done`.
