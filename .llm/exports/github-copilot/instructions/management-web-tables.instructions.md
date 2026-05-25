---
description: "Management-web list pages should compose shared @podverse/ui table wrappers"
applyTo:
  - "apps/management-web/src/app/(management)/**/*PageClient.tsx"
  - "apps/management-web/src/app/(management)/**/*Client.tsx"
---

# Management web tables (`@podverse/ui`)

When adding or refactoring **list / directory / storage** pages under **`apps/management-web`**:

## Prefer shared composites

1. Prefer **`ResourceTableWithFilter`** (CRUD rows with view/edit/delete), **`TableWithFilter`** (generic rows), **`FilterTablePageLayout`** (title/error/chrome), and related exports from **`@podverse/ui`** over reimplementing **`Table`** + **`TextInput`** + **`Pagination`** wiring by hand.
2. Keep **routing, data fetching, permissions, and `next-intl` strings** in the app; pass localized labels and policies into the shared components.

## Guidance

- **`crud-tables-resources`** — CRUD list/detail conventions and row action order (`getRowActions`, delete confirm).
- **`reusable-components`**, **`shared-ui-i18n`** — no hardcoded English in **`@podverse/ui`**; apps pass strings.
- **`tables-support-sorting`**, **`table-sort-defaults`**, **`sort-prefs-cookie-by-path`** — sort UX, defaults by column type, and cookie/list-state behavior for shared tables.

## References

- [`packages/ui/PACKAGES-UI.md`](../../packages/ui/PACKAGES-UI.md) — **Table family** section.
- [`01-design-target-api.md`](../../.llm/plans/completed/management-web-tables-convergence/01-design-target-api.md) — locked contracts for table APIs (tables convergence plan set).
- [`.llm/exports/github-copilot/skills/crud-tables-resources/SKILL.md`](../skills/crud-tables-resources/SKILL.md)
- [`.llm/exports/github-copilot/skills/tables-support-sorting/SKILL.md`](../skills/tables-support-sorting/SKILL.md)
- [`.llm/exports/github-copilot/skills/table-sort-defaults/SKILL.md`](../skills/table-sort-defaults/SKILL.md)
- [`.llm/exports/github-copilot/skills/sort-prefs-cookie-by-path/SKILL.md`](../skills/sort-prefs-cookie-by-path/SKILL.md)
