# Management web tables convergence — summary

**Status:** Active.

## Objective

One shared table stack across [`apps/management-web`](../../../../apps/management-web) by porting
the metaboost-style table API into [`@podverse/ui`](../../../../packages/ui) and migrating every
table page on top of it. Hard breaks on style are accepted; outcome is that each list page is a
thin shell over the same wrapper, with one rule for action cells, sort, pagination, filters,
empty/loading/error, and persisted state.

## Confirmed decisions

- **Wrappers are passive** — pages own fetchers and pass `rows`, loading/error, and pagination
  signals (see [`01-design-target-api.md`](./01-design-target-api.md) Locked contracts). Matches
  [`UsersListPageClient.tsx`](../../../../apps/management-web/src/app/(management)/users/UsersListPageClient.tsx).
- **Adoption strategy:** Port metaboost-style wrappers
  ([`metaboost/packages/ui/src/components/table`](../../../../../metaboost/packages/ui/src/components/table))
  into `@podverse/ui` and migrate every podverse mgmt-web list page on top of them.
- **Action cells:** Icons everywhere via existing
  [`Table.IconViewLink`](../../../../packages/ui/src/components/table/Table/TableIconActions.tsx) /
  `IconEditLink` / `IconDeleteButton` / `IconActionLink`. Flag status **Open** becomes an icon link.
- **Outliers in scope:** Storage (cursor + bulk select), Workers (Disclosure-grouped tables), and
  the admin permissions matrix stay on raw `Table` where appropriate (matrix adopts shared header
  cells only if sortable).
- **State persistence:** URL params win; `tableListState` + `sortPrefs` cookies fall back; async
  overlay refetch via `useCookieModeListRefresh` and `useAsyncPageLoading`.
- **Delete confirm:** `Modal` + `ConfirmPanelActions` + `Button` — no `ConfirmDeleteModal` export.

## Phase 04 migration order

Product memberships → Stats → Users → Admins → Flag status → Database table browser.

## Plan artifacts

- Target API: [`01-design-target-api.md`](./01-design-target-api.md)
- Shared i18n keys: [`01-i18n-keys.md`](./01-i18n-keys.md)

## Scope

| Page                                                                                                                                         | Target wrapper                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [`UsersListPageClient.tsx`](../../../../apps/management-web/src/app/(management)/users/UsersListPageClient.tsx)                              | `ResourceTableWithFilter` (View / Edit / Delete)              |
| [`AdminsListPageClient.tsx`](../../../../apps/management-web/src/app/(management)/admins/AdminsListPageClient.tsx)                           | `ResourceTableWithFilter` (Edit conditional via row policy)   |
| [`TableBrowserPageClient.tsx`](../../../../apps/management-web/src/app/(management)/database/[table]/TableBrowserPageClient.tsx)             | `ResourceTableWithFilter` (View only); delete dashboard dup   |
| [`FlagStatusPageClient.tsx`](../../../../apps/management-web/src/app/(management)/feed-operations/flag-status/FlagStatusPageClient.tsx)      | `ResourceTableWithFilter`; lifecycle filter via `trailingToolbar`; `Open` → icon link |
| [`StatsPageClient.tsx`](../../../../apps/management-web/src/app/(management)/stats/StatsPageClient.tsx)                                      | `TableWithFilter` (no actions, row click)                     |
| [`ProductMembershipsPageClient.tsx`](../../../../apps/management-web/src/app/(management)/products/memberships/ProductMembershipsPageClient.tsx) | `TableWithSort` / `TableWithFilter` with `paginationMode: 'none'` |
| [`StoragePageClient.tsx`](../../../../apps/management-web/src/app/(management)/storage/StoragePageClient.tsx)                                | `ResourceTableWithFilter` cursor variant + bulk-select bar    |
| [`WorkersPageClient.tsx`](../../../../apps/management-web/src/app/(management)/workers/WorkersPageClient.tsx)                                | Grouped variant: `paginationMode: 'none'`                     |
| [`NewAdminPageClient.tsx`](../../../../apps/management-web/src/app/(management)/admins/new/NewAdminPageClient.tsx) / [`EditAdminPageClient.tsx`](../../../../apps/management-web/src/app/(management)/admins/[id]/edit/EditAdminPageClient.tsx) | Raw `Table` primitive; optional shared header cells           |

## New `@podverse/ui` exports (introduced in phases 02–03)

- `Table.SortableHeaderCell`
- `TableFilterBar`, `TableWithSort`, `TableWithFilter`, `ResourceTableWithFilter`
- Cursor pagination UI + bulk-select + grouped variants; **`paginationMode: 'none'`**
- `FilterTablePageLayout`
- `useTableFilterState`, `useDeleteModal`, `useAsyncPageLoading`, `useCookieModeListRefresh`
- `sortPrefsCookie`, `tableListStateCookie` helpers
- `GoToPageModal`
- **Editor:** `.cursor/rules/management-web-tables.mdc`, `.cursor/skills/crud-tables-resources/SKILL.md`,
  **`PACKAGES-UI.md` Table family** (phase 03)

## Out of scope (now)

- `apps/web` tables (separate consolidation later).
- Backend list-API normalization beyond thin adapters at page boundaries.

## Existing guardrails

- [`.cursor/rules/prefer-shared-ui-web-management.mdc`](../../../../.cursor/rules/prefer-shared-ui-web-management.mdc)
- [`.cursor/rules/management-web-prefer-shared-ui.mdc`](../../../../.cursor/rules/management-web-prefer-shared-ui.mdc)
- [`.cursor/rules/shared-ui-i18n.mdc`](../../../../.cursor/rules/shared-ui-i18n.mdc)
- [`.cursor/skills/reusable-components/SKILL.md`](../../../../.cursor/skills/reusable-components/SKILL.md)
- [`.cursor/skills/ui-component-promotion/SKILL.md`](../../../../.cursor/skills/ui-component-promotion/SKILL.md)
