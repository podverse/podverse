# Phase 03 — Higher-level wrappers in `@podverse/ui`

## Goal

Add the wrappers list pages will compose: `TableFilterBar`, `TableWithSort`, `TableWithFilter`,
`ResourceTableWithFilter` (with cursor / bulk-select / grouped variants), and
`FilterTablePageLayout`. No app migrations yet.

## Deliverables

1. **`TableFilterBar`** under `packages/ui/src/components/table/TableFilterBar/`:
   - Search `TextInput` (debounced via `useTableFilterState`).
   - Funnel popover with "search in column" checkboxes from `columns`.
   - Props per [`01-design-target-api.md`](./01-design-target-api.md).
   - Uses existing `PopoverIcon` for the funnel.

2. **`TableWithSort`** under `packages/ui/src/components/table/TableWithSort/`:
   - Renders `<thead>` from a typed `columns` config; sortable columns use
     `Table.SortableHeaderCell` (phase 02) and non-sortable use `Table.HeaderCell`.
   - Owns sort change → optional cookie write via `sortPrefsCookie` when
     `sortPrefsCookieName` is provided; otherwise hands off to `onSortChange`.
   - Body is `children` (caller renders `<tbody>`).

3. **`TableWithFilter`** under `packages/ui/src/components/table/TableWithFilter/`:
   - Composes `TableFilterBar` + `TableWithSort` + optional pagination.
   - Generic `<TRow>`; consumer provides `rows` and `renderRow(row, index)`.
   - Optional `trailingToolbar` slot (right-aligned in the filter row) for app-specific extras
     like a lifecycle dropdown.
   - `emptyMessage` rendered above the table when `rows.length === 0`.
   - `paginationMode: 'page' | 'none'` — `'none'` hides page controls (Workers).
   - State sync mode `'url' | 'cookie'`; cookie mode wires `useCookieModeListRefresh` for
     `onListMetadataChange`.

4. **`ResourceTableWithFilter`** under
   `packages/ui/src/components/table/ResourceTableWithFilter/`:
   - Wraps `TableWithFilter` and adds an actions cell when `actions` is provided.
   - Actions cell is fixed: `Table.RowActions` containing a subset of `Table.IconViewLink`,
     `Table.IconEditLink`, `Table.IconDeleteButton`, `Table.IconActionLink` based on `actions`
     props and per-row `getRowActions(row)` policy.
   - Delete flow: `useDeleteModal` + **`Modal` + `ConfirmPanelActions` + `Button`** (see
     [`01-design-target-api.md`](./01-design-target-api.md) Locked contracts §7). No standalone
     `ConfirmDeleteModal` export.
   - Optional `paginationMode: 'page' | 'cursor' | 'none'`. Cursor mode renders presentational
     `CursorPagination` fed from [`useCursorPagination`](../../../../packages/ui/src/hooks/useCursorPagination.ts).
   - Optional `bulkSelect: { selectedKeys, onSelectChange, actions, ariaLabels }` adds
     `SelectHeaderCell` + `SelectCell` columns and a sticky `BulkActionBar` when selection is
     non-empty.
   - Optional `groupedSections`: when present, render one `Disclosure` per section, each with its
     own `TableWithFilter` body, sharing one global `TableFilterBar` above all sections.

5. **`BulkActionBar`** (sticky bottom toolbar) — used only when bulk-select is enabled. Props:
   `selectedCount`, `actions: { label, variant, onClick }[]`, `clearLabel`, `onClear`.

6. **`FilterTablePageLayout`** under `packages/ui/src/components/layout/FilterTablePageLayout/`:
   - Props: `title`, `subtitle?`, `breadcrumbs?`, `headerActions?`, `error?`, `errorVariant?`,
     `children`.
   - Does **not** hard-depend on `ManagementPageShell`; mgmt-web composes shell + layout at the
     call site (same pattern as today).
   - `error` rendered above `children` with `role="alert"` when set.

7. **Barrel exports** in
   [`packages/ui/src/index.ts`](../../../../packages/ui/src/index.ts) for all new symbols.

8. **Editor guardrails (same PR as wrappers land):**
   - **Rule:** [`.cursor/rules/management-web-tables.mdc`](../../../../.cursor/rules/management-web-tables.mdc)
     — always-applied glob on `apps/management-web/src/app/(management)/**/*PageClient.tsx` (or
     `**/*Client.tsx` under `(management)`) requiring new list pages to use the shared wrappers;
     links to the four table skills (three added in phase 07 + `crud-tables-resources` from this
     phase).
   - **Skill:** [`.cursor/skills/crud-tables-resources/SKILL.md`](../../../../.cursor/skills/crud-tables-resources/SKILL.md)
     — when to use `ResourceTableWithFilter`, action order, `getRowActions`, permission gating
     (mirror metaboost `crud-tables-resources`).

9. **Documentation:** Append a **Table family** section to [`packages/ui/PACKAGES-UI.md`](../../../../packages/ui/PACKAGES-UI.md):
   primitive `Table`, `Table.SortableHeaderCell`, `TableFilterBar`, `TableWithSort`,
   `TableWithFilter`, `ResourceTableWithFilter`, variants (cursor / bulk / grouped / `none`),
   `FilterTablePageLayout`, hooks from phase 02. Present tense only; no migration narrative.

## Tests

- `TableWithSort.test.tsx`: render columns, click sortable header → onSortChange called with
  correct (key, order); cookie write fires when `sortPrefsCookieName` provided.
- `TableWithFilter.test.tsx`: filter input updates `search` after debounce; pagination next
  fires URL update; `emptyMessage` rendered when no rows; `paginationMode: 'none'` hides page UI.
- `ResourceTableWithFilter.test.tsx`: action cell renders right icons per `actions` and
  `getRowActions`; delete flow opens `Modal`, confirms, closes; cursor mode renders
  `CursorPagination`; `bulkSelect` adds select column + bar.
- `FilterTablePageLayout.test.tsx`: `error` renders with role="alert".

## Verification

- `npm run lint`, `npm run build:packages`, `npm run test:unit` all clean.
- Optional: render a tiny throwaway story / fixture page to eyeball appearance — do **not**
  commit it; this phase is library-only.

## Verification command (suggested)

```bash
./scripts/nix/with-env npm run lint && ./scripts/nix/with-env npm run build:packages && ./scripts/nix/with-env npm run test:unit -w @podverse/ui
```

## Out of scope

- App migrations (phase 04+).
- Permissions matrix wiring (phase 04 keeps it raw).
- Backend changes.
