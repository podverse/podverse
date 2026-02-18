## Image Shrinking Cache and Recheck

This doc focuses on change detection and how the service avoids re-downloading unchanged images.

Key code paths:

- Change detection + headers + checksum: `apps/workers/src/commands/imageShrink/batch.ts`
- Source metadata storage: `packages/orm/src/services/imageShrinkSource.ts`

### Change Detection Strategy

The worker uses multiple signals to avoid unnecessary work:

- HTTP `ETag`
- HTTP `Last-Modified`
- HTTP `Content-Length`
- SHA-256 checksum (only when needed)

It stores origin metadata in `image_shrink_source` keyed by source URL.

### Recheck TTL

If the current processing target is _not_ a hint (i.e., not from MQ), a per-URL recheck TTL
limits how often it will be rechecked.

### Sequence Diagram

```mermaid
sequenceDiagram
  participant Consumer as ImageShrinkConsumer
  participant SourceSvc as ImageShrinkSourceService
  participant Origin as OriginImage
  participant Storage as SpacesCDN
  participant DB as ChannelItemImage

  Consumer->>SourceSvc: getByUrl(url)
  SourceSvc-->>Consumer: sourceMeta_or_null

  Consumer->>Origin: HEAD url (conditional)
  Origin-->>Consumer: 304 or headers

  alt HEAD 304
    Consumer->>SourceSvc: updateCheckTime(url)
  else HEAD ok with comparable headers
    Consumer->>SourceSvc: upsert(url, headers, changed=false)
  else HEAD missing or changed
    Consumer->>Origin: GET url (conditional)
    Origin-->>Consumer: image bytes + headers
    Consumer->>Consumer: compare ETag/LastModified/ContentLength/Checksum
    alt unchanged
      Consumer->>SourceSvc: upsert(url, headers, changed=false)
    else changed
      Consumer->>Storage: uploadResizedImage(key, webp)
      Consumer->>SourceSvc: upsert(url, headers, changed=true)
      Consumer->>DB: update image url + is_resized
    end
  end
```

### Notes

- Checksums are only computed if other headers are inconclusive.
- `IMAGE_SHRINK_RECHECK_TTL_SECONDS` controls how often unchanged URLs are rechecked.
