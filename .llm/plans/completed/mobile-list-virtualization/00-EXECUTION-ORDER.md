# Execution order — mobile-list-virtualization

Run COPY-PASTA prompts **1 → 2 → 3** in order. 01 and 02 are independent screens but share the same
`FlatList` + `ListHeaderComponent` pattern; do 01 first as the reference conversion.

## Steps

1. **01** — `LibrarySubscriptionsScreen` → `FlatList` (highest priority; unbounded list).
2. **02** — `PlaylistDetailScreen` (non-reorder) + `PodcastDetailScreen` episodes → `FlatList`
   (`ListHeaderComponent`; PodcastDetail split-aware).
3. **03** — Add the abcmemory rule enforcing the list baseline for new screens; verify detail 597's
   inventory; archive the set.

## Parallelism

01 and 02 touch different screens (safe to parallelize) but 02 is the harder split-aware case — keep
sequential so 01 sets the pattern. 03 is docs/abcmemory only.

## After each prompt

- Mark `[x]` in `COPY-PASTA.md` and move the finished numbered file to
  `.llm/plans/completed/mobile-list-virtualization/`.
- Do **not** run tests during agent work; the operator verifies at the end.
- **No master-plan status change is required** — 23.3 stays `_TBD_` until part (b) tuning is also
  considered; this set completes part (a). When the set is archived, update the 23.3 line's
  parenthetical to point at `.llm/plans/completed/mobile-list-virtualization/`.

## Definition of done for the set

- Subscriptions, PlaylistDetail (non-reorder), and PodcastDetail episodes render via `FlatList`;
  no user-data list uses `ScrollView` + `.map()` except the documented-acceptable ones in 597.
- Existing E2E (`library-subscriptions`, `library-playlists`, `podcast-episode`, `tablet`) stays
  green (testIDs preserved).
- abcmemory rule exists so new list screens follow the baseline.
