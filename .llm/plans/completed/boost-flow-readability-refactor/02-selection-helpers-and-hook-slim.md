# 02 - Selection Helpers and Hook Slimming

## Objective

Reduce `useBoostSelection` complexity by moving non-React logic into pure helper functions.

## Scope

- Lightning value merge logic.
- Button tab derivation.
- MetaBoost resolution priority (item then channel) through shared strategy.

## Target Files

- `apps/web/src/components/Boost/hooks/useBoostSelection.ts`
- new helper module(s) under `apps/web/src/components/Boost/hooks/` or `apps/web/src/components/Boost/lib/`

## Implementation Steps

1. Extract merge helpers (`channel` and `item` variants).
2. Extract selection/tab helper(s).
3. Keep hook focused on state, effects, and return values.
4. Preserve current behavior for selected value priority and fallback.

## Acceptance Criteria

- Hook file is materially shorter and easier to read.
- Pure helpers contain the branching complexity.
- No behavior drift in selected value or metaBoost precedence.
