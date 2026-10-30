**Cursor model:** Opus 5.5 · **Reasoning:** extra high

# 61 — Mobile cold-start restore retires ended livestreams

## Rows

- R2 (mobile): an ended livestream does not load into the player on its own.
- R4 (mobile): treat it like a finished item. Move it to history, then load the next queue item
  paused, or leave the player empty.
- R7 (mobile): restore reads the item's status fresh from the server, not the copy on the device.
  This covers both the last-playback snapshot and the signed-in queue head.
- R9 (mobile): a now-playing item adopted from another device follows the same rule.
- R11 (mobile question): answered below; no code change for it.
- R35: a 404 from `fetchFreshItemByIdText` retires at each load site below. On the snapshot path,
  `knownLiveBeforeFetch` still decides whether that read runs. A 404 thrown by today's
  `getItemByIdText` retires only when the caller can see it (nothing stored); that is not a new
  read.

## Runs after

- 60 (mobile helpers), and so also 10.
- Area G edits `PlaybackProvider.tsx` after this plan. This plan changes only the three places
  named under Files, so G can rebase onto them.

## What must stay true

- **Fresh status only.** The keep or retire choice comes from `resolveRestoredItemLoad` (plan 60).
  Its `fresh` argument is a `playbackContentRepository.fetchFreshItemByIdText` result from this
  load. Never pass a stored copy, a queue-cache copy, or an engine-meta placeholder as `found`.
  No start or end time heuristics.
- **No answer, no change.** `load-stored` is only `unavailable` (offline, timeout, 5xx). It keeps
  today's restore.
- **Any 404 from a fresh read retires.** A `not-found` result from `fetchFreshItemByIdText` is
  `retire` at every load site, whether or not the item was known to be live.
  `knownLiveBeforeFetch` only decides whether the snapshot path calls that read. It does not keep
  a 404. Do not add a fresh read on the snapshot path for an item that was not known to be live.
- **`getItemByIdText` is not that fresh read.** Its 404 is visible to the caller only when nothing
  is stored, and only the snapshot path's caller sees that throw. A stored copy hides the 404.
  What each load site does with it is under that site.
- **Retire is quiet.** No toast, no alert, no playback event, no outbox entry, no
  `last_played_at` or `playback_event_kind` on the history write. Per
  **playback-meaningful-events**, app open does not bump recency. The history write is a queue
  zone move that the server status justified.
- **Paused.** Whatever loads after a retire loads with `autoPlayOverride: false`,
  `autoQueue: { mode: 'clear' }` and intent `session_restore`, the same as today's restore.
- **Nothing new on first paint.** Every fresh read happens inside the existing async restore and
  adopt work, which already runs after first paint.

## Files

apps/mobile/src/playback/PlaybackProvider.tsx
release-notes/scratchpad.md

Inside `PlaybackProvider.tsx`, change only these places:

1. `restoreFromSnapshot` (`useCallback`, the `kind: 'item'` tail after the clip and soundbite
   branches).
2. `adoptQueueHeadWhenPlayerEmpty` (`useCallback`): the step between choosing the resource to
   load and calling `playQueueResource(..., 'session_restore', ...)`.
3. The handoff-prompt `useEffect` that loops over the ordered conflicts, reads
   `queueRepository.getNowPlaying(context, conflict.queueIdText, { skipCache: true })`, and calls
   `setPlaybackHandoffPrompt`.

A small `useCallback` shared by the three (for example `readRestoredItemLoad`) may sit just above
`restoreFromSnapshot`. It wraps the stored-copy read, the `knownLiveBeforeFetch` computation, the
fresh read, and `resolveRestoredItemLoad`. On the snapshot path, a 404 thrown by `getItemByIdText`
retires inside that helper and does not call `fetchFreshItemByIdText`. If you add it, name it in
your final message for area G.

## Change 1 — `restoreFromSnapshot`, item branch

Today: `getItemByIdText` (local first), then `ensureChannel`, `snapshotStillCurrent()`, and
`startItemPlayback` paused.

New behavior for `snapshot.kind === 'item'`:

- Call `getItemByIdText` first, as today. Handle its rejection in this item branch only, not in
  the outer `catch` that also covers clips and soundbites. `getErrorResponseStatus` is the same
  helper plan 60 uses; add it to the existing `@podverse/helpers/error` import (`getErrorCode` is
  already imported from there).
- A thrown 404 means nothing was stored. `getItemByIdText` returns a stored copy instead of
  throwing when one exists (`playbackContentRepository.ts`: the request runs only when there is
  no copy, or the copy has no `item_values` array, and a stored copy is returned from the
  `catch`). If `snapshotStillCurrent()`, clear the snapshot and return. Do not call
  `fetchFreshItemByIdText`. This is the same clear-and-return as `retire` below, for an item the
  server says is missing, whether or not `snapshot.is_live` is set. Any other throw stays in
  today's `catch`: dev log, return, snapshot kept.
