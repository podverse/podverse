# Phase 1: Post Flow Correctness

## Objective

Ensure boost submit state and success/failure outcomes reflect actual Metaboost ingest results.

## Files

- `apps/web/src/components/Boost/hooks/useBoostPayments.ts`
- `apps/web/src/components/Boost/payments/mbrssV1/mbrssV1RequestMetadata.ts`
- `apps/web/src/components/Boost/payments/mbV1/mbV1RequestMetadata.ts`

## Changes

1. Normalize metadata POST result semantics:
   - Replace nullable return from `postMbrssV1BoostMessage` / `postMbV1BoostMessage` with explicit success/failure result shape (or throw on failure).
   - Remove ambiguous `return null` success path.
2. In `useBoostPayments`, treat metadata ingest failures as non-success for final boost status:
   - Do not call `onBoostSuccess` when metadata post fails.
   - Preserve existing Lightning payment failure handling.
3. Fix loading-state lifecycle:
   - Guarantee `setIsSubmitting(false)` on every control path (including `sender_blocked` modal branch).
4. Keep existing sender-blocked modal behavior, but ensure it does not leave the form in pending state.

## Acceptance Criteria

- Submit spinner always clears after any Metaboost post outcome.
- No branch reports success when metadata ingest failed or was unreachable.
- Existing sender-blocked modal still appears for sender-blocked responses.
