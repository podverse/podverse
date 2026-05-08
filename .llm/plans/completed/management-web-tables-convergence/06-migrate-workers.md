# Phase 06 — Migrate Workers (grouped Disclosure tables)

## Goal

Migrate
[`WorkersPageClient.tsx`](../../../../apps/management-web/src/app/(management)/workers/WorkersPageClient.tsx)
to the **grouped variant** of `TableWithFilter` from phase 03. The page keeps its
`Disclosure`-per-category layout, but every table inside uses the same shared chrome.

## Pagination

**`paginationMode: 'none'`** — required variant from phase 03 (`TableWithFilter` /
`ResourceTableWithFilter`). Workers tables are non-paginated.

## Deliverables

1. **Grouped config:**
   - `groupedSections: [{ id, title, columns, rows, ariaLabel }]` — one entry per worker
     category.
   - One global `TableFilterBar` above all sections (search filters across categories with the
     existing per-category visibility).

2. **Per-section empty state:** Each `Disclosure` body may show **`emptyMessage`** independently when
   that section has zero visible rows after filtering (do not rely on a single global empty state if
   other sections still have rows).

3. **Cell content:**
   - Cells still render `CopyToClipboardButton` + `CodeText` + optional
     `Table.IconActionLink` (existing behavior).
   - Icon links live in `Table.RowActions`.

4. **Loading / error / empty:**
   - Loading → wrapper loading prop / overlay pattern aligned with phase 02.
   - Load error → `FilterTablePageLayout` **`error`** prop or existing `Alert`.
   - Section-level **no matching** rows → per-section `emptyMessage`.

## Sorting

Keep **none** for Workers (matches today).

## i18n

- Reuse category title keys; generic chrome from [`01-i18n-keys.md`](./01-i18n-keys.md).

## E2E

Update [`e2e/workers-page.spec.ts`](../../../../apps/management-web/e2e/workers-page.spec.ts) —
prefer **`aria-label`** on icon links over layout-specific selectors.

```bash
make e2e_test_management_web_report_spec SPEC=e2e/workers-page.spec.ts
```

## Out of scope

- New worker actions; layout consolidation only.
- Backend changes.
