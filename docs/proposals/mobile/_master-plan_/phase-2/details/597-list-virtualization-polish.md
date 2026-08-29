# 597-list-virtualization-polish

**Master step:** 23.3
**Model (author + implement):** Codex 5.3
**Status:** draft

## Scope

Two distinct parts — do not conflate them:

### (a) Baseline audit + remediation — **required, not jank-gated**

The Ship-bar baseline (master plan, "Long / unbounded lists via `FlatList` / `SectionList`") means a
list whose length is driven by **user data** (subscriptions, playlist items, a channel's episodes)
must be virtualized, **not** rendered with `ScrollView` + `.map()`. Several screens shipped before
this was enforced and need remediation. This part is a correctness/perf baseline and can run
**independently of** the operator visual-polish pass (23.1/23.2).

Concrete near-term remediation is tracked as a completed plan set:
`.llm/plans/completed/phase-1/mobile-list-virtualization/`.

### (b) FlashList adoption / windowing tuning — **optional, jank-gated**

FlashList swap, `windowSize` / `maxToRenderPerBatch` / `getItemLayout` tuning, cell recycling — only
if the operator flags jank on a specific large feed. Not required for MVP.

## Screen inventory (audit as of 2026-08)

| Screen                          | Current                                                                                | Data bound             | Action                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------ |
| `HomeScreen`                    | `FlatList` (+ `numColumns`)                                                            | feed page              | ✅ compliant                                                 |
| `LibraryDownloadsScreen`        | `FlatList`                                                                             | downloads              | ✅ compliant                                                 |
| `LibrarySubscriptionsScreen`    | `FlatList` (grid-aware)                                                                | **all** subs, no limit | ✅ compliant                                                 |
| `PlaylistDetailScreen`          | `FlatList` for browse path (reorder path intentionally mapped)                         | all playlist items     | ✅ compliant for baseline scope                              |
| `PodcastDetailScreen` episodes  | `FlatList` + `ListHeaderComponent`/`ListFooterComponent` (split-aware right pane list) | accumulates pages      | ✅ compliant                                                 |
| `SearchScreen`                  | `ScrollView` + `.map()`                                                                | ~1 API page (~60)      | ✅ acceptable (bounded); revisit only if paginated later     |
| `FullPlayerUpNext`              | `.map()` in player sheet                                                               | queue window           | ✅ acceptable (small, bounded)                               |
| `LibraryPlaylistsScreen`        | `.map()`                                                                               | user's playlists       | ✅ acceptable (small)                                        |
| Album / Artist / Episode detail | `.map()`                                                                               | per-entity lists       | ⚠️ low priority; convert if a large-entity jank case appears |

## Implementation notes (baseline conversions)

- **Do not nest a `FlatList` inside a `ScrollView`** (RN warns + breaks virtualization). The list
  must own scroll: move the heading / filter / header cards into `ListHeaderComponent` (the pattern
  `HomeScreen` already uses). This means the converted screens stop using `MobileScreenContainer`'s
  `ScrollView` for the list body.
- **PodcastDetail split:** the right (list) pane becomes the `FlatList`; the left (header) pane stays
  a `ScrollView`. Keep the existing `podcast-detail-split` / `podcast-detail-screen` testIDs.
- Guard `columnWrapperStyle` on `numColumns > 1` (RN throws otherwise) and set a `key` that changes
  with column count on grid screens.
- Reorder / drag-and-drop UIs stay a functional sketch (Track 23 hard stop) — the reorder path in
  `PlaylistDetailScreen` can remain non-virtualized.

## Acceptance criteria

- **(a)** No user-data-driven list renders via `ScrollView` + `.map()`; the inventory above is all
  ✅ or an explicitly documented WONTFIX with reason.
- **(b)** Only lists called out in operator notes get FlashList/tuning; no unrelated UI redesign.
- New list screens follow the baseline (enforced by the abcmemory rule added in the plan set).

## Web parity references

- N/A (platform performance / RN list primitives).

## Verification

Manual scroll on the largest feeds (Subscriptions, a long playlist, a high-episode podcast) after
change; existing E2E flows (`library-subscriptions`, `library-playlists`, `podcast-episode`) stay
green.
