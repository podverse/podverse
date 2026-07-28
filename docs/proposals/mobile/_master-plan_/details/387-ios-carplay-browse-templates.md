# 387-ios-carplay-browse-templates

**Master step:** 12.8
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Implement CarPlay browse UI with **`CPListTemplate`** (and a root tab or list structure) that
  mirrors the **shipped Android Auto v1** tree: **Library** + **Downloads** from the native cache.
- No SQLite; JS may be dead. Tolerant parsing of the same JSON envelopes as Android
  (`PodverseNativeCacheModel` / Swift equivalent).

## Ship bar (this slice)

Match Android Auto scaffold — **not** the later Podcasts/Music/Queue/History UX-parity redesign
([car-ux-parity](/docs/proposals/mobile/car-ux-parity/000-OVERVIEW.md)).

| Root node   | Source cache              | Behavior                                      |
| ----------- | ------------------------- | --------------------------------------------- |
| Library     | `library-browse-index`    | Browsable nodes (add-by-RSS follows today)    |
| Downloads   | `downloads-index`         | Playable offline items                        |

Omit a root node when its payload is empty (same as Android).

## Architecture notes

- Swift parser for envelope + `nodes` / `entries` arrays; ignore unknown keys; never crash.
- Item select on Downloads → play path (12.9 / 12.15 parity) via shared engine.
- Library grandchildren (episodes under a podcast) empty until richer cache (12.22) — same as AA.
- Native strings for “Library” / “Downloads” OK when JS dead (same i18n note as Android detail 391).

## Implemented (this slice)

- `ios/PodverseCarPlayCacheModel.swift`: tolerant Swift mirror of `PodverseNativeCacheModel.kt`
  (`parseBrowseNodes` / `parseDownloadEntries`, schemaVersion==1 gate, `JSONSerialization`, skips
  malformed entries, never throws).
- `ios/PodverseCarPlaySceneDelegate.swift`: root `CPListTemplate` with Library and/or Downloads
  (empty sources omitted). Library rows push browse nodes; a browse node pushes an empty grandchild
  list (parity with Android returning `emptyList()` deeper). Download rows carry a select hook that
  logs the `idText` and calls `completion()` — step 3 (12.9/12.15) fills in resolve + play.
- Reads `PodverseNativeCache.read(.libraryBrowse)` / `.downloads` from the shared App Group; no
  SQLite, no network. Artwork thumbnails deferred (CarPlay needs a `UIImage`, not a URL) — content
  parity with the AA scaffold, artwork is later polish.

## Acceptance criteria

- CarPlay shows Library and/or Downloads from cache with app force-quit.
- Corrupt/missing cache → empty lists, no crash.
- Select download item invokes play wiring (or stub hook consumed by 12.9/12.15).

## Verification

```bash
rg -n 'CPListTemplate|LIBRARY|DOWNLOADS|library-browse|downloads' apps/mobile/modules/podverse-media-engine/ios
# Operator: CARPLAY-SIMULATOR-CHECKLIST.md browse section after full slice
```

## Depends on

- 12.7 scene config
- 12.1–12.6 cache
- Android parity reference: details 391, 393