- `knownLiveBeforeFetch` is true when `snapshot.is_live === true`, or when the copy in hand
  (`getItemByIdText`'s result) gives `resolveItemLiveStatusId(item) !== null`. The second case
  covers snapshots written without `is_live`: the car journal in `drainPlaybackJournal.ts`, and
  rows written by builds before plan 60.
- When `knownLiveBeforeFetch` is false, do not call `fetchFreshItemByIdText`. Continue with
  today's load of the returned copy. A 404 that `getItemByIdText` swallowed is not visible here:
  the stored copy loads. Regular episodes that are already on the device cost no extra request.
- When it is true, call `fetchFreshItemByIdText` and `resolveRestoredItemLoad`:
  - `retire`, including `not-found`: if `snapshotStillCurrent()`, clear the snapshot
    (`clearLastPlaybackSnapshot`). Load nothing and return. The cold-start effect already calls
    `adoptQueueHeadWhenPlayerEmpty` after `restoreFromSnapshot` and does nothing for signed-out
    users, so signed-in users get the next queue head (Change 2) and signed-out users keep an
    empty player. Signed-out users have no server queue or history, so there is nothing to move.
  - `load`: use the fresh item in place of the stored copy for `ensureChannel` and
    `startItemPlayback`. `resolveItemPlaybackStart` then picks the livestream target, or the
    regular-item target if the item stopped being live.
  - `load-stored`: today's path with the copy in hand. This result is only `unavailable`, never
    `not-found`. The copy is the item `getItemByIdText` already returned, so this branch does not
    see a 404.
- Keep the existing `snapshotStillCurrent()` guard before any load or clear. Sign-in can clear the
  snapshot while a read is in flight.

## Change 2 — `adoptQueueHeadWhenPlayerEmpty`

The function picks `resourceToLoad`: the now-playing row, else the first upcoming row promoted to
now-playing, possibly from the fallback queue. It records `queueHeadAdoptAttemptedRef` and calls
`playQueueResource`. Server queue resources carry no `item.live_item` (`listResourceRelations` in
`packages/orm/src/services/queue/queueResource.ts` does not load it). A head that web wrote while a
livestream played therefore looks like a regular episode on mobile. Because of that, the fresh
read runs for **every** plain item head, not only known-live ones.

- Applies when the chosen resource is a plain item (the `resolveQueueResourceRef` kind for
  items). Clip, soundbite and Add by RSS heads keep today's path.
- `knownLiveBeforeFetch`: `resolveItemLiveStatusId` is non-null on the queue copy, or on
  `playbackContentRepository.getStoredItemByIdText(idText)` (local only, no request).
- `load`: call `playQueueResource({ ...resourceToLoad, item: freshItem }, 'session_restore', ...)`
  with today's options. Its `ensureItemValues` call becomes a no-op when the fresh item already
  carries values.
- `load-stored`: today's call. This result is only `unavailable`. `playQueueResource` then calls
  `ensureItemValues`, which calls `getItemByIdText` when the queue row has no `item_values`
  array. That call can receive a 404, and this function cannot see it. A stored copy is returned
  from `getItemByIdText`'s catch; if nothing is stored, `ensureItemValues` catches the throw and
  returns the queue row (`playbackContentRepository.ts`). Playback continues with that copy. Do
  not retire from it, and do not add a read. The fresh read already ran; a 404 from it is
  `retire` and never reaches `playQueueResource`.
- `retire`, including a 404 for an item that was not known to be live:
  1. Record the retired head's attempt key in `queueHeadAdoptAttemptedRef` first. The history
     write bumps `queueDataRevision`, the re-run effect fires, and it must not pick the same
     head again.
  2. If this session's cross-device role is `remote` right now (another session is the active
     device), write nothing and load nothing. The active device owns its queue head. Read the
     role through a ref if the cross-device hook is created below this callback.
  3. Otherwise call `queueRepository.moveNowPlayingToHistory(context, queueIdTextForLoad,
     { completed: true, idText, kind: 'item', playbackPosition: '0' })`. If that throws, log it
     the way this function already logs failures (`if (__DEV__) console.warn('[playback] …',
     { error, idText, queueIdText })`) and stop with an empty player. A queue refresh re-runs the adopt later and the attempt key stops a retry loop.
  4. Re-resolve the head the same way the function already does: now-playing, else promote the
     first upcoming. Run the same check on it. Loop at most `RESTORED_QUEUE_HEAD_RETIRE_LIMIT = 3`
     retires (a module-level `const` near the provider's other limits), then stop with an empty
     player.
- Keep the in-flight guard held across the whole loop so a parallel effect run cannot start a
  second adopt.
- Offline: `resolveQueueHeadResource` already returns the cached first upcoming without promoting
  it, and the fresh read is `unavailable`, so the loop never runs offline.

## Change 3 — handoff-prompt `useEffect`

Before titles resolve, after `remoteRef` matches `conflict.remote`, and only when
`remoteRef.resourceKind` is the item kind:

- Fresh-read the remote item. Compute `knownLiveBeforeFetch` the same way as Change 2. Pass it
  through; it does not keep a 404.
- `retire`, including a 404 for an item that was not known to be live: call
  `rememberPlaybackHandoffDismissal(buildPlaybackHandoffDismissedStateKey(conflict.remote))` and
  `continue` to the next conflict. Do not write history: the other device owns that row. If its
  stream really ended, or the item is gone, its own restore or advance retires it.
- `load`: put `{ ...remoteResource, item: freshItem }` in the prompt's `remoteResource`. Then
  **Switch** (`handlePlaybackHandoffSwitch` → `playQueueResource`) plays the item as the server
  has it, as a livestream target when it is live. `serverTitle` keeps reading the queue row.
- `load-stored`: today's path. This result is only `unavailable`. Title lookup calls
  `getItemByIdText` inside `resolveConflictStateTitle`, whose catch ignores errors, including a
  404, and the prompt still shows. That 404 does not retire. Only the fresh read's 404 suppresses
  the prompt.
- Re-check `cancelled` after the fresh read, as the effect already does after its other awaits.

## Answers recorded here (no code)

- **R11, mobile:** web's cause does not occur on mobile. On web, a login session could be the
  active session while none of its tabs held audio. The tab then resolved `remote`, routed Play
  to itself, and the command executor dropped it (plan 20). Mobile has one player per account
  session. Its session id is the account session row id
  (`apps/api/src/lib/auth/accountSessionStore.ts`), which stays the same across token rotation
  and app restarts. `resolveCrossDevicePlaybackAvailability` reports `ready` only once
  `thisSessionIdText` is known, so `resolvePlaybackRole` gives `active`, never `remote`, for this
  phone's own session. When the role is `remote`, `sendRemotePlayItem` plays locally on
  `no_device`, and `routedResume` takes over on `no_device`. Plan 62's flow checks the symptom on
  a device: with a still-live livestream restored, playing a regular episode works.
- **R9, idle adoption:** `resolvePlaybackIdleAdoption` in
  `apps/mobile/src/playback/crossDevice/crossDevicePlaybackPolicy.ts` already returns `none` when
  the remote state `is_live`. A livestream is never auto-loaded when another device goes idle.
  No change.
- **R9, explicit take-over:** `takeOverHere` and the `no_device` fallbacks run after the user
  pressed Play. They are not restores and are out of this rule.
- **Engine-held source at cold start:** when the native engine still holds a source (car session
  or background process kept alive), `adoptEngineSource` reflects what is already loaded and
  sounding. It stays as today. Unloading it would need `nativePlaybackBridge.destroy()`, which
  on Android stops `PodverseMediaLibraryService` and drops a connected car session.
- **Add by RSS livestream heads:** no fresh parse at restore; today's path. Mobile never writes
  livestreams to the server queue (`nowPlayingResourceFromTarget` returns `null` for them), and
  restore does not parse feeds.

## Tests

- No new unit tests in this plan. The keep or retire rules are unit-tested in plan 60
  (`restoredItemLoad.test.ts`, `lastPlaybackStorage.test.ts`), including a 404 for an item that
  was not known to be live. Plan 62's Maestro flow covers an ended queue head and a still-live
  one. It does not cover a 404.
- Existing mobile unit tests and `type-check:mobile` must still pass; the operator runs them at
  the end of the set.

## Release scratchpad

```markdown
## Mobile no longer restores a livestream that has ended

- Surfaces: mobile
- Change: on launch, before the app reloads the last item paused, it asks the server for the
  current status of anything that might be a livestream: a saved livestream, every signed-in queue
  head that is an episode, and the other device's item in the Switch prompt. A livestream that has
  ended, or any of those reads that answers 404, is not loaded. For signed-in users it moves to
  History as finished, and the next queue item loads paused; if nothing is next, the player stays
  empty. Signed-out users get an empty player. A saved item the device has no copy of, when the
  server answers 404, is dropped the same way. The Switch prompt is not shown when that other item
  has ended or the server answers 404. Offline or on a server error, restore behaves as before. A
  livestream that is still live or scheduled restores as before. Livestreams are now saved for
  restore on mobile, where before the previous episode was restored instead.
- Who notices: listeners who left a livestream in the player and reopen the app after it ended
- Operator steps: none
```
