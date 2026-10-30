# Media player decision matrix

Authoritative behavior baseline for the Podverse web media player. Locked in
during **Phase 1** of the
[this decision matrix](/apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md)
plan-set and used as the regression oracle for every subsequent phase. Each
later phase that touches the controller tree must keep this matrix passing.

## Scope

Source of truth for **what `currentTime`, `mpIsPlaying`, and side effects
should be after every playback decision**, expressed as a (source kind ×
trigger) table.

Behavior is read from current production code; the cross-references below
are sticky pointers — keep them updated when the code moves.

- Decision spine: `MediaPlayerController.tsx` →
  `NonLiveMediaOrchestrator.tsx` (non-live audio / video)
- Resource load entry point: `useMediaPlayerResourceUpdate.tsx`
- Anonymous restore: `AnonymousPlaybackRestoreController.tsx` +
  `anonymousPlaybackStorage.ts`
- Keyboard shortcuts: `mediaPlayerWindowKeyDown.ts`
- Livestream: `MediaPlayerControllerLiveStreamAV.tsx` (renders `MediaElement`)
- Cross-device role, store, and commands:
  `apps/web/src/contexts/CrossDevicePlayback.tsx` +
  `apps/web/src/lib/crossDevicePlayback/`

## Source kinds

How the player distinguishes "what is playing" is implicit in context fields,
not a single enum. The matrix uses these labels:

| Label            | Discriminator                                                           |
| ---------------- | ----------------------------------------------------------------------- |
| **clip**         | `mpClip !== null`                                                       |
| **soundbite**    | `mpItemSoundbite !== null`                                              |
| **chapter**      | `mpItemChapter !== null` and `mpItemChapterShouldSeek === true` on load |
| **item-podcast** | `mpItem !== null` and `mpChannel.medium_id === MediumEnum.Podcast`      |
| **item-video**   | `mpItem !== null` and `mpChannel.medium_id === MediumEnum.Video`        |
| **item-music**   | `mpItem !== null` and `mpChannel.medium_id === MediumEnum.Music`        |
| **add-by-RSS**   | `mpAddByRSS !== null`                                                   |
| **livestream**   | `mpItem.live_item` truthy (drives a separate live-stream controller)    |

Decision precedence inside the `loadedmetadata` handler (in
[`NonLiveMediaOrchestrator.tsx`](./Controller/NonLiveMediaOrchestrator.tsx)
lines 390–422): clip > soundbite > chapter > item, then within item,
podcast/video read the abridged-index `p`; music uses intent-specific
policy (`session_restore` resumes snapshot; `explicit_play` /
`fresh_transition` force `0`).

## Triggers

| Trigger                  | Code path                                                                                                                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Initial load**         | User clicks play in a list/detail UI → `useMediaPlayerResourceUpdate` → context setters → `<audio>`/`<video>` `src` re-render → media element fires `loadedmetadata`                                  |
| **Anonymous restore**    | `AnonymousPlaybackRestoreController` runs once when logged out + `loggedInAccount === null`                                                                                                           |
| **Queue load**           | `activeQueueUpcomingResources[0]` changes → `handleLoadQueueItem` / `handleLoadQueueClip` / `handleLoadQueueItemSoundbite` / `handleLoadQueueItemAddByRSS` in `MediaPlayerController.tsx`             |
| **AutoQueue transition** | `autoQueueActiveRow` changes → `handleLoadAutoQueueItem`                                                                                                                                              |
| **Skip-next button**     | `TrackNextButton*` → move-to-history + `useQueueResourcesLoadActive()` → queue load                                                                                                                   |
| **Track-ended**          | Media element `ended` event in `NonLiveMediaOrchestrator` `handleEnded`                                                                                                                               |
| **Explicit play**        | List/detail "play" buttons → `useMediaPlayerResourceUpdate` (same as initial load, just from a different surface)                                                                                     |
| **Alternate enclosure**  | User picks a different format/source in `SourceSelectors` / `EmbedAlternateEnclosureModal` → staged `pendingPlaybackDecision` with reason `enclosure-switch-resume` → reload at prior `mpCurrentTime` |

## Matrix — Sections 1 through 5 (non-livestream)

Notation: `p` = abridged stored position seconds (`queueResourcesAbridgedIndex.items[id].p`);
`d` = abridged stored duration (`.d`); `start_time` / `end_time` /
`duration` are typed strings or numbers per DTO and are coerced with
`Number()` or `parseFloat`.

### 1. Initial load — single load into an empty player

