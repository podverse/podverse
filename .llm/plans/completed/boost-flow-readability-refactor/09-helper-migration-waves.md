# 09 - Helper Migration Waves

## Objective

Migrate duplicate generic helpers to shared modules incrementally, starting with highest confidence and lowest risk.

## Wave 1 - Shared Helper Introduction (No Call-Site Changes)

### Scope

- Add shared helper modules/functions in `@podverse/helpers`.
- Add exports from `packages/helpers/src/index.ts`.
- Do not change consuming call sites yet.

### Acceptance

- New helper APIs compile and lint.
- No behavior changes introduced yet.

## Wave 2 - V4V Package Adoption

### Scope

- Replace local generic helpers in:
  - `packages/v4v-metaboost/src/mb1ConfirmPayment.ts`
  - other `v4v-metaboost` files where generic patterns match
  - `packages/v4v-btc-ln` safe candidates

### Acceptance

- No contract changes in request/response shaping.
- Existing MB1 and boost behavior remains intact.

## Wave 3 - App/Worker Adoption

### Scope

- Migrate safe generic helper duplication in app/worker code where semantics are equivalent.
- Prioritize files touched by the boost-flow and metaboost scope first.

### Acceptance

- No runtime behavior regressions in workers/web flow.
- Import layering remains valid.

## Wave 4 - Cleanup and Normalization

### Scope

- Remove now-dead local helper definitions.
- Normalize naming and comments.
- Ensure all migrated files use the shared helpers consistently.

### Acceptance

- No lingering duplicated generic helpers in migrated scope.
- Reduced local helper footprint with clearer intent.
