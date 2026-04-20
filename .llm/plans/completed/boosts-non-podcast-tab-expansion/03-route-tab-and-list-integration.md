# 03 Route Tab And List Integration

## Objective
Wire Boosts tabs and BoostMessagesSection into non-podcast detail routes.

## Routes
- `apps/web/src/app/artist/[channel_id]/*`
- `apps/web/src/app/album/[channel_id]/*`
- `apps/web/src/app/track/[item_id]/*`
- `apps/web/src/app/podcast/livestream/[item_id]/*`

## Tasks
1. Update list header tab arrays to include `boosts` when shared eligibility allows it.
2. Update list components to render `BoostMessagesSection` for `type === 'boosts'`.
3. Build and guard `boostsPageFetcher` with shared eligibility and required IDs.
4. Keep non-boost tabs/filters/sorting behavior unchanged.

## Acceptance
- Boosts tab appears only on eligible routes.
- Tab is hidden if fetcher cannot be built.
- Existing route behavior is not regressed.
