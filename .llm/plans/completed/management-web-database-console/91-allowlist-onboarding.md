# Database Allowlist Onboarding

Use this checklist whenever adding a new table to the management database console.

## Goal

Enable new tables safely without exposing unintended data or write capability.

## Onboarding Steps

1. Define the table entry in policy registry:
   - table key and route alias,
   - allowed operations (read-only or mutable),
   - readable columns,
   - writable columns,
   - allowed filter and sort operators.
2. Define identity mapping:
   - primary key field(s),
   - row lookup strategy for detail/update/delete.
3. Add validation schemas:
   - query payload shape,
   - create/update payloads,
   - field-specific constraints.
4. Add permission mapping:
   - required resource key,
   - required operation for each endpoint.
5. Add tests:
   - allowlisted access succeeds,
   - non-allowlisted fields/ops fail,
   - permission-denied behavior returns correct status.

## Default Safety Settings

- New tables start as read-only.
- Write operations disabled unless explicitly approved.
- Hard pagination and filter limits enabled.

## Required Review Items

- Data classification and sensitivity review.
- PII/secret column redaction review.
- Audit logging coverage for write actions.
- Rollback plan if policy misconfiguration is detected.

## Promotion Criteria (Read-Only -> Writable)

- Endpoint and validation tests pass.
- Permission checks pass for all actor types.
- Audit logs verified in test environment.
- Feature flag exists and defaults to off in production.
