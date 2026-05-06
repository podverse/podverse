# Image Shrinking Service

## Overview

The image shrinking service produces resized WebP images for list views and stores them on an
image CDN. It runs as a long-running MQ consumer plus a periodic backfill cron job and never
blocks RSS parsing.

Storage is abstracted via a provider-agnostic interface (`ImageStorageService`); the worker
injects an **S3-compatible** implementation at bootstrap (`BUCKET_PROVIDER`). Supported backends
include DigitalOcean Spaces, AWS S3, Backblaze B2, Garage, and other S3-compatible endpoints.
See [Bucket providers](BUCKET-PROVIDERS.md) for setup.

Key points:

- Resizing runs via the `imageShrinkRunConsumer` MQ consumer.
- Parser emits MQ hints so the consumer revisits origin URLs on each parse; the consumer also
  resolves already-resized rows when `image_shrink_source` has metadata for that URL.
- A periodic backfill cron enqueues unresized images for full coverage.
- A periodic orphan cleanup deletes unreferenced WebP objects from storage.
- Resized images are stored in `channel_image` and `item_image` with `is_resized = true`.
- List views prefer resized images; headers and full-size views continue using original URLs.

For detailed testing steps (prerequisites, backfill, consumer, verification), see [Testing Guide](TESTING.md).

Further reading:

- [01 Flow](ARCHITECTURE/01-FLOW.md)
- [02 Cache and Recheck](ARCHITECTURE/02-CACHE-RECHECK.md)
- [03 Deletion and Orphans](ARCHITECTURE/03-DELETION-ORPHANS.md)

## End-to-End Flow

1. RSS parser saves original image URLs as usual.
2. Parser emits MQ hints (channel + item image URLs) for recently parsed feeds.
3. `imageShrinkRunConsumer` consumes hints (fresh within 24 hours).
4. Periodic backfill enqueues any remaining unresized images.
5. Worker downloads, resizes to the configured width (`IMAGE_SHRINK_WIDTH_PX`, default **400**), encodes WebP at `IMAGE_SHRINK_WEBP_QUALITY` (default **92**), and uploads to image CDN.
6. Worker writes `is_resized = true` rows pointing at CDN URLs.

## Origin size, decode errors, and logs

- **Max download size:** Optional `IMAGE_SHRINK_MAX_SOURCE_BYTES` (default **20971520**, 20 MiB). Larger
  responses are rejected using `Content-Length` when present, or after the body exceeds the cap.
- **Decode:** Sharp runs with `failOn: 'none'` for best-effort handling of marginal JPEG/PNG/WebP
  inputs; truly corrupt origins may still fail (for example libvips JPEG errors).
- **Processor logs:** On failure, workers emit `imageShrinkProcessor: failed to process target` with
  `entityType`, `entityId`, `url`, `urlHash`, `hinted`, `maxSourceBytes`, `errorName`, `errorMessage`,
  and (when a full GET completed first) `originResponseStatus`, `originContentLength`, `originEtag`,
  `originLastModified`, `originContentType`.
- **MQ consumer logs:** On hint handling failure, `imageShrinkRunConsumer: error processing hint (mq
message context)` includes `hintUrl`, `hintEntityType`, and `hintCreatedAt` before the stack trace
  line from `logError`.

## CDN Key Format

Each resized image uses a deterministic key for easy lookup and deletion:

```
images/{entity_type}/{entity_id}/{sha256(url)}-w{width}-c{sha256_prefix16}.webp
```

The `c{sha256_prefix16}` segment is the first 16 hex characters of the SHA-256 digest of the
**origin** image bytes. When the origin changes at the same URL, a new object key is written and the
DB row is updated; the previous CDN object becomes an orphan and is removed by the orphan cleanup
job after `IMAGE_SHRINK_ORPHAN_MIN_AGE_EXPIRATION`.

Changing **`IMAGE_SHRINK_WIDTH_PX`** or **`IMAGE_SHRINK_WEBP_QUALITY`** changes the encoded bytes and therefore the content checksum and object key; existing CDN objects are not updated until origins are reprocessed.

