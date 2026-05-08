# Phase 02 — Foundation in `@podverse/ui`

## Goal

Add the low-level building blocks the higher wrappers need. No app-side migration yet.

## Deliverables

1. **`Table.SortableHeaderCell`** in
   [`packages/ui/src/components/table/Table/Table.tsx`](../../../../packages/ui/src/components/table/Table/Table.tsx)
   (or sibling `TableSortableHeaderCell.tsx` and re-export through `Table.SortableHeaderCell`).
   - Renders `<th>` with a `<button>` inside.
   - Props per [`01-design-target-api.md`](./01-design-target-api.md).
   - Updates `aria-sort` based on active state.
   - Uses Font Awesome icons (`fa-sort`, `fa-sort-up`, `fa-sort-down`).
   - Unit tests under `Table.test.tsx`: click toggles asc/desc; correct icon and `aria-sort`.

2. **Cookie helpers** under `packages/ui/src/lib/cookies/`:
   - `sortPrefsCookie.ts` — typed read/merge of `{ [listKey]: { sortBy, sortOrder } }`.
   - `tableListStateCookie.ts` — typed read/merge of `{ [listKey]: { search, columns, page,
     limit, filters } }`.
   - Both export `read`, `merge`, `serialize`, and constant `*_COOKIE_NAME` defaults.
   - Pure functions; no DOM access (cookie I/O lives at call site or `js-cookie`).

3. **Hooks** under `packages/ui/src/hooks/`:
   - `useTableFilterState.ts` — accepts URL params + columns; returns `{ search, setSearch,
     selectedColumns, setSelectedColumns }`; debounces search; sync mode `'url' | 'cookie'`.
   - `useDeleteModal.ts` — `{ openFor(row), close, isOpen, isPending, error, confirm }` plus an optional **render helper** that composes [`Modal`](../../../../packages/ui/src/components/layout/Modal/Modal.tsx) + [`ConfirmPanelActions`](../../../../packages/ui/src/components/layout/ConfirmPanel/ConfirmPanel.tsx) + `Button` like [`UsersListPageClient.tsx`](../../../../apps/management-web/src/app/(management)/users/UsersListPageClient.tsx) (lines 193–221). No separate `ConfirmDeleteModal` component.
   - `useAsyncPageLoading.ts` — owns `NavigationLoadingOverlay` open/close; exposes `runAsyncLoad(fn)`.
   - `useCookieModeListRefresh.ts` — strips query string, runs `runAsyncLoad`, then either calls
     a parent `onListMetadataChange()` or `router.refresh()` fallback.

4. **`NavigationLoadingOverlay`** — **promote** the full-page overlay pattern from
   [`apps/web/src/components/LoadingSpinner/WebLoadingSpinnerOverlay.tsx`](../../../../apps/web/src/components/LoadingSpinner/WebLoadingSpinnerOverlay.tsx)
   into `packages/ui` (e.g. `packages/ui/src/components/feedback/NavigationLoadingOverlay/`), using
   the existing `LoadingSpinner` from `@podverse/ui`. Used by `useAsyncPageLoading`.

5. **`Pagination` extensions** in
   [`packages/ui/src/components/navigation/Pagination/Pagination.tsx`](../../../../packages/ui/src/components/navigation/Pagination/Pagination.tsx):
   - Optional `refreshOnPage(page: number, limit: number) => void` for cookie mode (skips full
     page navigation).
   - Optional "Go to page" button opens **`GoToPageModal`** (new, sibling component).
   - URL builder includes `limit` only when `limit !== defaultLimit`.
   - Existing `Pagination` API stays back-compat (additive only).

6. **`CursorPagination` (presentational only)** under
   [`packages/ui/src/components/navigation/CursorPagination/`](../../../../packages/ui/src/components/navigation/CursorPagination/) —
   **do not** add a new cursor hook. Wire labels and handlers to the return value of the existing
   [`useCursorPagination`](../../../../packages/ui/src/hooks/useCursorPagination.ts) (`pageNumber`,
   `hasPrev`, `hasNext`, `isLoading`, `goPrev`, `goNext`). Accessible `prevLabel` / `nextLabel` via
   props.

7. **Barrel exports** added to
   [`packages/ui/src/index.ts`](../../../../packages/ui/src/index.ts):
   - `TableSortableHeaderCell` type, `SortDirection`, `TableColumn`, cookie helpers, hooks,
     `NavigationLoadingOverlay`, `CursorPagination`, `GoToPageModal`.

## Tests

- Vitest unit tests for each hook (cookie merge, debounced search, overlay open/close).
- `Table.SortableHeaderCell` test for icon + `aria-sort` + click toggle.
- No e2e in this phase.

## Verification

- `npm run lint` clean.
- `npm run build:packages` clean.
- `npm run test:unit` clean (new tests pass).
- No call sites changed in `apps/management-web` yet.

## Out of scope

- Higher-level wrappers (`TableWithSort`, etc.) — phase 03.
- Page migrations — phase 04+.

## Verification command (suggested)

```bash
./scripts/nix/with-env npm run lint && ./scripts/nix/with-env npm run build:packages && ./scripts/nix/with-env npm run test:unit -w @podverse/ui
```
