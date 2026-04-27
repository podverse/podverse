---
name: management-web-users-crud
status: completed
---

# Summary

Full user management CRUD section for Podverse management-web with paginated users table, invite link management, configurable token expiration, edit/delete user pages, and reusable table components in @podverse/ui.

## Key Decisions

- Raw SQL via `AppDbDataSourceRead`/`AppDbDataSourceReadWrite` (not @podverse/orm services)
- Superuser-only permissions for user management
- Lightweight table components in @podverse/ui without cookie-backed list state
- Server-side pagination via page/limit query params
- `MANAGEMENT_API_SET_PASSWORD_TTL_HOURS` env var (default 168 = 7 days)

## Files Changed

### Management API
- `apps/management-api/src/routes/users.ts` -- Full CRUD + invite link endpoints
- `apps/management-api/src/config/index.ts` -- Added `setUserPasswordTtlHours`
- `apps/management-api/src/lib/startup/validation.ts` -- Added env var validation
- `apps/management-api/.env.example` -- Added `MANAGEMENT_API_SET_PASSWORD_TTL_HOURS`
- `apps/management-api/src/routes/users.integration.test.ts` -- Integration tests

### Management Web
- `apps/management-web/src/lib/requests/users.ts` -- Full request helpers
- `apps/management-web/src/app/(management)/users/UsersListPageClient.tsx` -- Paginated table
- `apps/management-web/src/app/(management)/users/page.module.scss` -- Updated styles
- `apps/management-web/src/app/(management)/users/[id]/page.tsx` -- Detail page
- `apps/management-web/src/app/(management)/users/[id]/UserDetailPageClient.tsx` -- Detail + invite links
- `apps/management-web/src/app/(management)/users/[id]/page.module.scss` -- Detail styles
- `apps/management-web/src/app/(management)/users/[id]/edit/page.tsx` -- Edit page
- `apps/management-web/src/app/(management)/users/[id]/edit/EditUserPageClient.tsx` -- Edit form
- `apps/management-web/src/app/(management)/users/[id]/edit/page.module.scss` -- Edit styles
- `apps/management-web/i18n/originals/en-US.json` -- New i18n keys

### Shared UI
- `packages/ui/src/components/table/Table/Table.tsx` -- Table compound component
- `packages/ui/src/components/table/Table/Table.module.scss` -- Table styles
- `packages/ui/src/components/table/Table/index.ts` -- Barrel export
- `packages/ui/src/components/navigation/Pagination/Pagination.tsx` -- Pagination component
- `packages/ui/src/components/navigation/Pagination/Pagination.module.scss` -- Pagination styles
- `packages/ui/src/components/navigation/Pagination/index.ts` -- Barrel export
- `packages/ui/src/index.ts` -- Updated barrel exports