| Source kind                     | `currentTime` after `loadedmetadata`                                                                                                                                              | `mpIsPlaying` after load                                       | Side effects                                                                                                                                                                              |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **clip**                        | `Number(mpClip.start_time)`                                                                                                                                                       | follows `mpShouldPlay` (true if play was triggered explicitly) | `updateNowPlaying`; starts a listen session (`webListenSession`); on subsequent `play` effect, `globalPauseAtTime = Number(mpClip.end_time)`; `autoQueueShouldClear: true`                |
| **soundbite**                   | `Number(mpItemSoundbite.start_time)`                                                                                                                                              | same                                                           | `updateNowPlaying`; starts a listen session (`webListenSession`) that counts toward the soundbite's item; later `globalPauseAtTime = start_time + duration`; `autoQueueShouldClear: true` |
| **chapter (with `shouldSeek`)** | `Number(mpItemChapter.start_time)` (set by `playWhenReady` effect when chapter changes); `loadedmetadata` then re-applies chapter start because `mpItemChapterRef.current` is set | controller follows `mpShouldPlay`                              | `setMPItemChapterShouldSeek(false)`; `updateNowPlaying`; `globalPauseAtTime = null` if `mpItemChapter.end_time`                                                                           |
| **item-podcast**                | `p` if `p > 0` else `0`; near-end `p >= d - 5` clamps `mpCurrentTime` to `0` at update-time in `useMediaPlayerResourceUpdate` (see **§ near-end clamp**)                          | follows `mpShouldPlay`                                         | `updateNowPlaying`; starts a listen session (`webListenSession`)                                                                                                                          |
| **item-video**                  | Same as item-podcast                                                                                                                                                              | follows `mpShouldPlay`                                         | Same as item-podcast plus floating-portal video wrapper rendering                                                                                                                         |
| **item-music**                  | **`0` for `explicit_play` / `fresh_transition`** (`p` ignored); **`session_restore`** uses snapshot + near-end clamp via `resolvePlaybackLoadDecision`                            | follows `mpShouldPlay`                                         | `updateNowPlaying`; starts a listen session (`webListenSession`)                                                                                                                          |
| **add-by-RSS**                  | If `addByRSSSeekToTime !== null` and `>= 0`: that value (applied on `loadedmetadata` once or directly if `readyState >= 1`); otherwise `0`                                        | follows `mpShouldPlay`                                         | The listen session directive is `'none'`, so nothing is reported. `onAddByRSSPositionSave` is called from `play`, `pause`, and every 15s of accumulated playback in `timeupdate`          |
| **livestream**                  | See **§ 6a** appendix (the live element owns position; `currentTime` typically meaningless)                                                                                       | plays once the element can play while `mpIsPlaying` is true    | See § 6a                                                                                                                                                                                  |

### 1b. Alternate enclosure switch (same now-playing item)

When the user selects a different labeled enclosure for the current item, the UI stages `pendingPlaybackDecision` with reason **`enclosure-switch-resume`**. After the new file loads, `currentTime` is set to the prior `mpCurrentTime` (near-end clamped against the new duration when metadata arrives). Clip/soundbite/chapter `pauseAt` boundaries are re-armed. `mpIsPlaying` is unchanged; playback resumes via the existing play/pause sync effect when the user was already playing.

### 2. Anonymous restore (logged-out, first page load only)

Runs **once** per browser session, gated by `anonymousPlaybackRestoreStarted`
in [`AnonymousPlaybackRestoreController.tsx`](/apps/web/src/components/Queue/AnonymousPlaybackRestoreController.tsx).

| Snapshot `kind`        | `currentTime` after `loadedmetadata`                                                                                                                        | `mpIsPlaying` after load                                                | Side effects                                                                                                                                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clip`                 | `Number(mpClip.start_time)` — the **clip start**, _not_ the snapshot position (because clip precedence overrides item-level data in `handleLoadedMetadata`) | `false` (snapshot restore never auto-plays; `shouldPlay` is not passed) | `mediaPlayerResourceUpdate({ ..., mpCurrentTime: snapshot.playback_position_seconds, mpDuration: snapshot.media_file_duration_seconds })`; `autoQueueShouldClear: true`                                                |
| `item_soundbite`       | `Number(mpItemSoundbite.start_time)` — same precedence as above                                                                                             | `false`                                                                 | Soundbite end-time + 1 still pauses if snapshot position is past it                                                                                                                                                    |
| `item` (podcast/video) | `snapshot.playback_position_seconds` once `loadedmetadata` fires (via abridged `p`)                                                                         | `false`                                                                 | Snapshot drives both `mpCurrentTime` and `mpDuration` so the UI shows the saved position immediately, before media metadata loads                                                                                      |
| `item` (music)         | `snapshot.playback_position_seconds` (near-end clamp via `mediaFileDurationHintSeconds` / abridged `d`; explicit `0` does not fall back to `p`)             | `false`                                                                 | `item-music` + `session_restore`; same resume model as podcast snapshot                                                                                                                                                |
| `item` (livestream)    | None; the live element starts at the live point when played                                                                                                 | `false`                                                                 | The item is read fresh by id (`fetchFreshRestoredItem`). Ended or not found: the snapshot is cleared and the player stays empty. Live or scheduled: loads as a `livestream` target with no saved position or duration. |
| **logged in**          | Restore is **skipped** entirely; snapshot is cleared by the login effect                                                                                    | n/a                                                                     | `clearAnonymousPlaybackSnapshot()` is called                                                                                                                                                                           |

> **Clip / soundbite anonymous restore (by design):** when the snapshot is a
> `clip` or `item_soundbite`, the controller seeks to **segment start** on
> `loadedmetadata`, not `snapshot.playback_position_seconds`. Clips and
> soundbites are short segments; resume is anchored at the segment boundary.

The snapshot never decides whether the item is live; restore decides from the item the server
returns on that load. When the server gives no answer (offline, timeout, 5xx, 410), restore loads
the item and channel copy the snapshot kept (`stored_item`, `stored_channel`) with the saved
position and duration, as a `livestream` target when the copy is a live item; a snapshot with no
copy loads nothing and is kept.

### 3. Queue load (manual queue)

`activeQueueUpcomingResources[0]` change drives the load through
`MediaPlayerController` (`handleLoadQueueItem` / Clip / Soundbite /
AddByRSS). **`autoQueueShouldClear: true`** in every path.

When the player has no loaded target, that load is paused and does not post
`play`. If the head is upcoming (`list_position` > 0), web first calls
`POST /queue/{id}/resources/promote-upcoming`, which moves the row to
now-playing without writing `last_played_at`. A later refresh of that same
row also skips the `play` write so the promote is not undone by a listen stamp.

On signed-in mount, `QueueController` loads the last-active queue first. If that
queue has no now-playing and no upcoming and the player is still empty, it
loads the other account queue (AV ↔ music) into the store so the queue-head
effect can promote and load paused. Falling back does not flip
`is_active_queue`. Auto-queue is not consulted at open — those rows are not
persisted and only advance after skip / ended while something is already
playing. Hydration and automatic queue-head loads give way to any playback load
applied after they start (for example an explicit Play on a detail page), so a
slow adoption never replaces the item the user chose.

A queue head whose item is a livestream is decided from the item read fresh on that load, never
from the copy on the queue row. Ended: the row moves to history as completed, without a new
`last_played_at`, the queue reloads, and the next row loads paused through the same empty-player
path; with nothing left, the player stays empty. Only a tab that owns the head writes that row:
any tab that is not `remote`, once the first check-in has settled; while it is pending the write
waits. Not found: nothing is written and nothing loads. Live or scheduled: it loads as a
`livestream` target with no saved position. No answer (offline, timeout, 5xx, 410): the queue
row's own copy of the item loads at the row's position, with the row's channel; the row carries no
live status, so a livestream row loads through the episode path.

The handoff prompt (a paused local item and a newer, different server head) opens only after the
head's item is read fresh. An ended or missing livestream head is never offered: its dismissal is
remembered and nothing is written. With no answer, the prompt names the queue row. Add by RSS heads
are offered without a read.

| Resource shape                                         | `currentTime` after `loadedmetadata`                                                                                                                           | `mpIsPlaying`                                                            | Side effects                                                                                                                                                    |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nextResource.item` only (no clip/soundbite)           | item-podcast/video: `p` or `0`; item-music: **`session_restore`** resumes `playback_position` (near-end clamp); **`fresh_transition`** after skip/ended is `0` | follows `mpShouldPlay`; queue load does not set `shouldPlay` → unchanged | `handleLoadQueueItem` defaults music to `session_restore`; `pendingMusicQueueLoadIntentRef` supplies `fresh_transition` before skip/ended `loadActive`          |
| `nextResource.item`, a livestream                      | None; the live element starts at the live point                                                                                                                | unchanged (an empty-player adopt loads paused)                           | Ended, on a tab that owns the head: `retireEndedQueueHeadItem` writes history, then `queueResourcesLoadActive` with the queue's id; nothing loads from this row |
| `nextResource.clip`                                    | `Number(clip.start_time)`                                                                                                                                      | unchanged                                                                | Clip pause-at-end-time + 1 still active                                                                                                                         |
| `nextResource.item_soundbite`                          | `Number(soundbite.start_time)`                                                                                                                                 | unchanged                                                                | Soundbite pause-at-end-time + 1 still active                                                                                                                    |
| `nextResource.add_by_rss_resource_data` (non-redacted) | If `playback_position` parses to a finite number: that value; else 0                                                                                           | `mpShouldPlay` set by `usePlayAddByRSS`                                  | `setMPAddByRSS`; reads `playback_position` from queue resource; `is_add_by_rss_redacted` resources are skipped                                                  |

