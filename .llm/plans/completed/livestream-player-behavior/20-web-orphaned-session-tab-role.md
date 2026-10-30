**Cursor model:** Opus 5.5 · **Reasoning:** extra high

# 20 — Web: a tab of the active session plays here when no tab holds audio

## Rows

R10

## Runs after

none

## Cause (area F compares mobile against this)

R10 is not a livestream media bug. The local live and non-live mounts behave correctly after a
restore. Play does nothing because the tab resolves its cross-device role as `remote` while no
tab of this browser can play.

1. A signed-in member plays on web (here, a livestream), maybe pauses, and leaves. Leaving is a
   reload, a closed tab, or a browser restart.
2. Nothing releases the shared playback state. It still names this login session as
   `active_session_id_text`, and check-ins from any tab of the same session keep it alive
   (`PLAYBACK_STATE_TTL_MS` is 60 minutes in `apps/api/src/lib/accountPlayback/playbackStore.ts`).
   The leader reconcile in `apps/web/src/contexts/CrossDevicePlayback.tsx` only turns a stale
   `playing` state into `paused`; it never clears the active session.
3. The new page load gets a new random `tabId` and `thisTabHoldsAudio: false`. Once availability
   is `ready`, `resolveTabPlaybackRole` in `apps/web/src/lib/crossDevicePlayback/tabPlaybackRole.ts`
   returns `remote`, because the session is active and this tab does not hold audio. It assumes
   another tab of this browser does, without checking.
4. In `remote`, `CrossDevicePlayback.tsx` clears the local player. The bar shows the shared
   resource (the restored livestream) with the caption "Playing in Another Tab".
5. Every play becomes a command addressed to this session:
   - An item Play button goes through `useMediaPlayerResourceUpdate` → `resolveRemotePickCommand`
     → `sendPlaybackCommand`.
   - The bar's play and pause go through `usePlayerTransport` → `readRemoteControlState`.
   - The command executor (`useCrossDevicePlaybackCommandExecutor.ts`) drops every command,
     because no tab has `thisTabHoldsAudio`.
6. The Playback Devices button is hidden with a single device (`usePlaybackDevices` `showSwitch`),
   so the only take-over control is missing too. The player stays stuck until the 60-minute TTL.

So the stuck state follows any item, not just a livestream; the operator met it after a
livestream. A Play clicked before the first check-in completes still works, because the role is
`idle` until availability is `ready`. That is why
`apps/web/e2e/media-player-livestream-to-podcast-transition.spec.ts` (Play right after
`page.goto`) never caught it.

For area F: on web the cause is the multi-tab session role. A login session can be the active
session while none of its tabs holds audio. Mobile has one player per session, so the same
question there is: can mobile resolve its own active session as remote, or route a local play
through a command to itself?

## Local restore findings (no change in this plan)

These hold on the local path. They are not the cause of R10; areas D and E own them.

- Restored live items never get a `livestream` playback target:
  - `AnonymousPlaybackRestoreController.tsx` builds `item-podcast`, `item-video`, or `item-music`.
  - `useMediaPlayerControllerQueueHeadLoading.ts` `handleLoadQueueItem` uses
    `playbackTargetFromStandardLoad`, which never returns `livestream`.
  - So a restored live item starts a listen session and reads the abridged duration hint. That
    is area D's restore path.
- `NonLiveMediaOrchestrator.tsx` derives `elementSource` from the selected enclosure with no
  `live_item` check. The surface effect clears `src` for live items, but returns early when the
  enclosure type is empty and the URL is not HLS. In that case the hidden non-live `<audio>` loads
  the live URL, `onLoadedMetadata` consumes the staged `pendingPlaybackDecision`, and
  `setMPDuration` receives `NaN`. That is area E's controller work.

## Decisions

- **An orphaned tab is `idle`.** A tab of the active session becomes `idle` (not `remote`) once
  it knows no other tab of this browser holds audio. In `idle`, sections 1–6 of the decision
  matrix apply: the empty player adopts the local queue head paused, every Play loads here, and
  the publisher's existing claim takes the active slot on the first play. This matches the § 7a
  row "Playing device leaves presence" (local queue head, paused).
  - Rejected option: a fourth role, or keeping `remote` and routing commands to the tab. Both add
    states to a contract that already covers this case.
