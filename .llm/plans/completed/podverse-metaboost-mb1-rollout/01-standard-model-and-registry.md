# 01 - Standard Model and Registry

## Objective

Introduce a thin, future-safe standard resolution layer so Podverse can support `mb1` now and add new standards with minimal changes.

## Scope

- Standard handler contract.
- MB1 initial handler.
- Resolver + soft-fail behavior.
- BTC-only guardrails at Podverse runtime boundary.

## Candidate Locations

- `packages/v4v-metaboost/src/` (preferred for reusable shared runtime logic)
- `apps/web/src/components/Boost/hooks/` (consumer side wiring only)

## Implementation Plan

1. Define standard-agnostic interfaces/types:
   - `MetaBoostStandardHandler`
   - `ResolvedMetaBoostStandard` (handler + normalized metadata)
   - `resolveMetaBoostStandard(input)`
2. Add MB1 handler:
   - matches `standard === 'mb1'` (case-insensitive normalization).
   - validates required `node` URL shape via existing MetaBoost helpers.
3. Add unknown-standard behavior:
   - return `null`/`unsupported` instead of throwing.
   - leave caller to continue legacy V4V flow.
4. Add BTC-only runtime guard:
   - handler can expose capabilities for future currencies,
   - Podverse execution path uses only BTC-compatible branch for now.
5. Keep existing `toMetaBoost(...)` behavior reusable; do not duplicate validation logic.

## Suggested Touchpoints

- `packages/v4v-metaboost/src/metaBoost.ts`
- `packages/v4v-metaboost/src/index.ts`
- new file(s) in `packages/v4v-metaboost/src/` for resolver/handlers

## Test Plan

- resolver returns MB1 handler for `mb1` standard.
- resolver returns unsupported for unknown standard.
- invalid node yields unsupported/fallback-safe result.
- BTC-only capability branch remains enforced by callers.

## Acceptance Criteria

- Call sites can ask one resolver function whether a standard is supported.
- MB1 works through handler contract.
- Unknown standards do not break user boosts.
