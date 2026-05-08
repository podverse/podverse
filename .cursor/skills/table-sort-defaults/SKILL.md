---
name: table-sort-defaults
description: Default sort order by column type for sortable tables; use when adding or changing sortable tables or backend list endpoints.
---

# Table sort defaults (Podverse)

Use when adding or changing **sortable** **`ResourceTableWithFilter`**, **`TableWithFilter`**, or **`TableWithSort`** usage, or **list APIs** that accept **`sortBy`/`sortOrder`**. Keeps UI indicators and server ordering aligned.

For **whether** a table should sort at all, see **tables-support-sorting** (`.cursor/skills/tables-support-sorting/SKILL.md`). For **cookie/path** list prefs, see **sort-prefs-cookie-by-path** (`.cursor/skills/sort-prefs-cookie-by-path/SKILL.md`).

## Defaults by column type

| Column type | Default order          | Rationale                                          |
| ----------- | ---------------------- | -------------------------------------------------- |
| **String**  | `asc` (A→Z)            | Alphabetical reading order.                        |
| **Number**  | `asc` (smallest first) | Unless “latest/highest first” is the product goal. |
| **Date**    | `desc` (newest first)  | Typical for activity / created-at lists.           |

Header controls reflect the **active** sort direction.

## Frontend: `defaultSortOrder` on columns

- **`TableFilterBar`** column meta and **`TableWithFilter`** column definitions support **`defaultSortOrder?: 'asc' | 'desc'`**.
- Set explicitly when adding sortable columns:
  - String / id columns: **`'asc'`**.
  - Timestamps / dates: **`'desc'`**.
  - Numbers: usually **`'asc'`** unless the column represents “latest value”.

If **`defaultSortOrder`** is omitted, rely on shared wrapper behavior documented in **`packages/ui`** (prefer explicit defaults for new work).

## Backend: missing `sortOrder`

When the API receives **`sortBy`** but no **`sortOrder`**, align with UI defaults:

- **Date-like** fields (**`created_at`**, **`updated_at`**, etc.): **DESC**.
- **Other** fields: **ASC**.

Implement in **`apps/api`** / **`apps/management-api`** list handlers and **`packages/orm`** query helpers consistently.

## Where to look in-repo

- **`packages/ui`**: **`TableFilterBar`**, **`ResourceTableWithFilter`**, **`TableWithFilter`**, **`sortPrefsCookie`**, **`tableListStateCookie`** — typings and cookie names (**`SORT_PREFS_COOKIE_NAME_DEFAULT`**, **`TABLE_LIST_STATE_COOKIE_NAME_DEFAULT`**).
- **Apps**: column arrays in **`apps/management-web`** `*PageClient.tsx` list pages using shared tables.
