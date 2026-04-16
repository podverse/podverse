# 01 - Boost Strategy and Registry

## Objective

Make standard routing explicit so web code can follow one clear decision path for MB1 vs fallback behavior.

## Scope

- Consolidate runtime decision entry point in `@podverse/v4v-metaboost`.
- Keep strategy output simple for web consumers.
- Preserve BTC-only guardrail for Podverse runtime.

## Target Files

- `packages/v4v-metaboost/src/metaBoostStandard.ts`
- optional new helper in `packages/v4v-metaboost/src/` for strategy result typing
- `packages/v4v-metaboost/src/index.ts`

## Implementation Steps

1. Define one strategy resolver for boost execution mode.
2. Ensure MB1-supported path is explicit and easy to read.
3. Ensure unsupported/unknown standard resolves to safe fallback mode.
4. Document extension path for future standards through same resolver.

## Acceptance Criteria

- Web layer can branch on a single strategy result.
- MB1 path is unambiguous.
- No direct, duplicated MB1 checks scattered in multiple files.
