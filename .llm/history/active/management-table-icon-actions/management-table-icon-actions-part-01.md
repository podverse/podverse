# management-table-icon-actions

**Started:** 2026-05-07  
**Author:** Agent  
**Context:** Standardize management-web table row actions on storage-style `IconButton` + `@podverse/ui` helpers.

---

### Session 1 - 2026-05-07

#### Prompt (Developer)

the tables in management web should always use the button style that the storage page uses. this should be made consistent with a podverse-ui compoenent/s

#### Key Decisions

- Added **`TableIconActionLink`**, **`TableIconViewLink`**, **`TableIconEditLink`**, **`TableIconDeleteButton`** in `packages/ui` (plus **`Table.Icon*`** aliases on `Table`) wrapping **`IconButton`** with the same eye / pen / trash icons as storage.
- Migrated **Users**, **Admins** (edit), **Database table browser** (both route trees), **Workers** (related-tool link), and refactored **Object storage** to use these APIs + **`Table.RowActions`** and **`ManagementIconButtonLink`**.

#### Files Created/Modified

- `packages/ui/src/components/table/Table/TableIconActions.tsx`
- `packages/ui/src/components/table/Table/Table.tsx`
- `packages/ui/src/components/table/Table/index.ts`
- `packages/ui/src/index.ts`
- `apps/management-web/src/app/(management)/users/UsersListPageClient.tsx`
- `apps/management-web/src/app/(management)/admins/AdminsListPageClient.tsx`
- `apps/management-web/src/app/(management)/database/[table]/TableBrowserPageClient.tsx`
- `apps/management-web/src/app/dashboard/database/[table]/TableBrowserPageClient.tsx`
- `apps/management-web/src/app/(management)/workers/WorkersPageClient.tsx`
- `apps/management-web/src/app/(management)/storage/StoragePageClient.tsx`
- `.llm/history/active/management-table-icon-actions/management-table-icon-actions-part-01.md`
