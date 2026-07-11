# Plan 04 — Web migration and verify

**Steps:** 1.10, 1.11
**Model:** Opus 4.8

## Detail references

- [029-web-consume-playback-core](/docs/proposals/mobile/_master-plan_/details/029-web-consume-playback-core.md)
- [030-web-playback-regression-verify](/docs/proposals/mobile/_master-plan_/details/030-web-playback-regression-verify.md)

## Tasks

1. Add `@podverse/playback-core` dependency to `apps/web/package.json`.
2. Replace `apps/web/src/lib/playback/index.ts` with re-exports from `@podverse/playback-core`.
3. Add thin re-export shim at `apps/web/src/lib/queue/combineQueueNowPlayingAndUpcoming.ts` (or update
   the single consumer import).
4. Update direct subpath imports (`clampNearEndSeconds`, enclosure-switch modules) to use barrel or
   package where needed.
5. Archive `.llm/plans/active/mobile-pg1-playback-core/` to `completed/`.

## On completion

Mark steps **1.10, 1.11** as `done`. Provide operator verification commands.
