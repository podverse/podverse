# 391-android-auto-browse-tree

**Master step:** 12.12
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Populate `PodverseMediaLibraryService.onGetChildren` by reading the durable native cache and
  mapping payloads → Media3 `MediaItem`s. No SQLite; works with the JS runtime dead.
- v1 tree: a **Library** node (from the `library-browse` index) and a **Downloads** node (offline
  items — see [393-car-offline-items-in-tree](/docs/proposals/mobile/_master-plan_/details/393-car-offline-items-in-tree.md)).
- Add a tolerant Kotlin parser (`PodverseNativeCacheModel.kt`) so the service callback stays thin.

## Architecture notes

- **Reader:** `PodverseNativeCache.read(context, LIBRARY_BROWSE | DOWNLOADS)` returns the opaque JSON
  string (12.3). `PodverseNativeCacheModel` decodes the envelope + arrays via `org.json`.
- **Payload shapes** (TS source of truth `apps/mobile/src/data/nativeCache/projection.ts`, schema
  12.1 / detail 380):
  - `NativeCacheBrowseNode` = `{ idText, title, kind: 'podcast'|'playlist'|'category', artworkUrl?, childCount? }`
  - `NativeCacheDownloadEntry` = `{ idText, title, filePath, artworkUrl?, mediaUrl?, bytes? }`
  - Each payload wrapped in `{ schemaVersion, updatedAtMs, ...payload }`.
- **Tolerant parsing:** unknown keys ignored; missing/mismatched `schemaVersion` → empty list;
  malformed entries skipped (never throw). Missing/corrupt cache → empty tree, no crash.
- **Tree shape (v1):**
  - Root → `Library` (browsable) + `Downloads` (browsable); a node is **omitted** when its source
    payload is empty.
  - `Library` → one browsable `MediaItem` per node; mediaId `library/<kind>/<idText>`.
  - `Downloads` → playable items (detail 393); mediaId `download/<idText>`.
  - Deeper hydration (episodes under a podcast, items under a playlist) needs a richer cached index
    than today's follows-derived browse index — future 12.12 follow-up (returns empty for now).
- **Metadata:** set title + `artworkUri` from cached `artworkUrl` only. Never fetch network to build
  the tree.
- **Paging:** honor Media3 `page`/`pageSize` by slicing the mapped list.
- **Play wiring is out of scope** (12.15 / detail 394): items only need stable, decodable mediaIds
  with the correct playable flag here.

## i18n note

Root node labels (`Library`, `Downloads`) are native car strings; there is no i18next runtime in the
service when JS is dead. Localizing them means projecting localized labels into the cache — future
work. Item titles come from cached content and are already user data.

## Files

- `apps/mobile/modules/podverse-media-engine/android/.../PodverseNativeCacheModel.kt` (new)
- `apps/mobile/modules/podverse-media-engine/android/.../PodverseMediaLibraryService.kt` (`onGetChildren` + builders)

## Acceptance criteria

- `onGetChildren(ROOT_ID)` returns Library and/or Downloads (empty payload omits the node).
- `onGetChildren(library)` maps cached nodes to browsable items with `library/<kind>/<idText>` ids.
- Absent/corrupt cache → empty list, no crash.
- Paging slices correctly for large libraries.
- No SQLite / network access in the browse path.

## Web parity references

- [DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md)
- [380-native-cache-schema](/docs/proposals/mobile/_master-plan_/details/380-native-cache-schema.md)

## Verification

```bash
rg -n 'onGetChildren|parseBrowseNodes|LIBRARY_ID|DOWNLOADS_ID|pageSlice' \
  apps/mobile/modules/podverse-media-engine/android
```

## Depends on

- 12.11 service config + allowed callers (detail 390)
- 12.3 durable Android cache storage (done); 12.4 JS write path (done)
