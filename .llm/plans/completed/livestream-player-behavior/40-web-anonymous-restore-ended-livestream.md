**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 40 — Web: anonymous restore retires an ended livestream

## Rows

R1, R3, R6, R33

## Runs after

10

## Goal

A signed-out visitor whose saved snapshot names a livestream that has ended gets an empty player
on the next page load, and the snapshot is cleared. A livestream that is still live or scheduled
restores paused as a real livestream (a `livestream` playback target), never as a podcast episode
with a saved position and duration.

The keep or retire decision uses only the item as the server returns it on this page load (plan
10's `resolveRestoredLivestream`). It never reads the stored copy of the item.

When the server gives no answer (offline, timeout, 5xx, 410), restore loads the stored copy
(R33, matching mobile plan 60's `load-stored`). Web keeps no item copy today; the snapshot is an
id plus a position. This plan makes `kind: 'item'` snapshots also keep the item and channel the
player held, and restore loads that copy only when the fresh read has no answer. A snapshot
written before this change has no copy; with no answer it loads nothing and is kept, which is
mobile's "no copy and no network" outcome.

Signed-out visitors have no server queue and no history, so "treat it like a finished item" here
means: clear the snapshot and leave the player empty. Plan 41 does the queue and history part for
signed-in members.

## What the code does today

- `writeAnonymousPlaybackSnapshotFromPlayerState` in
  `apps/web/src/utils/anonymousPlaybackStorage.ts` stores `kind: 'item'` for any `mpItem`,
  livestream included, with only the id, position, duration, and `updated_at`. It runs on every
  `updateNowPlaying` while logged out (`useQueueResourceUpdateNowPlaying`), whose params already
  carry `mpChannel`.
- `parseAnonymousPlaybackSnapshot` checks the known fields and returns
  `parsed as AnonymousPlaybackSnapshotV1`, so unknown fields pass through unchecked.
- `AnonymousPlaybackRestoreController.tsx`, `kind: 'item'` branch: reads the item by id, reads the
  channel, then loads it as `item-music`, `item-video`, or `item-podcast` with
  `explicitPlaybackSeconds` and `mediaFileDurationHintSeconds` from the snapshot. A livestream
  therefore loads through the non-live path with the snapshot's duration, and a failed read throws
  into the outer `catch` and restores nothing.

## Files

apps/web/src/lib/playback/fetchFreshRestoredItem.ts
apps/web/src/lib/playback/fetchFreshRestoredItem.test.ts
apps/web/src/utils/anonymousPlaybackStorage.ts
apps/web/src/utils/anonymousPlaybackStorage.test.ts
apps/web/src/components/Queue/AnonymousPlaybackRestoreController.tsx
apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md
tools/web/seed-e2e.mjs
apps/web/e2e/helpers/seedConstants.ts
apps/web/e2e/helpers/anonymousSnapshot.ts
apps/web/e2e/media-player-anonymous-restore.spec.ts
release-notes/scratchpad.md

## Change 1 — `fetchFreshRestoredItem` (shared by plans 40 and 41)

New file `apps/web/src/lib/playback/fetchFreshRestoredItem.ts`. It sits next to the existing
`index.ts` barrel; do not add it to that barrel. Callers import it by path.

```typescript
import type { DTOItem } from '@podverse/helpers';
import { resolveItemLiveStatusId } from '@podverse/helpers';
import { getStatusCodeFromError } from '@podverse/helpers-requests';
import type { FreshLiveItemStatusLookup, RestoredLivestreamDecision } from '@podverse/playback-core';
import { resolveRestoredLivestream } from '@podverse/playback-core';

import { getApiRequestService } from '../../factories/apiRequestService';

export type FreshRestoredItem = {
  /** The item as the server returned it on this read; null when the read failed or found nothing. */
  item: DTOItem | null;
  decision: RestoredLivestreamDecision;
};

/**
 * Reads a restored or adopted now-playing item from the server and decides whether it stays
 * loaded. A 404 is a missing item. Any other failure is no answer: the decision keeps the item
 * with `item: null`, and the caller loads the copy it already has.
 */
export async function fetchFreshRestoredItem(itemIdText: string): Promise<FreshRestoredItem> {
  let item: DTOItem | null = null;
  try {
    item = await getApiRequestService().reqItemGetByIdOrIdText(itemIdText);
  } catch (error: unknown) {
    const lookup: FreshLiveItemStatusLookup =
      getStatusCodeFromError(error) === 404 ? { kind: 'not-found' } : { kind: 'unavailable' };
    return { item: null, decision: resolveRestoredLivestream(lookup) };
  }
  if (!item) {
    return { item: null, decision: resolveRestoredLivestream({ kind: 'unavailable' }) };
  }
  return {
    item,
    decision: resolveRestoredLivestream({
      kind: 'status',
      statusId: resolveItemLiveStatusId(item),
    }),
  };
}
```

Notes for the implementer:

- `resolveItemLiveStatusId` (helpers) and `resolveRestoredLivestream` plus its two types
  (playback-core) come from plan 10. `apps/web` already depends on both packages and on
  `@podverse/helpers-requests`. Import playback-core from the package root, as
  `useAutoQueueLoadResources.tsx` does.
- `apiRequest` rethrows the axios error, and axios 1.x sets `error.status`, which
  `getStatusCodeFromError` reads. A merged item answers 410 and lands in `unavailable`.
- `keep` with `item: null` happens only for `status-unavailable`. Every caller reads it as "load
  the copy you already have".

## Change 2 — the snapshot keeps a copy of the item

In `apps/web/src/utils/anonymousPlaybackStorage.ts`. `ANONYMOUS_PLAYBACK_SNAPSHOT_VERSION` stays
`1`: the new fields are optional, older rows parse without them, and older builds ignore them.

Add `DTOChannel` to the existing `@podverse/helpers` type import (the file already imports
`DTOClip`, `DTOItem`, `DTOItemSoundbite` as types; keep one `import type` line for that module).

`AnonymousPlaybackSnapshotV1`: add after `media_file_duration_seconds`:

```typescript
  /**
   * The item and channel the player held, kept only for `kind: 'item'`. Restore loads this copy
   * only when the server gives no answer for the item; the server's answer always wins.
   */
  stored_item?: DTOItem;
  stored_channel?: DTOChannel;
```

`AnonymousPlaybackWriteInput`: add `mpChannel?: DTOChannel | null;` after `mpItemSoundbite`. The
`useQueueResourceUpdateNowPlaying` call passes its whole params object, which already has
`mpChannel`, so no caller changes.

Two type guards above `parseAnonymousPlaybackSnapshot`:

```typescript
/** A stored item copy must name the snapshot's own item; anything else is dropped. */
function isStoredItemCopy(value: unknown, idText: string): value is DTOItem {
  return isPlainObject(value) && value.id_text === idText && typeof value.channel_id === 'number';
}

/** A stored channel copy must be the stored item's channel; anything else is dropped. */
function isStoredChannelCopy(value: unknown, channelId: number): value is DTOChannel {
  return isPlainObject(value) && value.id === channelId && typeof value.id_text === 'string';
}
```

`parseAnonymousPlaybackSnapshot`: replace the final `return parsed as AnonymousPlaybackSnapshotV1;`
with:

```typescript
    const { stored_item: storedItem, stored_channel: storedChannel, ...fields } = parsed;
    // The checks above validated every field `AnonymousPlaybackSnapshotV1` requires.
    const snapshot = fields as AnonymousPlaybackSnapshotV1;
    if (
      parsed.kind === 'item' &&
      isStoredItemCopy(storedItem, parsed.id_text) &&
      isStoredChannelCopy(storedChannel, storedItem.channel_id)
    ) {
      return { ...snapshot, stored_item: storedItem, stored_channel: storedChannel };
    }
    return snapshot;
```

A malformed or mismatched copy is dropped and the row is kept, so the saved position survives.
The one assertion is the one the function already had, moved; keep its comment.

`writeAnonymousPlaybackSnapshotFromPlayerState`: after the `media_file_duration_seconds` block and
before `writeAnonymousPlaybackSnapshot`, add:

```typescript
  if (
    resolved.kind === 'item' &&
    input.mpItem !== null &&
    input.mpChannel !== null &&
    input.mpChannel !== undefined &&
    input.mpChannel.id === input.mpItem.channel_id
  ) {
    snapshot.stored_item = input.mpItem;
    snapshot.stored_channel = input.mpChannel;
  }
```

Clip and soundbite snapshots keep no copy; their restore never makes a status decision.

## Change 3 — anonymous restore, `kind: 'item'` branch

In `apps/web/src/components/Queue/AnonymousPlaybackRestoreController.tsx`, replace the block from
`const fullItem = await api.reqItemGetByIdOrIdText(snapshot.id_text);` to the end of the `try`
body. Leave the `clip` and `item_soundbite` branches unchanged.

```typescript
        const loadRestoredItem = (item: DTOItem, channel: DTOChannel) => {
          if (checkIsLiveItem(item)) {
            mediaPlayerResourceUpdateRef.current({
              target: playbackTargetLivestream(channel, item),
              itemChapterShouldSeek: false,
              enclosureSelectedParams: 'use-active-item-or-default',
              skipMoveNowPlayingToHistory: false,
              newAutoQueueConfig,
              autoQueueShouldClear: true,
            });
            return;
          }
          // existing `const target = fullChannel.medium_id === MediumEnum.Music ? … : …;` and the
          // existing `mediaPlayerResourceUpdateRef.current({ target, … })` call, unchanged except
          // that they read `item` and `channel` in place of `fullItem` and `fullChannel`
        };

        const restored = await fetchFreshRestoredItem(snapshot.id_text);
        if (loggedInAccountRef.current) {
          return;
        }
        if (restored.decision.action === 'retire') {
          clearAnonymousPlaybackSnapshot();
          return;
        }
        const fullItem = restored.item;
        if (fullItem === null) {
          if (snapshot.stored_item !== undefined && snapshot.stored_channel !== undefined) {
            loadRestoredItem(snapshot.stored_item, snapshot.stored_channel);
          }
          return;
        }
        const fullChannel = await api.reqChannelGetByIdOrIdText(fullItem.channel_id);
        if (!fullChannel || loggedInAccountRef.current) {
          return;
        }
        loadRestoredItem(fullItem, fullChannel);
```

- A livestream loads with no `explicitPlaybackSeconds` and no `mediaFileDurationHintSeconds`. A
  livestream has no saved position, and the snapshot's duration must not reach the player. This
  holds for the stored copy too: a copy whose `live_item` is set loads as a `livestream` target.
- `fullItem === null` here means `status-unavailable` (offline, timeout, 5xx, 410). The stored
  copy loads paused with the snapshot's position and duration, exactly as today's restore loaded
  the item. With no copy (a snapshot written before this change), nothing loads and the snapshot
  is kept for the next load. Nothing is logged: no answer is expected when offline.
- The retire branch runs for any `retire`, including a 404 on a snapshot that was never a
  livestream. Clearing a snapshot that names a missing item is correct either way.
- Imports: `fetchFreshRestoredItem` from `'../../lib/playback/fetchFreshRestoredItem'`;
  `playbackTargetLivestream` added to the existing `'../../lib/playback'` import, which already
  brings `playbackTargetFromStandardLoad` (the barrel re-exports both); `checkIsLiveItem` from
  `'../../utils/mediaPlayer/mediaPlayerItemEnclosureType'`; `DTOChannel` and `DTOItem` on a new
  `import type` line from `'@podverse/helpers'` next to the existing `MediumEnum` value import.

The restore still loads paused: `shouldPlay` and `isPlaying` stay unset, as in the other
branches.

## Change 4 — decision matrix

In `apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md`:

- § 2 table: add a row after the `item` (music) row and before **logged in**:
  - Snapshot `kind`: `` `item` (livestream) ``
  - `currentTime`: "None; the live element starts at the live point when played"
  - `mpIsPlaying`: `false`
  - Side effects: "The item is read fresh by id (`fetchFreshRestoredItem`). Ended or not found: the
    snapshot is cleared and the player stays empty. Live or scheduled: loads as a `livestream`
    target with no saved position or duration."
- § 2: add two sentences after the table's closing note block: "The snapshot never decides whether
  the item is live; restore decides from the item the server returns on that load. When the server
  gives no answer (offline, timeout, 5xx, 410), restore loads the item and channel copy the
  snapshot kept (`stored_item`, `stored_channel`) with the saved position and duration, as a
  `livestream` target when the copy is a live item; a snapshot with no copy loads nothing and is
  kept."
- § 6a, the "Reload while live is playing" row: replace its right-hand cell with: "The snapshot
  stores `kind: 'item'` for a livestream. Restore reads the item fresh and calls
  `resolveRestoredLivestream`: Ended or not found clears the snapshot and leaves the player empty;
  Live or scheduled loads it paused as a `livestream` target; no answer loads the snapshot's
  stored copy. Signed-in reload: see § 3." Plan 41 writes the § 3 text this points to.
- § 6b: no change. § 6c "Test feed selection" table: add a row for the new seed item
  (Change 5): Slot "Live audio, ended", Choice "Feed `e2eLiveAvChn01` / item `e2eLiveEnded01`,
  status ended, start three days ago", Source the seed link used by the other rows, Scope
  "Restore retires an ended livestream (anonymous-restore and livestream queue-restore specs)".
- "Cross-cutting side effects glossary":
  - The `clearAnonymousPlaybackSnapshot()` row: change "When it fires" from "On login" to "On
    login, and on restore when the snapshot's item is an ended livestream or no longer exists".
  - The `writeAnonymousPlaybackSnapshotFromPlayerState` row: append to "When it fires": "; an
    `item` snapshot also keeps the item and channel the player held".

The file is checked by Prettier. After editing, run
`npx prettier --write apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md` so the
tables stay aligned (formatting only, not a test).

## Change 5 — seed an ended livestream

`tools/web/seed-e2e.mjs`:

- Next to `E2E_LIVE_AV_STALE_SCHEDULED_ITEM_TITLE` (around line 340), add
  `const E2E_LIVE_AV_ENDED_ITEM_ID_TEXT = 'e2eLiveEnded01';` (14 characters, inside the 9–15
  `nano_id_v2` range) and `const E2E_LIVE_AV_ENDED_ITEM_TITLE = 'E2E Ended Livestream';`.
- After the `E2E_LIVE_AV_STALE_SCHEDULED_ITEM_ID_TEXT` `insertLiveItem` call, add:

```javascript
  await insertLiveItem({
    idText: E2E_LIVE_AV_ENDED_ITEM_ID_TEXT,
    guidSlug: 'ended',
    title: E2E_LIVE_AV_ENDED_ITEM_TITLE,
    enclosureType: 'audio/mpeg',
    enclosureUrl: E2E_PODCAST_SHORT_ENCLOSURE_URL,
    statusName: 'ended',
    startsInDays: -3,
  });
```

- Add `ended ${E2E_LIVE_AV_ENDED_ITEM_ID_TEXT}` to the closing `console.log` list.

The start time is three days back on purpose. Ended live items older than one day
(`LIVE_ITEM_ENDED_VISIBILITY_MAX_AGE_MS`, reference `end_time ?? start_time`) are hidden from list
endpoints, so `media-list-chips.spec.ts`, which asserts no "Ended" label on the livestream lists,
is unaffected. The item detail endpoint is unfiltered, which is the read restore uses.

`apps/web/e2e/helpers/seedConstants.ts`: after `E2E_LIVE_AV_STALE_SCHEDULED_ITEM_TITLE`, add
`E2E_LIVE_AV_ENDED_ITEM_ID_TEXT = 'e2eLiveEnded01'` and
`E2E_LIVE_AV_ENDED_ITEM_TITLE = 'E2E Ended Livestream'` as exported constants.

## Change 6 — E2E snapshot helper

`apps/web/e2e/helpers/anonymousSnapshot.ts` mirrors the production shape, so it gains the copy:

- `AnonymousSnapshotPayload`: add `stored_item?: unknown;` and `stored_channel?: unknown;`.
- `WriteAnonymousSnapshotArgs`: add `storedItem?: unknown;` and `storedChannel?: unknown;`.
- `buildSnapshotPayload`: copy each into `stored_item` / `stored_channel` when defined, the same
  way it copies `mediaFileDurationSeconds`.

`unknown` is right here: the spec passes JSON bodies read from the API, and the production parser
is what validates them.

## Tests

- New `apps/web/src/lib/playback/fetchFreshRestoredItem.test.ts` (vitest). Mock
  `'../../factories/apiRequestService'` so `getApiRequestService()` returns an object with a
  `reqItemGetByIdOrIdText` `vi.fn()`. One `it` each:
  - a returned item whose `live_item.live_item_status.id` is `LiveItemStatusEnum.Live` → item
    returned, decision `{ action: 'keep', reason: 'live' }`;
  - Ended → item returned, `{ action: 'retire', reason: 'ended' }`;
  - an item with `live_item: null` → item returned, `{ action: 'keep', reason: 'not-live-item' }`;
  - the request rejects with `{ status: 404 }` → item null, `{ action: 'retire', reason: 'not-found' }`;
  - rejects with `{ status: 503 }` → item null, `{ action: 'keep', reason: 'status-unavailable' }`;
  - rejects with `new Error('network')` → same as 503;
  - resolves `null` → item null, `status-unavailable`.
  Fixtures carry only the fields read, cast once with a one-line comment, as
  `useMediaPlayerControllerQueueHeadLoading.test.tsx` does.
- `apps/web/src/utils/anonymousPlaybackStorage.test.ts`, next to the existing writer and parser
  cases, with item and channel fixtures in the file's existing style (`{ id: 1, id_text: 'item-1',
  channel_id: 5 }`, `{ id: 5, id_text: 'channel-5' }`):
  - writer, `item` with `mpChannel` whose `id` matches → the stored row has `stored_item` and
    `stored_channel` equal to the inputs;
  - writer, `item` with `mpChannel` omitted, or with a different `id` → no `stored_item` or
    `stored_channel` key;
  - writer, `clip` with `mpChannel` → no copy keys;
  - parser, a row with a matching copy → both copy fields returned;
  - parser, a copy whose `stored_item.id_text` differs from `id_text`, or with `stored_channel`
    missing, or with `stored_channel.id` not equal to `stored_item.channel_id` → the row parses
    with no copy keys (not `null`);
  - parser, a `clip` row carrying a copy → parses with no copy keys.
- `apps/web/e2e/media-player-anonymous-restore.spec.ts`, three tests after the music near-end
  test. Extend the file's doc comment with one bullet: "§ 2 — a livestream snapshot is decided from
  the item the server returns: ended clears the snapshot, live restores a paused livestream, and no
  answer restores the snapshot's stored copy."
  1. "First page load while logged out for a snapshot of an ended livestream clears the snapshot
     and leaves the player empty"
     - `writeAnonymousSnapshotBeforeNavigation(page, { kind: 'item', itemIdText:
       E2E_LIVE_AV_ENDED_ITEM_ID_TEXT, playbackPositionSeconds: 42, mediaFileDurationSeconds:
       120 })`, then `page.goto('/')`.
     - `await expect.poll(async () => readAnonymousSnapshotFromPage(page)).toBeNull();` (this
       proves the restore ran).
     - `expectMediaPlayerTitleAbsent(page, E2E_LIVE_AV_ENDED_ITEM_TITLE)` and
       `await expect(liveStreamMediaElement(page, 'audio')).toHaveCount(0)`.
  2. "First page load while logged out for a snapshot of a live livestream restores it paused as
     a livestream"
     - Snapshot `E2E_LIVE_AV_AUDIO_ITEM_ID_TEXT`, position 42, duration 120; `page.goto('/')`.
     - `expectMediaPlayerTitleVisible(page, E2E_LIVE_AV_AUDIO_ITEM_TITLE)`.
     - `await expect(liveStreamMediaElement(page, 'audio')).toHaveCount(1)` and
       `expectSingleSourcedMediaElement(page)`. Loading through the non-live path would give the
       hidden non-live `<audio>` a `src` as well.
     - `expectPersistentPlayerPlaying(page, false)`.
  3. "First page load while logged out restores the stored copy of a livestream when the server
     cannot answer for the item"
     - Read the copy from the API with `page.request`: GET
       `` `${API_BASE_URL}/item/${E2E_LIVE_AV_AUDIO_ITEM_ID_TEXT}` `` (`storedItem`), then GET
       `` `${API_BASE_URL}/channel/${channelId}` `` (`storedChannel`), where `channelId` comes from
       `storedItem` narrowed with `typeof` / `in` checks (no `as`). Both bodies are the DTO itself.
       Add `const API_BASE_URL = 'http://localhost:4030/api/v2';` and derive the existing
       `API_LOGIN_URL` from it.
     - `await page.route((url) => url.pathname.endsWith(`/item/${E2E_LIVE_AV_AUDIO_ITEM_ID_TEXT}`),
       (route) => route.fulfill({ status: 503, body: '' }))`. Nothing else on `/` reads that path.
     - `writeAnonymousSnapshotBeforeNavigation(page, { kind: 'item', itemIdText:
       E2E_LIVE_AV_AUDIO_ITEM_ID_TEXT, playbackPositionSeconds: 0, storedItem, storedChannel })`;
       `page.goto('/')`.
     - `expectMediaPlayerTitleVisible(page, E2E_LIVE_AV_AUDIO_ITEM_TITLE)`,
       `await expect(liveStreamMediaElement(page, 'audio')).toHaveCount(1)`,
       `expectPersistentPlayerPlaying(page, false)`, and
       `expect(await readAnonymousSnapshotFromPage(page)).not.toBeNull()` (the snapshot is kept).
  - Import `liveStreamMediaElement`, `expectSingleSourcedMediaElement`, and
    `expectPersistentPlayerPlaying` from `./helpers/mediaPlayerAssertions`, and the new constants
    plus `E2E_LIVE_AV_AUDIO_ITEM_ID_TEXT` / `E2E_LIVE_AV_AUDIO_ITEM_TITLE` from
    `./helpers/seedConstants`. Keep the file's existing `test.setTimeout(20_000)`.

## Release scratchpad

## Web: a saved livestream that has ended no longer reloads for signed-out visitors

- Surfaces: web
- Change: on page load, a signed-out visitor's saved now-playing item is read fresh from the
  server. When it is a livestream whose status is ended, or the item no longer exists, the saved
  snapshot is cleared and the player stays empty. A livestream that is still live or scheduled
  restores paused as a livestream, without the saved position or duration of an episode. Before,
  an ended livestream reloaded into the player, and a live one loaded through the episode path
  with the last saved duration. The saved snapshot now also keeps a copy of the item and its
  podcast, so when the server cannot be reached the player restores that copy, paused at the saved
  position, as it did before. A snapshot saved by an earlier version has no copy, so with no
  server answer nothing restores and the snapshot is kept for the next load.
- Who notices: signed-out web listeners who were on a livestream when they left
- Operator steps: none; the E2E seed adds an ended live item `e2eLiveEnded01`
