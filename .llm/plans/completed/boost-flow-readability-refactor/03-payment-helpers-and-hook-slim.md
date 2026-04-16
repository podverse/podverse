# 03 - Payment Helpers and Hook Slimming

## Objective

Break `useBoostPayments` into named helper steps so the submit flow is human-readable.

## Scope

- Metadata request preparation and posting.
- Recipient payment execution loop.
- MB1 single-send POST after payments and fallback response handling.
- Error normalization and modal handoff logic.

## Target Files

- `apps/web/src/components/Boost/hooks/useBoostPayments.ts`
- new helper module(s) in Boost hook/lib area

## Implementation Steps

1. Extract helper for metadata request path (proxy/direct URL handling).
2. Extract helper for recipient payment execution per recipient type.
3. Extract helper for MB1 ingest POST behavior.
4. Keep top-level hook as step-oriented orchestration.

## MB1/Fallback Guardrail

- MB1 available/supported: execute MB1 ingest path, and do not enable bLIP fallback for that submission path.
- MetaBoost absent/unsupported: fallback path remains available.

## Acceptance Criteria

- `handleSubmitBoost` reads like clear workflow steps.
- Helper boundaries match behavior domains (metadata, payment, MB1 ingest, errors).
- MB1 precedence behavior is preserved.
