# Podverse Confident Unit Tests - Master Plan

## Goal

Increase unit-test confidence for the most business-critical Podverse code paths without chasing exhaustive, brittle coverage.

## Confidence Target ("confident", not "bulletproof")

- Critical invariants are covered.
- Main failure paths are covered.
- Boundary conditions are covered where regressions are likely.
- We avoid low-value tests of framework internals or trivial pass-through code.

## Scope Priority

1. API auth and rate-limiting rules
2. Parser and ingestion guardrails
3. ORM business rules
4. v4v/shared utility business logic
5. Selective web business logic utilities/hooks
6. Maintenance skills and stop-line review

## Execution Order

1. `01-test-foundation-and-standards.md`
2. `02-api-auth-and-rate-limit.md`
3. `03-parser-and-ingestion-rules.md`
4. `04-orm-critical-business-rules.md`
5. `05-v4v-helpers-and-shared-utilities.md`
6. `06-web-high-value-business-logic.md`
7. `07-skill-files-and-maintenance-loop.md`
8. `08-coverage-review-and-stop-line.md`

## Required Commands (from monorepo root)

```bash
./scripts/nix/with-env npm run test -w apps/api
./scripts/nix/with-env npm run test -w packages/parser
./scripts/nix/with-env npm run test -w packages/orm
./scripts/nix/with-env npm run test -w packages/v4v-helpers --if-present
./scripts/nix/with-env npm run test -w apps/web
./scripts/nix/with-env npm run test
```

## Definition of Done

- New tests exist for each phase's listed targets.
- Tests are deterministic and pass locally.
- No low-signal over-granular test inflation.
- New repo-local skills are added for future guidance.
- A final stop-line review captures what was intentionally not tested yet.
