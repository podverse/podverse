**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 10 — Shared decision: keep or retire a restored livestream

## Rows

R5, R29

## Runs after

none

## Goal

One pure decision, called by web and mobile, that says whether a now-playing livestream
restored on app or page load (or adopted from another device) stays loaded or is treated as a
finished item. It trusts only the item's live status as freshly read from the server. It never
looks at `start_time`, `end_time`, or the copy of the item stored on the device.

Areas D (web) and F (mobile) call it. They own the fetch, and the "finished item" steps (move to
history, load the next queue item paused, or leave the player empty).

## Files

packages/helpers/src/lib/liveItemStatus.ts
packages/helpers/src/lib/liveItemStatus.test.ts
apps/web/src/lib/embed/resolveEmbedLiveItemStatus.ts
apps/web/src/lib/embed/__tests__/resolveEmbedLiveItemStatus.test.ts
packages/playback-core/src/restoredLivestream.ts
packages/playback-core/src/__tests__/restoredLivestream.test.ts
packages/playback-core/src/index.ts
packages/playback-core/package.json

## Change 1 — `resolveItemLiveStatusId` in `@podverse/helpers`

Live status is read from two DTO fields today: `live_item.live_item_status.id` (relation) and
`live_item.live_item_status_id` (column). `apps/web/src/lib/embed/resolveEmbedLiveItemStatus.ts`
already reconciles them in `resolveEmbedLiveItemStatusId`. Promote that function to helpers
(**reuse-beyond-components**) so every surface reads status one way.

In `packages/helpers/src/lib/liveItemStatus.ts` (already exported from
`packages/helpers/src/index.ts` with `export *`), add:

```typescript
import type { DTOItem } from '../dtos/item/item.js';

/**
 * The item's live status, or null when the item is not a live item. Reads the
 * `live_item_status` relation first, then the `live_item_status_id` column, because list and
 * detail responses do not always carry both.
 */
export function resolveItemLiveStatusId(
  item: Pick<DTOItem, 'live_item'>
): LiveItemStatusEnum | null {
  const liveItem = item.live_item;
  if (liveItem === null || liveItem === undefined) {
    return null;
  }
  const statusId = liveItem.live_item_status?.id ?? liveItem.live_item_status_id;
  if (statusId === null || statusId === undefined) {
    return null;
  }
  return statusId;
}
```

Keep the existing `LiveItemStatusEnum` value import; add the `DTOItem` type import on its own
line (**type-imports-separate-line**).

New `packages/helpers/src/lib/liveItemStatus.test.ts` (vitest, colocated like
`liveItemVisibility.test.ts`). Cover `resolveItemLiveStatusId`:

- `live_item` null → null; `live_item` undefined → null.
- relation and column both set to Ended → Ended.
- relation present, column set to a different value → the relation's value.
- relation missing (build the object without `live_item_status`), column Live → Live.

Also cover `getLiveItemStatusEnumValue` (it has no test today): `'ended'`, `' Live '`,
`'PENDING'` map to their enums; `'unknown'`, `''`, and `null` map to null.

## Change 2 — embed uses the shared resolver

In `apps/web/src/lib/embed/resolveEmbedLiveItemStatus.ts`:

- Delete `resolveEmbedLiveItemStatusId`.
- `isEmbedItemCurrentlyLive(item)` returns
  `resolveItemLiveStatusId(item) === LiveItemStatusEnum.Live`, importing
  `resolveItemLiveStatusId` and `LiveItemStatusEnum` from `@podverse/helpers`.
- `filterEmbedCurrentlyLiveChannelItems` is unchanged.

In `apps/web/src/lib/embed/__tests__/resolveEmbedLiveItemStatus.test.ts`, drop the
`resolveEmbedLiveItemStatusId` import and its two `expect` lines. Keep the
`isEmbedItemCurrentlyLive` and `filterEmbedCurrentlyLiveChannelItems` assertions.

No other file imports `resolveEmbedLiveItemStatusId` (checked: `EmbedPlayerInfo.tsx`,
`EmbedListRow.tsx`, `fetchEmbedListData.ts`, `fetchEmbedListPageClient.ts` import the other two).

## Change 3 — `resolveRestoredLivestream` in `@podverse/playback-core`

New file `packages/playback-core/src/restoredLivestream.ts`:

