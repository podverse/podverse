**Cursor model:** Opus 5.5 · **Reasoning:** high

# 41 — Web: signed-in queue head retires an ended livestream

## Rows

R1, R3, R6, R8, R32, R33, R34

## Runs after

10, 20, 40

## Goal

When a signed-in tab adopts a queue head whose item is a livestream that has ended, the tab does
not load it. It treats the item like a finished item: it moves the row to history, reloads the
queue, and the queue-head effect then loads the next item paused through the existing
empty-player path. With nothing left in the queue, the player stays empty.

Only the tab that owns the queue head writes that History row (R34). A tab in the `remote` role
(another session is the active device, or another tab of this browser holds this session's audio)
loads nothing for the head, writes nothing, and shows no prompt; the owning device retires it.
Every other tab owns the head: the active tab, an `idle` tab when no session is active, and an
`idle` tab of the active session that plan 20 made `idle` because no tab of the browser holds
audio. While the first cross-device check-in is pending, ownership is unknown, so the write waits
for it. This is the same rule mobile plan 61 applies.

The same rule covers a head that another device left in now-playing (R8).

The handoff prompt is never offered for a queue head whose item is an ended or missing livestream
(R32). The tab reads the head's item fresh before it opens the prompt, as mobile plan 61 does, and
writes nothing for a suppressed prompt.

A livestream that is still live or scheduled loads as a `livestream` target (no saved position)
instead of the podcast, video, or music target it gets today.

Status comes only from the item read fresh on this load (`fetchFreshRestoredItem`, plan 40). The
`nextResource.item` copy on the queue row is never used for the keep or retire decision. When the
fresh read has no answer (offline, timeout, 5xx, 410), the tab loads the queue row's own copy of
the item (R33), matching mobile plan 60's `load-stored`.

## What the code does today

In `apps/web/src/hooks/useMediaPlayerControllerQueueHeadLoading.ts`:

- `handleLoadQueueItem` reads the item and channel, then always calls `mediaPlayerResourceUpdate`
  with `playbackTargetFromStandardLoad(...)` and `parsePlaybackSeconds(nextResource.playback_position)`.
  A live item therefore loads through the non-live path, an ended one loads like any episode, and a
  failed item read throws and loads nothing.
- `shouldLoadQueueResource` is synchronous. When the player holds a paused item and the server
  head is a newer different item, it calls `setPlaybackHandoffPrompt` itself and returns `false`.
  It opens the prompt only when `crossDeviceRole === 'idle'` and availability is not `pending`.
- The queue row's `item` is loaded with `listResourceRelations` in
  `packages/orm/src/services/queue/queueResource.ts`: enclosures and their sources, images,
  `item_about`, and `item.channel` with its images. It has no `live_item`.

`useQueueResourcesMoveNowPlayingToHistory` skips every live item, so nothing ever moves a
livestream row to history from the client.

## Files

apps/web/src/hooks/useMediaPlayerControllerQueueHeadLoading.ts
apps/web/src/hooks/__tests__/useMediaPlayerControllerQueueHeadLoading.test.tsx
apps/web/e2e/media-player-livestream-queue-restore.spec.ts
apps/web/e2e/helpers/mediaPlayerAssertions.ts
makefiles/local/e2e-spec-order-web.txt
apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md
release-notes/scratchpad.md

No cross-device file is edited. The hook reads `crossDevicePlaybackStore.getSnapshot()` through its
existing import, and the unit test calls plan 20's `settleAudioTabSearch()`.

## Change 1 — ownership and the retire write

Reuse: `fetchFreshRestoredItem` from plan 40
(`apps/web/src/lib/playback/fetchFreshRestoredItem.ts`), `playbackTargetLivestream` from the
`'../lib/playback'` barrel, `checkIsLiveItem` from
`'../utils/mediaPlayer/mediaPlayerItemEnclosureType'`. Do not change
`useQueueResourcesMoveNowPlayingToHistory`: it moves what the player holds and updates the
abridged index from player state, and here the player does not hold the ended item.

Add this module-level function directly below `isRemotePlaybackRole`:

```typescript
/**
 * Whether this tab moves an ended livestream queue head to History. A `remote` tab never does:
 * another device, or this browser's audio tab, owns the head. Every other tab owns it, including
 * an `idle` tab when no session is active. Ownership is unknown until the first check-in settles.
 */
const resolveEndedQueueHeadOwnership = (): 'owner' | 'not-owner' | 'unknown' => {
  const snapshot = crossDevicePlaybackStore.getSnapshot();
  if (snapshot.availability === 'pending') {
    return 'unknown';
  }
  return snapshot.role === 'remote' ? 'not-owner' : 'owner';
};
```

Add this function inside the hook, directly above `handleLoadQueueItem`:

```typescript
  /**
   * An ended livestream at the queue head is treated like a finished item: its row goes to
   * history and the queue reloads, so the queue-head effect loads the next row paused. An item
   * the server no longer has writes nothing; the player stays empty.
   */
  async function retireEndedQueueHeadItem(endedItem: DTOItem | null): Promise<void> {
    const queueIdText = activeQueueRef.current?.id_text;
    if (endedItem === null || !queueIdText) {
      return;
    }
    const ownership = resolveEndedQueueHeadOwnership();
    if (ownership === 'unknown') {
      // The queue-head effect runs again when availability settles, and reads the head again.
      queueHeadAdoptedWithoutListenRef.current = null;
      return;
    }
    if (ownership === 'not-owner') {
      return;
    }
    try {
      await apiRequestService.reqQueueResourceItemAddHistory(queueIdText, endedItem.id_text, {
        playback_position: '0',
        completed: true,
      });
      await queueResourcesLoadActiveRef.current(undefined, { queueIdText });
    } catch (error: unknown) {
      logger.error('Ended livestream could not move to history', {
        error,
        itemIdText: endedItem.id_text,
      });
    }
  }
```

- `DTOItem` joins the existing `import type { DTOQueueResource } from '@podverse/helpers';` line.
  `logger` joins the existing value import from `'@podverse/helpers'` (lines 6–11). Do not add a
  second import from the same module.
- The body is `completed: true` and position `'0'`, with no `last_played_at` and no
  `playback_event_kind`. Loading the page is not a listen, so the row keeps the recency of its last
  real play. Mobile's retire (plan 61) sends the same body through
  `queueRepository.moveNowPlayingToHistory`, and mobile's normal ended path already moves rows to
  history with this shape.
- `unknown` clears the adopt marker for this row. `crossDeviceAvailability` is a dependency of the
  queue-head effect, so when the check-in settles the effect adopts the same row again, reads it
  fresh, and decides ownership then. The head stays in now-playing and nothing loads meanwhile.
- A failed write is unexpected, so it is logged. The player stays empty and the row stays in
  now-playing. There is no retry in this pass: `queueHeadAdoptedWithoutListenRef` still holds
  this row's id, so the effect does not dispatch it again. The next full page load tries again.
- `queueResourcesLoadActiveRef.current(undefined, { queueIdText })` is the same reload the
  effect's promote step uses. Passing a selection skips the auto-queue advance.

## Change 2 — `handleLoadQueueItem` decides from the fresh read

Replace `handleLoadQueueItem` with:

```typescript
  async function handleLoadQueueItem(
    nextResource: DTOQueueResource,
    options?: QueueResourceLoadOptions
  ) {
    const restored = await fetchFreshRestoredItem(nextResource.item.id_text);
    if (restored.decision.action === 'retire') {
      if (isStaleAutomaticLoad(options?.automaticLoad)) {
        return;
      }
      await retireEndedQueueHeadItem(restored.item);
      return;
    }
    // No answer from the server: load the queue row's own copy, which carries its channel.
    const itemToLoad = restored.item ?? nextResource.item;
    const rowChannel = restored.item === null ? (nextResource.item.channel ?? null) : null;
    const fullChannel =
      rowChannel ?? (await apiRequestService.reqChannelGetByIdOrIdText(itemToLoad.channel_id));
    if (!fullChannel) {
      return;
    }
    if (isStaleAutomaticLoad(options?.automaticLoad) || isRemotePlaybackRole()) {
      return;
    }
    rememberQueueResourceAsLocalState(nextResource);
    const musicIntent = resolveMusicIntentForQueueHeadLoad();
    const loadsAsLivestream =
      checkIsLiveItem(itemToLoad) && !nextResource.clip && !nextResource.item_soundbite;
    mediaPlayerResourceUpdate({
      target: loadsAsLivestream
        ? playbackTargetLivestream(fullChannel, itemToLoad)
        : playbackTargetFromStandardLoad({
            channel: fullChannel,
            clip: nextResource.clip ?? null,
            item: itemToLoad,
            itemChapter: null,
            itemSoundbite: nextResource.item_soundbite ?? null,
            musicIntent,
          }),
      explicitPlaybackSeconds: loadsAsLivestream
        ? undefined
        : parsePlaybackSeconds(nextResource.playback_position),
      // every other field unchanged from today's call
    });
  }
```

- The retire branch has no `isRemotePlaybackRole()` check of its own:
  `resolveEndedQueueHeadOwnership` covers the `remote` role.
- `resolveMusicIntentForQueueHeadLoad()` is still called on every load, livestream included,
  because it consumes `pendingMusicQueueLoadIntentRef`. Skipping it would leave a stale
  `fresh_transition` for the next music load.
- `restored.item === null` with a `keep` decision is `status-unavailable` (offline, timeout, 5xx,
  410). The row's copy loads at the row's saved position, with the row's `item.channel`, so no
  request is needed. When the row has no `channel` relation, the channel is read as today; if
  that read fails, nothing loads.
- The queue row carries no `live_item`, so with no answer a livestream row loads through the
  episode path, as on mobile (plan 61's `load-stored` reads the same server row). The next load
  with a server answer decides it properly.
- A 404 retires with `restored.item === null`, so nothing is written and the player stays empty,
  which is today's outcome for a missing item.
- The channel read stays before the stale/remote check, as today. The existing test "does not
  apply an empty-player head load after a playback load is applied" depends on that order.

## Change 3 — read the head before offering the handoff prompt

The prompt decision moves out of the synchronous check so the effect can read the head's item
first.

### `resolveQueueHeadLoadDecision`

Rename `shouldLoadQueueResource` to `resolveQueueHeadLoadDecision` and give it this return type,
declared above the hook next to `PlaybackHandoffPromptState`:

```typescript
type QueueHeadLoadDecision =
  | { kind: 'load' }
  | { kind: 'skip' }
  | { kind: 'offer-handoff'; prompt: PlaybackHandoffPromptState };
```

Inside the body, change only the returns: every `return true` becomes `return { kind: 'load' }`,
every `return false` becomes `return { kind: 'skip' }`, and the final block that calls
`setPlaybackHandoffPrompt({ … })` and returns `false` returns
`{ kind: 'offer-handoff', prompt: { … } }` with the same object instead. It no longer sets state.
The stale-record clear (`clearPlaybackHandoffLocalState()`), the dismissal check, and the
`crossDeviceRole` / `crossDeviceAvailability` hold stay where they are.

### Prompt helpers

Module level, below `resolveEndedQueueHeadOwnership`:

```typescript
/** The prompt belongs to a settled idle tab; the effect that closes it uses the same test. */
const canRaisePlaybackHandoffPrompt = (): boolean => {
  const snapshot = crossDevicePlaybackStore.getSnapshot();
  return snapshot.role === 'idle' && snapshot.availability !== 'pending';
};

/**
 * The item whose live status decides whether a queue head may be offered: the rows that
 * `switchToServerPlayback` sends to `handleLoadQueueItem`. Add by RSS rows have no server status.
 */
const queueHeadItemIdTextForStatusRead = (resource: DTOQueueResource): string | null => {
  if (resource.add_by_rss_resource_data && !resource.is_add_by_rss_redacted) {
    return null;
  }
  return resource.item?.id_text ?? null;
};
```

Inside the hook, next to `queueHeadLoadRequestIdRef`:

```typescript
  // Each queue-head effect run starts a new prompt check; a status read from an earlier run is
  // dropped, so a prompt never opens for a decision that no longer holds.
  const handoffPromptCheckIdRef = useRef(0);
```

Inside the hook, a small helper used by `continueLocalPlayback` and the new offer:

```typescript
  const rememberPlaybackHandoffDismissal = (dismissedStateKey: string | null): void => {
    if (dismissedStateKey === null) {
      return;
    }
    playbackHandoffDismissedStateKeyRef.current = dismissedStateKey;
    writePlaybackHandoffDismissedStateKey(dismissedStateKey);
  };
```

`continueLocalPlayback`: replace its `if (playbackHandoffPrompt.dismissedStateKey !== null) { … }`
block with `rememberPlaybackHandoffDismissal(playbackHandoffPrompt.dismissedStateKey);`.

Directly below `resolveQueueHeadLoadDecision`:

```typescript
  /**
   * Opens the handoff prompt after reading the head's item fresh. An ended or missing livestream
   * head is never offered: its dismissal is remembered so the same head does not ask again, and
   * nothing is written, because the tab that owns the head retires it. With no answer, the prompt
   * names the queue row as it is.
   */
  async function offerPlaybackHandoffPrompt(
    prompt: PlaybackHandoffPromptState,
    checkId: number
  ): Promise<void> {
    const headItemIdText = queueHeadItemIdTextForStatusRead(prompt.nextResource);
    if (headItemIdText !== null) {
      const restored = await fetchFreshRestoredItem(headItemIdText);
      if (checkId !== handoffPromptCheckIdRef.current || !canRaisePlaybackHandoffPrompt()) {
        return;
      }
      if (restored.decision.action === 'retire') {
        rememberPlaybackHandoffDismissal(prompt.dismissedStateKey);
        return;
      }
    }
    setPlaybackHandoffPrompt(prompt);
  }
```

- The dismissal key names the head's item and its `last_played_at`. A head that ended stays ended,
  so remembering it is safe, and it stops the effect from reading the same head on every re-run.
  It replaces any earlier dismissal, which named a different head.
- A suppressed prompt writes no History row, from any tab. That is mobile plan 61's handoff rule.
  The head is retired by the next empty-player load on a tab that owns it (Change 1).

### The queue-head effect

In the effect that reads `activeQueueUpcomingResources[0]`:

- First lines of the effect body, before the `remote` check:

```typescript
    handoffPromptCheckIdRef.current += 1;
    const handoffPromptCheckId = handoffPromptCheckIdRef.current;
```

- Replace `if (!shouldLoadQueueResource(nextResource)) { return; }` with:

```typescript
    const loadDecision = resolveQueueHeadLoadDecision(nextResource);
    if (loadDecision.kind === 'offer-handoff') {
      if (playbackHandoffPrompt !== null && playbackHandoffPrompt.nextResource.id === nextResource.id) {
        // This head was already read before its prompt opened; refresh the titles only.
        setPlaybackHandoffPrompt(loadDecision.prompt);
      } else {
        void offerPlaybackHandoffPrompt(loadDecision.prompt, handoffPromptCheckId);
      }
      return;
    }
    if (loadDecision.kind === 'skip') {
      return;
    }
```

- Leave the dependency list as it is. `playbackHandoffPrompt` is read from the render the effect
  belongs to; a prompt change by itself does not need to re-run the load decision.
- The effect that closes an open prompt when the tab stops being a settled idle tab is unchanged.

### Paths that reach `handleLoadQueueItem`

- Empty-player adopt (`dispatchLoad({ skipNowPlayingWrite: true, pauseOnLoad: true })`): the
  main case. After the history write and reload, `activeQueueUpcomingResources` changes, the
  effect runs again with the next row, promotes it if it is upcoming, and loads it paused. That
  needs no new code.
- Non-empty player whose loaded item matches the head: `isAlreadyLoadedThisItem` skips the load,
  so an ended livestream that is already in the player is not moved out from under the listener.
  Leave that guard as it is.
- `switchToServerPlayback` (the prompt's Switch choice, `forcePlay: true`): the prompt is no
  longer offered for an ended head, so this reaches the retire branch only when the head ended
  after its prompt opened. The tab is a settled idle tab, so it owns the head: the row moves to
  history and the local item stays in the player. With no answer, Switch plays the row's copy.

## Answers recorded here (no code)

- **R8, explicit take-over:** "Play Here" in the remote view and an incoming take-over command
  run after a person chose to move playback. They are not restores, and the other device may
  still be sounding the stream, so `usePlaybackResourceLoader` and
  `useCrossDevicePlaybackTransfer` stay unchanged. Mobile plan 61 records the same answer for
  its `takeOverHere`.
- **R8 and R34, remote role:** a tab in the `remote` role never loads the queue head (the effect
  returns early), never offers the prompt, and never retires the head
  (`resolveEndedQueueHeadOwnership`), so it never moves the playing device's row.
- **R34 and plan 20's idle role:** plan 20 makes a tab of the active session `idle` once no tab of
  the browser holds audio. That tab owns the session's queue head, so it retires an ended head.
  Before plan 20's audio-tab search settles, the same tab is `remote` and does nothing; the effect
  runs again when the role changes.
- **R34 with no active session:** when the shared state names no active session (it expired, or
  the account has no cross-device playback), no other device owns the head, so the tab that loads
  it retires it. Mobile plan 61 skips the write only when the role is `remote`, which is the same
  rule.
- **Add by RSS livestream heads:** `handleLoadQueueItemAddByRSS` is unchanged, and the prompt
  check reads no status for an Add by RSS head. An Add by RSS item has no server status to read
  fresh.

## Change 4 — decision matrix

In `apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md`:

- § 3: after the paragraph that ends "a slow adoption never replaces the item the user chose.",
  add two paragraphs:
  - "A queue head whose item is a livestream is decided from the item read fresh on that load,
    never from the copy on the queue row. Ended: the row moves to history as completed, without a
    new `last_played_at`, the queue reloads, and the next row loads paused through the same
    empty-player path; with nothing left, the player stays empty. Only a tab that owns the head
    writes that row: any tab that is not `remote`, once the first check-in has settled; while it is
    pending the write waits. Not found: nothing is written and nothing loads. Live or scheduled: it
    loads as a `livestream` target with no saved position. No answer (offline, timeout, 5xx, 410):
    the queue row's own copy of the item loads at the row's position, with the row's channel; the
    row carries no live status, so a livestream row loads through the episode path."
  - "The handoff prompt (a paused local item and a newer, different server head) opens only after
    the head's item is read fresh. An ended or missing livestream head is never offered: its
    dismissal is remembered and nothing is written. With no answer, the prompt names the queue row.
    Add by RSS heads are offered without a read."
- § 3 table: add a row after the `nextResource.item` row. Resource shape: "`nextResource.item`,
  a livestream"; `currentTime`: "None; the live element starts at the live point";
  `mpIsPlaying`: "unchanged (an empty-player adopt loads paused)"; Side effects: "Ended, on a tab
  that owns the head: `retireEndedQueueHeadItem` writes history, then `queueResourcesLoadActive`
  with the queue's id; nothing loads from this row."
- "Cross-cutting side effects glossary": add a row after the two `moveNowPlayingToHistory` rows.
  Effect: "`reqQueueResourceItemAddHistory` (`completed: true`) for an ended livestream"; When it
  fires: "A signed-in queue-head load on a tab that is not `remote`, after the first check-in,
  finds the head's item is a livestream that has ended"; Where: "`retireEndedQueueHeadItem` in
  `useMediaPlayerControllerQueueHeadLoading`".

Run `npx prettier --write apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md`
after editing (formatting only).

## Tests

### Unit — `useMediaPlayerControllerQueueHeadLoading.test.tsx`

Setup changes:

- Add `reqQueueResourceItemAddHistory: vi.fn()` to the `vi.hoisted` object, add it to the
  `'../../factories/apiRequestService'` mock, and `mockReset().mockResolvedValue(undefined)` it in
  `beforeEach`.
- Fixtures next to `item`, with the same one-cast pattern:
  - `endedLiveItem`: `{ id: 3, id_text: 'live-ended', title: 'Ended Stream', channel_id: 1,
    item_enclosures: [], live_item: { live_item_status: { id: LiveItemStatusEnum.Ended } } }`.
  - `liveItem`: same shape, `id: 4`, `id_text: 'live-now'`, status `LiveItemStatusEnum.Live`.
  - `endedLiveQueueHead`: `{ ...queueHead, id: 18, item: endedLiveItem, item_id: 3 }`.
  - Import `LiveItemStatusEnum` from `@podverse/helpers`. `resolveItemLiveStatusId` (plan 10)
    reads `live_item.live_item_status.id` first, which these fixtures set.
- A helper next to `checkInWithNoActiveDevice`:
  `checkInAsOrphanedActiveSession()` calls `crossDevicePlaybackStore.applyPresenceResponse` with
  `session_id_text: THIS_SESSION_ID_TEXT`, `devices: { revision: 1, devices: [] }`, and
  `state: playbackState(1, THIS_SESSION_ID_TEXT)`, then `crossDevicePlaybackStore.settleAudioTabSearch()`
  (plan 20). The role is then `idle`.
- Import `buildPlaybackHandoffDismissedStateKey` from `'../../utils/playbackHandoffDismissal'`
  (the file already imports `readPlaybackHandoffDismissedStateKey` from there).

Update one existing test: in "offers a newer server item through the prompt instead of loading
it into a paused Add by RSS player", the server head is a plain item, so its status is now read.
Replace `expect(hoisted.reqItemGetByIdOrIdText).not.toHaveBeenCalled();` with
`expect(hoisted.reqItemGetByIdOrIdText).toHaveBeenCalledWith('item-1');`. Every other existing
prompt test already waits with `waitFor` and resolves the read to `item` (not live), so it still
passes.

Add a `describe('livestream queue head', ...)` block inside the existing describe:

1. "moves an ended livestream head to history and reloads the queue instead of loading it":
   `hoisted.upcoming = [endedLiveQueueHead]`, `reqItemGetByIdOrIdText` resolves `endedLiveItem`.
   Render; `waitFor` `queueResourcesLoadActive` toHaveBeenCalledWith(`undefined`,
   `{ queueIdText: 'queue-1' }`). Assert `reqQueueResourceItemAddHistory` was called with
   `'queue-1'`, `'live-ended'`, and exactly `{ playback_position: '0', completed: true }`;
   `mediaPlayerResourceUpdate` and `reqChannelGetByIdOrIdText` not called. (Cross-device is off,
   so the tab owns the head.)
2. "loads a live head as a livestream target without a saved position": head with `liveItem`,
   `playback_position: '42'`. `waitFor` `mediaPlayerResourceUpdate` called with
   `expect.objectContaining({ target: expect.objectContaining({ kind: 'livestream' }),
   explicitPlaybackSeconds: undefined, isPlaying: false })`. No history call.
3. "writes nothing and loads nothing when the head item is gone": `reqItemGetByIdOrIdText`
   rejects with `{ status: 404 }`; flush with `flushQueueHeadEffect()` twice; assert no history
   call, no `queueResourcesLoadActive` call, no `mediaPlayerResourceUpdate`.
4. "loads the queue row's copy with the row's channel when the head's status cannot be read":
   `reqItemGetByIdOrIdText` rejects with `{ status: 503 }`; head
   `{ ...queueHead, playback_position: '42', item: { ...item, channel } }` (one cast). `waitFor`
   `mediaPlayerResourceUpdate` called with `expect.objectContaining({ target:
   expect.objectContaining({ item: expect.objectContaining({ id_text: 'item-1' }) }),
   explicitPlaybackSeconds: 42, isPlaying: false })`. Assert `reqChannelGetByIdOrIdText` not
   called and no history call.
5. "reads the channel for the queue row's copy when the row carries none": rejects with
   `{ status: 503 }`, head `queueHead`. `waitFor` `mediaPlayerResourceUpdate` called; assert
   `reqChannelGetByIdOrIdText` toHaveBeenCalledWith(1).
6. "does not retire an ended head when another session becomes active during the read":
   `act(() => { enableCrossDevicePlayback(); checkInWithNoActiveDevice(); })`; head
   `endedLiveQueueHead`; `reqItemGetByIdOrIdText` returns `createDeferred<DTOItem>().promise`.
   Render; `waitFor` the read toHaveBeenCalledWith('live-ended'); `act(() =>
   publishOtherSessionActive())`; resolve the deferred with `endedLiveItem`; flush twice. Assert
   no history call and no `mediaPlayerResourceUpdate`.
7. "waits for the first check-in before retiring an ended head, then retires it":
   `act(() => enableCrossDevicePlayback())` (availability `pending`); head `endedLiveQueueHead`,
   read resolves `endedLiveItem`. Render; `waitFor` the read toHaveBeenCalledWith('live-ended');
   flush twice; assert no history call. Then `act(() => checkInWithNoActiveDevice())`; `waitFor`
   `reqQueueResourceItemAddHistory` toHaveBeenCalledWith('queue-1', 'live-ended',
   `{ playback_position: '0', completed: true }`); assert the read was called twice.
8. "retires an ended head from an idle tab of the active session":
   `act(() => { enableCrossDevicePlayback(); checkInAsOrphanedActiveSession(); })`; assert the
   role is `idle`. Head `endedLiveQueueHead`, read resolves `endedLiveItem`. Render; `waitFor` the
   history call with the same three arguments as test 1.

Add a `describe('handoff prompt for a livestream head', ...)` block:

1. "does not offer the prompt for an ended livestream head and remembers the dismissal":
   `stagePausedLocalItemAgainstNewerServerHead()`, then
   `hoisted.upcoming = [{ ...hoisted.upcoming[0], item: endedLiveItem, item_id: 3 }]` (one cast);
   read resolves `endedLiveItem`. Render; `waitFor` the read toHaveBeenCalledWith('live-ended');
   flush. Assert `handoffPrompt` is null, no history call, no `mediaPlayerResourceUpdate`, and
   `readPlaybackHandoffDismissedStateKey()` equals
   `buildPlaybackHandoffDismissedStateKey({ serverItemIdText: 'live-ended', serverLastPlayedAt:
   '2026-10-19T12:00:00.000Z' })`. Then flip `mpIsPlaying` to `true` and back to `false` with two
   `rerender` calls and assert the read was still called only once.
2. "offers the prompt from the queue row when the head's status cannot be read":
   `stagePausedLocalItemAgainstNewerServerHead()`; read rejects with `{ status: 503 }`. Render;
   `waitFor` `handoffPrompt` toEqual `PROMPT_FOR_NEWER_SERVER_HEAD`.
3. "does not open the prompt when local playback starts while the head is being read":
   `stagePausedLocalItemAgainstNewerServerHead()`; read returns a deferred promise. Render;
   `waitFor` the read toHaveBeenCalledWith('item-2'); set `mpIsPlaying: true` and `rerender`;
   resolve the deferred with `otherItem`; flush twice. Assert `handoffPrompt` is null.

Mock rejections use plain objects; `getStatusCodeFromError` reads `.status`.

### E2E — new `apps/web/e2e/media-player-livestream-queue-restore.spec.ts`

Copy the setup pattern from `media-player-music-queue-restore.spec.ts`: the same
`API_BASE_URL`, `loginSeedUser`, `test.setTimeout(20_000)` in `beforeEach`, and
`clearSeededPodcastQueueResources(page)` in `beforeEach`. Doc comment names the matrix § 3
paragraphs from Change 4.

Shared helpers in the spec file:

- `putNowPlaying(page, itemIdText)`: POST
  `${API_BASE_URL}/queue/${E2E_PODCAST_QUEUE_ID_TEXT}/item/${itemIdText}/now-playing` with
  `{ last_played_at: new Date().toISOString(), media_file_duration: 120,
  playback_event_kind: 'play', playback_position: 0 }`; then POST
  `/queue/${E2E_PODCAST_QUEUE_ID_TEXT}/update-is-active` with `{ is_active_queue: true }`.
- `historyItemIdTexts(page)`: GET
  `${API_BASE_URL}/queue/${E2E_PODCAST_QUEUE_ID_TEXT}/resources/history-paginated`; return the
  `item.id_text` strings from `body.data`, narrowing with `typeof`/`in` checks as the music spec
  does (no `as` casts).

Tests:

1. "Full page load moves an ended livestream at the queue head to history and loads the next
   queue item paused"
   - `putNowPlaying(page, E2E_LIVE_AV_ENDED_ITEM_ID_TEXT)`; POST
     `/queue/${E2E_PODCAST_QUEUE_ID_TEXT}/item/${E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT}/last` with
     `{ playback_event_kind: 'queue_add' }`.
   - `page.goto('/')`; `expectMediaPlayerTitleVisible(page, 'E2E Podcast No Stored Position')`;
     `expectPersistentPlayerPlaying(page, false)`;
     `expectMediaPlayerTitleAbsent(page, E2E_LIVE_AV_ENDED_ITEM_TITLE)`.
   - `await expect.poll(() => historyItemIdTexts(page)).toContain(E2E_LIVE_AV_ENDED_ITEM_ID_TEXT)`.
2. "Full page load leaves the player empty when the only queue item is an ended livestream"
   - `putNowPlaying(page, E2E_LIVE_AV_ENDED_ITEM_ID_TEXT)` only.
   - `page.goto('/')`; poll history as above first (proves the load ran), then
     `expectMediaPlayerTitleAbsent(page, E2E_LIVE_AV_ENDED_ITEM_TITLE)` and
     `await expect(page.locator('audio[src], video[src]')).toHaveCount(0)`.
3. "Full page load restores a live livestream at the queue head paused as a livestream"
   - `putNowPlaying(page, E2E_LIVE_AV_AUDIO_ITEM_ID_TEXT)`.
   - `page.goto('/')`; `expectMediaPlayerTitleVisible(page, E2E_LIVE_AV_AUDIO_ITEM_TITLE)`;
     `await expect(liveStreamMediaElement(page, 'audio')).toHaveCount(1)`;
     `expectSingleSourcedMediaElement(page)`; `expectPersistentPlayerPlaying(page, false)`.
4. "Full page load loads the queue row's copy of the head paused when the server cannot answer
   for the item"
   - `putNowPlaying(page, E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT)`.
   - `await page.route((url) =>
     url.pathname.endsWith(`/item/${E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT}`), (route) =>
     route.fulfill({ status: 503, body: '' }))`. Nothing else on `/` reads that path.
   - `page.goto('/')`; `expectMediaPlayerTitleVisible(page, 'E2E Podcast No Stored Position')`;
     `expectPersistentPlayerPlaying(page, false)`.

`apps/web/e2e/helpers/mediaPlayerAssertions.ts`: add `E2E_LIVE_AV_ENDED_ITEM_ID_TEXT` to the
`itemIdTexts` list in `clearSeededPodcastQueueResources` (after
`E2E_LIVE_AV_VIDEO_ITEM_ID_TEXT`) and to that file's `./seedConstants` import. The delete removes
the history row the previous test left, so each test starts clean.

`makefiles/local/e2e-spec-order-web.txt`: add the line
`apps/web/e2e/media-player-livestream-queue-restore.spec.ts` directly after
`apps/web/e2e/media-player-cross-device-remote.spec.ts`.

## Release scratchpad

## Web: ended livestreams no longer reload from a signed-in queue

- Surfaces: web
- Change: when a signed-in tab loads the head of the account queue and that item is a livestream
  whose status is now ended, the tab no longer loads it. It moves the row to history as a
  completed item, reloads the queue, and loads the next queue item paused; with nothing else
  queued, the player stays empty. This also covers a livestream another device left in
  now-playing. Only a tab that is not showing another device's playback writes that history row,
  and it waits for its first cross-device check-in to do so; a tab viewing another device's
  playback leaves the row to that device. The "switch to the other item?" prompt is no longer
  shown for an ended livestream. A head livestream that is still live or scheduled now loads as a
  livestream (starting at the live point) instead of through the episode path with a saved
  position. Status is read fresh from the server on each load; when the server cannot be reached,
  the queue's own copy of the item loads paused at its saved position instead of nothing.
- Who notices: signed-in web listeners who left a livestream in their queue and came back after
  it ended
- Operator steps: none
