# 02 Messages Fetcher Scope Extension

## Objective
Enable public Boosts message fetching for non-podcast surfaces with explicit scope wiring.

## Primary Targets
- `apps/web/src/components/Boost/messages/fetchPublicBoostMessages.ts`
- `apps/web/src/components/Boost/messages/createMbrssBoostBreadcrumbLinkResolver.ts`
- `apps/web/src/utils/value/boostEligibility.ts`

## Tasks
1. Extend fetcher scope typing to support new non-podcast surfaces where API contract exists.
2. Add breadcrumb/link resolver behavior for new scopes.
3. Keep eligibility split policy intact:
   - `canShowBoostAction`: `mb-v1` or `mbrss-v1` with recipients.
   - `canShowBoostMessagesTab`: only when the fetch scope can be built and standard is supported for public messages.
4. Avoid duplicating MetaBoost parsing outside shared utility.

## Acceptance
- Fetcher supports each newly enabled surface scope.
- Resolver output is valid for each scope.
- Utility remains the single source of tab visibility decisions.
