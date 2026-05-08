# management-web-tables-convergence

Started: 2026-05-07  
Author: Agent  
Context: Phase 02 foundation — `@podverse/ui` table/list primitives, no management-web migration.

### Session 1 - 2026-05-07

#### Prompt (Developer)

@podverse/.llm/plans/active/management-web-tables-convergence/COPY-PASTA.md:27-31

#### Key Decisions

- Completed barrel exports in `packages/ui/src/index.ts` for cookie helpers, hooks, `NavigationLoadingOverlay`, `DeleteConfirmModalShell`, `GoToPageModal`, and table sort types (`TableSortDirection`, `TableColumn`, sortable header props).
- Added Vitest coverage: pure cookie helpers (`cookieJson`, `sortPrefsCookie`, `tableListStateCookie`), hooks (`useAsyncPageLoading`, `useDeleteModal`, `useTableFilterState`, `useCookieModeListRefresh` with mocked `next/navigation`), extended `Table.test.tsx` for `SortableHeaderCell`.
- Extended `vitest.config.ts` to pick up `*.test.ts` files.
- Sorted imports in `GoToPageModal.tsx` for ESLint.
- Marked phase `02-foundation.md` complete in `COPY-PASTA.md` and moved `02-foundation.md` to `.llm/plans/completed/management-web-tables-convergence/`.

#### Files Created/Modified

- packages/ui/src/index.ts
- packages/ui/vitest.config.ts
- packages/ui/src/lib/cookies/cookieJson.test.ts
- packages/ui/src/lib/cookies/sortPrefsCookie.test.ts
- packages/ui/src/lib/cookies/tableListStateCookie.test.ts
- packages/ui/src/hooks/useAsyncPageLoading.test.tsx
- packages/ui/src/hooks/useDeleteModal.test.tsx
- packages/ui/src/hooks/useTableFilterState.test.tsx
- packages/ui/src/hooks/useCookieModeListRefresh.test.tsx
- packages/ui/src/components/table/Table/Table.test.tsx
- packages/ui/src/components/navigation/GoToPageModal/GoToPageModal.tsx
- .llm/plans/active/management-web-tables-convergence/COPY-PASTA.md
- .llm/plans/completed/management-web-tables-convergence/02-foundation.md (moved from active)

### Session 2 - 2026-05-07

#### Prompt (Developer)

@podverse/.llm/plans/active/management-web-tables-convergence/COPY-PASTA.md:35-39

#### Key Decisions

- Completed phase 03: higher-level table wrappers in `@podverse/ui`, Vitest coverage, ESLint import sort on touched UI sources.
- Added `.cursor/rules/management-web-tables.mdc`, `.cursor/skills/crud-tables-resources/SKILL.md`, and **Table family** in `packages/ui/PACKAGES-UI.md`.
- Marked `03-higher-level-wrappers.md` complete in `COPY-PASTA.md` and moved it to `.llm/plans/completed/management-web-tables-convergence/`.

#### Files Created/Modified

- packages/ui/PACKAGES-UI.md
- packages/ui/src (phase 03 implementation + lint import order fixes)
- .cursor/rules/management-web-tables.mdc
- .cursor/skills/crud-tables-resources/SKILL.md
- .llm/plans/active/management-web-tables-convergence/COPY-PASTA.md
- .llm/plans/completed/management-web-tables-convergence/03-higher-level-wrappers.md (moved from active)

### Session 3 - 2026-05-07

#### Prompt (Developer)

@podverse/.llm/plans/active/management-web-tables-convergence/COPY-PASTA.md:48-53

#### Key Decisions

- Phase 04 marked complete: list migrations were already landed in prior work; finished by adding E2E coverage (`users-list`, `admins-list`, `database-table-browser`), strengthening existing specs with shared-table sort/link assertions (`products-hub`, `stats-page`, `feed-operations-flag-status`), updating `makefiles/local/e2e-spec-order-management-web.txt`, moving `04-migrate-list-pages.md` to completed, and checking off `COPY-PASTA.md`.
- Confirmed `npm run build -w @podverse/management-web` succeeds after prior Flag lint fix.

#### Files Created/Modified

- apps/management-web/e2e/users-list.spec.ts
- apps/management-web/e2e/admins-list.spec.ts
- apps/management-web/e2e/database-table-browser.spec.ts
- apps/management-web/e2e/products-hub.spec.ts
- apps/management-web/e2e/stats-page.spec.ts
- apps/management-web/e2e/feed-operations-flag-status.spec.ts (lookup Search uses `exact: true` to avoid clashing with the column-filter funnel button)
- makefiles/local/e2e-spec-order-management-web.txt
- .llm/plans/active/management-web-tables-convergence/COPY-PASTA.md
- .llm/plans/completed/management-web-tables-convergence/04-migrate-list-pages.md (moved from active)

