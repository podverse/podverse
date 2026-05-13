# 04a: Management API Auth and Admins Subplan

## Scope
- `/auth/*`
- `/admins/*`
- invite-link generation and redeem flow

## Documentation Focus
- admin authentication semantics
- role and permission dependencies
- superuser constraints for sensitive operations

## Required Coverage
- login/logout/me operation details
- admin CRUD request/response schemas
- invite/redeem lifecycle and failure cases

## Critical Error Semantics
- `401`: authentication missing/invalid
- `403`: authenticated but insufficient role/permission
- `404`: admin target missing

## Exit Criteria
- Auth and admin surfaces include role-aware behavior notes.
- Invitation flows are fully documented with examples.
