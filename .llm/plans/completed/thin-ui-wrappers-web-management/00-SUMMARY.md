# Thin UI wrappers (web + management-web)

## Goal

Reduce repeated **identical** `@podverse/ui` usage—same component **and** same prop wiring (especially i18n from `useTranslations`)—by introducing **app-local wrapper components** under each app’s `src/components/` tree, following the existing **`WebLoadingSpinnerOverlay`** pattern.

## Scope of this plan set

Started as inventory-only (**`01-wrapper-candidates-inventory.md`**); implementation was executed per **`COPY-PASTA.md`** (management-web + web thin wrappers). **Archived** under **`.llm/plans/completed/thin-ui-wrappers-web-management/`**.

## Non-goals

- Moving wrappers into `packages/ui` (unless a future promotion pass chooses to).
- Changing visual design or UX beyond consolidating duplicate markup.

## Related conventions

- `.cursor/skills/reusable-components/SKILL.md`
- `.cursor/rules/prefer-shared-ui-web-management.mdc`
