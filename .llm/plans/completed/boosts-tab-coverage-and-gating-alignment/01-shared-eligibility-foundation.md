# 01 Shared Eligibility Foundation

## Objective
Create one shared eligibility decision point for boost UI behavior so tab visibility and action visibility cannot drift.

## Files In Scope
- `apps/web/src/utils/value/boostEligibility.ts` (new)

## Tasks
1. Add a shared function:
   - `getBoostEligibilityForContent({ channel, item })`
2. Return a stable contract:
   - `canShowBoostAction`
   - `canShowBoostMessagesTab`
3. Compute eligibility from:
   - resolved channel MetaBoost metadata (`channel_meta_boost`)
   - value-tag presence (`channel_values.length > 0`)
   - required IDs (`podcast_guid`, optional `item.guid` when item scoped)
4. Keep this file side-effect free and UI-agnostic.

## DRY Guidelines
- Do not duplicate `resolveMetaBoostFromApiValueMetadata` checks elsewhere once this utility exists.
- Use this function in all boost tab/action visibility branches.

## Acceptance Criteria
- Utility exists and compiles.
- No consumer-specific assumptions embedded (no route-specific strings, no component imports).
