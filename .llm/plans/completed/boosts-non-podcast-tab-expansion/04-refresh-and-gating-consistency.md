# 04 Refresh And Gating Consistency

## Objective
Ensure post-boost list refresh and boost-action/tab gating stay consistent across all supported surfaces.

## Targets
- `apps/web/src/contexts/Modals.tsx`
- `apps/web/src/components/Boost/BoostFormBase.tsx`
- Newly integrated non-podcast list routes

## Tasks
1. Confirm each newly supported Boosts tab route consumes `publicBoostMessagesRefreshTrigger`.
2. Confirm successful boost actions trigger `bumpPublicBoostMessagesRefresh`.
3. Verify no route shows Boosts tab with action disabled due to inconsistent gating inputs.
4. Keep Donate page behavior unchanged.

## Acceptance
- Post-boost refresh works on every supported Boosts-tab surface.
- Shared eligibility policy is consistent across action and tab entry points.