### 4. AutoQueue transition (`autoQueueActiveRow` change)

`handleLoadAutoQueueItem` calls `mediaPlayerResourceUpdate` with
**`autoQueueShouldClear: false`** so the auto-queue is preserved.

The buffer's later rows come from `fillAutoQueueForward` in `@podverse/playback-core`,
called by `useAutoQueueLoadResources`. `fetchAutoQueueResources` in
`useMediaPlayerControllerQueueHeadLoading` makes that call when the active row is the
highest key or the buffer is empty.

| Resource shape                                           | `currentTime` after `loadedmetadata`                                                           | `mpIsPlaying`                                                                                                            | Side effects                                                                                                               |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `autoQueueResources[row].item` + optional clip/soundbite | Same precedence as the queue-load row above (clip > soundbite > item with music/podcast split) | Inherits whatever play state was already on (autoQueue typically advances during ended → load → `setMPShouldPlay(true)`) | Auto-queue remains populated; near-end clamp **inside `useMediaPlayerResourceUpdate`** still applies before metadata loads |

### 5. Skip-next / Track-ended

**Skip-next button** (`TrackNextButton*`):

1. `moveNowPlayingToHistory({ completed: false, ... })`
2. `useQueueResourcesLoadActive()` → loads next from queue or auto-queue or
   wraps on repeat
3. If `upcomingManualCount === 0 && !hasAutoQueueNext`: `clearNowPlaying()`
4. Otherwise: queue-load path runs; new resource loads via § 3 / § 4

**Track-ended** (media element `ended` event,
`NonLiveMediaOrchestrator.handleEnded`):

