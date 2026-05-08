# Phase 05 — Migrate Storage (cursor + bulk select)

## Sort decision (v1)

**No column sorting** — storage list stays unsorted (matches today). Revisit only if product adds
sortable columns and the API supports stable ordering.

## Goal

Migrate
[`StoragePageClient.tsx`](../../../../apps/management-web/src/app/(management)/storage/StoragePageClient.tsx)
to `ResourceTableWithFilter` cursor variant + bulk-select bar from phase 03. Behavior preserved;
chrome converges with other list pages.

## Backend pre-check

[`listStorageObjects`](../../../../apps/management-web/src/lib/requests/storage.ts) → `GET /storage/objects`
returns **`StorageListObjectsResponse`**: `{ objects, nextContinuationToken, isTruncated, prefix }`.

- **Canonical adapter:** map `objects` → **`items`** and `nextContinuationToken` → match
  [`CursorPageResult<T>`](../../../../packages/ui/src/hooks/useCursorPagination.ts) (`items` +
  optional `nextContinuationToken`). If `isTruncated` is redundant with token presence, ignore in the
  adapter after verifying parity with today’s client.

## Wrapper wiring

- Use **[`useCursorPagination`](../../../../packages/ui/src/hooks/useCursorPagination.ts)** in the page;
  pass **`hasPrev`, `hasNext`, `goPrev`, `goNext`, `pageNumber`, `isLoading`** into presentational
  **`CursorPagination`** (phase 02). Do **not** thread opaque `prevToken` / `nextToken` props through
  the wrapper — the hook owns tokens internally.

## Deliverables

1. **Wrapper config:**
   - `paginationMode: 'cursor'`.
   - `actions: { view, delete }` — `Table.IconViewLink` to object detail,
     `Table.IconDeleteButton` for single delete; both gated by `canDelete`.
   - `bulkSelect`:
     - `selectedKeys` from existing selection state.
     - `actions`: one entry "Delete selected" (variant `danger`) opening the existing confirm flow.
     - `ariaLabels`: localized strings from [`01-i18n-keys.md`](./01-i18n-keys.md) + existing storage keys as needed.
   - `trailingToolbar`: keep the existing `MoreButton` "delete all".
   - **No `sortable` columns** in v1.

2. **Bulk-select clearing:** Selection clears on filter change, sort change (N/A in v1), and **cursor
   navigation** — same rules as [`01-design-target-api.md`](./01-design-target-api.md) Locked contracts §5.

3. **Empty state:** wrapper `emptyMessage` from existing `t('empty')`.

4. **Filter bar:** prefix search becomes `TableFilterBar`; preserve debounce semantics.

## i18n

- Prefer shared `tableShared.*` where possible; keep storage-specific keys for domain strings.
- Drop unused keys after migration.

## E2E

Update existing storage specs (paths today):

- [`e2e/storage-superuser-crud.spec.ts`](../../../../apps/management-web/e2e/storage-superuser-crud.spec.ts)
- [`e2e/storage-permissions.spec.ts`](../../../../apps/management-web/e2e/storage-permissions.spec.ts)
- [`e2e/storage-disabled.spec.ts`](../../../../apps/management-web/e2e/storage-disabled.spec.ts)

Assertions: select-all → bulk bar; delete-selected; cursor next/prev.

```bash
make e2e_test_management_web_report_spec SPEC=e2e/storage-superuser-crud.spec.ts,e2e/storage-permissions.spec.ts,e2e/storage-disabled.spec.ts
```

## Risks

- Token semantics — if `nextContinuationToken` is empty while `isTruncated` is true, document the
  discrepancy and fix adapter **or** fix API in a separate PR.

## Out of scope

- Server-side bulk delete API changes (caller keeps today’s behavior).
- Adding sorting in v1.
