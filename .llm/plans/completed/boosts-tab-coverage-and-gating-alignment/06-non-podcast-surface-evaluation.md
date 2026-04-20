# 06 Non Podcast Surface Evaluation

## Objective
Determine whether artist/album/track/livestream pages can support Boosts tabs now, and explicitly document deferred cases.

## Surfaces To Evaluate
- `apps/web/src/app/artist/[channel_id]/*`
- `apps/web/src/app/album/[channel_id]/*`
- `apps/web/src/app/track/[item_id]/*`
- `apps/web/src/app/podcast/livestream/[item_id]/*`

## Evaluation Checklist
1. Query-param type supports `boosts` on the route.
2. List header includes Boosts tab key.
3. List component can render `BoostMessagesSection`.
4. Required scoped identifiers are available for messages fetcher.
5. Eligibility can be enforced with shared utility.

## Current Expected Outcome
- Keep these surfaces unsupported for Boosts tab in this iteration because route-level query-param contracts and list/tab structures do not currently include boosts support.
- Record this as an intentional defer, not an omission.

## Deliverable
- Add completion notes summarizing why these surfaces remain deferred and what is required to enable them safely in a follow-up.
