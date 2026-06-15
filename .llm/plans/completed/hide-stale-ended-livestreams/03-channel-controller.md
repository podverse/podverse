# 03 — Channel/album page endpoint

`GET /api/v1/live-item/channel/:id` returns all statuses (no pagination) and partitions in memory (`apps/api/src/controllers/liveItem.ts` ~103-143) via `ItemService.getManyByChannelWithLiveItem`.

## Tasks

1. In `LiveItemController.getManyByChannel`, after fetching items, drop stale ended items using `isLiveItemEndedAndStale` (from `@podverse/helpers`) before partitioning into live/pending/ended.
2. Keep `live` and `pending` untouched; only ended items older than the cutoff are removed.

## Notes

- This is an in-memory filter (the query loads all of a channel's live items, no pagination), so SQL OR-expansion is unnecessary here.
- This also covers the SSR live block prepended on `/podcast/[channel_id]` and `/album/[channel_id]` (they call `reqLiveItemGetManyByChannel`).

## Verification

```bash
npm run test:e2e:api
```
