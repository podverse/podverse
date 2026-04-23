# Phase 3: Capability Parse and Fallback Policy

## Objective

Decide and codify how strict Podverse should be when capability payloads are partially malformed, especially around terms URL and optional threshold fields.

## Files

- `packages/v4v-metaboost/src/mbrssV1FetchCapability.ts`
- `packages/v4v-metaboost/src/mbV1FetchCapability.ts`
- `packages/v4v-metaboost/src/metaBoostCapabilityParseThresholdContext.ts`
- `apps/web/src/components/Boost/BoostFormFields.tsx`
- `apps/web/src/components/Boost/BoostMetaBoostInfo.tsx`

## Decision Gate

Choose one policy and apply consistently:

1. **Strict policy (default)**
   - Any invalid required capability field fails capability.
   - Optional threshold fields, if present but invalid, also fail capability.
2. **Soft-fallback policy**
   - Required fields still hard-fail.
   - Invalid optional threshold fields are ignored (null fallback), capability remains usable.

## Changes

1. Encode selected policy in parser functions with explicit comments.
2. Align boost-form user messaging to distinguish:
   - capability unreachable/server failure
   - capability invalid/unsupported response shape
3. Ensure terms URL behavior is intentional:
   - if strict, keep hard fail and explicit reason in logs/tests;
   - if soft fallback for terms URL is desired, define safe UI fallback path.

## Acceptance Criteria

- Capability parse behavior is deterministic and documented by tests.
- UI message semantics match the chosen parser policy.