Output is WebP for smaller file size at similar quality. WebP is well supported in current browsers and on Android and iOS 14+. On iOS 13 and earlier, the system Photos app may not display saved WebP images correctly when the user saves an image to their device.

## Worker Commands

Run the MQ consumer:

```
npm run image_shrink_run_consumer -w apps/workers
```

Run the backfill (cron-style, enqueues up to `IMAGE_SHRINK_BATCH_SIZE` hints per run):

```
npm run image_shrink_backfill -w apps/workers
```

Run the orphan cleanup (cron-style, deletes unreferenced WebP objects):

```
npm run image_shrink_cleanup_orphans -w apps/workers
```

Run the source prune (cron-style, deletes unused `image_shrink_source` rows):

```
npm run image_shrink_source_prune -w apps/workers
```

## Cleanup Behavior Details

### Orphan Cleanup Criteria

The orphan cleanup job (`imageShrinkCleanupOrphans`) lists objects directly from the configured
bucket (S3-compatible API) and applies the following filters before deleting:

- Only objects under the `images/` prefix with a `.webp` suffix.
- Only objects with a `lastModified` timestamp (missing timestamps are skipped).
- Only objects older than `IMAGE_SHRINK_ORPHAN_MIN_AGE_EXPIRATION` in seconds (default: `604800`, 7 days).
- `IMAGE_SHRINK_ORPHAN_CLEANUP_MAX_DELETE` can cap deletions per run (default: no cap).
- `IMAGE_SHRINK_ORPHAN_CLEANUP_PAGE_SIZE` controls list pagination (default: `500`).
- `IMAGE_SHRINK_ORPHAN_CLEANUP_DRY_RUN` defaults to `true` unless set to `false`.

The job then checks whether each candidate CDN URL is still referenced by a resized
`channel_image` or `item_image` row. Only unreferenced objects are deleted.

### Source Prune Criteria

The source prune job (`imageShrinkSourcePrune`) deletes **metadata rows** from
`image_shrink_source` when:

- The URL is **unused** (no `channel_image`/`item_image` row with `is_resized = true` points at it).
- The last change/check time is older than `IMAGE_SHRINK_SOURCE_PRUNE_EXPIRATION` in seconds (default: `2592000`, 30 days).

Source pruning does **not** delete CDN objects; it only trims metadata rows.

## MQ Hints

Hints are published to the `image-shrinking-hints` queue with the following fields:

- `url`
- `entityType` (`channel` or `item`)
- `hintCreatedAt`

Channel-level hints use **AMQP message priority 9**; item-level hints use **priority 4**, so channel
artwork is shrunk ahead of episode images when the broker delivers by message priority (configure the
`image-shrinking-hints` queue as a prioritized queue in Artemis if ordering is not already applied).

The consumer ignores hints older than 24 hours.

## Change Detection

The consumer tracks origin metadata per URL in `image_shrink_source` (keyed by URL):

- `ETag` / `Last-Modified` on conditional `HEAD` when deep recheck is not due.
- Unconditional `GET` plus SHA-256 of bytes on a deep recheck cadence
  (`IMAGE_SHRINK_DEEP_RECHECK_EXPIRATION`, default 7 days) or after the first stored row is created.
- After any `GET` that returns bytes, the processor compares SHA-256 to the stored checksum before
  skipping work.
- A per-URL re-check TTL (`IMAGE_SHRINK_RECHECK_EXPIRATION`) limits non-hint polling; MQ hints
  bypass that TTL.

## Required Environment Variables

Required when image shrink is enabled (i.e. when `BUCKET_PROVIDER` is set). If it is empty or unset, image shrink is disabled and these variables are not used.

See `apps/workers/.env.example` for the authoritative template and commented grouping. Variables are listed below in the same order and section structure.

### Image Shrink (storage)

