# 03 Header Boost Action Alignment

## Objective
Ensure global media header boost-action visibility uses the same eligibility policy as Boosts-tab visibility inputs.

## Files In Scope
- `apps/web/src/components/Media/Header/HeaderButtons.tsx`

## Tasks
1. Replace direct value-length gate (`channel_values.length > 0`) with shared eligibility utility.
2. Pass current channel/item context to the utility and use `canShowBoostAction`.
3. Keep existing modal open behavior unchanged (`setModalBoost({ channel, item })`).

## DRY Guidelines
- Do not duplicate MetaBoost parsing logic inside header components.
- Header component should consume eligibility output only.

## Acceptance Criteria
- Header boost button is rendered only when shared action eligibility is true.
- No behavior change for unrelated buttons (share/funding/rss/etc.).
