# Management web tables convergence — execution order

Run the numbered prompts in [`COPY-PASTA.md`](COPY-PASTA.md) in order:

1. [`01-design-target-api.md`](./01-design-target-api.md) + [`01-i18n-keys.md`](./01-i18n-keys.md) —
   Lock target API, prop names, i18n contract, action-cell rules, Locked contracts.
2. [`02-foundation.md`](./02-foundation.md) — `Table.SortableHeaderCell`, cookies, hooks
   (`useTableFilterState`, `useDeleteModal`, `useAsyncPageLoading`, `useCookieModeListRefresh`),
   `Pagination` extensions, `GoToPageModal`.
3. [`03-higher-level-wrappers.md`](./03-higher-level-wrappers.md) — `TableFilterBar`,
   `TableWithSort`, `TableWithFilter`, `ResourceTableWithFilter` (with cursor + bulk-select +
   grouped variants), `FilterTablePageLayout`.
4. [`04-migrate-list-pages.md`](./04-migrate-list-pages.md) — Users, Admins list, DB browser
   (delete `dashboard/database/[table]/` duplicate), Flag status, Stats, ProductMemberships.
5. [`05-migrate-storage.md`](./05-migrate-storage.md) — Cursor variant + sticky bulk-select bar;
   keep delete-all `MoreButton`.
6. [`06-migrate-workers.md`](./06-migrate-workers.md) — Grouped Disclosure tables on top of shared
   primitives.
7. [`07-cleanup-tests-docs.md`](./07-cleanup-tests-docs.md) — Drop unused helpers, add skills
   mirroring metaboost (`crud-tables-resources`, `tables-support-sorting`, `table-sort-defaults`,
   `sort-prefs-cookie-by-path`), update `PACKAGES-UI.md`, refresh e2e selectors, complete history.

Phases 02 → 03 must precede any page migration. Phases 04 / 05 / 06 can run in parallel branches
once 03 lands. Phase 07 always runs last.

**Archive:** The full plan set now lives in this directory (see [`COPY-PASTA.md`](./COPY-PASTA.md)).
