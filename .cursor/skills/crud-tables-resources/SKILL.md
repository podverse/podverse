---
name: crud-tables-resources
description: Use @podverse/ui ResourceTableWithFilter and related wrappers for management-web CRUD list pages (actions, permissions, delete confirm).
---

# CRUD tables and resources (Podverse management-web)

Use when adding or changing **admin list/detail/edit** flows that show tabular data in **`apps/management-web`**. Keeps row actions, confirm delete, and **`@podverse/ui`** usage aligned.

## Shared implementation

- **`ResourceTableWithFilter`**, **`TableWithFilter`**, **`FilterTablePageLayout`** — exported from **`@podverse/ui`** (see **`packages/ui/PACKAGES-UI.md`** — Table family).
- Apps supply **`LinkComponent`** (e.g. Next.js **`Link`** wrapped for icon buttons), **localized `labels`**, **`deleteConfirm`** copy, **`renderCells`**, **`getRowKey`**, and URL/cookie state props (**`basePath`**, **`currentQueryParams`**, **`useTableFilterState`** integration via props).

## Row action order

When **`actions`** is set, **`ResourceTableWithFilter`** renders **View → Edit → Delete** (fixed **`Table.RowActions`** order). **`getRowActions(row)`** returns **`ResourceRowActionsPolicy`** (`view` / `edit` / **`delete`**: **`enabled`**, **`disabled`**, or **`hidden`**) plus optional **`disabledReasons`** for tooltips.

## Permissions

- Gate **list** access in the **page** or layout (session / API errors / redirect), not inside **`@podverse/ui`**.
- Pass **`canView`-style behavior** by returning **`hidden`** or **`disabled`** from **`getRowActions`** per row (e.g. hide delete for protected rows).
- **Delete**: implement **`actions.onDelete`**; **`useDeleteModal`** + **`DeleteConfirmModalShell`** handle the modal; **`deleteConfirm.message(row)`** builds the body.

## Adding a new CRUD list page

1. Define routes under **`apps/management-web/src/app/(management)/…`** (App Router).
2. Fetch list data in the **client page** (or server wrapper + client child); handle loading/error in app code.
3. Render **`FilterTablePageLayout`** + **`ManagementPageShell`** (or existing shell pattern) + **`ResourceTableWithFilter`** with **`columns`**, **`rows`**, **`renderCells`**, **`actions`**, **`deleteConfirm`**, and filter/sort/pagination props matching the API.
4. Add **i18n** keys under **`apps/management-web/i18n/originals/`** (and overrides); pass translated strings into **`labels`** and **`deleteConfirm`**.

## References

- [`packages/ui/src/components/table/ResourceTableWithFilter/ResourceTableWithFilter.tsx`](/packages/ui/src/components/table/ResourceTableWithFilter/ResourceTableWithFilter.tsx)
- **[`management-web-tables`](/.cursor/rules/management-web-tables.mdc)** rule
