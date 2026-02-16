# Image Shrinking Service

## Overview

The image shrinking service produces resized WebP images for list views and stores them on an
image CDN. It runs as a long-running MQ consumer plus a periodic backfill cron job and never
blocks RSS parsing.

Storage is abstracted via a provider-agnostic interface (`ImageStorageService`); the worker
injects the implementation at bootstrap. **Digital Ocean Spaces is the current implementation.**
The pipeline can be switched to another image CDN (e.g. AWS S3, Cloudflare R2) by providing a
different implementation and wiring it in the worker; batch logic and the interface stay unchanged.

Key points:

- Resizing runs via the `mqImageShrinkRunConsumer` MQ consumer.
- Parser emits MQ hints so the consumer prioritizes recently updated images.
- A periodic backfill cron enqueues unresized images for full coverage.
- Resized images are stored in `channel_image` and `item_image` with `is_resized = true`.
- List views prefer resized images; headers and full-size views continue using original URLs.

For detailed testing steps (prerequisites, backfill, consumer, verification), see [Image Shrinking — Testing Guide](IMAGE-SHRINKING-TESTING.md).

## End-to-End Flow

1. RSS parser saves original image URLs as usual.
2. Parser emits MQ hints (channel + item image URLs) for recently parsed feeds.
3. `mqImageShrinkRunConsumer` consumes hints (fresh within 24 hours).
4. Periodic backfill enqueues any remaining unresized images.
5. Worker downloads, resizes to `IMAGE_SHRINK_WIDTH_PX`, and uploads to image CDN.
6. Worker writes `is_resized = true` rows pointing at CDN URLs.

## CDN Key Format

Each resized image uses a deterministic key for easy lookup and deletion:

```
images/{entity_type}/{entity_id}/{sha256(url)}-w{width}.webp
```

Output is WebP for smaller file size at similar quality. WebP is well supported in current browsers and on Android and iOS 14+. On iOS 13 and earlier, the system Photos app may not display saved WebP images correctly when the user saves an image to their device.

## Worker Commands

Run the MQ consumer:

```
npm run mq_image_shrink_run_consumer -w apps/workers
```

Run the backfill (cron-style, enqueues up to `IMAGE_SHRINK_BATCH_SIZE` hints per run):

```
npm run mq_image_shrink_backfill -w apps/workers
```

## MQ Hints

Hints are published to the `image-shrinking-hints` queue with the following fields:

- `url`
- `entityType` (`channel` or `item`)
- `hintCreatedAt`

The consumer ignores hints older than 24 hours.

## Change Detection

The consumer tracks origin metadata per URL to avoid re-downloading unchanged images:

- `ETag` and `Last-Modified` headers are stored and compared on future runs.
- If headers are missing, `Content-Length` and optional SHA-256 checksums are used.
- A per-URL re-check TTL limits how often unchanged URLs are re-checked unless a hint arrives.
- Backfill runs can be scheduled more frequently to speed up full coverage if needed.

Origin metadata is stored in the `image_shrink_source` table (keyed by URL).

## Required Environment Variables

Required when image shrink is enabled (i.e. when any image shrink env var is set). If none are set, image shrink is disabled and these variables are not used.

See `apps/workers/.env.example` for the authoritative template and commented grouping. Variables are listed below in the same order and section structure.

### DigitalOcean

- `DIGITAL_OCEAN_ACCESS_KEY`
- `DIGITAL_OCEAN_SECRET_KEY`

### Image Shrink (storage)

- `IMAGE_CDN_REGION`
- `IMAGE_CDN_BUCKET`
- `IMAGE_CDN_BASE_URL`

### Image Shrink

- `IMAGE_SHRINK_WIDTH_PX`
- `IMAGE_SHRINK_BATCH_SIZE`
- `IMAGE_SHRINK_CONCURRENCY`
- `IMAGE_SHRINK_RPS`
- `IMAGE_SHRINK_RECHECK_TTL_SECONDS` (Optional; see example env file)
- `IMAGE_SHRINK_SOURCE_PRUNE_DAYS` (Optional; see example env file)

## Kubernetes Wiring

### ConfigMap

Add non-sensitive values to `infra/k8s/base/workers/configmap.yaml` using the same section structure as `apps/workers/.env.example` (DigitalOcean; Image Shrink storage; Image Shrink):

- **DigitalOcean** — keys are in secrets; no values in ConfigMap.
- **Image Shrink (storage):** `IMAGE_CDN_REGION`, `IMAGE_CDN_BUCKET`, `IMAGE_CDN_BASE_URL`
- **Image Shrink:** `IMAGE_SHRINK_WIDTH_PX`, `IMAGE_SHRINK_BATCH_SIZE`, `IMAGE_SHRINK_CONCURRENCY`, `IMAGE_SHRINK_RPS`, `IMAGE_SHRINK_RECHECK_TTL_SECONDS` (Optional), `IMAGE_SHRINK_SOURCE_PRUNE_DAYS` (Optional)

### Secret

Use `infra/k8s/scripts/create_workers_digital_ocean_secret.sh` to create:

```
podverse-${ENV}-workers-digital-ocean-opaque.enc.yaml
```

### Consumer Deployment

Add the worker deployment in `infra/k8s/base/workers/image-shrink-consumer.deployment.yaml` and
ensure the DigitalOcean secret is included in `envFrom`.

### Cron Job

`infra/k8s/base/cron/worker-image-shrink-backfill.cronjob.yaml` runs the backfill on a schedule.
Add the secret to the `envFrom` list so the workers pod can access the Spaces credentials.