- `BUCKET_PROVIDER` (`digitalocean` | `aws-s3` | `backblaze-b2` | `garage` | `s3-compatible`)
- `BUCKET_ACCESS_KEY`
- `BUCKET_SECRET_KEY`
- `BUCKET_REGION`
- `BUCKET_NAME`
- `BUCKET_CDN_BASE_URL`
- `BUCKET_ENDPOINT` (required for `garage` and `s3-compatible`; optional otherwise — see [Bucket providers](BUCKET-PROVIDERS.md))
- `BUCKET_FORCE_PATH_STYLE` (optional; default is provider-specific)

Provider-specific setup: [Bucket providers](BUCKET-PROVIDERS.md).

### Image Shrink

- `IMAGE_SHRINK_WIDTH_PX` (Optional; default **400**)
- `IMAGE_SHRINK_WEBP_QUALITY` (Optional; default **92**; integers **1–100**)
- `IMAGE_SHRINK_BATCH_SIZE`
- `IMAGE_SHRINK_CONCURRENCY`
- `IMAGE_SHRINK_RPS`
- `IMAGE_SHRINK_RECHECK_EXPIRATION` (Optional; see example env file)
- `IMAGE_SHRINK_DEEP_RECHECK_EXPIRATION` (Optional; see example env file)
- `IMAGE_SHRINK_SOURCE_PRUNE_EXPIRATION` (Optional; see example env file)
- `IMAGE_SHRINK_ORPHAN_CLEANUP_DRY_RUN` (Optional; default true)
- `IMAGE_SHRINK_ORPHAN_CLEANUP_MAX_DELETE` (Optional; cap per run)
- `IMAGE_SHRINK_ORPHAN_MIN_AGE_EXPIRATION` (Optional; default 604800)
- `IMAGE_SHRINK_ORPHAN_CLEANUP_PAGE_SIZE` (Optional; default 500)

## Kubernetes Wiring

### ConfigMap

Add non-sensitive values to `infra/k8s/base/workers/configmap.yaml` using the same section structure as `apps/workers/.env.example` (Image Shrink storage; Image Shrink):

- **Image Shrink (storage):** `BUCKET_PROVIDER`, `BUCKET_REGION`, `BUCKET_NAME`, `BUCKET_CDN_BASE_URL`, `BUCKET_ENDPOINT` (when required), `BUCKET_FORCE_PATH_STYLE`
- **Image Shrink:** `IMAGE_SHRINK_WIDTH_PX` (Optional; default 400), `IMAGE_SHRINK_WEBP_QUALITY` (Optional; default 92), `IMAGE_SHRINK_BATCH_SIZE`, `IMAGE_SHRINK_CONCURRENCY`, `IMAGE_SHRINK_RPS`, `IMAGE_SHRINK_RECHECK_EXPIRATION` (Optional), `IMAGE_SHRINK_DEEP_RECHECK_EXPIRATION` (Optional), `IMAGE_SHRINK_SOURCE_PRUNE_EXPIRATION` (Optional)

### Secret

Use `infra/k8s/scripts/secret-generators/create_workers_storage_bucket_secret.sh` to create:

```
podverse-${ENV}-workers-storage-bucket-opaque.enc.yaml
```

The secret stores `BUCKET_ACCESS_KEY` and `BUCKET_SECRET_KEY`.

### Consumer Deployment

Add the worker deployment in `infra/k8s/base/workers/image-shrink-consumer.deployment.yaml` and
ensure the storage bucket secret is included in `envFrom`.

### Cron Job

`infra/k8s/base/cron/worker-image-shrink-backfill.cronjob.yaml` runs the backfill on a schedule.
Add the secret to the `envFrom` list so the workers pod can access the bucket credentials.

`infra/k8s/base/cron/worker-image-shrink-orphan-cleanup.cronjob.yaml` runs the orphan cleanup on a weekly schedule. It uses the same env/secret wiring as the backfill job.

`infra/k8s/base/cron/worker-image-shrink-source-prune.cronjob.yaml` runs the source prune on a weekly schedule. It uses the same env/secret wiring as the backfill job.
