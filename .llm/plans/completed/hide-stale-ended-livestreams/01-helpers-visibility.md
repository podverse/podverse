# 01 — Shared constant + helpers

Add `packages/helpers/src/lib/liveItemVisibility.ts` (exported from the helpers index):

- `LIVE_ITEM_ENDED_VISIBILITY_MAX_AGE_MS = 24 * 60 * 60 * 1000`.
- `getEndedLiveItemVisibilityCutoff(now: Date = new Date()): Date` -> `now - MAX_AGE_MS`.
- `isLiveItemEndedAndStale(liveItem, now?): boolean` -> true when status is `Ended` and `(end_time ?? start_time) < cutoff`. Used by the channel controller and unit tests.

## Tasks

1. Create the file with the constant + two helpers.
2. Export from `packages/helpers/src/index.ts` (or the appropriate barrel).
3. Add unit tests for `getEndedLiveItemVisibilityCutoff` and `isLiveItemEndedAndStale` (boundary at exactly 1 day; null end_time fallback to start_time; non-ended statuses always non-stale).

## Verification

```bash
npm run test:unit
```
