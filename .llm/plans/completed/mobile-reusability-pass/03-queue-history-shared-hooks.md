# 03 — Queue/history shared hooks

## Objective

Extract shared queue/history fetch and normalization logic into reusable hooks/functions.

## Targets

- `apps/mobile/src/screens/library/LibraryQueueScreen.tsx`
- `apps/mobile/src/screens/library/LibraryHistoryScreen.tsx`

## Planned extractions

1. Create `apps/mobile/src/hooks/usePrimaryQueue.ts`:
   - fetch queues
   - choose active/default queue
2. Create `apps/mobile/src/hooks/useQueueResources.ts`:
   - now-playing load
   - upcoming load
   - history paginated load
3. Create shared mappers for queue resource → `HomeFeedRowData`.

## Acceptance criteria

- Queue + History screens delegate queue selection/loading to shared hooks.
- `getPrimaryQueue` duplication removed.
- Shared queue row mapping used in both screens.

## Notes

- Keep API method usage via `requestWithMobileAuthRefresh`.
- Preserve existing testIDs and notice messaging.
