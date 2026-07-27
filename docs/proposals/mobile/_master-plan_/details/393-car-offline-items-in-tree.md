# 393-car-offline-items-in-tree

**Master step:** 12.14
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Surface offline/downloaded episodes in the Android Auto browse tree from the `downloads` native
  cache index, so they are playable in the car with the phone app force-stopped and no network.
- Builds on the browse tree from [391-android-auto-browse-tree](/docs/proposals/mobile/_master-plan_/details/391-android-auto-browse-tree.md);
  this detail is the **Downloads** node + its playable children.

## Architecture notes

- **Source:** `downloads-index.json` written by `downloadsRepository` (Track 13.9 / detail 438) via
  `projectDownloadsIndexToNativeCache`. Each `NativeCacheDownloadEntry` carries `idText`, `title`,
  `filePath` (absolute sandbox path readable by the service process), optional `artworkUrl` /
  `mediaUrl`.
- **Mapping:** `PodverseNativeCacheModel.parseDownloadEntries` decodes the envelope + `entries`
  array; entries missing `idText`, `title`, or `filePath` are skipped (a download with no local
  path is not playable offline). `downloadChildren()` maps each to a **playable** `MediaItem`
  (`isPlayable=true`, `isBrowsable=false`) with mediaId `download/<idText>`.
- **Node presence:** the `Downloads` root node is omitted when the downloads cache is empty.
- **Play resolution is out of scope here** (12.15 / detail 394): the mediaId is stable and decodable
  so step 3 can resolve `download/<idText>` → the entry's local `filePath` (preferred) or remote
  `mediaUrl` fallback. No `setMediaItem` / URL wiring in this step.
- **No network:** artwork/title come from cached fields only; the tree builds fully offline.

## Files

- `apps/mobile/modules/podverse-media-engine/android/.../PodverseNativeCacheModel.kt` (`parseDownloadEntries`)
- `apps/mobile/modules/podverse-media-engine/android/.../PodverseMediaLibraryService.kt` (`downloadChildren`)

## Edge cases

- Empty downloads cache → no `Downloads` node.
- Entry with blank `filePath` → skipped (not offline-playable).
- Large downloads list → paged with the shared `pageSlice` (detail 391).
- Corrupt JSON / schema mismatch → empty list, no crash.

## Acceptance criteria

- Completed downloads appear under `Downloads` as playable items with `download/<idText>` ids.
- Titles + artwork come from cache; no network fetch.
- Missing/corrupt cache → node absent, no crash.
- mediaId is decodable by step 3 for local-file play.

## Web parity references

- [438-cache-downloads-index](/docs/proposals/mobile/_master-plan_/details/438-cache-downloads-index.md)
- [DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md)

## Verification

```bash
rg -n 'parseDownloadEntries|downloadChildren|download/|filePath' \
  apps/mobile/modules/podverse-media-engine/android
```

## Depends on

- 12.12 browse tree (detail 391) — this phase
- 13.9 downloads native-cache projection (done)
