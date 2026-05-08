# 05 — Management-web convergence

## Prompt (Agent)

Execute **phase 05**: after shared primitives exist or APIs align, update `apps/management-web` to
use them where it reduces drift from **web baseline**. Keep wrappers for session, i18n, and
Next-specific bridges.

## Already aligned (verify only)

- `ManagementAppLayout` + `@podverse/ui` `NavBar` with `appearance="web"`.
- `ManagementUserMenu`, `ManagementLocaleSelector`, `ManagementThemeSwitcher` using `DropdownMenu`
  / `FormDropdown`.

## Navbar — parity vs web

| Aspect              | Web                                      | Management-web                          |
| ------------------- | ---------------------------------------- | --------------------------------------- |
| Shell component     | Local `NavBar` + web SCSS                | `@podverse/ui` `NavBar` slots           |
| Density             | Search, more, media-adjacent actions    | Minimal: brand + right cluster          |
| Convergence path      | Migrate web onto ui `NavBar` (phase 03)| Already on ui; extend slots if needed   |

**Why not identical chrome today**: management is admin tool; fewer affordances is intentional.
Convergence means **tokens, spacing, dropdown/menu behavior**, not copying web-only buttons.

## Target replacements

1. **Native `<select>`** in user admin flows → `FormDropdown` from `@podverse/ui` (match web
   control feel).
2. **Database table browser** prev/next: if phase 03 unifies pagination, use shared `Pagination`
   instead of ad hoc buttons (both `(management)` and legacy `dashboard` route copies if both
   exist—prefer deleting duplicate route tree per separate cleanup issue).
3. **`react-hot-toast`**: dependency present but unused → either add lazy `Toaster` for parity
   with web feedback patterns **or** remove dependency to avoid drift.

## Wrappers to keep

- `ManagementIconButtonLink.tsx` — Next `Link` typing bridge.
- `useManagementClientSessionGuard.ts` — not ui.
- Page-local `role="dialog"` + `ConfirmPanel` — localized `aria-label` stays in app.

## Completion criteria

- No new management-only primitives that duplicate ui without justification.
- i18n keys updated when new strings appear (`i18n-management` rule).

## Completed (2026-05-06)

- **Database table browser** (`TableBrowserPageClient` in both `(management)/database/[table]` and
  legacy `dashboard/database/[table]`): replaced ad hoc secondary `Button` prev/next with
  `@podverse/ui` **`Pagination`** when `totalPages > 1`; kept **`PaginationSummaryLine`** alone when
  `totalPages <= 1` (shared `Pagination` returns `null` for single-page results).
- **`react-hot-toast`**: removed unused dependency from `apps/management-web/package.json` (web app
  retains toast).
- **Native `<select>`**: none found in management-web TSX (phase note satisfied by inventory).
- Navbar / dropdown alignment already matched prior phases; no further layout changes.
