# Execution order — Feed Status Table Replacement

## Phase order

1. [01-schema-and-data-migration.md](./01-schema-and-data-migration.md)
2. [01b-status-mapping-and-transition-spec.md](./01b-status-mapping-and-transition-spec.md)
3. [02-orm-and-domain-services.md](./02-orm-and-domain-services.md)
4. [03-parser-pipeline-migration.md](./03-parser-pipeline-migration.md)
5. [04-archiver-lifecycle-migration.md](./04-archiver-lifecycle-migration.md)
6. [05-management-feed-ops-contract-migration.md](./05-management-feed-ops-contract-migration.md)
7. [05b-management-api-contract-lock.md](./05b-management-api-contract-lock.md)
8. [06-web-blocked-reason-and-takedown-i18n.md](./06-web-blocked-reason-and-takedown-i18n.md)
9. [07b-parity-fixture-matrix.md](./07b-parity-fixture-matrix.md)
10. [07-tests-and-removal-cutover.md](./07-tests-and-removal-cutover.md)

## Why this order

- Schema/lifecycle foundation must land first so all callers can target the same source of truth.
- Explicit mapping and transition rules are required before runtime implementation to avoid
  interpretation drift.
- ORM and domain-service boundaries must be updated before parser/archiver runtime migration.
- Parser and archiver need the new lifecycle model before management UI/API switches contracts.
- Management API contract lock must be completed before management-web and web integration.
- Web/i18n should follow API contract finalization to avoid temporary compatibility layers.
- Parity fixture matrix must be finalized before removal cutover execution.
- Physical table/column removal comes last after comprehensive parity tests pass.
