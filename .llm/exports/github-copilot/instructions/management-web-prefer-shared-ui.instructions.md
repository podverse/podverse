---
description: "Management-web — prefer @podverse/ui; aligns with cross-app shared UI rule"
applyTo: "apps/management-web/src/**/*.tsx"
---

# Management Web: Prefer Shared UI

Cross-app policy (web + management-web): **`.llm/exports/github-copilot/instructions/prefer-shared-ui-web-management.instructions.md`**.

When editing `apps/management-web/src/**/*.tsx`:

- Prefer importing generic UI primitives from `@podverse/ui` before adding page-specific wrappers.
- If a generic pattern is missing, add it to `packages/ui/src/components/**` (or shared hooks under `packages/ui/src/hooks/**`) and export from `packages/ui/src/index.ts`.
- Avoid creating one-line app-local re-export files for `@podverse/ui` components.
- Keep app-local components in `apps/management-web/src/components/**` for shell/product-specific behavior only.
- Before adding a component under `apps/management-web/src/components`, compare with **`apps/web`** for the same UX pattern; if they align, extend **`@podverse/ui`** instead of duplicating (see **`ui-component-promotion`** skill).

Recent convergence examples (phase 05): database **table browser** pagination uses **`Pagination`** from **`@podverse/ui`** instead of ad hoc prev/next buttons; prefer **`FormDropdown`** over native `<select>` when matching web control patterns. **Field titles** on form controls: see **`management-web-form-eyebrow`** (use **`eyebrow`**, not freestanding **`Label`**).

Common candidates to share:

- Form controls and action rows (`FormGroup`, `Input`, `Label`, `FormDropdown`, `FormPrimaryActions`)
- Table and pagination wrappers (`Table`, `Pagination`)
- Status and state messaging (`StatusBadge`, `LoadingSpinner`, `Alert`)
- Icon actions and menus (`IconButton`, `DropdownMenu`, shared dropdown keyboard hook)
