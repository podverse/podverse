# 02 — Browse tree from native cache incl. offline items (12.12, 12.14)

**Cursor model:** Opus 4.8
**Details to author:**
[391-android-auto-browse-tree](/docs/proposals/mobile/_master-plan_/details/391-android-auto-browse-tree.md),
[393-car-offline-items-in-tree](/docs/proposals/mobile/_master-plan_/details/393-car-offline-items-in-tree.md)

## Goal

Populate `onGetChildren` by reading the durable native cache (no SQLite, JS may be dead) and mapping
payloads → Media3 `MediaItem`s: a **Library** node (from `library-browse` index) and a **Downloads**
node (offline items from `downloads` index). Missing/corrupt cache → empty tree, never crash.

## Context

- Reader: `PodverseNativeCache.read(context, PodverseNativeCacheKind.LIBRARY_BROWSE | DOWNLOADS)`
  returns opaque JSON string (12.3).
- Payload shapes (`apps/mobile/src/data/nativeCache/projection.ts`, schema 12.1 / detail 380):
  - `NativeCacheBrowseNode` = `{ idText, title, kind: 'podcast'|'playlist'|'category', artworkUrl?, childCount? }`
  - `NativeCacheDownloadEntry` = `{ idText, title, filePath, artworkUrl?, mediaUrl?, bytes? }`
  - Each payload wrapped in `{ schemaVersion, updatedAtMs, ...payload }`.
- `library-browse` is currently derived from add-by-RSS follows (12.4); deeper hydration is future
  work — map whatever nodes exist.

## Do

1. Read details 391 + 393 (author if TBD) and the payload types above.
2. Add a small Kotlin parser (use `org.json`, consistent with `PodverseNativeCache.schemaVersion`)
   that decodes each payload with the envelope, **ignoring unknown keys** and tolerating
   absent/`schemaVersion` mismatch (return empty list). Keep parsing in a dedicated helper
   (e.g. `PodverseNativeCacheModel.kt`) — service callback stays thin.
3. **Tree shape (v1):**
   - Root children: `Library` (browsable) + `Downloads` (browsable). Omit a node if its source
     payload is empty.
   - `Library` children: one `MediaItem` per `NativeCacheBrowseNode` (browsable if `kind` is a
     container; mediaId encodes kind + idText, e.g. `library/podcast/<idText>`).
   - `Downloads` children: one **playable** `MediaItem` per `NativeCacheDownloadEntry`
     (mediaId `download/<idText>`; set title + artwork; playable=true).
4. **Artwork/metadata:** set `MediaMetadata` title/subtitle/artworkUri where available; do not block
   on network — use provided `artworkUrl` string only.
5. **Paging:** honor `page`/`pageSize` (slice the mapped list) so large libraries don't overflow.
6. Keep the play wiring for step 3 — here MediaItems only need stable, decodable mediaIds (playable
   flag correct); actual `setMediaItem`/play is 12.15.
7. Update `README.md` browse-tree section, mark **12.12**, **12.14** + Appendix C **391**, **393** +
   detail headers **done**, check the box in `COPY-PASTA.md`.

## Do not

- Do not read SQLite/Drizzle from native (JS-dead contract).
- Do not fetch network metadata to build the tree (use cached fields only).
- Do not duplicate queue policy in native — tree is a projection of cached state.
- Do not wire actual playback (step 3) or iOS.
- Do not run tests during agent work.

## Skills / rules

- **mobile-carplay-android-auto**, **mobile-data-layer**, **mobile-playback**

## Operator verify (after implement)

```bash
rg -n 'onGetChildren|Downloads|Library' apps/mobile/modules/podverse-media-engine/android
npm run mobile:prebuild
# DHU browse proof is step 4.
```
