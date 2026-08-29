# 02 — PlaylistDetail + PodcastDetail episodes → FlatList

**Cursor model:** Codex 5.3
**Ship bar:** The playlist item list (non-reorder) and the podcast episode list render via
`FlatList` with headers in `ListHeaderComponent`; PodcastDetail stays split-aware; testIDs preserved;
`library-playlists`, `podcast-episode`, and `tablet` E2E stay green.

## Why

Both lists are user-data-driven and currently `ScrollView` + `.map()`. PodcastDetail additionally
**accumulates** pages via a manual "Show more" button, so the mounted row count only grows.

## Context (read first)

- `apps/mobile/src/screens/library/PlaylistDetailScreen.tsx` — wrapped in `MobileScreenContainer`
  (ScrollView); header `SectionCard`(s) + a body `SectionCard`; non-reorder items via `.map()`;
  reorder mode (`reorderableResources.map`, move up/down) is separate.
- `apps/mobile/src/screens/podcast/PodcastDetailScreen.tsx` — `headerPane` + `listPane`; episodes
  `episodeRows.map()` with `podcast-episode-row-<i>` testIDs; live rows section; `hasMorePages`
  "Show more" (`podcast-detail-load-more`); split layout gate `showSplitLayout` renders two
  `ScrollView` panes (`podcast-detail-split`, `podcast-detail-screen`).
- Reference: `HomeScreen.tsx` (`FlatList` + `ListHeaderComponent`).

## Tasks

### PlaylistDetailScreen (non-reorder path only)

1. Replace the item body `SectionCard` list with a `FlatList` whose `ListHeaderComponent` is the
   header `SectionCard`(s) (title, actions, share/edit/reorder toggle). The `FlatList` owns scroll —
   stop wrapping the body in `MobileScreenContainer`'s `ScrollView`.
2. `data` = the mapped home rows (`playlistResourceToHomeRow`); preserve row `testID`s and press
   handlers.
3. **Leave reorder mode as-is** (`reorderableResources.map` + move up/down) — it is a bounded,
   functional-sketch interaction (Track 23 hard stop). Only the read/browse path is virtualized.

### PodcastDetailScreen episodes

4. Convert `listPane`'s episode list to a `FlatList` with `episodeRows` as `data`
   (`podcast-episode-row-<i>` preserved), the header (`headerPane`), live rows, and section heading as
   `ListHeaderComponent`, and the "Show more" (`podcast-detail-load-more`) + notices as
   `ListFooterComponent`. Keep the manual "Show more" (do not add infinite scroll in this pass).
5. **Split-aware:** in `showSplitLayout`, the **right** pane becomes the `FlatList` (episodes); the
   **left** pane stays a `ScrollView` (`headerPane`). In the non-split layout, one `FlatList` with the
   header in `ListHeaderComponent`. Keep `podcast-detail-split` and `podcast-detail-screen` testIDs on
   the same nodes as today (split container / scrollable detail).
6. Keep the `RefreshControl` (pass it to the `FlatList` `refreshControl`).

## Guards / gotchas

- Never nest the new `FlatList` inside a `ScrollView` (the split's right pane must be the list itself,
  not a list inside a pane ScrollView).
- Preserve all testIDs — `podcast-episode.yaml` and `tablet.yaml` assert them
  (`podcast-episode-row-0`, `podcast-detail-split`, `podcast-detail-screen`).
- Do not change pagination semantics, live-rows rendering, or the subscribe/share actions.

## Acceptance

- PlaylistDetail (browse) and PodcastDetail episodes render via `FlatList`; no `ScrollView` + `.map()`
  for those rows.
- Split podcast detail still shows header (left) + episode list (right); both scroll independently.
- `npm run mobile:e2e:test -- library-playlists`, `-- podcast-episode`, and `-- tablet` green.
