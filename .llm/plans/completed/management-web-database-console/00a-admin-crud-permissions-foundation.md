# Plan 00A - Admin CRUD Permissions Foundation

## Goal

Establish Podverse management-admin CRUD permission infrastructure before database console work.
Mirror the Metaboost pattern: explicit CRUD permission dimensions, route-level permission checks,
and UI flows to assign/update permissions safely.

## Scope

- Add a permission model for management admins (resource-level CRUD dimensions).
- Add middleware and auth payload support so permissions can be enforced server-side.
- Add admin create/update management flows to assign permissions.
- Enforce rule: an admin cannot change their own CRUD permissions.
- Implement canonical permission model only (clean-break, no legacy fallback paths).

## Target Files

- `apps/management-api/src/orm/entities/*`
- `apps/management-api/src/orm/services/*`
- `apps/management-api/src/lib/auth/*`
- `apps/management-api/src/lib/authz/*`
- `apps/management-api/src/routes/*`
- `apps/management-api/src/schemas/*`
- `apps/management-api/src/types/*`
- `apps/management-web/src/lib/requests/*`
- `apps/management-web/src/app/*`
- `apps/management-web/src/components/*`
- `infra/database/management/migrations/*`
- `infra/k8s/base/db/source/management/*` (or equivalent mirrored management DB source)

## Steps

1. Define permission data model:
   - Add CRUD permission columns or permission table for management admins.
   - Use explicit dimensions aligned to upcoming management resources.
   - Include migration(s) and mirrored DB source changes.
2. Extend authenticated user payload:
   - Include role + permission shape in management auth context (`/auth/me` and middleware user).
3. Add permission middleware:
   - Implement `requireCrud(resource, op)` or equivalent.
   - Superuser bypass allowed; non-super must satisfy bit/flag checks.
4. Add admin management API endpoints:
   - Create/list/update admin accounts with permission assignment support.
   - Restrict sensitive operations according to role + permission policy.
5. Enforce self-permission guard:
   - Admins cannot change their own CRUD permissions.
   - Add explicit checks in controller/service (not UI-only).
6. Build management-web admin forms:
   - Add create/edit UI to assign CRUD permissions per admin.
   - Hide/disable forbidden actions according to current actor permissions.
7. Add integration coverage:
   - Permission matrix tests for allow/deny by operation and resource.
   - Self-permission-change denial tests.

## Acceptance Criteria

- Permissions are persisted and available in authenticated management user context.
- `requireCrud`-style checks protect write/read endpoints by resource and operation.
- Admin create/update flows support assigning and editing CRUD permissions.
- An admin cannot modify their own CRUD permissions.
- API and UI both reflect permission constraints, with API as source of truth.

## Risks

- Incomplete permission mapping may accidentally over-grant access.
- UI-only permission checks can be bypassed without strict server enforcement.
- Missing bootstrap seed strategy for initial superuser access can block first-time setup.