| Context                      | Outcome                                                                                                                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mpAddByRSS != null`         | `onAddByRSSEnded(positionSeconds)`; `setMPShouldPlay(false)`; load active queue with stored `medium_id`; if `upcomingManualCount === 0`, attempt `onAddByRSSPlayNext()`; if that returns false, `clearNowPlaying()` |
| Non add-by-RSS               | `moveNowPlayingToHistory({ completed: true, ... })`; `useQueueResourcesLoadActive()`; if both queues empty: `clearNowPlaying()`; otherwise: `setMPShouldPlay(true)`                                                 |
| Embed route (`isEmbedRoute`) | `setMPIsPlaying(false)`; `setMPShouldPlay(false)`; return (no history move, queue load, or `clearNowPlaying`)                                                                                                       |

Add by RSS next and previous choose the neighbor with `resolveAddByRSSAdjacentStep`
in `@podverse/playback-core`. `useAddByRSSPlayNext` and `useAddByRSSPlayPrevious` load
that id and play it.

### 6. Time-update side effects

`handleTimeUpdate` (lines 502–588 of `NonLiveMediaOrchestrator.tsx`) does:

1. `setMPCurrentTime` (skipped when add-by-RSS is paused, to keep the
   slider stuck at the saved position).
2. Increments `playbackElapsedRef` only on positive deltas; every ≥ 15 s
   accumulated playback: `updateNowPlaying` + (add-by-RSS only)
   `onAddByRSSPositionSave`. Resets to 0 after each flush.
3. If `globalPauseAtTime !== null` and `currentTime >= globalPauseAtTime`:
   `setMPIsPlaying(false)`; clear pause-at.
4. **Clip** end: when `currentTime >= Number(clip.end_time) + 1`,
   `setMPClip(null)`; `setMPIsPlaying(false)`; clear pause-at.
5. **Soundbite** end: when
   `currentTime >= start_time + duration + 1`, `setMPItemSoundbite(null)`;
   `setMPIsPlaying(false)`; clear pause-at.
6. **Chapter** sync (only when **not** clip / soundbite): walk chapters via
   `selectItemChapterForTime`; update `mpItemChapter` if the active chapter
   id changed.

The `+ 1` buffer on clip/soundbite end is intentional padding to let the
playhead visibly cross the end-time before pause.

#### Two-step clip / soundbite termination (regression oracle)

Clip and soundbite end with **two distinct timeupdate-driven steps**, not
one. Tests must keep these straight:

- **Step A — pause at `end_time` (clip) or `start_time + duration`
  (soundbite).** Set up in the `playWhenReady` effect by writing
  `globalPauseAtTime`. Step 3 of the list above fires
  `setMPIsPlaying(false)` and clears `globalPauseAtTime`.
- **Step B — clear at `end_time + 1` (clip) or
  `start_time + duration + 1` (soundbite).** Step 4 / 5 fires
  `setMPClip(null)` / `setMPItemSoundbite(null)` plus another
  `setMPIsPlaying(false)`.

For a `clip(start=5, end=10)`:

- `timeupdate(9.5)` — neither step fires.
- `timeupdate(10.0)` — Step A fires (`setMPIsPlaying(false)`); Step B does
  not.
- `timeupdate(11.0)` — Step B fires (`setMPClip(null)` +
  `setMPIsPlaying(false)`).

A test that asserts `expect(setMPIsPlaying).not.toHaveBeenCalled()` after
the play head has already crossed `end_time` is misaligned with this
contract — it must use a sample point strictly **inside** the clip range
(e.g. `9.5`).

## Near-end clamp (the "5-second rule")

Implemented **only** in `useMediaPlayerResourceUpdate.getAbridgedAndSet`
(lines 144–162):

```
if (duration > 0 && currentTime >= duration - 5) {
  currentTime = 0;
}
```

Applies before metadata loads, on the **stored abridged `p`/`d`** for the
resource. It is **not** re-applied inside the `handleLoadedMetadata` seek
calculation, which uses raw `Number(queueResourceAbridged?.p) > 0`. Track
this in Phase 2 — the matrix cells above assume the
`useMediaPlayerResourceUpdate` clamp is the canonical authority.

### Sign and validity rules (Phase 2 tightening)

Today's inline `Number(p) || 0` accepts and passes through any finite number
including **negative** values (because `-5 || 0 === -5`). Phase 2 introduces
`parsePlaybackSeconds(unknown): number | undefined` which **tightens** the
contract: negative, non-finite (`NaN`, `Infinity`, `-Infinity`), and
non-numeric inputs all become `undefined`. Phase 3 consumers compose
`parsePlaybackSeconds(value) ?? 0` so callers continue to see `0` for
invalid input — but a stored negative `p` no longer leaks into the player
state. This is a one-way change; no existing user-facing behavior depends
on negatives flowing through.

## Music playback intents (Phase 2 type naming)

Phase 2's `MusicItemPlaybackIntent` discriminator names the three music
playback contexts that already exist in this matrix as prose. The literal
values map 1:1 to the trigger sections above:

| Intent literal     | Matrix section(s)                                                                                       | Expected `currentTime`                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `session_restore`  | § 2 — Anonymous restore (`item` music); § 3 — logged-in queue hydration (`handleLoadQueueItem` default) | snapshot / `playback_position` via `resumeSeekFromAbridged` (near-end clamp on explicit and `p`; explicit `0` does not fall back to `p`) |
| `explicit_play`    | § 1 — User Play from list/detail (`useMediaPlayerResourceUpdate`)                                       | `0` always (`p` ignored)                                                                                                                 |
| `fresh_transition` | § 4 — AutoQueue transition; § 5 — skip-next / track-ended before `loadActive`                           | `0` always (`p` ignored)                                                                                                                 |

Only `session_restore` resumes mid-track. Skip, ended, and auto-queue
advances set `pendingMusicQueueLoadIntentRef` to `fresh_transition` before
`queueResourcesLoadActive` so the next music row does not inherit a prior
track's saved position.

**Playlists:** playlist-driven next/previous uses auto-queue / queue rows;
no separate playlist intent — same `fresh_transition` vs `session_restore`
split as § 3–§ 5.

Once chapters and the 3-second restart are handled in `useTrackPreviousButtonActions`,
`runCorePreviousTrack` calls `resolveAutoQueuePrevious` in `@podverse/playback-core`.

## Section 6 (REQUIRED) — Livestream baseline

Livestreams render the shared `MediaElement` from
`MediaPlayerControllerLiveStreamAV.tsx`. A progressive file sets `src`. An HLS
playlist is attached after mount, natively or with lazy `hls.js` when the
browser cannot play it. Each source mounts its own element, keyed by delivery
and URL (`LivestreamMediaElement`). Leaving a livestream unmounts that element,
so the next livestream starts from a fresh element. The source is the selected
labeled enclosure (`getSelectedLabeledItemEnclosureAndSource`). When
`mpItem.live_item` is absent, or the enclosure's media type does not match
this controller, the source is null and no element is mounted.

`MediaPlayerController` mounts `NonLiveMediaMount`,
`MediaPlayerControllerLiveStreamAudio`, and `MediaPlayerLiveStreamVideoWrapper`
together. The audio livestream shell is hidden. Video livestreams render
inside `MediaPlayerLiveStreamVideoWrapper` →
`MediaPlayerLivestreamVideoPortalFloating`.

Live position lives in `liveMediaStore` (`lib/livePlayback/liveMediaStore.ts`).
The live element a host mounts registers there; Add by RSS livestreams
register the non-live element.

### 6a. Live-stream behavior

| Trigger                         | What the code does                                                                                                                                                                                                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Initial play, audio live stream | Labeled enclosure selection, then `MediaElement` with `delivery` `file` or `hls`. The audio shell is hidden.                                                                                                                                                                                                                    |
| Initial play, video live stream | Same selection. The `<video>` is inside the floating portal wrapper, with `playsInline`.                                                                                                                                                                                                                                        |
| Source fallback                 | Only the selected labeled source is passed. There is no walk to the next labeled enclosure.                                                                                                                                                                                                                                     |
| Live to non-live                | `mpItem.live_item` clears, the live source becomes null, and the live element unmounts. `NonLiveMediaMount` drives the non-live item.                                                                                                                                                                                           |
| Non-live to live                | `mpItem.live_item` is set, `isNonLiveVideoPlaying` is false for that item, and the live controller mounts `MediaElement` for the matching media type.                                                                                                                                                                           |
| Live stream end / disconnect    | `LivestreamMediaElement` pauses the element when `mpIsPlaying` is false, and calls `play()` when it is true. This controller has no separate retry UI.                                                                                                                                                                          |
| Live time and duration          | `mpDuration` is 0 for every live resource, set on load. The duration slot is the Live control; the time slot is empty at the live edge and shows `−m:ss` when more than 10 s behind (`resolveLivePlaybackDisplay`).                                                                                                             |
| Rewind window                   | `readLiveSeekWindow` reads the last `seekable` range for HLS only; the live edge is hls.js `liveSyncPosition`, or for native HLS the range end minus the offset measured at first play. A window of 30 s or more shows the scrubber and skip buttons; progressive streams and shorter windows hide them.                        |
| Play after pause                | `liveMediaStore.prepareResume` runs before `play()`: an element that has not played starts as is; HLS resumes in place while the paused moment is 6 s or more inside the window, otherwise seeks to the live edge; progressive reconnects (new element, or `reloadAt(0)` for Add by RSS).                                       |
| Live control                    | `transport.goToLive` seeks to the live edge, or reconnects when there is no window, then sets `mpIsPlaying`.                                                                                                                                                                                                                    |
| Reload while live is playing    | The snapshot stores `kind: 'item'` for a livestream. Restore reads the item fresh and calls `resolveRestoredLivestream`: Ended or not found clears the snapshot and leaves the player empty; Live or scheduled loads it paused as a `livestream` target; no answer loads the snapshot's stored copy. Signed-in reload: see § 3. |

### 6b. Live-stream E2E specs

Added under [`apps/web/e2e/`](/apps/web/e2e):

- `media-player-livestream-audio-start.spec.ts` — start a known live audio
  stream; assert play state and player UI.
- `media-player-livestream-video-start.spec.ts` — same for live video,
  including the floating-portal wrapper behavior.
- `media-player-livestream-to-podcast-transition.spec.ts` — the dispose /
  recreate dance regression case; assert clean transition with no double
  audio and no stuck UI.
- `media-player-podcast-to-livestream-transition.spec.ts` — reverse
  direction.
- `media-player-livestream-hls-start.spec.ts` — live HLS playback and playlist reload.
- `media-player-livestream-live-controls.spec.ts` — Live control in place of
  the duration after an episode, progressive reconnect, HLS rewind / resume
  in place / go to live, and no rewind controls on a short window.

These specs are the regression checks for livestream start, HLS playback, and
live/non-live transitions. They must run unchanged across every phase.

### 6c. Test feed selection

The live-stream specs run against the internal seed. No live-stream
test server or external network dependency is involved; the asset server
on port 2111 serves the enclosures.

| Slot                       | Choice                                                                                           | Source                                            | Scope                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Live audio, no enclosure   | Feed `v5fCrIj9Io` / item `e2eLiveStrm01`                                                         | [tools/web/seed-e2e.mjs](/tools/web/seed-e2e.mjs) | Controller-tree mount on navigation, without play (audio-start spec)                       |
| Live audio, playable       | Feed `e2eLiveAvChn01` / item `e2eLiveAud001`, progressive mp3 on port 2111                       | [tools/web/seed-e2e.mjs](/tools/web/seed-e2e.mjs) | Play, dispose, and recreate across live ⇄ non-live transitions (transition specs)          |
| Live video, playable       | Feed `e2eLiveAvChn01` / item `e2eLiveVid001`, progressive mp4 on port 2111                       | [tools/web/seed-e2e.mjs](/tools/web/seed-e2e.mjs) | Live `<video>` mount and floating-portal placement (video-start spec)                      |
| Live audio HLS             | Feed `e2eLiveAvChn01` / item `e2eLiveHlsA01`, `e2e-hls-event.m3u8`                               | [tools/web/seed-e2e.mjs](/tools/web/seed-e2e.mjs) | Live audio HLS playback and playlist reload (hls-start spec)                               |
| Live video HLS             | Feed `e2eLiveAvChn01` / item `e2eLiveHlsV01`, `e2e-hls-video-event.m3u8`                         | [tools/web/seed-e2e.mjs](/tools/web/seed-e2e.mjs) | Live video HLS playback, decoded frames, and floating portal (hls-start spec)              |
| Live audio HLS, rewindable | Feed `e2eLiveAvChn01` / item `e2eLiveHlsRw01`, `e2e-hls-rewind-event.m3u8` (120 s, 6 s segments) | [tools/web/seed-e2e.mjs](/tools/web/seed-e2e.mjs) | Live rewind, resume in place, and go to live (live-controls spec)                          |
| Live audio, ended          | Feed `e2eLiveAvChn01` / item `e2eLiveEnded01`, status ended, start three days ago                | [tools/web/seed-e2e.mjs](/tools/web/seed-e2e.mjs) | Restore retires an ended livestream (anonymous-restore and livestream queue-restore specs) |

The playable live items sit in their own unsubscribed channel so
`v5fCrIj9Io` keeps a single enclosure-free live item — the audio-start and
header-image specs both resolve
`a[href*="/podcast/livestream/"]:first` there — and so the subscribed-list
filter spec still matches exactly one channel on the term `livestream`.

**What a progressive file does and does not cover.** Enclosure selection,
controller selection, element mount, unmount/remount, and floating-portal
placement are all real: they depend on the labeled enclosure's media type
and on `mpItem.live_item`, not on the transport. Playlist reload and
playback from a live HLS playlist are asserted in Chromium through `hls.js`.
Rewind, resume in place, and go to live are asserted on a static EVENT
playlist in Chromium through `hls.js`. Safari native HLS (including the
join-offset live edge), real live-edge advance, `duration === Infinity`,
and cross-source fallback are still not asserted.

## Section 7 — Cross-device remote view

A tab's cross-device role is `active`, `remote`, or `idle`
(`resolveTabPlaybackRole` in `tabPlaybackRole.ts`). A tab of the active
session is `remote` only while another tab of this browser holds that
session's audio. A new tab asks the other tabs (`audio-tab-query` on the
tab channel) and waits `AUDIO_TAB_QUERY_WAIT_MS`. When no tab answers,
the audio tab closes, or it stays silent for `AUDIO_TAB_SILENCE_MS`, the
tab is `idle`; the next play here claims. Without `BroadcastChannel` it
stays `remote`. In `active` and `idle`, sections 1–6 apply unchanged.
In `remote`, the local player is cleared once (`CrossDevicePlayback.tsx`
calls `useMediaPlayerClearNowPlaying`) and the cells below apply. The remote
view's content comes from the shared state's resource summary at once,
then from the remote item's records once this tab has loaded them
(channel, item or clip, chapters, or the Add by RSS item from this
account's queue).

### 7a. What the player shows

`resolveRemotePlayerDisplay` is null unless the role is `remote` and
`displayState.resource` is set. While it is null and the local player is
empty, `#media-player` drops `media-player-active` and the bar is hidden.
Playback Devices renders only when two or more devices are connected.

