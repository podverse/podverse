---
name: tables-support-sorting
description: Ensure tables that display list data support sortable columns where appropriate; use TableWithSort, TableWithFilter, ResourceTableWithFilter, or Table.SortableHeaderCell and follow table-sort-defaults.
---


# Tables support sorting (Podverse)

Use when adding or changing **tables that display list data** in **`apps/management-web`** or **`apps/web`** (e.g. users, admins, storage, stats). Sortable columns should exist where ordering by name, date, or other fields helps users; omit sorting only when the dataset is tiny, fixed-order, or non-tabular.

Orchestration:

- Use this skill to decide **whether** sorting applies and which **`@podverse/ui`** primitive fits.
- Use **table-sort-defaults** (`.llm/exports/opencode/skills/table-sort-defaults/SKILL.md`) for default **`asc`/`desc`** per column type.
- Use **sort-prefs-cookie-by-path** (`.llm/exports/opencode/skills/sort-prefs-cookie-by-path/SKILL.md`) when list metadata is persisted via cookies and URL stripping (see hooks in **`@podverse/ui`**).

## How to add sorting

1. **`TableWithSort`** (`packages/ui`): Tables that need sortable headers only (no filter row). Pass **`columns`** (`sortable`, **`sortKey`**, **`defaultSortOrder`**), **`sortBy`**, **`sortOrder`**, **`onSortChange`**. Parent owns sort state (often URL **`searchParams`**).

2. **`Table.SortableHeaderCell`**: One-off or custom layouts; wire **`sortKey`**, active state, and **`onSort`**.

3. **`TableWithFilter` / `ResourceTableWithFilter`**: List pages with **`TableFilterBar`** use **`sortableColumnIds`** (and column **`defaultSortOrder`**) so headers and URL/cookie behavior stay aligned.

## Non-sortable lists

Some catalogs intentionally have **no** sort (e.g. workers command matrix). Use plain **`Table.HeaderCell`** and a no-op **`onSortChange`** only when product/requirements say so.

## See also

- **table-sort-defaults** — default order by column type.
- **sort-prefs-cookie-by-path** — cookie + URL policy for list metadata.
- **crud-tables-resources** — CRUD row actions and **`ResourceTableWithFilter`** wiring.
