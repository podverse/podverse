---
name: Image Shrinking Service - Architecture
overview: >
  Define the overall architecture, storage model, and external service package naming
  (`external-services-digital-ocean`) for image shrinking without impacting parser
  performance.
todos: []
isProject: false
---

# Image Shrinking Service - Architecture

## Goals

- Keep RSS parsing fast by offloading image resizing to async workers.
- Use DO Spaces CDN via a new `@podverse/external-services-digital-ocean` package.
- Store resized image URLs in existing `channel_image`/`item_image` tables with `is_resized = true`.
- Exclude Add-by-RSS feeds from shrinking.
- Prefer resized images in list views only, keeping header/full-size images on originals.
- Use one resized width controlled by `IMAGE_SHRINK_WIDTH_PX`.


## Key Files

- Image entities/DTOs:
  - [packages/orm/src/entities/channel/channelImage.ts](/Users/mitcheldowney/repos/pv/podverse/packages/orm/src/entities/channel/channelImage.ts)
  - [packages/orm/src/entities/item/itemImage.ts](/Users/mitcheldowney/repos/pv/podverse/packages/orm/src/entities/item/itemImage.ts)
  - [packages/helpers/src/dtos/channel/channelImage.ts](/Users/mitcheldowney/repos/pv/podverse/packages/helpers/src/dtos/channel/channelImage.ts)
  - [packages/helpers/src/dtos/item/itemImage.ts](/Users/mitcheldowney/repos/pv/podverse/packages/helpers/src/dtos/item/itemImage.ts)
- Parser entry + image handlers:
  - [packages/parser/src/lib/rss/parser.ts](/Users/mitcheldowney/repos/pv/podverse/packages/parser/src/lib/rss/parser.ts)
  - [packages/parser/src/lib/rss/channel/channelImage.ts](/Users/mitcheldowney/repos/pv/podverse/packages/parser/src/lib/rss/channel/channelImage.ts)
  - [packages/parser/src/lib/rss/item/itemImage.ts](/Users/mitcheldowney/repos/pv/podverse/packages/parser/src/lib/rss/item/itemImage.ts)
- Image services with TODOs:
  - [packages/orm/src/services/channel/channelImage.ts](/Users/mitcheldowney/repos/pv/podverse/packages/orm/src/services/channel/channelImage.ts)
  - [packages/orm/src/services/item/itemImage.ts](/Users/mitcheldowney/repos/pv/podverse/packages/orm/src/services/item/itemImage.ts)
- External services patterns:
  - [packages/external-services-firebase/src/index.ts](/Users/mitcheldowney/repos/pv/podverse/packages/external-services-firebase/src/index.ts)
  - [packages/external-services-paypal/src/index.ts](/Users/mitcheldowney/repos/pv/podverse/packages/external-services-paypal/src/index.ts)

## Architecture Decisions

- Create `@podverse/external-services-digital-ocean` (not `...-spaces`) to allow future DO APIs.
- Use S3-compatible SDK with Spaces; keep upload/delete methods minimal and explicit.
- Keep original RSS image URLs as `is_resized = false`; add resized entries with `is_resized = true`.
- Avoid resizing in parser; emit MQ hints and use an hourly batch worker to populate
  resized images.
- Add-by-RSS content is explicitly excluded from shrinking (no job enqueued, no CDN URLs used).
- Keep API payloads unchanged; apply resized-image preference in web list helpers only.


## High-Level Flow

- Parser persists RSS image URLs (current flow).
- Parser emits MQ hints for recently updated image URLs (non-Add-by-RSS only).
- Worker consumes queue: download image → resize/optimize → upload to Spaces CDN → write `is_resized = true` row.
- Deletion handling ensures CDN objects are removed for any `is_resized` rows removed.
- API/web list views select `is_resized = true` URLs when available.

## CDN Object Key Strategy

- Use a deterministic key so deletion is reliable without extra columns.
- Recommended format: `images/{entity_type}/{entity_id}/{sha256(url)}-w{width}.webp`.
- Store the full CDN URL in `url` and derive the key by stripping the CDN base prefix.

## Web App Usage Scope

- Use resized images for list-based UI (browse/search lists and other repeating grids).
- Do not use resized images for header images or single-image sections.
- Do not use resized images for media player modal/full-size artwork.

## Resized Width Control

- Define a single resized width in pixels via `IMAGE_SHRINK_WIDTH_PX`.
 - Use the same width across the batch worker and any selection logic.


## Cost/Performance Controls

- Single resized width to maximize cache hit rate and reduce storage.
- Dedupe by URL hash to avoid repeat uploads.
- Worker concurrency/batch limits to cap cost.