| Situation                                                 | Content                                                          | Caption                                         | Progress                                                     | Controls                                                                                                                           |
| --------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Another device plays a non-live item                      | `displayState.resource`, then its records                        | Playing on {device}                             | remote estimate over `duration_seconds`; one seek on release | play/pause, jumps, previous/next, speed and Share in More, Add to Playlist, Playback Devices                                       |
| Another device is starting the item                       | same                                                             | Starting on {device}                            | estimate, not advancing                                      | same                                                                                                                               |
| Playing device pauses                                     | same                                                             | Paused on {device}                              | frozen estimate                                              | same                                                                                                                               |
| Another open tab of this browser holds audio (any status) | same                                                             | Playing in Another Tab                          | same as that status                                          | same                                                                                                                               |
| Another device plays a livestream                         | same                                                             | Playing on {device} (or Paused on, Starting on) | Live label                                                   | play/pause, previous/next, Add to Playlist, Share in More, Playback Devices                                                        |
| Narrow layout                                             | same                                                             | same                                            | same                                                         | play/pause, jumps when the item can skip, Playback Devices. Previous/next, Add to Playlist, and More are on the full-screen player |
| Playing device stops (`resource` null)                    | bar hidden                                                       | —                                               | —                                                            | —                                                                                                                                  |
| Playing device leaves presence                            | local queue head, paused; bar stays hidden if the queue is empty | none                                            | local                                                        | local                                                                                                                              |
| This browser's audio tab closed or reloaded               | local queue head, paused; bar stays hidden if the queue is empty | none                                            | local                                                        | local                                                                                                                              |
| Transfer pending (any role)                               | as the role shows                                                | Sending to {device}…                            | as the role shows                                            | as the role shows                                                                                                                  |

