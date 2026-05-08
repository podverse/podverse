# DRY cleanup of staged shared-UI consolidation

## Outcome

Resolve the duplication and inefficiency findings from the DRY audit of the
`feature/mgmt-bucket-view` staged changes (807 files, 24k insertions). The branch finishes a
major shared-UI consolidation; most of the diff is correct. This plan set targets the
remaining cleanup, ordered from highest to lowest impact.

## Scope

- **`@podverse/ui`:** Delete dead `LoadingOverlay`; remove duplication between
  `TableWithFilter` and `ResourceTableWithFilter`; align checkbox primitives; remove an
  English fallback string from `useDeleteModal`; promote a shared `ErrorBoundaryShell`.
- **`apps/web` and `apps/management-web`:** Replace byte-identical `error.tsx` /
  `global-error.tsx` / `ErrorBoundary.module.scss` with thin app shells that call the
  shared boundary; delete `CommonListPageHeader` pass-through; deduplicate the four
  `*PageHeader` files via a single hook; fold the eight `*PageDropdownConfig` files into
  one parameterized factory.
- **i18n:** Align `common.loading` vs `misc.loading` for "generic loading" announcements
  across both apps.
- **Naming:** Renamed **`MainInnerWrapper`** → **`MainSidebarLayout`** and
  **`MainInnerContentWrapper`** → **`MainColumnStack`**; added a barrel JSDoc for the
  notice / alert family (**`Banner`**, **`Callout`**, **`CallToActionMessage`**, **`Alert`**,
  **`RestrictedNotice`**).

## Non-Goals

- The intentional thin app-local i18n wrappers (`Web*` / `Management*` loading spinners,
  alerts) — these correctly follow `app-local-ui-wrappers.mdc` and stay.
- The pagination layered API (`Pagination` / `PaginatedSection` / `PaginationStrip`) — it
  is a deliberate composition tree.
- The `BulkActionBar` (table) vs `StickyBulkActionBar` (layout) pair — different UX.
- Promoting `managementTableUrl.ts` to `@podverse/ui` (3-line helper, not worth churn yet).
- Storybook (not used in these packages).

## References

- [Audit plan (master)](../../../../.cursor/plans/dry_audit_of_staged_podverse_changes_734ea013.plan.md)
- [`prefer-shared-ui-web-management.mdc`](../../../../.cursor/rules/prefer-shared-ui-web-management.mdc)
- [`shared-ui-i18n.mdc`](../../../../.cursor/rules/shared-ui-i18n.mdc)
- [`app-local-ui-wrappers.mdc`](../../../../.cursor/rules/app-local-ui-wrappers.mdc)
- [`reusable-components`](../../../../.cursor/skills/reusable-components/SKILL.md)
- [`ui-component-promotion`](../../../../.cursor/skills/ui-component-promotion/SKILL.md)