- **Find the audio tab by asking.** On channel open, a tab posts a new `audio-tab-query` on the
  existing tab channel. The audio tab answers with its existing `audio-tab` announcement. With no
  answer after `AUDIO_TAB_QUERY_WAIT_MS` (1000 ms), the search is settled with no audio tab.
  - Rejected option: waiting one heartbeat plus slack (`AUDIO_TAB_SILENCE_MS`, 12 s). That leaves
    the operator's Play swallowed for 12 s.
- **A silent audio tab expires in every tab**, after `AUDIO_TAB_SILENCE_MS` with no heartbeat.
  This covers a crashed audio tab that sent no `audio-tab-gone`.
- **Without `BroadcastChannel`,** the search never settles and the role stays `remote`, as today.
  Tabs cannot coordinate there, and guessing `idle` could start a second audio tab.
- **No release publish.** An idle tab does not write `resource: null` or change the shared state.
  The existing leader reconcile still pauses a stale `playing` state; the next local Play claims.
  Other devices keep showing "Paused on {this device}" until then, as they do today.

## Files

apps/web/src/lib/crossDevicePlayback/playbackTabChannel.ts
apps/web/src/lib/crossDevicePlayback/playbackTabChannel.test.ts
apps/web/src/lib/crossDevicePlayback/tabPlaybackRole.ts
apps/web/src/lib/crossDevicePlayback/tabPlaybackRole.test.ts
apps/web/src/lib/crossDevicePlayback/crossDevicePlaybackStore.ts
apps/web/src/lib/crossDevicePlayback/crossDevicePlaybackStore.test.ts
apps/web/src/lib/crossDevicePlayback/playbackDeviceMenu.ts
apps/web/src/lib/crossDevicePlayback/playbackDeviceMenu.test.ts
apps/web/src/contexts/CrossDevicePlayback.tsx
apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md
apps/web/e2e/media-player-cross-device-remote.spec.ts
release-notes/scratchpad.md

## Change 1 — tab channel query

In `playbackTabChannel.ts`:

- Add `| { kind: 'audio-tab-query'; accountId: number; tabId: string }` to `PlaybackTabMessage`.
- Add `askForAudioTab(): void` to `PlaybackTabChannel`. Doc comment: "Asks the tab that holds
  audio to announce itself."
- `readPlaybackTabMessage`: add `case 'audio-tab-query': return { kind: 'audio-tab-query',
  accountId, tabId };` next to `'tab-gone'`.
- `UNAVAILABLE_PLAYBACK_TAB_CHANNEL`: `askForAudioTab: () => undefined`.
- `startPlaybackTabChannel` return: `askForAudioTab: () => { post({ kind: 'audio-tab-query',
  accountId, tabId }); }`.

Older builds in other tabs drop the unknown kind in their own `readPlaybackTabMessage` `default`,
so mixed builds degrade to today's behavior. The heartbeat still reaches the new tab within 5 s,
which keeps it `remote`.

## Change 2 — role resolver

In `tabPlaybackRole.ts`, add a required parameter `anotherTabMayHoldAudio: boolean` with this doc
comment: "False only once this tab has asked the other tabs of this browser and none holds audio."
Then change the session-active branch:

```typescript
if (sessionRole === 'active') {
  if (params.thisTabHoldsAudio) {
    return 'active';
  }
  return params.anotherTabMayHoldAudio ? 'remote' : 'idle';
}
```

Keep the existing order: availability first, then `claimPending`. Update the function's doc
comment so that it describes the `idle` case.

## Change 3 — store

In `crossDevicePlaybackStore.ts`:

- Add `audioTabSearchSettled: boolean` to `CrossDevicePlaybackSnapshot`, next to `audioTab`. Doc
  comment: "True once this tab asked the other tabs of this browser who holds audio and the wait
  ended. Until then a tab of the active session assumes another tab holds audio."
  - `createInitialCore` sets it to `false`, so `reset` clears it.
  - `buildSnapshot` copies it.
- In `buildSnapshot`, pass `anotherTabMayHoldAudio: !core.audioTabSearchSettled ||
  (core.audioTab !== null && core.audioTab.tabId !== core.tabId)` to `resolveTabPlaybackRole`.
- New method next to `noteAudioTabGone`: `settleAudioTabSearch(): void` →
  `update({ audioTabSearchSettled: true })`.