The narrow bar is `MediaPlayerButtonsMobile`. It shows play/pause, jump
back and jump forward when the item can skip, and Playback Devices when
two or more devices are connected. Add to Playlist, More, and
previous/next stay on the desktop bar and the full-screen player.
Desktop and the full-screen player keep previous/next for a livestream
and hide jumps, because seek is not allowed for a live item. More on a
livestream omits playback speed and the sleep timer and keeps Share.

Also in the remote view:

- Segment strip: names the chapter at the playing device's estimated
  position, or the clip or official clip; none for a live item. It
  follows the estimate (`useRemotePlayerInfo`), not a drag preview.
- Title, channel, and full-screen links: built from the summary's
  `medium` until records load (episode path for podcast or video, track
  path for music, no link otherwise; channel link stays empty), then
  the same resolution the local player builds. A null resolved title
  falls back to the summary title.
- Add to Playlist: opens the playlist modal with the loaded records and
  sends no command. For an Add by RSS item it stays disabled until the
  remote resource is `ready` (a now-playing queue row matches the hash
  and this tab can resolve an index item). A database item stays
  enabled while records load; a failed load shows one error toast.
- Share: a row in More on the desktop bar and the full-screen player,
  in every role, including while this browser plays. The narrow bar
  does not show More. Share opens the existing share modal. In the remote
  role it uses the loaded
  records (and the chapter the strip names, when that chapter is in the
  loaded list). It is disabled for an Add by RSS item (no public page),
  from the summary ref, before records load. A load that is not ready
  shows one error toast. In `active` and `idle` it uses the local player
  records and is disabled when those records have no channel and no item.
- Playback Devices uses the accent color while the remote view is
  showing. Choosing another device that is already playing does nothing.
  Choosing This Device takes over in this tab unless this tab already
  holds the audio, so another tab of this browser still takes over here.

