## Page content fits the window width

- Surfaces: web
- Change: The shared page column no longer uses a full-width box plus side margins, which made every chrome page about 28px wider than the window and showed a horizontal scrollbar.
- Who notices: anyone using the website; lists, filters, and the footer stay within the screen
- Operator steps: none

## Notifications unread dot matches channel rows

- Surfaces: mobile
- Change: An unread notification now shows the same trailing accent dot used on podcast channel
  rows, instead of a smaller circle on the leading edge of the artwork.
- Who notices: anyone opening the notifications inbox with unread rows
- Operator steps: none

## Shrunk artwork defaults to JPEG so iOS push notifications show images

- Surfaces: workers, k8s base env, push notifications (iOS, Android)
- Change: The image shrink worker now encodes shrunk artwork as JPEG by default (`IMAGE_SHRINK_FORMAT=jpeg`, mozjpeg at `IMAGE_SHRINK_JPEG_QUALITY=82`, transparency flattened onto white) instead of always WebP. New object keys end in `.jpg`. `IMAGE_SHRINK_FORMAT=webp` keeps the previous behavior at `IMAGE_SHRINK_WEBP_QUALITY`, but iOS notification attachments do not support WebP, so iOS pushes show no artwork with that setting. When a resized row's extension differs from the configured format, the worker re-encodes it on its next hint or backfill even if the origin bytes did not change, and updates the existing resized row in place. The replaced objects become orphans. Orphan cleanup now recognizes both `.jpg` and `.webp` shrink keys (its summary counter is renamed `skippedOtherSuffix`). Startup validation reports both new env vars.
- Who notices: iOS users, once the app attaches push images; operators see `.jpg` objects in the image bucket and slightly larger files (WebP is roughly 20–30% smaller)
- Operator steps: none required; unset `IMAGE_SHRINK_FORMAT` means jpeg. Set `IMAGE_SHRINK_FORMAT=webp` in an overlay only to keep WebP. Existing WebP rows convert gradually as the consumer and backfill process them; run `imageShrinkCleanupOrphans` afterward to remove the old WebP objects.
