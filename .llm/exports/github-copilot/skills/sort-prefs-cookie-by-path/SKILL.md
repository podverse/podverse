---
name: sort-prefs-cookie-by-path
description: Persist list and sort preferences via Podverse table cookies; honor URL searchParams when present; prefer client refetch over router.refresh for table metadata where hooks apply.
---


# Sort and list-state cookies (Podverse)

Use when adding or changing **sort**, **search**, **column visibility**, **pagination**, or related **list metadata** on pages that use **`@podverse/ui`** table wrappers.

## Cookie names (defaults)

Exported from **`@podverse/ui`** (see **`packages/ui/src/lib/cookies/`**):

- **`SORT_PREFS_COOKIE_NAME_DEFAULT`** — defaults to **`podverse_table_sort_prefs`** (per-list sort keys).
- **`TABLE_LIST_STATE_COOKIE_NAME_DEFAULT`** — defaults to **`podverse_table_list_state`** (`search`, columns, page, etc., keyed by list id).

Apps may override env-driven cookie names where documented; follow **`apps/*/.env.example`** and **`packages/ui`** exports.

## Policy (high level)

- **Bookmark / direct URLs** may include **`?search=`**, **`sortBy`**, **`sortOrder`**, **`page`**, etc. Server and client tables should **honor explicit query params** when present.
- **`useTableFilterState`** debounces search and can sync **router.push** to **`basePath`** with merged params — align **`initialSearch`** / **`currentQueryParams`** with the route you own.
- When using **cookie refresh mode** (**`tableListStateCookieName`** + **`tableListStateListKey`** on **`ResourceTableWithFilter`** / **`TableWithFilter`**), list metadata writes merge into **`podverse_table_list_state`** instead of relying only on long URLs.

## Hooks

- **`useCookieModeListRefresh`** — coordinates cookie writes with a parent callback; prefer **refetch via API** when implementing **afterCookieListMutation** instead of unnecessary full **`router.refresh()`** for large table pages (see hook JSDoc in **`packages/ui`**).
- **`useAsyncPageLoading`** — wrap async list loads so navigation/table overlays behave consistently.

Podverse **management-web** list migrations increasingly standardize on **`ResourceTableWithFilter`** props for these hooks — mirror existing **`UsersListPageClient`** / **`StoragePageClient`** patterns when adding pages.

## See also

- **table-sort-defaults** — default **`asc`/`desc`** by column type.
- **tables-support-sorting** — when to make tables sortable.
- **`PACKAGES-UI.md`** (Table family) — wrapper props and cookie wiring.