```typescript
import { LiveItemStatusEnum } from '@podverse/helpers';

/**
 * What the server said about a restored now-playing item, read fresh on this load.
 *
 * - `status`: the item was returned. `statusId` is `resolveItemLiveStatusId(item)` on the
 *   returned item, or the live status from a fresh Add by RSS parse. `null` means the item is no
 *   longer a live item.
 * - `not-found`: the server answered that the item does not exist (HTTP 404).
 * - `unavailable`: no answer: offline, timeout, 5xx, or any other failure.
 *
 * A copy of the item stored on the device, or a placeholder built from engine metadata, is never
 * a `status` lookup.
 */
export type FreshLiveItemStatusLookup =
  | { kind: 'status'; statusId: LiveItemStatusEnum | null }
  | { kind: 'not-found' }
  | { kind: 'unavailable' };

export type RestoredLivestreamDecision =
  | { action: 'keep'; reason: 'live' | 'pending' | 'not-live-item' | 'status-unavailable' }
  | { action: 'retire'; reason: 'ended' | 'not-found' };

/**
 * Whether a restored or adopted now-playing livestream stays loaded. Only an ended status or a
 * missing item retires it; every other answer, including no answer, keeps it, so a stream that
 * is really live is never hidden. Start and end times are never consulted.
 */
export function resolveRestoredLivestream(
  lookup: FreshLiveItemStatusLookup
): RestoredLivestreamDecision {
  switch (lookup.kind) {
    case 'unavailable':
      return { action: 'keep', reason: 'status-unavailable' };
    case 'not-found':
      return { action: 'retire', reason: 'not-found' };
    case 'status':
      switch (lookup.statusId) {
        case LiveItemStatusEnum.Ended:
          return { action: 'retire', reason: 'ended' };
        case LiveItemStatusEnum.Live:
          return { action: 'keep', reason: 'live' };
        case LiveItemStatusEnum.Pending:
          return { action: 'keep', reason: 'pending' };
        case null:
          return { action: 'keep', reason: 'not-live-item' };
      }
  }
}
```

Both switches are exhaustive (three lookup kinds; three enum members plus `null`), so
TypeScript accepts them without a `default`. Do not add a `default` or a trailing return: a new
enum member or lookup kind must fail type-check here rather than silently keep or retire.

Exports:

- `packages/playback-core/src/index.ts`: add
  `export { resolveRestoredLivestream, type FreshLiveItemStatusLookup, type RestoredLivestreamDecision } from './restoredLivestream.js';`
  next to the `resolvePlaybackLoadDecision` export, in the file's existing multi-line style.
- `packages/playback-core/package.json` `exports`: add a `"./restoredLivestream"` subpath with
  `types` `./dist/restoredLivestream.d.ts` and `default` `./dist/restoredLivestream.js`, after
  `"./resolveQueueAdvance"`.

## What callers must know (copy into the doc comment only as far as it is true of the code)

These are contracts for areas D and F. They are recorded in the area A final message and in the
playback-core livestream section that plan 11 writes; do not add them as comments here beyond the
doc comments above.

- Build the lookup from a fresh server read on this load: web anonymous restore fetches the item
  by id; signed-in restore reads the queue now-playing endpoint (its response is fresh server
  data); mobile reads the item by id or the queue now-playing endpoint; a cross-device adopted
  item is fetched by id. A 404 is `not-found`; any other failure is `unavailable`.
- Queue reads (`QueueResourceService` now playing, upcoming, history) already drop items that are
  not `Active`, so a live item removed from its feed vanishes from the signed-in queue head
  without this helper.
- `keep` with `not-live-item` means the fresh item is a regular item now; load it from the fresh
  DTO, not the stored copy.
- `retire` means: treat it like a finished item (history, then next queue item paused, or empty).

## Tests

- New `packages/helpers/src/lib/liveItemStatus.test.ts`: `resolveItemLiveStatusId` and
  `getLiveItemStatusEnumValue` cases listed in Change 1.
- New `packages/playback-core/src/__tests__/restoredLivestream.test.ts`, one `it` per row:
  - `status` Ended → `retire` / `ended`
  - `status` Live → `keep` / `live`
  - `status` Pending → `keep` / `pending`
  - `status` null → `keep` / `not-live-item`
  - `not-found` → `retire` / `not-found`
  - `unavailable` → `keep` / `status-unavailable`
- Updated `apps/web/src/lib/embed/__tests__/resolveEmbedLiveItemStatus.test.ts` per Change 2.

## Release scratchpad

none
