# Phase 05 - v4v Helpers and Shared Utilities

## Targets

- `packages/v4v-helpers/src/recipients.ts`
- Selected high-value helper modules touched by payment/value logic.

## Test Intent

- Protect split normalization and amount-calculation invariants.
- Ensure rounding and sum constraints remain stable.

## Planned Test Areas

1. **Split normalization**
   - Empty/invalid splits fallback behavior.
   - Redistribution after rounding to total 100.
   - Min-percent behavior for very small splits where applicable.

2. **Amount calculations**
   - Deterministic per-recipient allocations.
   - Integer rounding behavior with sum consistency.

3. **Sort behavior**
   - Split-descending stability for expected ties/ordering.

## Verification

```bash
./scripts/nix/with-env npm run test -w packages/v4v-helpers --if-present
```