Hidden in the remote view: volume, mute, clip, repeat, shuffle,
alternate enclosure, chapter markers on the progress bar, clip and
soundbite highlight on the progress bar, and full-screen video. The
clip editor and the embed player keep the local progress bar. If the
shared `duration_seconds` is missing or zero, the remote bar shows the
position, leaves the duration blank, draws no fill, and does not seek.

### 7b. Triggers in the remote role

A command names the target state. `play` and `pause` are separate
commands. `seek` and `set_rate` are not sent for a live item.

| Trigger                                                                                     | Result                                                                                                      | Where                                                         |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Play/pause button, Space                                                                    | `pause` while status is `playing` or `loading`; `play` while `paused`                                       | `usePlayerTransport`, `mediaPlayerWindowKeyDown.ts`           |
| Jump buttons, arrow keys                                                                    | absolute `seek` from the estimate (arrows ±10s), clamped to the playing device's duration; nothing for live | `usePlayerTransport`, `mediaPlayerWindowKeyDown.ts`           |
| Previous/next (desktop and full screen), including long press                               | `previous` or `next`                                                                                        | `useTrackPreviousButtonActions`, `useTrackNextButtonActions`  |
| Progress click or drag                                                                      | one `seek` on mouseup                                                                                       | `RemoteMediaPlayerProgress.tsx`                               |
| Speed in More                                                                               | `set_rate`                                                                                                  | `usePlayerTransport`                                          |
| Add to Playlist                                                                             | playlist modal with the loaded records; nothing sent                                                        | `PlaylistAddToButton.tsx`                                     |
| Current remote chapter's play button                                                        | `play` or `pause`                                                                                           | `ListItemChapterRow.tsx`, `ItemChapterHeaderPlaySection.tsx`  |
| Pick the item already playing there, with no start time                                     | `play` or `pause`                                                                                           | `useMediaPlayerResourceUpdate`, `usePlayAddByRSS`             |
| Pick another item, a chapter, or the same item with a start time                            | `play_item`                                                                                                 | same                                                          |
| Pick that loads paused (`shouldPlay === false`, or a load that skips the now-playing write) | nothing sent                                                                                                | same                                                          |
| Device menu: another device                                                                 | take over on that device                                                                                    | `PlaybackDevicesButton.tsx`, `useCrossDevicePlaybackTransfer` |
| Device menu: This Device                                                                    | local take over, unless this tab already holds the audio                                                    | same                                                          |
| Device menu: another device that is already playing                                         | nothing                                                                                                     | `playbackDeviceMenu.ts`                                       |

### 7c. Invariants

- The remote view writes no playback position, history, or saved
  position. The progress bar does not call `setMPCurrentTime`. Entering
  `remote` clears the local player once, which sets the local time to 0
  so this tab stops.
- The remote progress bar's length is the playing device's
  `duration_seconds`, never this tab's media element. The estimate
  advances only while status is `playing` and the item is not live
  (one 250 ms sample for the tab).
- No command is a toggle on the wire. No `seek` or `set_rate` for a
  live item.
- Item rows and detail play buttons match the remote resource by the
  first id the row carries: Add by RSS hash, then chapter, soundbite,
  clip, or item. A match uses the active style and the pause icon while
  status is `playing` or `loading`. A non-live match draws the row
  progress line from the estimate; a live match does not. Chapter rows
  match when the chapter at the playing device's estimated position is
  theirs (`selectItemChapterForTime`). No chapter matches for a clip,
  official clip, live item, or Add by RSS item, or when the chapter
  list is empty or the chapter request failed.
- The remote item's records load once per resource. A slower load for
  an older resource cannot replace a later one. Rows read the store and
  never start a load.
- A blocked start on the receiving tab shows Ready to Play Here. Play
  Here sets the local player playing inside the click. Not Now and the
  close button dismiss it. The sender shows one error toast per
  failure, then clears it. A device that has already left the list is
  named "the other device".

## Cross-cutting side effects glossary

| Effect                                                                       | When it fires                                                                                                                                                                                                                                                                           | Where                                                                    |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `setMPCurrentTime(p_or_0)`                                                   | On resource load, before metadata                                                                                                                                                                                                                                                       | `useMediaPlayerResourceUpdate`                                           |
| `mediaRef.currentTime = newCurrentTime`                                      | On `loadedmetadata` after seek policy decides                                                                                                                                                                                                                                           | `NonLiveMediaOrchestrator.handleLoadedMetadata`                          |
| `setMPClip(null)`                                                            | On clip end-time + 1 reached                                                                                                                                                                                                                                                            | `handleTimeUpdate`                                                       |
| `setMPItemSoundbite(null)`                                                   | On soundbite end-time + 1 reached                                                                                                                                                                                                                                                       | `handleTimeUpdate`                                                       |
| `setMPItemChapter(...)`                                                      | On `timeupdate` when chapters list exists, no clip/soundbite                                                                                                                                                                                                                            | `handleTimeUpdate`                                                       |
| `setAutoQueueResources({}), setAutoQueueActiveRow(0)`                        | On any `mediaPlayerResourceUpdate` call with `autoQueueShouldClear: true`                                                                                                                                                                                                               | `useMediaPlayerResourceUpdate`                                           |
| `moveNowPlayingToHistory({ completed: true })`                               | On track-ended (non add-by-RSS)                                                                                                                                                                                                                                                         | `handleEnded`                                                            |
| `moveNowPlayingToHistory({ completed: false })`                              | On skip-next button click                                                                                                                                                                                                                                                               | `TrackNextButton*`                                                       |
| `reqQueueResourceItemAddHistory` (`completed: true`) for an ended livestream | A signed-in queue-head load on a tab that is not `remote`, after the first check-in, finds the head's item is a livestream that has ended                                                                                                                                               | `retireEndedQueueHeadItem` in `useMediaPlayerControllerQueueHeadLoading` |
| `onAddByRSSPositionSave(t)`                                                  | On play, pause, and every ≥ 15 s of playback                                                                                                                                                                                                                                            | `handlePlay`, `handlePause`, `handleTimeUpdate`                          |
| `webListenSession`                                                           | `load` runs on `loadedmetadata` with the decision's `listenSession` (`'none'` for add-by-RSS). `timeupdate`, `seeked`, `pause`, and `ended` feed it. Reports go to `POST /stats/listen` once the counted-listen rule is met, and only for a signed-in account that has Taste Profile on | `handleLoadedMetadata` and the media event handlers                      |
| `writeAnonymousPlaybackSnapshotFromPlayerState`                              | On every `updateNowPlaying` while logged out; an `item` snapshot also keeps the item and channel the player held                                                                                                                                                                        | `useQueueResourceUpdateNowPlaying`                                       |
| `clearAnonymousPlaybackSnapshot()`                                           | On login, and on restore when the snapshot's item is an ended livestream or no longer exists                                                                                                                                                                                            | `AnonymousPlaybackRestoreController`                                     |
| `globalPauseAtTime` set                                                      | On clip / soundbite load (in `playWhenReady` effect)                                                                                                                                                                                                                                    | `NonLiveMediaOrchestrator`                                               |
| `globalPauseAtTime` cleared                                                  | On `timeupdate` when reached, or on chapter end with `end_time`                                                                                                                                                                                                                         | `NonLiveMediaOrchestrator`                                               |