- New method next to it: `expireSilentAudioTab(nowMs: number, silenceMs: number): void`. When
  `core.audioTab` is set, names another tab, and `nowMs - core.audioTab.lastSeenMs >= silenceMs`,
  it calls `update({ audioTab: null })`. Otherwise it does nothing.
  - It never touches this tab's own entry; `thisTabHoldsAudio` governs that.
- `noteAudioTab` and `noteAudioTabGone` are unchanged. `noteAudioTab` already refreshes
  `lastSeenMs` on every heartbeat.

The existing `update` skips notifying when nothing changed, so repeated settles and expiries are
silent.

## Change 4 — provider

In the tab-channel `useEffect` in `CrossDevicePlayback.tsx` (the one that calls
`startPlaybackTabChannel`):

- Add the constant `AUDIO_TAB_QUERY_WAIT_MS = 1_000` next to `AUDIO_TAB_SILENCE_MS`. Doc comment:
  "How long a new tab waits for the audio tab to answer its query before it plays here."
- `handleMessage`: add `case 'audio-tab-query': announceAudioTab(); return;`. The existing
  `announceAudioTab` sends only while this tab holds audio, so other tabs stay silent.
- After `setTabChannelAvailable(channel.available)`, when `channel.available`:
  - call `channel.askForAudioTab()`;
  - start `const audioTabSearchId = window.setTimeout(() => store.settleAudioTabSearch(),
    AUDIO_TAB_QUERY_WAIT_MS)`;
  - clear that timeout in the cleanup.
  - When the channel is not available, do neither.
- Replace the interval callback with a tick that runs in every tab and then calls `reconcile()`.
  Keep `reconcile`'s own leader-only guard.
  ```typescript
  const tick = () => {
    store.expireSilentAudioTab(Date.now(), AUDIO_TAB_SILENCE_MS);
    reconcile();
  };
  const reconcileId = window.setInterval(tick, LEADER_RECONCILE_INTERVAL_MS);
  ```
  Update the `LEADER_RECONCILE_INTERVAL_MS` doc comment to say that every tab also drops a silent
  audio tab on this interval.

Ordering this depends on: the `crossDevicePlaybackStore.reset({ accountId, enabled })` effect is
declared above the tab-channel effect, so in one commit the reset runs first and cannot wipe a
settle or an answer. Keep that order.

No change to `CrossDevicePlaybackPublisher.tsx`, `useMediaPlayerResourceUpdate.tsx`,
`usePlayerTransport.ts`, or `useMediaPlayerControllerQueueHeadLoading.ts`. They already treat
`idle` as local:

- `canPublish` is `role !== 'remote'`;
- the claim fires on the first local play because `thisTabHoldsAudio` is false;
- the queue-head adopt runs when not `remote`.

## Change 5 — devices menu wording

In `playbackDeviceMenu.ts` `descriptionParts`, an idle tab's This Device row must not say Playing
while nothing plays in this browser:

```typescript
if (entry.isActive && !(entry.isThisDevice && role === 'idle')) {
  parts.push(entry.isThisDevice && role === 'remote' ? 'playing_in_another_tab' : 'playing');
}
```

`transferTargetSessionIdText` is unchanged. Choosing This Device from an idle tab already returns
this session, so `transferTo` runs the local take-over of the shared item, which is the useful
action here.

## Change 6 — decision matrix

In `apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md`, § 7 only. Area D owns
the § 6a "Reload while live is playing" row; do not edit § 6a here.

- § 7 intro paragraph: after the sentence naming the three roles, add:
  > A tab of the active session is `remote` only while another tab of this browser holds that
  > session's audio. A new tab asks the other tabs (`audio-tab-query` on the tab channel) and
  > waits `AUDIO_TAB_QUERY_WAIT_MS`. When no tab answers, the audio tab closes, or it stays
  > silent for `AUDIO_TAB_SILENCE_MS`, the tab is `idle`; the next play here claims. Without
  > `BroadcastChannel` it stays `remote`.
- § 7a table:
  - Change the Situation cell "Another tab of this browser (any status)" to "Another open tab of
    this browser holds audio (any status)".
  - Add a row after "Playing device leaves presence":
    `| This browser's audio tab closed or reloaded | local queue head, paused; bar stays hidden
    if the queue is empty | none | local | local |`
  - Keep the table's existing column layout; do not realign other rows.

