---
name: Image Shrink Change Detection
overview: Add an origin-image metadata table and update the shrink batch to detect upstream changes using conditional requests (ETag/Last-Modified) so resized images refresh only when needed.
todos:
  - id: schema-add
    content: Add image_shrink_source entity + service
    status: pending
  - id: batch-detect
    content: Update shrink batch to use conditional checks
    status: pending
  - id: mq-hint-ttl
    content: Bypass throttling when hinted
    status: pending
  - id: docs-update
    content: Document change detection + new table
    status: pending
isProject: false
---

# Image Shrink Change Detection Plan

## Goal

Detect when an origin image URL changes (same URL, new content) and refresh the resized CDN image efficiently using conditional requests and stored metadata.

## Approach (new table)

Use a dedicated table keyed by `url` to store origin metadata and last-check timestamps. This avoids duplicating metadata across `channel_image`/`item_image` rows and allows efficient reuse across many items sharing the same origin URL.

## Data Model

- Add new entity/table, e.g. `image_shrink_source`:
  - `id` (PK)
  - `url` (unique)
  - `etag` (nullable)
  - `last_modified` (nullable)
  - `content_length` (nullable)
  - `last_checked_at` (timestamp)
  - `last_changed_at` (timestamp)
  - `checksum_sha256` (nullable; used only when a full fetch is required)

Where:

- `etag` / `last_modified` are captured from `HEAD`/`GET` response headers.
- `content_length` is used as a cheap heuristic when ETag/Last-Modified are missing.
- `last_checked_at` supports throttling re-checks.

## Migration

- Add a SQL migration under `infra/db/migrations/` following the repo naming pattern.
- Migration creates `image_shrink_source` with unique `url` and metadata columns.

## Worker Flow Updates

- Update the batch job in [apps/workers/src/commands/imageShrink/batch.ts](/Users/mitcheldowney/repos/pv/podverse/apps/workers/src/commands/imageShrink/batch.ts):
  - Before fetching the full image, perform a `HEAD` (or conditional `GET` if HEAD unsupported).
  - If `ETag` or `Last-Modified` matches stored metadata → skip resizing.
  - If changed → fetch, resize, upload, and update metadata.
  - If neither header exists:
    - Compare `Content-Length`; if unchanged, skip.
    - Otherwise, fetch and hash to confirm change (update `checksum_sha256`).
  - Update `last_checked_at` even when skipping.
  - Add a minimal backoff: do not re-check the same URL more frequently than a configured TTL (e.g., 24h) unless it was recently hinted.

## ORM + Services

- Create new entity + service:
  - [packages/orm/src/entities/](/Users/mitcheldowney/repos/pv/podverse/packages/orm/src/entities/)
  - [packages/orm/src/services/](/Users/mitcheldowney/repos/pv/podverse/packages/orm/src/services/)
- Service methods:
  - `getByUrl(url)`
  - `upsertFromHeaders(url, headers, changed)`
  - `shouldCheck(url, minIntervalMs)`

## MQ Hint Integration

- When a hint arrives, bypass the throttling TTL for that URL (check immediately) to ensure fresh content after known feed updates.

## Config

- Add optional env for re-check TTL (e.g., `IMAGE_SHRINK_RECHECK_TTL_SECONDS`).
- Default to a conservative value in runtime logic (but do not set defaults in config files; use fallback at the call site).

## Documentation

- Update [docs/IMAGE-SHRINKING-SERVICE.md](/Users/mitcheldowney/repos/pv/podverse/docs/IMAGE-SHRINKING-SERVICE.md) to describe change detection and the new table.

## Testing

- Build the affected packages: `npm run build`.
- Run the batch job locally with mocked URLs to verify:
  - No re-fetch on unchanged `ETag` / `Last-Modified`.
  - Refresh on changed metadata.
  - Fallback behavior when headers are missing.

## Cleanup

- Primary: delete `image_shrink_source` rows when a URL no longer has any resized CDN rows.
- Safety net: add a periodic prune that removes rows not referenced by any resized images and
  not checked in the last N days (configurable threshold).
