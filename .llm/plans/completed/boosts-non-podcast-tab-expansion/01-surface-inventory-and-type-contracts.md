# 01 Surface Inventory And Type Contracts

## Objective
Document and align per-surface query-param type contracts before adding Boosts tabs.

## Files To Inspect First
- `apps/web/src/app/artist/[channel_id]/ArtistPageListHeader.tsx`
- `apps/web/src/app/album/[channel_id]/AlbumPageListHeader.tsx`
- `apps/web/src/app/track/[item_id]/TrackPageListHeader.tsx`
- `apps/web/src/app/podcast/livestream/[item_id]/LivestreamPageListHeader.tsx`
- Related context/filter type files for these routes.

## Tasks
1. For each route, verify current `type` union values and whether `boosts` is allowed.
2. Add `boosts` to query-param type values only where route supports a valid Boosts messages scope.
3. Note required IDs per surface (channel GUID, item GUID, or alternative stable IDs).
4. Produce/refresh a short decision note for any surface that cannot yet support Boosts tab (likely `videos/page.tsx` if list-only).

## Acceptance
- Route type contracts are explicit and compile.
- No UI work starts until contract-level support is in place.
