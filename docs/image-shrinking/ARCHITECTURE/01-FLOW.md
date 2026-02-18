## Image Shrinking Flow

This doc describes the end-to-end flow for image shrinking, from RSS parse through MQ hints to
storage and DB updates.

Key code paths:

- MQ hints emitted during RSS parsing: `apps/workers/src/commands/parser/rss/parseFeed.ts`
- MQ consumer and hint handling: `apps/workers/src/commands/imageShrink/runConsumer.ts`
- Resizing/uploading/DB updates: `apps/workers/src/commands/imageShrink/batch.ts`

### High-Level Flow

```mermaid
flowchart TD
  rssParse[parserRSSParseFeed] -->|parseRSSFeedAndSaveToDatabase| dbWrite[DB: channel_image/item_image]
  rssParse -->|imageHints| mqHints["MQ: image-shrinking-hints"]
  backfill[imageShrinkBackfill] -->|unresized images| mqHints

  mqHints --> consumer[imageShrinkRunConsumer]
  consumer -->|fetch channel/item images by URL| imageRows[DB: channel_image/item_image]
  consumer -->|processTarget| resize[createImageShrinkProcessor]

  resize -->|fetch + resize| webp[WebP output]
  resize -->|uploadResizedImage| storage["DigitalOcean Spaces"]
  resize -->|update url + is_resized| dbResized[DB: channel_image/item_image]

  storage -->|cdnBaseUrl + key| cdnUrl[CDN URL]
  cdnUrl --> dbResized
```

### CDN Key Format

Resized images are stored deterministically using a URL hash:

```
images/{entityType}/{entityId}/{sha256(url)}-w{width}.webp
```

Example:

```
images/item/10/5ae702a12c0ed2d27f3bb4797040aa9bbe0638174d28785-w300.webp
```

### What Triggers Shrinking

- **Hints**: fresh MQ hints (<= 24 hours old) from RSS parsing.
- **Backfill**: periodic job that enqueues unresized images from the DB.
- **Rechecks**: existing sources are periodically rechecked (see cache/recheck doc).
