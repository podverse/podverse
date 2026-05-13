# 01b: Audit Management API Route Matrix

## Goal
Build a complete route-to-operation matrix for `apps/management-api/src/routes` (including `product/`) with explicit permission semantics.

## Inputs
- `apps/management-api/src/routes/*.ts`
- `apps/management-api/src/routes/product/*.ts`
- `apps/management-api/openapi.yml`
- management integration tests under `apps/management-api/src/routes/*.integration.test.ts`

## Required Columns
- route file
- method
- canonical path
- auth middleware chain
- permission gate (`superuser`, `requireCrud`, other)
- request validator/schema
- response shape source
- risk class
- openapi status

## High-Risk Priority Areas
- product pricing lifecycle operations
- product membership settings updates
- database operations
- storage delete/bulk operations
- admin account mutation flows

## Deliverables
1. Complete matrix with permission notes per operation.
2. Permission model appendix (`401` vs `403` expectation per route family).
3. Gap report sorted by risk.

## Exit Criteria
- Every management route mapped.
- Permission gate documented for every non-public operation.
- High-risk gaps queued first for documentation drafting.
