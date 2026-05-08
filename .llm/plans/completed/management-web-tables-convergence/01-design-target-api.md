# Phase 01 — Design and target API

## Goal

Lock the public surface for the new `@podverse/ui` table stack so phases 02 / 03 are mechanical
and phase 04+ migrations can be done file-by-file without re-litigating shape.

**Documentation-only.** No runtime changes; no migrations. Edit this file, [`01-i18n-keys.md`](./01-i18n-keys.md), and short prop sketches only.

## Locked contracts (non-negotiable for phases 02–04)

1. **Wrappers are passive.** They do not fetch. The consumer owns the API client / fetcher and passes `rows`, `loading`, `error`, pagination signals (`totalPages` + `currentPage` for page mode, or `hasPrev` / `hasNext` / `goPrev` / `goNext` from [`useCursorPagination`](../../../../packages/ui/src/hooks/useCursorPagination.ts) for cursor mode), `onRetry`, and render props. Matches [`UsersListPageClient.tsx`](../../../../apps/management-web/src/app/(management)/users/UsersListPageClient.tsx) (client-owned `loadUsers`).
2. **Canonical list response — page mode:** `{ items: TRow[], pagination: { page: number, totalPages: number } }`. If an endpoint differs (e.g. `{ users, pagination }`, `{ rows, columns }`), add a **thin adapter** in the page or `lib/requests` before passing props to the wrapper.
3. **Canonical list response — cursor mode:** `{ items: TRow[], nextContinuationToken?: string }`, aligned with [`CursorPageResult<T>`](../../../../packages/ui/src/hooks/useCursorPagination.ts). Example: storage returns `{ objects, nextContinuationToken }` — map `objects` → `items` at the adapter.
4. **`getRowActions(row)` return type:** `{ view?: 'enabled' | 'hidden', edit?: 'enabled' | 'disabled' | 'hidden', delete?: 'enabled' | 'disabled' | 'hidden' }`. Omit key → treat as `enabled` when that action is configured. Optional `disabledReasons?: { view?, edit?, delete? }` callbacks return tooltip copy when state is `disabled`.
5. **Bulk-select clearing:** Selection clears whenever **filter**, **sort**, or **page/cursor navigation** changes. Call sites cannot disable this behavior.
6. **Default sort policy:** String columns default **asc**; number / date / timestamp columns default **desc**; nulls sort **last** in the active direction.
7. **Delete confirmation:** No `ConfirmDeleteModal` symbol. Use existing [`Modal`](../../../../packages/ui/src/components/layout/Modal/Modal.tsx) + [`ConfirmPanelActions`](../../../../packages/ui/src/components/layout/ConfirmPanel/ConfirmPanel.tsx) + [`Button`](../../../../packages/ui/src/components/button/Button/Button.tsx) (cancel secondary, confirm primary), as in [`UsersListPageClient.tsx`](../../../../apps/management-web/src/app/(management)/users/UsersListPageClient.tsx) lines 193–221. `useDeleteModal` may expose a small **render helper** that mounts this composition.
8. **Backend pre-check:** Before implementing each migrated page, confirm the management-api list endpoint shape vs §2–3; document adapter location in the phase 04 page subsection.

## References

- Podverse Table primitive (already exists):
  [`packages/ui/src/components/table/Table/Table.tsx`](../../../../packages/ui/src/components/table/Table/Table.tsx).
- Podverse row icon actions (already exist):
  [`TableIconActions.tsx`](../../../../packages/ui/src/components/table/Table/TableIconActions.tsx).
- Metaboost reference stack:
  - `packages/ui/src/components/table/Table/Table.tsx` (has `SortableHeaderCell`).
  - `TableWithSort/`, `TableFilterBar/`, `TableWithFilter/`, `ResourceTableWithFilter/`.
  - `packages/ui/src/hooks/useTableFilterState.ts`, `useDeleteModal`, `useCookieModeListRefresh`,
    `useAsyncPageLoading`.
  - `FilterTablePageLayout/FilterTablePageLayout.tsx`.

## Deliverables

1. **`Table.SortableHeaderCell` props.** Click toggles asc / desc; default order configurable per
   column (string columns asc, numeric/date desc by default — see metaboost
   `table-sort-defaults` skill). `aria-sort` reflects state. Icons via Font Awesome (already used
   by `Table`).
2. **Action-cell rule.** Every row action is one of `Table.IconViewLink`, `Table.IconEditLink`,
   `Table.IconDeleteButton`, `Table.IconActionLink`. No `Button variant="link"` text actions in
   tables. Wrap actions in `Table.RowActions`.
3. **Cookie helpers.** `sortPrefsCookie` (`{ sortBy, sortOrder }` keyed by list id) and
   `tableListStateCookie` (`{ search, columns, page, limit, filters }` keyed by list id). Both
   typed and exported from `packages/ui/src/index.ts`.
4. **Hooks.**
   - `useTableFilterState({ params, columns, sortPrefsCookieName?, ... })` — debounced search +
     column funnel state, syncs to URL or `tableListState` cookie.
   - `useDeleteModal({ deleteFn, onSuccess })` — open/close + pending + error + optional **modal render helper** composing `Modal` + `ConfirmPanelActions` + `Button`.
   - `useAsyncPageLoading()` — owns `NavigationLoadingOverlay` open/close around an async block.
   - `useCookieModeListRefresh()` — strips query string and runs `runAsyncLoad` then a parent
     `onListMetadataChange` callback (or `router.refresh()` fallback).
