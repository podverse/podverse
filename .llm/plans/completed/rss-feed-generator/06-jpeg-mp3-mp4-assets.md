# Sub-Plan 6: JPEG / MP3 / MP4 Assets (Run First)

## Execution position

**This plan runs first** (before 01–05) so that media files exist when RSS feeds are generated. All RSS feed plans assume assets under `assets/<namespace>/` are already available or will be ensured by this step. The generator produces six feed types per set; total feed files = count × 6. Media pool cap remains 100 per type.

## Objective

Implement (or document) the approach for ensuring generated RSS feeds can reference real channel/item images and enclosure media (JPEG, MP3, MP4) under the same test-assets namespace, reusing the existing AssetGenerator. Media must be available before feed generation.

## Hard rules (non-negotiable)

- **Never more than 100 of each type:** The rss-feed-generator must never produce more than **100 JPEG**, **100 MP3**, or **100 MP4** files. Use fixed paths (e.g. `image-001.jpg` … `image-100.jpg`, `audio-001.mp3` … `audio-100.mp3`, `video-001.mp4` … `video-100.mp4`).
- **Do not recreate existing files:** If any of files 1–100 already exist at those paths in the assets directory, **do not** regenerate or overwrite them. Check for existence first; only call AssetGenerator (or write) when the file is missing.

## Test data spec (media)

See [10-test-data-spec.md](10-test-data-spec.md). All image, audio, and video URLs point to localhost:2111. Ensure existence (generate only if missing); cap 100 each; reuse across feeds.

## Current State (shared with Lighthouse)

- **AssetGenerator** ([tools/test-assets/src/asset-generator.ts](tools/test-assets/src/asset-generator.ts)) is the single implementation: `generateImage(filename, backgroundColor)`, `generateMP3(filename, durationSeconds)`, `generateMP4(filename, durationSeconds)`. Assets are written to `tools/test-assets/assets/<namespace>/`.
- **Lighthouse** uses `new AssetGenerator({ namespace: 'lighthouse' })`, calls `generateAllAssets()` (fixed set: chan-1/2/3, item-1/2/3 images + MP3/MP4), then starts `AssetServer`; feed XML references `http://localhost:2111/lighthouse/...`.
- **RSS generator** must **reuse** this same AssetGenerator and layout: distinct namespace (e.g. `rss-generator`), same directory convention, same base URL pattern. Do not duplicate asset-generation or server logic.

## Desired End State (Placeholder) — Reuse, Don’t Duplicate

- When the RSS generator writes feeds under `assets/<namespace>/`, image and enclosure URLs in those feeds should point to files in the same directory, served by the **same** AssetServer that Lighthouse uses (no second server).
- **Reuse:** Use `AssetGenerator` from `podverse-test-assets` (same package Lighthouse uses). Instantiate with the RSS generator’s namespace (e.g. `rss-generator`). Call `generateImage()`, `generateMP3()`, `generateMP4()` with filenames that the generated RSS references. No new asset-generation code; no duplicate ffmpeg logic.
- Options:
  1. **Option A (recommended):** RSS generator CLI imports `AssetGenerator` from `podverse-test-assets`, creates `new AssetGenerator({ namespace: 'rss-generator' })`, and before or after writing RSS calls `generateImage` / `generateMP3` / `generateMP4` for a fixed set of filenames (e.g. chan-1-image.jpg, item-1-podcast.mp3, …) so that generated feeds reference exactly those names. Same pattern as Lighthouse’s `generateAllAssets()` but for the rss-generator namespace.
  2. **Option B:** RSS generator only writes RSS; docs say “run AssetGenerator for namespace rss-generator” (e.g. a one-line script that uses podverse-test-assets) so referenced files exist. Still reuses AssetGenerator; no duplication.
  3. **Option C (later):** Dynamic filenames per feed/item; generator calls AssetGenerator in a loop for each needed file. AssetGenerator API stays in test-assets; RSS tool only calls it.

## Implementation Steps (Placeholder)

1. **Document in generator README** — Add section “Media assets (JPEG, MP3, MP4)”:
   - Generated feeds use the same base URL pattern as Lighthouse: `http://localhost:2111/<namespace>/` (e.g. `rss-generator`). The same test-assets AssetServer serves both Lighthouse and RSS generator namespaces.
   - Asset file generation **reuses** `AssetGenerator` from `podverse-test-assets` (same as Lighthouse). Use a distinct namespace so assets don’t overwrite Lighthouse’s. Either: (a) CLI calls AssetGenerator for that namespace with a fixed set of filenames matching the RSS, or (b) document a separate “prepare assets” step using the same package.
   - Link to this sub-plan; full integration (fixed set or dynamic filenames) is in [future/09-asset-integration-full.md](future/09-asset-integration-full.md).

2. **Optional: minimal integration** — From the CLI, after writing RSS, import and use `AssetGenerator` from `podverse-test-assets`: `new AssetGenerator({ namespace: 'rss-generator' })`, then call `generateImage(...)`, `generateMP3(...)`, `generateMP4(...)` for the filenames that the generated RSS references (e.g. same naming pattern as Lighthouse: chan-1-image.jpg, item-1-podcast.mp3). Ensure the RSS builder uses these exact filenames. No new asset code; all generation stays in test-assets.

3. **Do not block on full asset coverage** — Validation can proceed with 404s for media URLs if Partytime/parser-mapping don’t require fetch. For full integration (all URLs resolve), execute [future/09-asset-integration-full.md](future/09-asset-integration-full.md).

## Acceptance Criteria

- README (or design doc) describes how media assets will or do work and points to this sub-plan.
- Either: (a) no real files are created and docs say “placeholder,” or (b) minimal AssetGenerator integration ensures at least one feed’s channel/item images and one enclosure URL resolve when the test-assets server is running.
- Implementation never creates more than 100 JPEG, 100 MP3, or 100 MP4; and never overwrites existing files 1–100.

## Run after this plan

- **If 06 only adds documentation:** There is no CLI yet. Proceed to plan 01; after 01, run the test under 01 and then run the asset checks below (once the generator creates assets).
- **If 06 adds an asset-ensure script or step:** Run whatever command ensures media files (e.g. `npm run ensure-assets` from `tools/rss-feed-generator` or a script under test-assets). Then:

1. **Asset count:** Confirm no more than 100 of each type:
   ```bash
   ls tools/test-assets/assets/rss-generator/image-*.jpg 2>/dev/null | wc -l   # ≤100
   ls tools/test-assets/assets/rss-generator/audio-*.mp3 2>/dev/null | wc -l   # ≤100
   ls tools/test-assets/assets/rss-generator/video-*.mp4 2>/dev/null | wc -l   # ≤100
   ```
2. **No overwrite:** Run the same command again; confirm existing files (e.g. image-001.jpg) were **not** recreated (e.g. check file mtime unchanged or that the script logs “skip, exists”).
3. **After 01 is done:** Run `cd tools/rss-feed-generator && npm run generate -- 1` and confirm feeds reference these asset paths and that asset count still does not exceed 100 each.

## References

- [tools/test-assets/TOOLS-TEST-ASSETS.md](tools/test-assets/TOOLS-TEST-ASSETS.md)
- [tools/test-assets/src/asset-generator.ts](tools/test-assets/src/asset-generator.ts)
- [tools/web-perf/lighthouse/src/index.ts](tools/web-perf/lighthouse/src/index.ts) (example of calling AssetGenerator + serving)
