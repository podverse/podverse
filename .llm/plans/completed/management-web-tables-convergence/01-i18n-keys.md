# Phase 01 — Shared `tableShared` i18n keys

Canonical keys for [`apps/management-web/i18n/originals/en-US.json`](../../../../apps/management-web/i18n/originals/en-US.json).
Apps pass these via thin wrappers (e.g. `ManagementResourceTable`) into `@podverse/ui` wrapper props.
Values are American English originals; other locales follow normal i18n sync.

## Namespace

All keys live under **`tableShared`** unless a page-specific key already exists (keep page keys for domain copy; only shared chrome uses `tableShared`).

| Key | Placeholders | Notes |
| --- | --- | --- |
| `tableShared.searchPlaceholder` | — | Main filter bar search input |
| `tableShared.searchSubmitLabel` | — | Optional explicit submit (if UI exposes one) |
| `tableShared.searchClearLabel` | — | Clear search control |
| `tableShared.filterColumnsLabel` | — | Visible label for “search in columns” funnel |
| `tableShared.filterColumnsAriaLabel` | — | `aria-label` for funnel trigger |
| `tableShared.sortAscLabel` | — | Sort ascending (tooltip / aria) |
| `tableShared.sortDescLabel` | — | Sort descending |
| `tableShared.sortClearLabel` | — | Clear active sort |
| `tableShared.sortAriaTemplate` | `{column}` | Template for sort button `aria-label` |
| `tableShared.noResults` | — | Empty state when filters yield zero rows |
| `tableShared.noData` | — | Empty state when list is empty without filters |
| `tableShared.loading` | — | Loading affordance if surfaced by wrapper |
| `tableShared.errorRetry` | — | Retry action label after load error |
| `tableShared.bulk.selectAllAria` | — | Header checkbox “select all on page” |
| `tableShared.bulk.selectRowAria` | — | Per-row checkbox |
| `tableShared.bulk.selectedCount` | `{count}` | Bulk bar summary |
| `tableShared.bulk.clearSelection` | — | Clear bulk selection |
| `tableShared.bulk.actionsLabel` | — | Optional bulk bar region label |
| `tableShared.cursor.prev` | — | Cursor pagination previous |
| `tableShared.cursor.next` | — | Cursor pagination next |
| `tableShared.confirmDelete.title` | — | Delete modal title |
| `tableShared.confirmDelete.message` | — | Delete modal body (may use `{name}` if wrapper supports) |
| `tableShared.confirmDelete.cancel` | — | Usually alias `common.cancel` |
| `tableShared.confirmDelete.confirm` | — | Usually alias `common.confirm` |
| `tableShared.confirmDelete.aria` | — | Modal `aria-label` |
| `tableShared.pagination.pageOf` | `{currentPage}`, `{totalPages}` | Page indicator |
| `tableShared.pagination.prev` | — | Often alias `common.paginationPrevButton` |
| `tableShared.pagination.next` | — | Often alias `common.paginationNextButton` |
| `tableShared.pagination.goToPageLabel` | — | Opens go-to-page modal |
| `tableShared.pagination.goToPageAria` | — | Button `aria-label` |
| `tableShared.pagination.goToPageSubmit` | — | Modal primary |

## Duplication policy

Where a key duplicates `common.*` (e.g. cancel, confirm, pagination), **either** reference `common` at the call site **or** add thin aliases under `tableShared` that mirror `common` for a single namespace in wrappers — pick one approach per implementation PR and document in `PACKAGES-UI.md`.

## Verification

Phase 04+ adds these keys before wiring wrapper props; `npm run lint:i18n` (or repo equivalent) passes.
