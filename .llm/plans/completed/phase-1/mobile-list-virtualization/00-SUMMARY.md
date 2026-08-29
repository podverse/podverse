# Mobile list virtualization — baseline remediation (2026-08-05)

## Goal

Bring every **user-data-driven** list on mobile up to the master plan's Ship-bar baseline: long /
unbounded lists render via `FlatList` / `SectionList`, **not** `ScrollView` + `.map()`. This is the
**required (a)** half of master step **23.3** / detail
[597](/docs/proposals/mobile/_master-plan_/phase-2/details/597-list-virtualization-polish.md) — it is a
correctness/perf baseline, **not** the optional, jank-gated FlashList tuning (part b), and it does
**not** wait for Track 23 operator visual polish.

## Why now

`ScrollView` + `.map()` mounts every row at once. For unbounded lists this means high memory, slow
first paint, and scroll jank as data grows. The clearest risk is **Subscriptions** (a power user can
follow hundreds/thousands of feeds, all mounted today).

## Already compliant (no work)

- `HomeScreen` — `FlatList` + `numColumns` (tablet grid).
- `LibraryDownloadsScreen` — `FlatList`.

## Scope (convert to FlatList)

1. **`LibrarySubscriptionsScreen`** — all subscriptions, no pagination → `FlatList` (highest
   priority). Grid-aware (`columns` from `useResponsive`), header/filter via `ListHeaderComponent`.
2. **`PlaylistDetailScreen`** (non-reorder path) + **`PodcastDetailScreen`** episodes → `FlatList`
   with header cards in `ListHeaderComponent`; PodcastDetail is split-aware (right pane = list).

## Explicitly out of scope

- `SearchScreen` (~1 API page, bounded), `FullPlayerUpNext` (small queue window),
  `LibraryPlaylistsScreen` (small), Album/Artist/Episode detail (low priority) — documented as
  acceptable in detail 597's inventory; revisit only if a real jank case appears.
- FlashList adoption / windowing *tuning* (part b of 23.3) — jank-gated, not this set.
- Reorder / drag-and-drop UIs — functional-sketch, Track 23 hard stop; the reorder path in
  `PlaylistDetailScreen` stays non-virtualized.

## Key constraints (must respect)

- **Never nest a `FlatList` inside a `ScrollView`** — the list must own scroll. Converted screens
  move heading/filter/header cards into `ListHeaderComponent` and stop wrapping the list body in
  `MobileScreenContainer`'s `ScrollView`. Mirror `HomeScreen`.
- Preserve existing `testID`s (`library-subscription-row-<idText>`, `podcast-episode-row-<i>`,
  `podcast-detail-split` / `podcast-detail-screen`, playlist row ids) so E2E stays green.
- Guard `columnWrapperStyle` on `numColumns > 1`; set a `key` that changes with column count.
- Agents do **not** run tests; the operator verifies with `COPY-PASTA.md`.

## Future-proofing

Step 03 adds an **abcmemory rule** so new list screens follow the baseline (prevents regressions),
and confirms detail 597's inventory is accurate. This is how the master plan "accounts for" the
optimization going forward, not just once.

## Reference

- Master plan Ship-bar row (line ~53) + step 23.3; detail
  `docs/proposals/mobile/_master-plan_/phase-2/details/597-list-virtualization-polish.md`.
- Pattern to copy: `apps/mobile/src/screens/home/HomeScreen.tsx` (`FlatList` + `ListHeaderComponent`
  + `numColumns` guards).
- Shared container (the `ScrollView` to stop wrapping list bodies in):
  `apps/mobile/src/components/screen/MobileScreenContainer.tsx`.
