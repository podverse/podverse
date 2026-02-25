# Query Param DRY Refactor - Execution Order

## Phase 1: Helpers Foundation (Sequential)

- `migration-01-helpers-dedupe.md`

Reason: API and web changes depend on the shared constants and types.

## Phase 2: Dependent Updates (Parallel)

- `migration-02-api-joi-refactor.md`
- `migration-03-web-updates.md`

## Phase 3: Verification (Sequential)

- Re-scan for duplicate query param arrays/types
- Confirm all Joi validations use shared constants
- Spot-check API and web imports compile cleanly
