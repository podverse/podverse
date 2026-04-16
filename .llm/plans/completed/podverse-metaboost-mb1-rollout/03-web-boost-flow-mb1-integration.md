# 03 - Web Boost Flow MB1 Integration

## Objective

Enable MB1 messaging behavior in web boost flows when valid supported MetaBoost metadata exists, and keep legacy boosts unchanged otherwise.

## Scope

- Selection logic: resolve standard and normalized metadata.
- Payment logic: MB1 metadata + confirm path only when resolver supports.
- Fallback behavior: no MetaBoost or unsupported standard uses current path.

## Implementation Plan

1. Update selection layer to resolve standard handler:
   - Source from item value metadata first, then channel metadata.
   - Normalize into a runtime object consumable by payment logic.
2. Update payment hook branching:
   - supported MB1: keep metadata request + recipient confirmation flow.
   - unsupported/absent: continue direct legacy payments.
3. Apply BTC-only guard in execution branch:
   - if metadata suggests unsupported currency for current Podverse runtime, fallback to legacy/no-MB1 path.
4. Keep UX resilient:
   - no hard failures from unknown standards.
   - optional informational logging for unsupported standards.

## Files to Update

- `apps/web/src/components/Boost/hooks/useBoostSelection.ts`
- `apps/web/src/components/Boost/hooks/useBoostPayments.ts`
- `apps/web/src/components/Boost/BoostFormFields.tsx` (only if UI messaging needs adjustment)
- `packages/v4v-metaboost/src/*` (consumer calls to new resolver)

## Test Plan

- with supported MB1 metadata: metadata call + confirm path used.
- without metadata: legacy flow used.
- unsupported standard: no crash, legacy flow used.
- BTC-only enforcement: non-BTC capability does not enter MB1 execution path.

## Acceptance Criteria

- MB1 functionality is auto-enabled for supported feeds.
- Non-MetaBoost feeds behave exactly as before.
- Standards architecture remains extensible.
