# Add by RSS - API Progress and Results

## Goal

Provide a lightweight progress and result surface for Add by RSS parsing requests.

## Scope

- Status values and response shapes.
- Storage for in-flight progress and results (temporary).
- Hash update behavior for parsed results.

## Key Files

- Account controllers:
  [apps/api/src/controllers/account/](/Users/mitcheldowney/repos/pv/podverse/apps/api/src/controllers/account/)
- MQ response handling (if applicable):
  [packages/mq/src/](/Users/mitcheldowney/repos/pv/podverse/packages/mq/src/)

## Plan

1. Define status values:
   - queued, processing, parsed, not_modified, failed.
2. Return parsed payload + updated hash when parsed.
3. Return not_modified when hash matches current feed state.
4. Decide on temporary storage for status/results (to be detailed later).
