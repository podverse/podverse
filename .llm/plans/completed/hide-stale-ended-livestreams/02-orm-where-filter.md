# 02 — ORM where filtering for paginated ended lists

For the paginated queries that take `liveItemType`, when it is `ended`, AND the live_item match with `(end_time >= cutoff) OR (end_time IS NULL AND start_time >= cutoff)`. Because TypeORM ANDs fields inside a nested relation, express the OR as a two-element `where` array (each element repeats the shared conditions). When `liveItemType !== 'ended'`, keep the current single `where`.

## Helper

Add `packages/orm/src/lib/liveItemWhere.ts`:

```ts
import { IsNull, MoreThanOrEqual } from 'typeorm';

// returns the two live_item time variants for the ended cutoff
export function buildEndedLiveItemTimeVariants(cutoff: Date) {
  return [
    { end_time: MoreThanOrEqual(cutoff) },
    { end_time: IsNull(), start_time: MoreThanOrEqual(cutoff) },
  ];
}
```

Each method maps these into its where structure when `liveItemType === 'ended'`, producing a `where` array; otherwise a single where.

## Methods to update

- `packages/orm/src/services/item/item.ts` `getMany` (~301-334) — top-level `live_item` path. Covers global/category recent.
- `packages/orm/src/services/item/item.ts` `getManyByChannels` (~812-837) — subscribed recent.
- `packages/orm/src/services/stats/statsAggregatedItem.ts` `getMany` (~28-53) — global/category top; live_item path is `item.live_item`.
- `packages/orm/src/services/stats/statsAggregatedItem.ts` `getManyByChannelsAndCount` (~55-79) — subscribed top; uses `findAndCount`, so the count stays correct automatically since the cutoff is in the `where`.

## Notes

- Recent/top global+category responses set `meta.count = null` (`apps/api/src/controllers/item.ts` ~120-122, 172-174), so no separate count query needs updating.
- The cutoff Date comes from `getEndedLiveItemVisibilityCutoff()` (Phase 1).

## Verification

```bash
npm run build:packages
npm run test:e2e:api
```
