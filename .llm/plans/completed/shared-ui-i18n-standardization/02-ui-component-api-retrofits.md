# 02 — @podverse/ui component API changes

## `Pagination`

**File:** [`packages/ui/src/components/navigation/Pagination/Pagination.tsx`](../../../packages/ui/src/components/navigation/Pagination/Pagination.tsx)

- Add required props: `prevLabel`, `nextLabel`, `pageIndicatorLabel` (full localized line, e.g.
  `t('paginationPageOf', { currentPage, totalPages })`).
- Remove hardcoded `« Prev` / `Next »` / `Page … of …`.
- Keep numeric page buttons and ellipsis as-is (numbers + `...` are locale-neutral).

## `StatsBarChart`

**File:** [`packages/ui/src/components/stats/StatsBarChart/StatsBarChart.tsx`](../../../packages/ui/src/components/stats/StatsBarChart/StatsBarChart.tsx)

- Require `valueLabel`, `emptyMessage`, `loadingLabel` (no English defaults).
- Remove `as never` from tooltip formatter; type-safe formatter body.

## `Breadcrumbs`

**File:** [`packages/ui/src/components/navigation/Breadcrumbs/Breadcrumbs.tsx`](../../../packages/ui/src/components/navigation/Breadcrumbs/Breadcrumbs.tsx)

- Make `navAriaLabel` required (remove default `'Breadcrumb'`).

## Tests

- Add [`packages/ui/src/components/navigation/Pagination/Pagination.test.tsx`](../../../packages/ui/src/components/navigation/Pagination/Pagination.test.tsx)
  smoke test with required labels.
