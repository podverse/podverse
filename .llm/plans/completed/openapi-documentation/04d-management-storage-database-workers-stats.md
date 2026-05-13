# 04d: Management API Storage, Database, Workers, and Stats Subplan

## Scope
- `/storage/*`
- `/database/*`
- `/workers/*`
- `/stats/*`

## Documentation Focus
- allowlist and safety constraints for database routes
- destructive operation warnings for storage deletes
- workers command catalog semantics
- stats query parameter semantics

## Required Safety Notes
- clearly mark destructive operations
- document required privilege level
- include guidance on expected large responses or expensive queries

## Edge Cases
- table not allowlisted
- object not found
- bulk delete partial failures
- invalid stats entity types

## Exit Criteria
- High-impact infra operations include explicit constraints and failure modes.
- Database and storage routes have clear safety/permission language.
