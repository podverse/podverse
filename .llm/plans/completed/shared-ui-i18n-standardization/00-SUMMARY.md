# Shared UI i18n — Summary

**Started:** 2026-05-06  
**Scope:** `@podverse/ui` must not ship user-facing English; apps own all copy via
`next-intl` and pass strings into shared components.

## Copy inventory (packages/ui)

| Component         | Issue (before)                            | Fix                              |
| ----------------- | ----------------------------------------- | -------------------------------- |
| `Pagination`      | Embedded `Prev` / `Next` / `Page x of y`  | Required `prevLabel`, `nextLabel`, `pageIndicatorLabel` |
| `StatsBarChart`   | Default `Count`, empty, loading English   | Required `valueLabel`, `emptyMessage`, `loadingLabel`   |
| `Breadcrumbs`     | Default `navAriaLabel` English            | Required `navAriaLabel` (landmark)                      |

## App callsites (known)

- **management-web** — `@podverse/ui` `Pagination`: `UsersListPageClient`, `StatsPageClient`.
- **management-web** — `Breadcrumbs`: all pass `navAriaLabel` (verify at build).
- **web** — app `Pagination` (`apps/web/.../Pagination.tsx`) had English `aria-label` on
  arrow buttons; use `pagination` namespace keys.
- **web** — `StatsBarChart` only in management `StatsPageClient` (add `loadingLabel` key).

## Principles

- No `next-intl` inside `packages/ui`.
- Visible text, `aria-label`, `title`, empty/loading states: app-localized and passed in.
- New shared components: document string props in the shared-ui i18n rule and
  `reusable-components` skill.
