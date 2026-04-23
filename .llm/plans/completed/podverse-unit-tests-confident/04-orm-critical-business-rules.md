# Phase 04 - ORM Critical Business Rules

## Targets

- `packages/orm/src/services/deduplicator.ts`
- `packages/orm/src/services/membershipClaimToken.ts`

## Test Intent

- Protect high-impact business rules that affect persistence correctness.

## Planned Test Areas

1. **Deduplicator matching precedence**
   - GUID match preference and fallback behavior.
   - Prevent accidental duplicate-merge regressions.

2. **Membership claim token time handling**
   - Month extension logic for existing and expired memberships.
   - Validate guard behavior for invalid/expired token states.

## Verification

```bash
./scripts/nix/with-env npm run test -w packages/orm
```
