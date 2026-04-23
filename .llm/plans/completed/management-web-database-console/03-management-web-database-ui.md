# Plan 03 - Management Web Database UI

## Goal

Add management-web navigation and pages for `/database` and `/workers`, including a generic database table browser/editor UI backed by management-api.

## Phase Gate

- Start only after `02` acceptance criteria and tests are complete.

## V1 Scope Lock

- `/database` UI in this phase supports only:
  - `feed`
  - `feed_flag_status`
  - `feed_flag_status_reason`
- No additional table UIs are included in this phase.

## Clean-Break Rule

- Canonical metadata and payload shapes only; no legacy UI state branches.

## Table Engine Decision

- Use `@tanstack/react-table` for table behavior and state:
  - column definitions,
  - sorting/filtering/pagination,
  - column visibility and row models.
- Use `@tanstack/react-query` for:
  - query caching,
  - request deduplication,
  - mutation invalidation for CRUD workflows.
- Keep rendering and forms custom:
  - custom page layout/components in `management-web`,
  - custom metadata-driven editors and action controls,
  - no full third-party admin UI framework.

## Target Files

- `apps/management-web/src/app/dashboard/*`
- `apps/management-web/src/app/database/*` (new)
- `apps/management-web/src/app/workers/*` (new)
- `apps/management-web/src/lib/requests/*` (new database request clients)
- `apps/management-web/src/lib/table/*` (new TanStack table/query helpers)
- `apps/management-web/i18n/originals/*.json` and locale overrides

## Steps

1. Dashboard updates:
   - Add links/cards for `/database` and `/workers`.
2. Workers route:
   - Add `/workers` page with Coming Soon messaging.
3. Database route foundation:
   - `/database` table index/list view.
   - `/database/[table]` list/query/filter/sort page.
   - `/database/[table]/new` create form.
   - `/database/[table]/[id]` detail/edit/delete page.
4. Add `@tanstack/react-table` and `@tanstack/react-query` integration:
   - build reusable state/controller hooks,
   - map table metadata + URL/query params to controlled table state.
5. Add request helpers for table metadata, querying, and mutations.
6. Add specialized UX affordance for feed status and reason editing.
7. Add loading/empty/error states and server-session route guards.

## Acceptance Criteria

- Admin can browse allowlisted tables and perform permitted CRUD actions.
- UI enforces metadata-driven field visibility/editability.
- `/workers` page is available and linked from dashboard.
- Table/query state is reusable and consistent across all `/database/*` views.
- All `/database` UI routes in v1 are limited to the three feed-related tables.

## Risks

- Dynamic forms can become brittle if metadata contracts are weak.
- Generic UI can be confusing without strong labels/help text per table.
- State drift between URL/UI/API payloads can occur without strict table-state mapping tests.
