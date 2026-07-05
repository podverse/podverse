# Plan 02 — Move policy modules

**Steps:** 1.2, 1.3, 1.4, 1.5, 1.6
**Model:** Opus 4.8

## Detail references

- [021-move-resolve-playback-decision](/docs/proposals/mobile/_master-plan_/details/021-move-resolve-playback-decision.md)
- [022-move-playback-target-types](/docs/proposals/mobile/_master-plan_/details/022-move-playback-target-types.md)
- [023-move-resume-seek-helpers](/docs/proposals/mobile/_master-plan_/details/023-move-resume-seek-helpers.md)
- [024-move-enclosure-switch-policy](/docs/proposals/mobile/_master-plan_/details/024-move-enclosure-switch-policy.md)
- [025-move-combine-queue-helper](/docs/proposals/mobile/_master-plan_/details/025-move-combine-queue-helper.md)

## Tasks

1. Move all non-test modules from `apps/web/src/lib/playback/` into `packages/playback-core/src/`.
2. Move `combineQueueNowPlayingAndUpcoming.ts` from `apps/web/src/lib/queue/`.
3. Use Tier A `.js` relative import specifiers within the package.
4. Remove moved source files from web (tests moved in plan 03).

## On completion

Mark steps **1.2, 1.3, 1.4, 1.5, 1.6** as `done`.
