# 01a: Audit Public API Route Matrix

## Goal
Build a complete, auditable route-to-operation matrix for `apps/api/src/routes` (including `product/`).

## Inputs
- `apps/api/src/routes/*.ts`
- `apps/api/src/routes/product/*.ts`
- `apps/api/openapi.yml`

## Required Columns
- route file
- method
- canonical path
- handler/controller
- auth mode (`public`, `cookie`, `bearer`, `either`)
- request source (validator/schema/type)
- response source (dto/entity/manual)
- risk class (`low`, `medium`, `high`)
- openapi status (`missing`, `partial`, `complete`)

## High-Risk Flags
Mark as `high` when operation is one or more of:
- auth/session/token issue or refresh
- payment/external webhook/integration callback
- mutable queue/process control
- mutation with cascading side effects

## Deliverables
1. Module-by-module matrix table.
2. Aggregate totals: endpoint count, missing count, partial count.
3. Top 10 high-risk undocumented operations.

## Exit Criteria
- All route files mapped.
- No `unknown` auth mode remaining.
- High-risk list reviewed before drafting phase starts.
