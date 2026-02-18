# Image Shrinking — Testing Guide

This document gives detailed steps to test the image shrinking service locally or in a staging environment. For an overview of the service, see [Service](SERVICE.md).

## Prerequisites

- **Database**: PostgreSQL with the Podverse schema applied (including `image_shrink_source`, `channel_image`, `item_image` with `is_resized` and image URL columns).
- **Message queue**: ActiveMQ Artemis (or compatible) with the `image-shrinking-hints` queue created and reachable.
- **Image CDN**: Storage and credentials for the image shrink pipeline. Currently the only documented implementation is Digital Ocean Spaces.
  - **Implementation option**: [Digital Ocean Spaces Setup](DIGITAL-OCEAN-SETUP.md) — create a Space, get keys and CDN URL, set env vars.

Ensure the database has some channel and/or item images (from normal RSS parsing or fixtures) so the backfill can find unresized images to enqueue.

## 1. Environment and config

1. **Copy the workers env template** (if you have not already):

   ```bash
   cp apps/workers/.env.example apps/workers/.env
   ```

2. **Set Base, ORM, and MQ variables** so the worker can start. See `apps/workers/ENV.md` for required vars. At minimum you need:
   - Base: `USER_AGENT`, `LOG_LEVEL`, `LOG_DIR` (optional)
   - ORM: `DB_HOST`, `DB_PORT`, `DB_READ_*`, `DB_READ_WRITE_*`, `DB_DATABASE`, `DB_SSL_CONNECTION`
   - MQ: `MESSAGE_QUEUE_PROTOCOL`, `MESSAGE_QUEUE_HOST`, `MESSAGE_QUEUE_USERNAME`, `MESSAGE_QUEUE_PASSWORD`, `MESSAGE_QUEUE_PORT`

3. **Set Image Shrink variables** for the implementation you are using. For Digital Ocean Spaces, follow [Digital Ocean Spaces Setup](DIGITAL-OCEAN-SETUP.md) and set:
   - `DIGITAL_OCEAN_ACCESS_KEY`, `DIGITAL_OCEAN_SECRET_KEY`
   - `BUCKET_REGION`, `BUCKET_NAME`, `BUCKET_CDN_BASE_URL`
   - `IMAGE_SHRINK_WIDTH_PX`, `IMAGE_SHRINK_BATCH_SIZE`, `IMAGE_SHRINK_CONCURRENCY`, `IMAGE_SHRINK_RPS`

   If any image shrink env var is set, **all** of the above are required (all-or-nothing). Optional: `IMAGE_SHRINK_RECHECK_TTL_SECONDS`, `IMAGE_SHRINK_SOURCE_PRUNE_DAYS`.

4. **Confirm the queue exists**. The consumer expects the queue name defined in `MQ_IMAGE_SHRINK_HINTS_CONFIG` (see `@podverse/helpers`). Ensure ActiveMQ has that queue created (or use default queue creation if your broker creates queues on demand).

## 2. Build the workers app

From the monorepo root:

```bash
npm run build:packages
npm run build -w apps/workers
```

Or from `apps/workers`:

```bash
npm run build
```

Ensure the build completes without errors. Startup validation will run when you execute a command and will report any missing env vars for the command’s categories.

## 3. Run the backfill (enqueue hints)

The backfill finds channel and item images that are not yet resized and enqueues one hint per unique image URL (up to `IMAGE_SHRINK_BATCH_SIZE`).

From the monorepo root:

```bash
npm run image_shrink_backfill -w apps/workers
```

Or from `apps/workers` with env loaded:

```bash
node ./dist/index.js imageShrinkBackfill
```

- If image shrink is disabled (no image shrink env set), the command logs that it is disabled and exits.
- If there are no unresized images, it logs "no unresized images found".
- Otherwise it queues hints and logs how many were queued.

## 4. Run the consumer (process hints and upload)

Start the long-running consumer so it processes hints from the queue, downloads origin images, resizes them, and uploads to the image CDN.

From the monorepo root:

```bash
npm run image_shrink_run_consumer -w apps/workers
```

Or from `apps/workers`:

```bash
node ./dist/index.js imageShrinkRunConsumer
```

Leave it running. It will:

