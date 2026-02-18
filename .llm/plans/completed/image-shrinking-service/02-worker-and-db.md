---
name: Image Shrinking Service - Worker and DB
overview: >
  Implement the async image shrinking worker, DB updates, and CDN deletion on image
  removal.
todos: []
isProject: false
---

# Image Shrinking Service - Worker and DB

## Scope

- Add a resize job/queue in workers.
- Update image services to preserve `is_resized` rows and manage deletion of CDN objects.
- Prefer resized images in API/web selection logic where appropriate.
- No unit tests per request.


## Key Files

- Workers parser entry:
  - [apps/workers/src/commands/parser/rss/parseFeed.ts](/Users/mitcheldowney/repos/pv/podverse/apps/workers/src/commands/parser/rss/parseFeed.ts)
- MQ parser runner:
  - [apps/workers/src/commands/mq/rss/runParser.ts](/Users/mitcheldowney/repos/pv/podverse/apps/workers/src/commands/mq/rss/runParser.ts)
- Image services:
  - [packages/orm/src/services/channel/channelImage.ts](/Users/mitcheldowney/repos/pv/podverse/packages/orm/src/services/channel/channelImage.ts)
  - [packages/orm/src/services/item/itemImage.ts](/Users/mitcheldowney/repos/pv/podverse/packages/orm/src/services/item/itemImage.ts)
- Parser handlers:
  - [packages/parser/src/lib/rss/channel/channelImage.ts](/Users/mitcheldowney/repos/pv/podverse/packages/parser/src/lib/rss/channel/channelImage.ts)
  - [packages/parser/src/lib/rss/item/itemImage.ts](/Users/mitcheldowney/repos/pv/podverse/packages/parser/src/lib/rss/item/itemImage.ts)

## Steps

- Add parser MQ hints for recently updated image URLs (skip Add-by-RSS):
  - Publish a lightweight message with channel/item ID + image URL.
  - Store hints in a durable MQ topic/queue with TTL semantics on the consumer side.
  - Keep MQ messages until consumed; the batch job applies a freshness cutoff.
  - Recommended freshness window: 24 hours based on `hint_created_at`.
- Add an hourly batch worker job to enqueue existing channel/item images for resizing.
- Image processing pipeline:
  - Download with timeouts and size caps.
  - Resize to `IMAGE_SHRINK_WIDTH_PX` and encode (e.g., WebP).
  - Upload to Spaces CDN using the deterministic key format.
  - Store `is_resized = true` rows with `image_width_size = IMAGE_SHRINK_WIDTH_PX`.
- Add idempotency rules:
  - Skip processing if a `is_resized` row already exists for the same URL + width.
  - Skip upload if the CDN key already exists (HEAD check).
- Modify `updateMany()` or downstream logic to keep existing `is_resized` rows when RSS images change.
- On deletion of `is_resized` rows, call `DigitalOceanService.deleteImageByKey()`.
- Add a periodic cleanup worker that scans for orphaned CDN objects (optional safety net).
- Update API/web image selection to prefer `is_resized` rows for list-based UI only.

## Web App Usage Rules

- Use resized images for list and grid views (browse/search/queue/library lists).
- Do not use resized images for header images, hero sections, or single-image sections.
- Do not use resized images for media player modal/full-size artwork.
- Skip `is_resized` images entirely for Add-by-RSS views.

## Web Integration Targets

- Update list components that call `findDTOChannelImageBySize` / `findDTOItemImageBySize`
  to prefer resized images when available, without affecting Add-by-RSS components.
- Implement a dedicated helper in `packages/helpers/src/lib/image.ts` for list usage
  (e.g., `findDTOItemImageForList`) that prioritizes `is_resized` images first.
- Target list components under `apps/web/src/components/List/**`, including:
  - `ListEpisodeRow.tsx`, `ListEpisodeGridNode.tsx`
  - `ListQueueResourceRow.tsx`, `ListPlaylistResourceRow.tsx`
  - `ListTrackRow.tsx`, `ListTrackGridNode.tsx`
  - `ListAlbumRow.tsx`, `ListArtistRow.tsx`, `ListArtistGridNode.tsx`
  - `ListClipRow.tsx`, `ListItemSoundbiteRow.tsx`
  - `ListSearchResultPodcastIndexFeedRow.tsx`
- Do not change `apps/web/src/components/AddByRSS/**` components.

## Helper Contract (List Images)

- Add `findDTOItemImageForList` and `findDTOChannelImageForList` in
  `packages/helpers/src/lib/image.ts`.
- Signature:
  - `(images, size: number, comparison: 'greater' | 'lesser' | null)`
  - Returns the first `is_resized` match if present, else falls back to existing
    `findDTOItemImageBySize` / `findDTOChannelImageBySize` behavior.
- Precedence rules:
  - Prefer `is_resized = true` images with `image_width_size` closest to `size`.
  - If no resized match exists, fall back to current helper logic.
  - If multiple resized candidates tie, pick the first sorted by URL for stability.
- Comparison behavior:
  - Reuse the same extension filtering and comparison modes as `findImageBySize`.
  - For `comparison = 'greater'`, pick the smallest resized width >= target.
  - For `comparison = 'lesser'`, pick the largest resized width <= target.
- Use only in list components (do not replace non-list callers).

## Batch Controls

- Batch by channel/item ID ranges to avoid large memory spikes.
- Use a configurable batch size and concurrency cap in the worker.
- Emit metrics/logs for skipped vs processed vs failed images.

## Batch Defaults

- Batch size: 250 items.
- Concurrency: 5 parallel downloads.
- Rate limit: 2 requests/second per worker.
- Expose these defaults as env overrides (`IMAGE_SHRINK_BATCH_SIZE`,
  `IMAGE_SHRINK_CONCURRENCY`, `IMAGE_SHRINK_RPS`).

## Cron Schedule

- Run hourly via `infra/k8s/base/cron/worker-image-shrinking.cronjob.yaml`
  to match the existing `worker-*.cronjob.yaml` naming.


## Rollout/Validation

- Manual validation in staging: ensure parser timing unaffected and resized URLs show in list views.
- Verify deletion path when channels/items are removed.
