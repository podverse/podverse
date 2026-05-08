# Management web tables convergence — copy-pasta checklist

**Status:** Complete. This directory (`.llm/plans/completed/management-web-tables-convergence/`) holds the full plan set.

- [x] `01-design-target-api.md` + `01-i18n-keys.md`
- [x] `02-foundation.md`
- [x] `03-higher-level-wrappers.md`
- [x] `04-migrate-list-pages.md`
- [x] `05-migrate-storage.md`
- [x] `06-migrate-workers.md`
- [x] `07-cleanup-tests-docs.md`

During execution, agents marked each phase and moved numbered files from `.llm/plans/active/` here per [`plan-lifecycle`](../../../../.cursor/rules/plan-lifecycle.mdc).

## Prompt blocks (verbatim archive)

### 01

Execute **Management web tables convergence — phase 01** per
[`01-design-target-api.md`](./01-design-target-api.md)
and
[`01-i18n-keys.md`](./01-i18n-keys.md).
Documentation-only: lock the target API (types / prop names / i18n contract / action-cell rules /
Locked contracts). Do not change runtime behavior.

### 02

Execute **phase 02** per
[`02-foundation.md`](./02-foundation.md).
Add `Table.SortableHeaderCell`, cookie helpers, hooks (`useTableFilterState`, `useDeleteModal`,
`useAsyncPageLoading`, `useCookieModeListRefresh`), and the `Pagination` / `GoToPageModal`
extensions in `@podverse/ui`. Export from `packages/ui/src/index.ts`. No app-side migration yet.

### 03

Execute **phase 03** per
[`03-higher-level-wrappers.md`](./03-higher-level-wrappers.md).
Add `TableFilterBar`, `TableWithSort`, `TableWithFilter`, `ResourceTableWithFilter` (with cursor,
bulk-select, and grouped variants), and `FilterTablePageLayout`. Export from
`packages/ui/src/index.ts`. Add unit tests. Include `.cursor/rules/management-web-tables.mdc`,
`.cursor/skills/crud-tables-resources/SKILL.md`, and `PACKAGES-UI.md` Table family per that file.
No app migration yet.

### 04

Execute **phase 04** per
[`04-migrate-list-pages.md`](./04-migrate-list-pages.md).
Migrate Product memberships, Stats, Users, Admins, Flag status directory, and DB browser onto the
shared wrappers (order and `ManagementResourceTable` per that file). Delete duplicate
`apps/management-web/src/app/dashboard/database/[table]/TableBrowserPageClient.tsx` when safe.
Update i18n keys and e2e selectors as listed.

### 05

Execute **phase 05** per
[`05-migrate-storage.md`](./05-migrate-storage.md).
Migrate `StoragePageClient` to `ResourceTableWithFilter` cursor variant + sticky bulk-select bar
and keep the delete-all `MoreButton` action. Update e2e selectors as needed.

### 06

Execute **phase 06** per
[`06-migrate-workers.md`](./06-migrate-workers.md).
Migrate `WorkersPageClient` to the grouped `TableWithFilter` variant inside `Disclosure` sections.
Preserve `CopyToClipboardButton` + `CodeText` cell content; only the table chrome changes.

### 07

Execute **phase 07** per
[`07-cleanup-tests-docs.md`](./07-cleanup-tests-docs.md).
Drop unused app-local helpers, add remaining `.cursor` skills (`tables-support-sorting`,
`table-sort-defaults`, `sort-prefs-cookie-by-path`), finalize e2e + history per `llm-history-tracking`.
Move all numbered phase files plus `COPY-PASTA.md` and `00-*` to
`.llm/plans/completed/management-web-tables-convergence/` when everything is done.