## Phase 1 deliverable-5 substitution

Phase 1's
[this decision matrix](/apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md)
deliverable 5 named two pure-helper test files to confirm and extend:

- `apps/web/src/lib/playbackResumeNearEnd.test.ts`
- `apps/web/src/lib/musicSessionRestoreCurrentTime.test.ts`

Neither of those production helpers exists yet — they are scheduled to
ship in **Phase 2** along with the centralized `clampNearEndSeconds`
extraction. The Phase 1 "zero production code changes" rule forbids
creating them now.

### What Phase 1 covers instead

The same behavioral surface is pinned by tests on the helpers and hooks
that exist today:

- 5-second near-end clamp (the rule `playbackResumeNearEnd` will
  encapsulate):
  [`useMediaPlayerResourceUpdate.nearEndClamp.test.tsx`](/apps/web/src/hooks/__tests__/useMediaPlayerResourceUpdate.nearEndClamp.test.tsx)
  pins the clamp inside `useMediaPlayerResourceUpdate` (clip, soundbite,
  podcast, video, music, zero-duration, missing-row, boundary cases).
- Anonymous restore (the rule `musicSessionRestoreCurrentTime` will
  cover for music): boundary cases added to
  [`anonymousPlaybackStorage.test.ts`](/apps/web/src/utils/anonymousPlaybackStorage.test.ts)
  for NaN, Infinity, large positions, negative positions, and
  zero-duration acceptance.
- Chapter selection (the rule a future helper will cover for chapter
  resume): boundary cases added to
  [`selectItemChapterForTime.test.ts`](/apps/web/src/utils/mediaPlayer/selectItemChapterForTime.test.ts)
  for empty lists, inclusive start, exclusive end, negative input, large
  input, and non-numeric end times.

### What Phase 2 must add

When Phase 2 extracts the helpers, it must:

1. Create `clampNearEndSeconds.ts` and rewrite
   `useMediaPlayerResourceUpdate.nearEndClamp.test.tsx` to call the new
   helper directly, **proving the extraction is behavior-preserving**.
2. Create `playbackResumeNearEnd.ts` /
   `musicSessionRestoreCurrentTime.ts` per the original plan and add
   `*.test.ts` files for each, lifting the boundary cases currently
   embedded in `anonymousPlaybackStorage.test.ts` /
   `selectItemChapterForTime.test.ts` into the new test files.
3. Update this matrix to point at the new helpers and remove this
   substitution subsection once the migration completes.

This subsection is the audit trail that lets Phase 2 close the loop
without losing coverage.

## Coverage

- **Unit / orchestration tests** that lock cell-by-cell behavior live under
  [`apps/web/src/components/MediaPlayer/Controller/__tests__/`](./Controller/__tests__/).
  The fake `HTMLMediaElement` harness they exercise lives at
  [`apps/web/src/test/mediaElementFake.ts`](/apps/web/src/test/mediaElementFake.ts).
- **Pure helpers** that the new policy will reuse — coverage extensions in
  [`selectItemChapterForTime.test.ts`](/apps/web/src/utils/mediaPlayer/selectItemChapterForTime.test.ts)
  and [`anonymousPlaybackStorage.test.ts`](/apps/web/src/utils/anonymousPlaybackStorage.test.ts).
- **Near-end clamp pinning** until Phase 2 centralizes the rule:
  [`useMediaPlayerResourceUpdate.nearEndClamp.test.tsx`](/apps/web/src/hooks/__tests__/useMediaPlayerResourceUpdate.nearEndClamp.test.tsx)
  (see the "Phase 1 deliverable-5 substitution" subsection above).
- **E2E specs** that drive the matrix end-to-end live under
  [`apps/web/e2e/`](/apps/web/e2e) prefixed with `media-player-` — including
  the livestream specs from § 6b.
- **Cross-device remote view:** two signed-in browser contexts in
  [`media-player-cross-device-remote.spec.ts`](/apps/web/e2e/media-player-cross-device-remote.spec.ts),
  and the unit tests in
  [`apps/web/src/lib/crossDevicePlayback/`](/apps/web/src/lib/crossDevicePlayback/).

> Open **Phase 2** items (capture before extracting helpers):
>
> - Resolve the snapshot-clip seek inconsistency above.
> - Extract `playbackResumeNearEnd` and `musicSessionRestoreCurrentTime`
>   pure helpers per Phase 2 plan; consolidate the 5-second clamp in one
>   place; re-apply it inside `handleLoadedMetadata` if/when policy
>   converges.
