# 10 - Helper Consolidation Verification

## Objective

Validate helper consolidation safety and ensure architecture-compliant shared usage.

## Verification Dimensions

1. Type safety and linting
2. Behavior parity for migrated helper semantics
3. Import-layer correctness
4. Build stability for touched packages/apps

## Required Checks

- Re-scan for duplicated helper patterns in migrated scope.
- Confirm shared helper imports resolve from `@podverse/helpers`.
- Confirm semantics are preserved where variants intentionally differ.

## Commands

Run from repo root:

```bash
./scripts/nix/with-env npm run lint -w @podverse/helpers
./scripts/nix/with-env npm run lint -w @podverse/v4v-metaboost
./scripts/nix/with-env npm run lint -w @podverse/web
./scripts/nix/with-env npm run build:packages
./scripts/nix/with-env npm run build -w @podverse/web
```

## Acceptance Criteria

- No regressions in MB1/boost behavior from helper consolidation.
- Shared helpers are used where generic duplication previously existed.
- Remaining non-migrated helpers are intentionally documented (semantic mismatch or out-of-scope).
