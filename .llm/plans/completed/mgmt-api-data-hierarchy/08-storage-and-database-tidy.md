# Phase 08 — Storage and Database tidy

Mount-style refactor only. URLs unchanged because both routers already follow
resource-rooted hierarchy.

## Scope

- Convert `storage.ts` to mount-style at `/storage`.
- Convert `database.ts` to mount-style at `/database`.
- Helpers (`getCrudForResource`, `getRequestId`, etc.) stay.
- No URL changes; do NOT rename storage/database/objects/tables paths.

## Steps

1. `apps/management-api/src/routes/storage.ts`: mount at `/storage`; rewrite
   handlers as `'/'`, `'/objects'`, `'/objects/count'`, `'/objects/metadata'`,
   `'/objects/download'`, `'/objects/bulk-delete'`,
   `'/objects/delete-all-by-prefix'`. Confirm `DELETE /objects` still uses
   the same query-string `key=`.
2. `apps/management-api/src/routes/database.ts`: mount at `/database`; rewrite
   handlers as `'/tables'`, `'/:table/meta'`, `'/:table/query'`,
   `'/:table/:id'`, `'/:table'` (POST), `'/:table/:id'` (PATCH/DELETE).
3. Re-run `apps/management-api/src/routes/storage.integration.test.ts` and
   `database.integration.test.ts` against the new file shape (no path edits
   needed because URLs do not change).
4. No request-module or page changes.

## Key files

- `apps/management-api/src/routes/storage.ts`
- `apps/management-api/src/routes/database.ts`
- `apps/management-api/src/routes/storage.integration.test.ts`
- `apps/management-api/src/routes/database.integration.test.ts`

## Verification

- `npm run test:e2e:api` storage + database suites pass.
- `make e2e_test_management_web_report_spec SPEC=e2e/storage-superuser-crud-enabled.spec.ts,e2e/database-table-browser.spec.ts`
  passes.