### Session 4 - 2026-05-07

#### Prompt (Developer)

@podverse/.llm/plans/active/management-web-tables-convergence/COPY-PASTA.md:57-60

#### Key Decisions

- Phase 05 complete: `StoragePageClient` uses `ResourceTableWithFilter` with `paginationMode="cursor"`, prefix filter via URL/search bar, sticky bulk bar + delete-all `MoreButton`, clear selection on cursor page change.
- `ResourceTableWithFilter` bulk-clear effect depends on `bulkSelect?.onSelectionChange` only so selection is not wiped when parent passes a new `bulkSelect` object each render.
- E2E `storage-superuser-crud.spec.ts` mocks two-page list flow for cursor pagination and bulk UI.

#### Files Created/Modified

- apps/management-web/src/app/(management)/storage/StoragePageClient.tsx
- packages/ui/src/components/table/ResourceTableWithFilter/ResourceTableWithFilter.tsx
- apps/management-web/e2e/storage-superuser-crud.spec.ts
- .llm/plans/active/management-web-tables-convergence/COPY-PASTA.md
- .llm/plans/completed/management-web-tables-convergence/05-migrate-storage.md (moved from active)

### Session 5 - 2026-05-07

#### Prompt (Developer)

@podverse/.llm/plans/active/management-web-tables-convergence/COPY-PASTA.md:64-67

#### Key Decisions

- Workers page uses shared table chrome: `useTableFilterState` + `TableFilterBar` + `TableWithSort` with `paginationMode` equivalent (no pagination UI), URL-synced `search`, `useManagementTableChrome` funnel/filter labels, workers-specific search placeholder and column copy.
- Grouped layout preserved as `Disclosure` per category with `filter.search` driving row filtering (live, same hook as filter bar).
- No `ResourceTableWithFilter`/`deleteConfirm` stub — workers are read-only with custom cells (`CopyToClipboardButton`, `CodeText`, optional `Table.IconActionLink` with `ariaLabel`/`title`).

#### Files Created/Modified

- apps/management-web/src/app/(management)/workers/WorkersPageClient.tsx
- apps/management-web/src/app/(management)/workers/WorkersPageClient.module.scss
- apps/management-web/e2e/workers-page.spec.ts
- .llm/plans/active/management-web-tables-convergence/COPY-PASTA.md
- .llm/plans/completed/management-web-tables-convergence/06-migrate-workers.md (moved from active)

### Session 6 - 2026-05-07

#### Prompt (Developer)

@podverse/.llm/plans/active/management-web-tables-convergence/COPY-PASTA.md:71-76

#### Key Decisions

- Removed unused `apps/management-web/src/lib/constants/sortIndicators.ts` (`SORT_ARROW_*` had no imports); removed empty `lib/constants` dir.
- Added Podverse skills mirroring metaboost: `.cursor/skills/tables-support-sorting/SKILL.md`, `table-sort-defaults/SKILL.md`, `sort-prefs-cookie-by-path/SKILL.md`; extended `.cursor/rules/management-web-tables.mdc` with links to **crud-tables-resources** + those three + completed **01-design-target-api**.
- Archived entire plan set to `.llm/plans/completed/management-web-tables-convergence/` (including `COPY-PASTA.md`, `00-*`, `01-*`, `07-*`); updated `COPY-PASTA.md` and `00-EXECUTION-ORDER.md` for archive state.
- `npm run i18n:validate` still reports missing `tableShared.*` keys in `originals/fr.json` and `originals/el-GR.json` for management-web (pre-existing locale parity gap); run `npm run i18n:translate` / sync overrides separately.
- Repo-wide `npm run lint` currently fails Prettier drift in `packages/ui` (unrelated files); `npm run build:packages` + `npm run build -w @podverse/management-web` succeed.

#### Files Created/Modified

- apps/management-web/src/lib/constants/sortIndicators.ts (deleted)
- .cursor/skills/tables-support-sorting/SKILL.md
- .cursor/skills/table-sort-defaults/SKILL.md
- .cursor/skills/sort-prefs-cookie-by-path/SKILL.md
- .cursor/rules/management-web-tables.mdc
- .llm/plans/completed/management-web-tables-convergence/COPY-PASTA.md
- .llm/plans/completed/management-web-tables-convergence/00-EXECUTION-ORDER.md
- .llm/plans/completed/management-web-tables-convergence/00-SUMMARY.md (moved from active)
- .llm/plans/completed/management-web-tables-convergence/01-design-target-api.md (moved from active)
- .llm/plans/completed/management-web-tables-convergence/01-i18n-keys.md (moved from active)
- .llm/plans/completed/management-web-tables-convergence/07-cleanup-tests-docs.md (moved from active)
- .llm/history/active/management-web-tables-convergence/management-web-tables-convergence-part-01.md
