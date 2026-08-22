# 01 — LibrarySubscriptionsScreen → FlatList (unbounded list)

**Cursor model:** Codex 5.3
**Ship bar:** Subscriptions renders via `FlatList` (grid-aware), not `ScrollView` + `.map()`;
existing filter + testIDs + empty/auth/error states preserved; `library-subscriptions` E2E green.

## Why

`subscriptionsRepository.list()` returns **all** subscriptions with no pagination, and they are
currently mapped inside `MobileScreenContainer` (a `ScrollView`). A power user with hundreds/thousands
of follows mounts every row at once. This is the highest-risk baseline gap (detail 597 inventory).

## Context (read first)

- `apps/mobile/src/screens/library/LibrarySubscriptionsScreen.tsx` — current `ScrollView` + `.map()`
  (grid cells already computed from `useResponsive().columns`); testID
  `library-subscription-row-<idText>`; filter control; `AuthAwareLoadState` for loading/empty/error.
- `apps/mobile/src/components/screen/MobileScreenContainer.tsx` — the `ScrollView` wrapper to stop
  using for the list body.
- `apps/mobile/src/screens/home/HomeScreen.tsx` — reference `FlatList` + `ListHeaderComponent` +
  `numColumns` + `columnWrapperStyle`/`key` guards.
- `apps/mobile/e2e/library-subscriptions.yaml` — flow that must stay green.

## Tasks

1. **Convert the list body to `FlatList`:**
   - `data` = subscriptions; `keyExtractor` = `${source}-${idText}` (match current key).
   - `renderItem` = the existing `Card` + `ListRow` cell, keeping
     `testID={`library-subscription-row-${idText}`}` and the add-by-RSS subtitle.
   - `numColumns={columns}`, `columnWrapperStyle={columns > 1 ? gridRow : undefined}`,
     `key={`subs-cols-${columns}`}` (FlatList requires remount when `numColumns` changes).
   - Preserve the single-column vs grid cell widths (reuse the existing `gridCell` flexBasis logic).
2. **Move the heading + filter into `ListHeaderComponent`** so the `FlatList` owns scroll (stop
   wrapping the list in `MobileScreenContainer`'s `ScrollView`). Keep the `library-subscriptions-screen`
   testID on the screen root (a `View`) and the filter's `library-subscriptions-filter` testID.
3. **Keep `AuthAwareLoadState` semantics:** loading / auth-required / empty / error render in place of
   the list (e.g. `ListEmptyComponent` or a conditional before the `FlatList`), preserving
   `library-subscriptions-loading` / `-auth-required` / `-empty` / `-error` testIDs and the retry.
4. Do not change `subscriptionsRepository` or the filter behavior.

## Guards / gotchas

- Do **not** nest the `FlatList` inside `MobileScreenContainer` (RN "VirtualizedLists should never be
  nested" + lost virtualization). Replace the container for this screen.
- Keep `columnWrapperStyle` guarded on `columns > 1` (RN throws with `numColumns === 1`).
- Preserve every existing testID exactly — `library-subscriptions.yaml` asserts them.

## Acceptance

- `LibrarySubscriptionsScreen` uses `FlatList`; no `ScrollView` + `.map()` for the rows.
- Phone (1 col) and tablet (2–3 col) both render; filter + states behave as before.
- `npm run mobile:e2e:test -- library-subscriptions` green on both phone slots.
