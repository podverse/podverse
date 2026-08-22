# 02 — Responsive breakpoints + Home/browse grid (18.2)

**Detail doc:** [511-tablet-home-grid](/docs/proposals/mobile/_master-plan_/details/511-tablet-home-grid.md)
**Model:** Codex 5.3
**Foundation:** delivers `useResponsive()` + `breakpoints` consumed by plans 03–04.

## Tasks

1. **Breakpoints token.** Add a `breakpoints` object to
   [`packages/design-tokens/src/tokens.ts`](/packages/design-tokens/src/tokens.ts)
   (`sm: 0`, `md: 600`, `lg: 900`) and export it via the package index. Tier A `.js` specifiers.
2. **`useResponsive` hook.** Add `apps/mobile/src/theme/useResponsive.ts` built on RN
   `useWindowDimensions`, returning `{ width, height, isTablet, isLandscape, columns }`:
   - `isTablet` = `width >= breakpoints.md`.
   - `columns` = `width >= breakpoints.lg ? 3 : width >= breakpoints.md ? 2 : 1` (tune later).
   - No hardcoded pixel literals in screens — all reads go through this hook / tokens.
3. **Home grid.** In [`HomeScreen.tsx`](/apps/mobile/src/screens/home/HomeScreen.tsx) drive the feed
   `FlatList` `numColumns` from `useResponsive().columns`. Provide a stable `key={`cols-${columns}`}`
   (FlatList requires remount when `numColumns` changes) and a `columnWrapperStyle` gap when
   `columns > 1`. Keep card component (`HomeFeedRow`) intact — only the grid wrapping changes.
4. **Browse grids.** Apply the same `columns` to card-based browse lists (e.g.
   `LibrarySubscriptionsScreen`) where a grid reads well; leave pure-text row lists single-column.
5. **Unit test.** Add a node-only vitest for the pure column-selection logic (extract a pure
   `resolveColumns(width, breakpoints)` so it stays out of the RN import graph) and register it in
   `apps/mobile/vitest.config.ts` `include`. Follow **unit-test-priority-confident** and
   **import-specifiers-tiered**.

## Acceptance

- Phone (< 600 dp) = 1 column, identical to today.
- Tablet (≥ 600 dp) = 2+ columns, no FlatList key warnings, no clipped cards.
- Column count sourced from `useResponsive`; no inline width math in screens.
- `resolveColumns` unit test passes (operator runs later).

## Do not

- Do not redesign Home / card visuals (Track 23).
- Do not run tests during agent work.
