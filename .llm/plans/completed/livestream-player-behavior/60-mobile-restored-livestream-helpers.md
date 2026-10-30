**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 60 — Mobile restored-livestream helpers

## Rows

- R2, R4, R7 (mobile): the pure pieces that plan 61 wires into `PlaybackProvider.tsx`. This plan
  changes no runtime behavior by itself except that livestream targets now get a last-playback
  snapshot (Change 2).
- R35: `resolveRestoredItemLoad` retires on any `not-found`, including an item that was not known
  to be live. `knownLiveBeforeFetch` stays on the argument and does not change that result.

## Runs after

- 10 (`resolveRestoredLivestream` in `@podverse/playback-core`, `resolveItemLiveStatusId` in
  `@podverse/helpers`).

## Goal

Give mobile three small, unit-tested pieces:

1. A repository read that fetches an item fresh from the server and reports 404 apart from other
   failures (Change 1).
2. A last-playback snapshot for a livestream, marked `is_live: true`, so a cold start knows the
   restored item was a livestream and must be checked fresh (Change 2).
3. A pure decision, `resolveRestoredItemLoad`, that turns the fresh read into "load this item",
   "load what you already have", or "retire" (Change 3).

Reuse: the keep or retire rule is `resolveRestoredLivestream` from plan 10. The status read is
`resolveItemLiveStatusId` from plan 10. Do not re-derive either. Parity source: web's
`fetchFreshRestoredItem` in plan 40 Change 1 (same three-way result, same 404 rule).

Mobile source already imports value exports from the `@podverse/helpers` barrel (for example
`ONE_HOUR_MS` in `channelLiveStatus.ts`). Import `resolveItemLiveStatusId` from
`@podverse/helpers` and the playback-core pieces from `@podverse/playback-core/restoredLivestream`.

## Files

apps/mobile/src/data/repositories/playbackContentRepository.ts
apps/mobile/src/lib/playback/lastPlaybackStorage.ts
apps/mobile/src/lib/playback/lastPlaybackStorage.test.ts
apps/mobile/src/lib/playback/restoredItemLoad.ts
apps/mobile/src/lib/playback/restoredItemLoad.test.ts

## Change 1 — `fetchFreshItemByIdText` in `playbackContentRepository.ts`

Add a method on the exported `playbackContentRepository` object, next to `getItemByIdText`:

```typescript
/**
 * The item as the server has it right now, for decisions that must not trust a stored copy (a
 * restored livestream's status). Never reads or writes the local store.
 */
fetchFreshItemByIdText: async (
  context: MobileAuthRequestContext,
  idText: string
): Promise<FreshRestoredItem> => {
  try {
    const item = await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqItemGetByIdOrIdText(idText)
    );
    return { item, kind: 'found' };
  } catch (error) {
    return getErrorResponseStatus(error) === 404 ? { kind: 'not-found' } : { kind: 'unavailable' };
  }
},
```

- The request call is the same one `getItemByIdText` makes (it resolves to the `DTOItem`).
- `getErrorResponseStatus` comes from `@podverse/helpers/error` (the import
  `directoryChannelGone.ts` uses). The offline-mode error (`ERR_OFFLINE_MODE`) has no response
  status, so it lands in `unavailable`, which is correct.
- `FreshRestoredItem` is a type import from `../../lib/playback/restoredItemLoad` (Change 3), on
  its own `import type` line.
- Do not log inside the catch. `unavailable` is an expected answer (offline at launch).

## Change 2 — snapshot livestreams in `lastPlaybackStorage.ts`

Snapshot shape: add one optional field to `LastPlaybackSnapshotV1`, after
`media_file_duration_seconds`:

```typescript
/** The item was playing as a livestream. Restore re-checks its status with the server. */
is_live?: true;
```

Keep `LAST_PLAYBACK_SNAPSHOT_VERSION` at `1`. Older builds parse the row and ignore the field;
this build reads older rows as `is_live` absent.

`parseLastPlaybackSnapshot`:

- After the `media_file_duration_seconds` check, reject the row (`return null`) when
  `parsed.is_live !== undefined && parsed.is_live !== true`.
- In the returned object, add `...(parsed.is_live === true ? { is_live: true } : {})` after the
  duration spread. The function copies known fields only; keep it that way.

`lastPlaybackIdentityFromTarget`:

- Return type becomes `{ kind: LastPlaybackKind; id_text: string; is_live?: true } | null`.
- `case 'livestream':` moves out of the `null` group. When `target.item === null`, return `null`.
  Otherwise return `{ id_text: target.item.id_text, is_live: true, kind: 'item' }`.
- `case 'add-by-rss':` still returns `null`.
- Update the doc comment above the function: livestream targets snapshot their item with
  `is_live`; Add by RSS targets are not snapshotted.

`lastPlaybackSnapshotFromTarget`: when `identity.is_live === true`, return

```typescript
{
  id_text: identity.id_text,
  is_live: true,
  kind: 'item',
  playback_position_seconds: 0,
  updated_at: new Date().toISOString(),
  v: LAST_PLAYBACK_SNAPSHOT_VERSION,
}
```

