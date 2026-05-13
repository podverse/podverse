# 02 — Image shrink: static raster whitelist only

## Goal

[`apps/workers/src/commands/imageShrink/batch.ts`](apps/workers/src/commands/imageShrink/batch.ts) must **not** decode/resize/upload WebP derivatives for GIF or animated inputs.

## Implementation

1. **Shared helper** in `@podverse/helpers` (or minimal worker-local module importing URL parsing): distinguish **shrink-eligible** extensions — e.g. `png`, `jpg`, `jpeg`, `webp` only — **exclude `gif`**. Align with [`urlHasAllowedImageExtension`](packages/helpers/src/lib/image.ts) patterns.

2. **Early skip** in `processTarget`: if source URL is not shrink-eligible by extension, **return** without GET/resize (log; optionally advance check timestamps per existing skip patterns so backfill does not spin).

3. **After download**: `sharp(buffer).metadata()` before resize. Skip upload if:

   - `format === 'gif'`, or
   - animated / multi-page WebP (use Sharp metadata fields available in repo’s Sharp version), or
   - format not in allowed static set.

   Do not call `uploadResizedImage` / `saveResizedRow` on skip.

4. **Tests:** URL early-exit for `.gif`; metadata skip path where practical.

5. **Docs:** [`docs/image-shrinking/SERVICE.md`](docs/image-shrinking/SERVICE.md) (or architecture doc): shrink applies only to static png/jpeg/webp sources; GIFs display from origin via UI helpers and are not shrunk.