## Tests

- `tabPlaybackRole.test.ts`:
  - Add `anotherTabMayHoldAudio: true` to `READY_THIS_SESSION`.
  - Keep "is remote when this session is active but another tab holds audio".
  - Add "is idle when this session is active and no other tab of this browser holds audio".
  - Add "is active when this tab holds audio even after the search settles with no other tab".
- `crossDevicePlaybackStore.test.ts`, one `it` each, after "releases this tab's audio when another
  tab announces itself as the audio tab":
  - A tab of the active session is `remote` until `settleAudioTabSearch`, then `idle` when no
    audio tab was noted.
  - After the settle, `noteAudioTab` from another tab makes it `remote`, and `noteAudioTabGone`
    makes it `idle` again.
  - `expireSilentAudioTab` drops another tab's entry only once `silenceMs` has passed since its
    `lastSeenMs` (role `remote` before, `idle` after), and never drops this tab's own entry.
  - `reset` clears `audioTabSearchSettled`.
- `playbackTabChannel.test.ts`: `askForAudioTab` posts an `audio-tab-query` that another tab of
  the same account receives. A malformed query (empty `tabId`) is dropped. Use the file's
  `createChannelHub` helper.
- `playbackDeviceMenu.test.ts`: "does not mark this device as playing when this tab is idle and
  this session is the active one". The This Device row has `['this_device']` and keeps its
  transfer target.
- `apps/web/e2e/media-player-cross-device-remote.spec.ts`: a new test after the same-context tab
  test ("When one browser opens another tab in the same context…"):
  - Title: "When a browser comes back after its audio tab paused a livestream and left, a new
    page plays an episode in that browser."
  - Same budget comment and `test.setTimeout(120_000)` as its neighbors; same `devicesToClose`
    and `try`/`finally` shape.
  - Steps:
    1. Open `deviceA = openSignedInDevice(browser)`, then `clearSeededPodcastQueueResources`.
    2. `openLivestreamAndPlay(deviceA.page, E2E_LIVE_AV_AUDIO_ITEM_ID_TEXT,
       E2E_LIVE_AV_AUDIO_ITEM_TITLE)`, `expectPersistentPlayerPlaying(deviceA.page, true)`, then
       `playerButton(deviceA.page, 'Pause').click()` and `expectAudioPaused(deviceA.page)`.
    3. Open `deviceB`, go to `/`, and `expectHomeLoaded`. A second device makes A's Playback
       Devices button a signal that A's check-in finished.
    4. On `deviceA.page`, `page.goto('/episode/' + E2E_PODCAST_ITEM_RESUME_NONE_ID_TEXT)`. This is
       a full load, standing in for the member coming back. Use `expectEpisodeLoaded`.
    5. `await expect(playerDevicesButton(deviceA.page)).toBeVisible({ timeout: 20_000 })`, then
       `await expect(playerDeviceCaption(deviceA.page)).toHaveCount(0)`. Before the fix this
       caption reads "Playing in Another Tab".
    6. `capturePageLoad` on the player with a sentence title.
    7. `clickDetailPagePlayButton(deviceA.page)` (import it from `./helpers/mediaPlayerAssertions`),
       then `expectPersistentPlayerPlaying(deviceA.page, true)`, `expectAudioPlaying(deviceA.page)`,
       and `expectMediaPlayerTitleVisible(deviceA.page, EPISODE_TITLE)`.
    8. Check `expect(playerDeviceCaption(deviceB.page)).toContainText('Playing on')`.
  - The existing same-context test must still pass unchanged: tab A2 next to a playing tab A gets
    A's answer to its query and stays `remote`.

## Release scratchpad

## Web: Play works again after coming back to a signed-in session

- Surfaces: web
- Change: a signed-in tab no longer treats itself as a remote view of its own login session when
  no tab of the browser is playing. A new tab asks the browser's other tabs who holds audio. With
  no answer within one second, or once the playing tab closes or goes silent, it plays locally: it
  loads the queue head paused, and a Play loads and plays here, taking the active slot. Before,
  after a reload or closed tab, the player showed "Playing in Another Tab", and every Play or
  Pause was sent as a command no tab could take, for up to an hour. It was first seen after a
  livestream.
- Who notices: signed-in members on web with cross-device playback, after reloading or reopening
  the site
- Operator steps: none
