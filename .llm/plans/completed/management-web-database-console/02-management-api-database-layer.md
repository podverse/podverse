# Plan 02 - Management API Database Layer

## Goal

Create a secure in-house generic data API in `management-api` for metadata, list/detail queries, and CRUD operations across allowlisted tables.

## Phase Gate

- Start only after `00a` and `01` acceptance criteria are complete.

## V1 Scope Lock

- Restrict allowlist to:
  - `feed`
  - `feed_flag_status`
  - `feed_flag_status_reason`
- Do not add other tables in this phase.

## Clean-Break Rule

- Canonical API contract only; no compatibility branches for older payloads.

## Target Files

- `apps/management-api/src/app.ts`
- `apps/management-api/src/routes/*` (new database routes)
- `apps/management-api/src/lib/*` (policy/authz/validation/query helpers)
- `apps/management-api/src/types/*`
- `apps/management-api/src/lib/auth/*`
- `apps/management-api/src/lib/database/*` (new policy + query engine helpers)

## Steps

1. Add database route module, for example:
   - `GET /database/tables`
   - `GET /database/:table/meta`
   - `POST /database/:table/query`
   - `GET /database/:table/:id`
   - `POST /database/:table`
   - `PATCH /database/:table/:id`
   - `DELETE /database/:table/:id`
2. Build policy registry:
   - allowlisted tables only,
   - field-level read/write constraints,
   - per-table operation flags (read-only vs mutable),
   - safe filter/sort operators by column type,
   - row identity mapping for detail/update/delete operations.
3. Implement query engine abstraction:
   - policy-aware query building via ORM/query builder patterns,
   - strict parameter binding only,
   - no browser-provided raw SQL execution.
4. Add validation layer for filters/sorts/pagination and mutation payloads.
5. Extend authz to enforce role permissions on all endpoints.
6. Return normalized response envelopes for table metadata and rows.

## Acceptance Criteria

- No endpoint allows non-allowlisted table access.
- Invalid filters/sorts are rejected predictably.
- Role checks block unauthorized CRUD operations.
- Feed status + reason table(s) are included in allowlist policy.
- Query payloads are safely constrained and cannot execute arbitrary SQL.
- All v1 endpoints operate only on the three feed-related allowlisted tables.

## Risks

- Generic route complexity can grow quickly without strict schema constraints.
- Role model gaps in management auth can delay secure rollout.
- Weak policy definitions can create accidental data exposure if allowlists are incomplete.
