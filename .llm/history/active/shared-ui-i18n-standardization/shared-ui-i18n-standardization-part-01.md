# shared-ui-i18n-standardization

**Started:** 2026-05-06  
**Author:** Agent  
**Context:** Implement Shared UI I18n Standardization Plan (rules, `@podverse/ui` APIs, apps, plan archive).

### Session 1 - 2026-05-06

#### Prompt (Developer)

Shared UI I18n Standardization Plan

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- **`@podverse/ui`** stays free of `next-intl`; apps pass localized strings via props (`Pagination`
  `prevLabel` / `nextLabel` / `pageIndicatorLabel`; `StatsBarChart` requires `valueLabel`,
  `emptyMessage`, `loadingLabel`; `Breadcrumbs` requires `navAriaLabel`).
- Added workspace rule **`shared-ui-i18n`**, extended **`prefer-shared-ui-web-management`**,
  **`reusable-components`** skill, **`i18n-management`** cross-link, and **`AGENTS.md`** pointer.
- **management-web** `common`: `paginationPrevButton`, `paginationNextButton`, `paginationPageOf`;
  **statsPage**: `loadingChart`.
- **web** namespace **`pagination`**: `ariaPreviousPage`, `ariaNextPage` for list pagination arrows.
- Plan set saved under `.llm/plans/completed/shared-ui-i18n-standardization/` after execution.

#### Files Created/Modified

- `.llm/plans/completed/shared-ui-i18n-standardization/` (plan set + COPY-PASTA)
- `.cursor/rules/shared-ui-i18n.mdc`
- `.cursor/rules/prefer-shared-ui-web-management.mdc`
- `.cursor/rules/i18n-management.mdc`
- `.cursor/skills/reusable-components/SKILL.md`
- `AGENTS.md`
- `packages/ui/src/components/navigation/Pagination/Pagination.tsx`
- `packages/ui/src/components/navigation/Pagination/Pagination.test.tsx`
- `packages/ui/src/components/navigation/Breadcrumbs/Breadcrumbs.tsx`
- `packages/ui/src/components/stats/StatsBarChart/StatsBarChart.tsx`
- `apps/management-web/src/app/(management)/users/UsersListPageClient.tsx`
- `apps/management-web/src/app/(management)/stats/StatsPageClient.tsx`
- `apps/management-web/i18n/originals/*.json` (+ overrides via compile)
- `apps/web/src/components/Pagination/Pagination.tsx`
- `apps/web/i18n/originals/*.json` (+ overrides via compile)