- Consume messages from the image-shrinking-hints queue
- For each hint: check change detection (ETag/Last-Modified/etc.), skip if unchanged; otherwise download, resize to `IMAGE_SHRINK_WIDTH_PX`, upload WebP to the CDN, and update `channel_image` or `item_image` with the CDN URL and `is_resized = true`

Use a small batch for local testing (e.g. `IMAGE_SHRINK_BATCH_SIZE=10`) so the backfill does not enqueue too many messages. Stop the consumer with Ctrl+C when done.

## 5. Verify results

### In the database

- **Resized images**: Rows in `channel_image` or `item_image` with `is_resized = true` should have `url` pointing at your CDN base URL (e.g. `https://your-space.nyc3.cdn.digitaloceanspaces.com/images/...`).
- **Source metadata**: Table `image_shrink_source` should have one row per unique image URL that was processed, with `url`, `etag`, `last_modified`, `checksum_sha256` (optional), `last_checked_at`, `last_changed_at`.

Example (PostgreSQL):

```sql
SELECT id, url, is_resized, image_width_size
FROM channel_image
WHERE is_resized = true
LIMIT 5;
```

### On the CDN

- For Digital Ocean: open the Space in the control panel and look under the `images/` prefix. You should see paths like `images/channel/<id>/<sha256>-w300.webp` or `images/item/<id>/<sha256>-w300.webp`.
- Open one of the CDN URLs in a browser to confirm the WebP image loads.

### In the app (optional)

If the web or mobile app uses resized images for list views, confirm that list views show the resized thumbnails (CDN URLs) and that they load correctly.

## 6. Test orphan cleanup (dry run → delete)

1. Start with dry run (default is `true`):

```bash
npm run image_shrink_cleanup_orphans -w apps/workers
```

2. Review logs for counts: listed objects, candidates, referenced, orphans, wouldDelete.
3. If you want to actually delete, set `IMAGE_SHRINK_ORPHAN_CLEANUP_DRY_RUN=false` and rerun.

Notes:

- Only `.webp` objects under `images/` older than `IMAGE_SHRINK_ORPHAN_CLEANUP_MIN_AGE_DAYS` are eligible.
- Objects without `lastModified` are skipped.
- Use `IMAGE_SHRINK_ORPHAN_CLEANUP_MAX_DELETE` to cap deletions per run.

## 7. Test source prune

1. Ensure there are unused `image_shrink_source` rows (URLs with no resized images pointing at them).
2. Run the prune job:

```bash
npm run image_shrink_source_prune -w apps/workers
```

3. Confirm older unused rows are deleted (default age threshold is 30 days).

## 8. Optional: generate hints via the parser

Hints are normally emitted when the RSS parser runs (for recently parsed feeds). To test the full flow including hint emission:

1. Run a parser command that publishes to the image-shrinking queue (see parser + MQ wiring in the codebase).
2. Then run the backfill and/or consumer as above.

If you only run the backfill without the parser, the backfill will still enqueue any existing unresized images from the database.

## 9. Troubleshooting

| Symptom                                       | What to check                                                                                                                                                   |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Image shrink is disabled"                    | At least one image shrink env var must be set; if any is set, all required vars must be set. See `apps/workers/ENV.md`.                                         |
| "ImageStorageService not initialized"         | The consumer requires image shrink to be enabled and the storage implementation to be wired at startup (e.g. Digital Ocean credentials and IMAGE*CDN*\\\* set). |
| Backfill reports "no unresized images found"  | Database has no `channel_image` / `item_image` rows with `is_resized = false`, or they have no valid `url`. Ingest some feeds or add test data.                 |
| Consumer fails on upload                      | Check DO credentials, bucket name, region, and CDN URL. Confirm the Space allows public read if you want CDN URLs to be viewable in a browser.                  |
| Queue not receiving / consumer not processing | Confirm MQ host, port, credentials, and that the queue name matches what the app uses. Check broker logs and that the backfill actually sent messages.          |

## References

- [Service](SERVICE.md) — architecture, flow, env vars, K8s
- [Digital Ocean Spaces Setup](DIGITAL-OCEAN-SETUP.md) — implementation option for image CDN (currently the only one)
- [apps/workers/ENV.md](../../apps/workers/ENV.md) — all worker env vars and categories
