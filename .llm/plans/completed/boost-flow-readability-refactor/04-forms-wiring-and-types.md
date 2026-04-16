# 04 - Forms Wiring and Types

## Status

Completed in current branch.

## Objective

Update form-layer wiring and shared types so they cleanly consume the refactored hook/helper APIs.

## Scope

- `BoostFormBase` integration.
- `BoostAppDonateForm` integration.
- Boost types used by hooks/components.
- Keep donation and RSS-driven boost flows aligned with the same strategy surface.

## Target Files

- `apps/web/src/components/Boost/BoostFormBase.tsx`
- `apps/web/src/components/Boost/BoostAppDonateForm.tsx`
- `apps/web/src/components/Boost/types.ts`
- optionally `apps/web/src/utils/value/metaBoost.ts` if type contracts change

## Implementation Steps

1. Completed: form wiring now consumes slimmer hook/helper interfaces.
2. Completed with one explicit local tradeoff: shared types were tightened, while `BoostPaymentAppConfig` remains local to `useBoostPayments` pending a deliberate extraction decision.
3. Completed: donation path follows the same standard-resolution contract (MB1-first when supported, non-MB1 fallback otherwise).

## Acceptance Criteria

- Form components remain focused on UX and orchestration.
- No broken props or status handling regressions.
- Same behavior for donation, channel, and item boost contexts.
- Status marked complete so COPY-PASTA can advance to verification/deployment phases.