5. **`Pagination` extensions.** Confirm podverse `Pagination` already supports prev/next/page
   numbers. Add `refreshOnPage` callback for cookie mode and `GoToPageModal` integration. Page
   size lives in URL `limit` only when `limit !== defaultLimit`.
6. **`TableFilterBar` props.** `search` (debounced) + `columns: TableFilterBarColumn[]` for the
   funnel "search in" multi-select.
7. **`TableWithSort` props.** `columns: { key, header, defaultSortOrder?, sortable? }[]`,
   `sortBy`, `sortOrder`, `onSortChange`. Renders `Table.Head` with the right cell type per
   column. Optional `sortPrefsCookieName` + `sortPrefsListKey` for cookie mode.
8. **`TableWithFilter` props.** Wraps `TableFilterBar` + `TableWithSort` + `Pagination`. `rows`
   typed via generic; consumer renders cells via `renderRow`. Optional `trailingToolbar` slot
   (replaces ad-hoc div+TextInput rows). `emptyMessage` shown above the table when empty (no
   `<tbody>` rows). State persistence: URL or cookie via `useTableFilterState`.
9. **`ResourceTableWithFilter` props.** Adds optional `actions` config: `{ viewHref, editHref,
   onDelete, labels, ... }` rendered in a final actions cell using `Table.IconViewLink` /
   `IconEditLink` / `IconDeleteButton`. Owns `useDeleteModal`; delete UI uses `Modal` +
   `ConfirmPanelActions` (see Locked contracts §7).
10. **Variants.**
    - `paginationMode: 'page' | 'cursor' | 'none'`. Cursor mode uses presentational
      `CursorPagination` driven by [`useCursorPagination`](../../../../packages/ui/src/hooks/useCursorPagination.ts)
      (`hasPrev`, `hasNext`, `goPrev`, `goNext`, `pageNumber`). `'none'` hides pagination (Workers).
    - `bulkSelect?: { selectedKeys, onSelectChange, actions }` — when present, header gets a
      `SelectHeaderCell` and rows get `SelectCell`; sticky `BulkActionBar` appears when
      `selectedKeys.length > 0`.
    - `groupedSections?: GroupedTableSection[]` — when present, renders one `Disclosure` per
      section, each with its own `TableWithFilter` body sharing the global filter bar.
11. **`FilterTablePageLayout` props.** `title`, `subtitle?`, `breadcrumbs?`, `headerActions?`,
    `error?`, `errorVariant?`, `children`. Layout only — mgmt-web composes with
    `ManagementPageShell` at the call site (same as [`03-higher-level-wrappers.md`](./03-higher-level-wrappers.md)).
12. **i18n contract.** No user-facing copy in `@podverse/ui`. All labels (`searchPlaceholder`,
    `filterColumnsLabel`, `sortAscLabel`, `sortDescLabel`, `noResults`, `confirmDeleteTitle`,
    `confirmDeleteMessage`, `pageOf`, `previous`, `next`, `goToPageLabel`, `bulkActionsLabel`,
    `selectRowAria`, `selectAllAria`, etc.) come in via props. Apps pass localized strings; this
    plan lists every required key.
13. **i18n key inventory.** Authoritative list: [`01-i18n-keys.md`](./01-i18n-keys.md).
14. **State precedence.** URL params win; when absent, fall back to `tableListState` cookie or
    `sortPrefs` cookie; defaults last.

## Verification

- This file lists every new `@podverse/ui` export and its props (or sketch). Shared i18n keys for
  mgmt-web: [`01-i18n-keys.md`](./01-i18n-keys.md).
- Cross-checked against `.cursor/rules/shared-ui-i18n.mdc` (no defaults in shared UI) and
  `.cursor/rules/avoid-type-assertions.mdc`.
- No code changes outside this directory; phase complete when sign-off on names + props.

## Out of scope

- Any implementation (phase 02 / 03).
- Changing `apps/management-web` page code (phase 04+).
- Backend list endpoint changes.

## Appendix — sketch (illustrative only)

```typescript
// packages/ui — illustrative; final names live in phase 02/03 implementations.

export type SortDirection = 'asc' | 'desc';

export type TableSortableHeaderCellProps = {
  ariaLabel: string;
  isActive: boolean;
  onSort: () => void;
  sortDirection?: SortDirection;
  children: ReactNode;
};

export type TableColumn<TKey extends string = string> = {
  key: TKey;
  header: string;
  sortable?: boolean;
  defaultSortOrder?: SortDirection;
  align?: 'left' | 'right' | 'center';
};

export type ResourceTableActions = {
  viewHref?: (row: unknown) => string;
  editHref?: (row: unknown) => string;
  onDelete?: (row: unknown) => Promise<void>;
  labels: { view: string; edit: string; delete: string };
};

export type ResourceTableWithFilterProps<TRow> = {
  /* …filter, sort, pagination, rows, renderRow, actions, paginationMode,
     bulkSelect, groupedSections, sortPrefsCookieName, sortPrefsListKey,
     tableListStateCookieName, tableListStateListKey, … */
};
```