before the near-end check. A live item never reports `'finished'` and never stores a position
or duration (the engine's duration for a live window is not a file length). Leave the existing
path unchanged for every other target.

Callers need no edit: `writeLastPlaybackSnapshotForTarget` in `PlaybackProvider.tsx` already
writes whatever this returns, and `identityRemapRepository.ts` spreads the stored row, so
`is_live` survives a remap. `drainPlaybackJournal.ts` writes item rows without `is_live`;
plan 61 covers that with the stored copy's `live_item`.

## Change 3 — new `apps/mobile/src/lib/playback/restoredItemLoad.ts`

```typescript
import type { DTOItem } from '@podverse/helpers/dto';
import { resolveItemLiveStatusId } from '@podverse/helpers';
import type { FreshLiveItemStatusLookup } from '@podverse/playback-core/restoredLivestream';
import { resolveRestoredLivestream } from '@podverse/playback-core/restoredLivestream';

/** A fresh server read of one item by id. 404 is `not-found`; any other failure is `unavailable`. */
export type FreshRestoredItem =
  | { kind: 'found'; item: DTOItem }
  | { kind: 'not-found' }
  | { kind: 'unavailable' };

/**
 * What a cold-start restore does with an item it is about to load paused.
 *
 * - `load`: load this fresh item. It replaces the stored or queue copy, so a livestream that
 *   became a regular item, or a regular item that is live now, loads as the server has it.
 * - `load-stored`: no usable answer; load the copy already in hand, as before.
 * - `retire`: the livestream ended or is gone; treat it like a finished item.
 */
export type RestoredItemLoadDecision =
  | { action: 'load'; item: DTOItem }
  | { action: 'load-stored' }
  | { action: 'retire'; reason: 'ended' | 'not-found' };

export const freshLiveItemStatusLookup = (
  fresh: FreshRestoredItem
): FreshLiveItemStatusLookup => {
  switch (fresh.kind) {
    case 'found':
      return { kind: 'status', statusId: resolveItemLiveStatusId(fresh.item) };
    case 'not-found':
      return { kind: 'not-found' };
    case 'unavailable':
      return { kind: 'unavailable' };
  }
};

/**
 * `knownLiveBeforeFetch` does not change the result. Callers still pass it: on the snapshot path
 * it is what decided whether this read happened at all. A `not-found` result retires the item
 * whether or not it was known to be live. `unavailable` loads the copy already in hand.
 */
export const resolveRestoredItemLoad = (params: {
  fresh: FreshRestoredItem;
  knownLiveBeforeFetch: boolean;
}): RestoredItemLoadDecision => {
  const { fresh } = params;
  const decision = resolveRestoredLivestream(freshLiveItemStatusLookup(fresh));
  if (decision.action === 'retire') {
    return { action: 'retire', reason: decision.reason };
  }
  return fresh.kind === 'found' ? { action: 'load', item: fresh.item } : { action: 'load-stored' };
};
```

- Both switches stay exhaustive with no `default` (plan 10's rule).
- Named exports only. No React Native imports, so the file runs under vitest in node.
- Do not return `load-stored` for `not-found`. `resolveRestoredLivestream` already retires that
  lookup. Leave `knownLiveBeforeFetch` on the argument and do not read it: plan 61 still passes
  the flag it used to decide whether to fetch, and the two not-found tests lock that both values
  retire.

## Tests

- `apps/mobile/src/lib/playback/lastPlaybackStorage.test.ts`:
  - Add a `livestreamTarget` fixture
    (`{ channel: { id_text: 'channel-1' }, item: { id_text: 'item-live' }, kind: 'livestream' }`)
    and a `livestreamWithoutItemTarget` (`item: null`), in the file's existing `as PlaybackTarget`
    fixture style.
  - `lastPlaybackIdentityFromTarget`: the livestream target gives
    `{ id_text: 'item-live', is_live: true, kind: 'item' }`; the no-item livestream gives `null`.
    Rename the "skips add-by-rss targets" case only if its wording becomes wrong.
  - `lastPlaybackSnapshotFromTarget`: a livestream at position 1200 with duration 1210 returns a
    snapshot (not `'finished'`) with `is_live: true`, `playback_position_seconds: 0`, and no
    `media_file_duration_seconds` key.
  - `parseLastPlaybackSnapshot`: a row with `is_live: true` round-trips it; a row without it has
    no `is_live` key; a row with `is_live: false` or `'yes'` returns `null`.
- New `apps/mobile/src/lib/playback/restoredItemLoad.test.ts`, one `it` per row. Build items as
  minimal `DTOItem` fixtures with and without `live_item`, matching how plan 10's
  `liveItemStatus.test.ts` builds them:
  - found, Live → `load` with that item
  - found, Pending → `load`
  - found, Ended → `retire` / `ended`
  - found, no `live_item` → `load` (the item became a regular episode)
  - not-found, known live → `retire` / `not-found`
  - not-found, not known live → `retire` / `not-found`
  - unavailable, known live → `load-stored`
  - unavailable, not known live → `load-stored`
- No test for `fetchFreshItemByIdText`. It is a thin request wrapper. The not-found decision is
  the two rows above. Plan 62 does not cover a 404.

## Release scratchpad

none (plan 61 writes the mobile entry for the behavior this enables)
