# Media player decision matrix

Authoritative behavior baseline for the Podverse web media player. Locked in
during **Phase 1** of the
[media-player-architecture-refactor](../../../../../.llm/plans/completed/media-player-architecture-refactor/)
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
- Livestream (video.js): `MediaPlayerControllerLiveStreamAV.tsx`

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
| **livestream**   | `mpItem.live_item` truthy (drives a separate video.js controller)       |

Decision precedence inside the `loadedmetadata` handler (in
[`NonLiveMediaOrchestrator.tsx`](./Controller/NonLiveMediaOrchestrator.tsx)
lines 390–422): clip > soundbite > chapter > item, then within item,
podcast/video read the abridged-index `p`; music uses intent-specific
policy (`session_restore` resumes snapshot; `explicit_play` /
`fresh_transition` force `0`).

## Triggers

| Trigger                  | Code path                                                                                                                                                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Initial load**         | User clicks play in a list/detail UI → `useMediaPlayerResourceUpdate` → context setters → `<audio>`/`<video>` `src` re-render → media element fires `loadedmetadata`                      |
| **Anonymous restore**    | `AnonymousPlaybackRestoreController` runs once when logged out + `loggedInAccount === null`                                                                                               |
| **Queue load**           | `activeQueueUpcomingResources[0]` changes → `handleLoadQueueItem` / `handleLoadQueueClip` / `handleLoadQueueItemSoundbite` / `handleLoadQueueItemAddByRSS` in `MediaPlayerController.tsx` |
| **AutoQueue transition** | `autoQueueActiveRow` changes → `handleLoadAutoQueueItem`                                                                                                                                  |
| **Skip-next button**     | `TrackNextButton*` → move-to-history + `useQueueResourcesLoadActive()` → queue load                                                                                                       |
| **Track-ended**          | Media element `ended` event in `NonLiveMediaOrchestrator` `handleEnded`                                                                                                                   |
| **Explicit play**        | List/detail "play" buttons → `useMediaPlayerResourceUpdate` (same as initial load, just from a different surface)                                                                         |

## Matrix — Sections 1 through 5 (non-livestream)

Notation: `p` = abridged stored position seconds (`queueResourcesAbridgedIndex.items[id].p`);
`d` = abridged stored duration (`.d`); `start_time` / `end_time` /
`duration` are typed strings or numbers per DTO and are coerced with
`Number()` or `parseFloat`.

### 1. Initial load — single load into an empty player

| Source kind                     | `currentTime` after `loadedmetadata`                                                                                                                                              | `mpIsPlaying` after load                                                                                   | Side effects                                                                                                                                                                                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **clip**                        | `Number(mpClip.start_time)`                                                                                                                                                       | follows `mpShouldPlay` (true if play was triggered explicitly)                                             | `updateNowPlaying`; `trackStatsClip(mpClip.id_text)`; `trackStatsChannel`; `trackStatsItem` (best-effort, skipped if no logged-in account); on subsequent `play` effect, `globalPauseAtTime = Number(mpClip.end_time)`; `autoQueueShouldClear: true` |
| **soundbite**                   | `Number(mpItemSoundbite.start_time)`                                                                                                                                              | same                                                                                                       | `updateNowPlaying`; `trackStatsItem(itemSoundbite.item.id_text)`; later `globalPauseAtTime = start_time + duration`; `autoQueueShouldClear: true`                                                                                                    |
| **chapter (with `shouldSeek`)** | `Number(mpItemChapter.start_time)` (set by `playWhenReady` effect when chapter changes); `loadedmetadata` then re-applies chapter start because `mpItemChapterRef.current` is set | controller follows `mpShouldPlay`                                                                          | `setMPItemChapterShouldSeek(false)`; `updateNowPlaying`; `globalPauseAtTime = null` if `mpItemChapter.end_time`                                                                                                                                      |
| **item-podcast**                | `p` if `p > 0` else `0`; near-end `p >= d - 5` clamps `mpCurrentTime` to `0` at update-time in `useMediaPlayerResourceUpdate` (see **§ near-end clamp**)                          | follows `mpShouldPlay`                                                                                     | `updateNowPlaying`; `trackStatsChannel`; `trackStatsItem` (skipped if no logged-in account or add-by-RSS)                                                                                                                                            |
| **item-video**                  | Same as item-podcast                                                                                                                                                              | follows `mpShouldPlay`                                                                                     | Same as item-podcast plus floating-portal video wrapper rendering                                                                                                                                                                                    |
| **item-music**                  | **`0` for `explicit_play` / `fresh_transition`** (`p` ignored); **`session_restore`** uses snapshot + near-end clamp via `resolvePlaybackLoadDecision`                            | follows `mpShouldPlay`                                                                                     | `updateNowPlaying`; track stats item/channel                                                                                                                                                                                                         |
| **add-by-RSS**                  | If `addByRSSSeekToTime !== null` and `>= 0`: that value (applied on `loadedmetadata` once or directly if `readyState >= 1`); otherwise `0`                                        | follows `mpShouldPlay`; stats tracking is **skipped** for add-by-RSS (see `if (!loggedInAccountRef.current |                                                                                                                                                                                                                                                      | mpAddByRSSRef.current) return`) | `onAddByRSSPositionSave` is called from `play`, `pause`, and every 15s of accumulated playback in `timeupdate` |
| **livestream**                  | See **§ 6a** appendix (video.js owns position; `currentTime` typically meaningless)                                                                                               | video.js autoplay = true; player typically renders playing                                                 | See § 6a                                                                                                                                                                                                                                             |

### 2. Anonymous restore (logged-out, first page load only)

Runs **once** per browser session, gated by `anonymousPlaybackRestoreStarted`
in [`AnonymousPlaybackRestoreController.tsx`](../../components/Queue/AnonymousPlaybackRestoreController.tsx).

| Snapshot `kind`        | `currentTime` after `loadedmetadata`                                                                                                                        | `mpIsPlaying` after load                                                | Side effects                                                                                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clip`                 | `Number(mpClip.start_time)` — the **clip start**, _not_ the snapshot position (because clip precedence overrides item-level data in `handleLoadedMetadata`) | `false` (snapshot restore never auto-plays; `shouldPlay` is not passed) | `mediaPlayerResourceUpdate({ ..., mpCurrentTime: snapshot.playback_position_seconds, mpDuration: snapshot.media_file_duration_seconds })`; `autoQueueShouldClear: true` |
| `item_soundbite`       | `Number(mpItemSoundbite.start_time)` — same precedence as above                                                                                             | `false`                                                                 | Soundbite end-time + 1 still pauses if snapshot position is past it                                                                                                     |
| `item` (podcast/video) | `snapshot.playback_position_seconds` once `loadedmetadata` fires (via abridged `p`)                                                                         | `false`                                                                 | Snapshot drives both `mpCurrentTime` and `mpDuration` so the UI shows the saved position immediately, before media metadata loads                                       |
| `item` (music)         | `snapshot.playback_position_seconds` (near-end clamp via `mediaFileDurationHintSeconds` / abridged `d`; explicit `0` does not fall back to `p`)             | `false`                                                                 | `item-music` + `session_restore`; same resume model as podcast snapshot                                                                                                 |
| **logged in**          | Restore is **skipped** entirely; snapshot is cleared by the login effect                                                                                    | n/a                                                                     | `clearAnonymousPlaybackSnapshot()` is called                                                                                                                            |

> **Clip / soundbite anonymous restore (by design):** when the snapshot is a
> `clip` or `item_soundbite`, the controller seeks to **segment start** on
> `loadedmetadata`, not `snapshot.playback_position_seconds`. Clips and
> soundbites are short segments; resume is anchored at the segment boundary.

### 3. Queue load (manual queue)

`activeQueueUpcomingResources[0]` change drives the load through
`MediaPlayerController` (`handleLoadQueueItem` / Clip / Soundbite /
AddByRSS). **`autoQueueShouldClear: true`** in every path.

| Resource shape                                         | `currentTime` after `loadedmetadata`                                                                                                                           | `mpIsPlaying`                                                            | Side effects                                                                                                                                           |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `nextResource.item` only (no clip/soundbite)           | item-podcast/video: `p` or `0`; item-music: **`session_restore`** resumes `playback_position` (near-end clamp); **`fresh_transition`** after skip/ended is `0` | follows `mpShouldPlay`; queue load does not set `shouldPlay` → unchanged | `handleLoadQueueItem` defaults music to `session_restore`; `pendingMusicQueueLoadIntentRef` supplies `fresh_transition` before skip/ended `loadActive` |
| `nextResource.clip`                                    | `Number(clip.start_time)`                                                                                                                                      | unchanged                                                                | Clip pause-at-end-time + 1 still active                                                                                                                |
| `nextResource.item_soundbite`                          | `Number(soundbite.start_time)`                                                                                                                                 | unchanged                                                                | Soundbite pause-at-end-time + 1 still active                                                                                                           |
| `nextResource.add_by_rss_resource_data` (non-redacted) | If `playback_position` parses to a finite number: that value; else 0                                                                                           | `mpShouldPlay` set by `usePlayAddByRSS`                                  | `setMPAddByRSS`; reads `playback_position` from queue resource; `is_add_by_rss_redacted` resources are skipped                                         |

### 4. AutoQueue transition (`autoQueueActiveRow` change)

`handleLoadAutoQueueItem` calls `mediaPlayerResourceUpdate` with
**`autoQueueShouldClear: false`** so the auto-queue is preserved.

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

| Context              | Outcome                                                                                                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mpAddByRSS != null` | `onAddByRSSEnded(positionSeconds)`; `setMPShouldPlay(false)`; load active queue with stored `medium_id`; if `upcomingManualCount === 0`, attempt `onAddByRSSPlayNext()`; if that returns false, `clearNowPlaying()` |
| Non add-by-RSS       | `moveNowPlayingToHistory({ completed: true, ... })`; `useQueueResourcesLoadActive()`; if both queues empty: `clearNowPlaying()`; otherwise: `setMPShouldPlay(true)`                                                 |

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

## Section 6 (REQUIRED) — Livestream / video.js baseline

The architecture refactor does **not** retire `video.js`, but Phases 4a/4b/4c
remove the global event bus (`EVENTS.MEDIA_PLAYER.*` group) and rewire the
arbitration between non-live and live elements. Each can affect livestream
behavior even without modifying `MediaPlayerControllerLiveStreamAV.tsx`. The
specs and matrix entries below are the **regression oracle** for livestream
behavior across this plan-set, **and** the baseline for the follow-up
[`media-player-livestream-hls-migration`](../../../../../.llm/plans/active/media-player-livestream-hls-migration/)
plan-set.

### 6a. Matrix appendix — live-stream behavior

| Trigger                             | Observed behavior (current production via video.js v8.23.4)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Initial play, audio live stream** | `<source>` selected via `getSelectedLabeledItemEnclosureAndSource` (same labeled-enclosure flow as VOD). video.js init: `controls: false, autoplay: true, preload: 'auto', sources: [{ src, type }]`. First-byte time depends on upstream; once `play` fires, `mpIsPlaying = true` syncs via the play/pause observer. `currentTime` typically reads `0` and never advances meaningfully (live edge). `duration` is `Infinity` in most cases. UI controls: seek bar disabled, jump buttons no-op (chrome currently leaves them rendered but inert). |
| **Initial play, video live stream** | Same source-selection flow; the `<video>` element is rendered inside `MediaPlayerLiveStreamVideoWrapper` → `MediaPlayerLivestreamVideoPortalFloating` so fullscreen / floating UI behavior matches VOD video.                                                                                                                                                                                                                                                                                                                                      |
| **Source fallback**                 | When the first labeled `<source>` 404s or codec unsupported, video.js currently tries the next source from the labeled enclosures array. Document **specific** observed fallbacks against the chosen test feeds in § 6c.                                                                                                                                                                                                                                                                                                                           |
| **Live → non-live transition**      | User triggers an explicit play of a regular podcast item while live is playing. Today: enclosure selection updates → `selectedItemEnclosureAndSource` effect fires → previous video.js player is **disposed**; container DOM is emptied; a new audio / video element is appended; the non-live `NonLiveMediaOrchestrator` then drives playback. The bottom-of-file note in `MediaPlayerControllerLiveStreamAV.tsx` captures the bug class this dispose/recreate prevents. Quoted verbatim below.                                                   |
| **Non-live → live transition**      | Reverse direction. The non-live `<audio>`/`<video>` is unmounted from the wrapper (since `mpItem.live_item` becomes truthy, the non-live AV controller short-circuits source assignment) and the video.js controller mounts.                                                                                                                                                                                                                                                                                                                       |
| **Live stream end / disconnect**    | When the upstream stops, video.js typically pauses and surfaces no user-facing retry. `mpIsPlaying` follows. Document specific observed behavior against the chosen test feeds in § 6c (this cell is intentionally underspecified until baseline runs occur).                                                                                                                                                                                                                                                                                      |
| **Reload while live is playing**    | Full-page reload: `AnonymousPlaybackRestoreController` reads the snapshot; the snapshot writer skips livestream because `mpItem.live_item` items still write as `kind: 'item'`, but the live player does not honor `mpCurrentTime` since live `currentTime` is `0`. **Action item for § 6b** — assert via spec that anonymous restore for a live item does **not** auto-play, then capture whatever today's UI shows for the artist/episode page.                                                                                                  |

#### Bottom-of-file note from `MediaPlayerControllerLiveStreamAV.tsx` (verbatim, the regression we must not re-introduce)

```
NOTES:

Special disposed logic was added to avoid problems with this scenario:

step 1: load a livestream using video js
step 2: a new non-livestream loads with a different controller, and video js instance disposes
step 3: a new livestream using video js needs to load

the problem is that since the video js instance was disposed, the DOM no longer has the element needed

how to handle this situation? whenever mpItem changes, the video js needs to be disposed and recreated
```

The corresponding `media-player-livestream-to-podcast-transition.spec.ts` /
`media-player-podcast-to-livestream-transition.spec.ts` E2E specs (§ 6b)
exist to detect re-introduction of that bug class.

### 6b. Live-stream E2E specs

Added under [`apps/web/e2e/`](../../../e2e/):

- `media-player-livestream-audio-start.spec.ts` — start a known live audio
  stream; assert play state and player UI.
- `media-player-livestream-video-start.spec.ts` — same for live video,
  including the floating-portal wrapper behavior.
- `media-player-livestream-to-podcast-transition.spec.ts` — the dispose /
  recreate dance regression case; assert clean transition with no double
  audio and no stuck UI.
- `media-player-podcast-to-livestream-transition.spec.ts` — reverse
  direction.

These specs gate Phase 4a/4b/4c **and** the follow-up HLS migration. They
must run unchanged across every phase.

### 6c. Test feed selection

Phase 1 decision (see
[media-player-architecture skill](../../../../../.cursor/skills/media-player-architecture/SKILL.md)
and
[01-baseline-verification-and-feed-selection.md](../../../../../.llm/plans/active/media-player-livestream-hls-migration/01-baseline-verification-and-feed-selection.md)):
exercise **only the controller-plumbing surface** against the existing
internal seed; do not stand up a live-stream test server or external
network dependency in Phase 1. The infrastructure decision (real HLS
server, mocked HLS via `page.route`, or extended seed) belongs to the
**Phase 4 HLS migration plan-set** that actually changes the live-stream
code path.

| Slot       | Choice                                                   | Source                                                       | Date verified | Scope                                                               |
| ---------- | -------------------------------------------------------- | ------------------------------------------------------------ | ------------- | ------------------------------------------------------------------- |
| Live audio | Seeded internal feed `v5fCrIj9Io` / item `e2eLiveStrm01` | [tools/web/seed-e2e.mjs](../../../../tools/web/seed-e2e.mjs) | 2026-05-13    | Controller-mount assertions only (no play, no seek, no real stream) |
| Live video | _Deferred to Phase 4_ — see subsection below             | _TBD by Phase 4 plan-set_                                    | _TBD_         | _TBD_                                                               |

### 6c. Deferred to Phase 4

Three of the four live-stream specs are intentionally left
`test.fixme()` at the end of Phase 1 because their assertions become
meaningful only once Phase 4 starts modifying the live-stream code path
and needs the regression oracle.

| Spec                                                                                                                        | Reason for deferral                                                                     | Phase 4 prerequisite                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [media-player-livestream-video-start.spec.ts](../../../e2e/media-player-livestream-video-start.spec.ts)                     | No video live-stream item in the current seed                                           | Either (a) add a video `live_item` to [seed-e2e.mjs](../../../../tools/web/seed-e2e.mjs) with a mocked HLS URL, (b) add Playwright `page.route` HLS mocks, or (c) point at a public HLS test stream gated by `E2E_LIVE_FEEDS_OK` env |
| [media-player-livestream-to-podcast-transition.spec.ts](../../../e2e/media-player-livestream-to-podcast-transition.spec.ts) | Seed has no regular (non-live) podcast item with an enclosure for the transition target | Add one item with a real or mocked enclosure URL to [seed-e2e.mjs](../../../../tools/web/seed-e2e.mjs); reuse the same HLS infrastructure decision as the video-start spec                                                           |
| [media-player-podcast-to-livestream-transition.spec.ts](../../../e2e/media-player-podcast-to-livestream-transition.spec.ts) | Same as above — needs both a playable podcast item and a playable live-stream item      | Same as above                                                                                                                                                                                                                        |

**Why Phase 4, not Phase 2 or 3?** Phases 2 and 3 (playback domain types
and controller decomposition) do not change the live-stream code path.
Phase 4 unifies live-stream + non-live audio/video onto a single
`<MediaElement>` and replaces video.js — that is the work the
dispose/recreate and transition specs are oracles for. Building the test
infrastructure in Phase 1 means maintaining it through Phases 2 and 3
for zero net benefit; building it inside the Phase 4 plan-set means the
infrastructure decision (real server vs mock vs seed extension) is made
by the same plan-set that will use it.

The cheap-and-durable Phase 1 oracle that remains useful through every
phase is the audio-start controller-mount assertion — it locks down
"items with `live_item` set route to `MediaPlayerControllerLiveStreamAV`"
and breaks loudly if Phase 4 fumbles the controller-selection logic.

## Cross-cutting side effects glossary

| Effect                                                    | When it fires                                                                     | Where                                           |
| --------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------- |
| `setMPCurrentTime(p_or_0)`                                | On resource load, before metadata                                                 | `useMediaPlayerResourceUpdate`                  |
| `mediaRef.currentTime = newCurrentTime`                   | On `loadedmetadata` after seek policy decides                                     | `NonLiveMediaOrchestrator.handleLoadedMetadata` |
| `setMPClip(null)`                                         | On clip end-time + 1 reached                                                      | `handleTimeUpdate`                              |
| `setMPItemSoundbite(null)`                                | On soundbite end-time + 1 reached                                                 | `handleTimeUpdate`                              |
| `setMPItemChapter(...)`                                   | On `timeupdate` when chapters list exists, no clip/soundbite                      | `handleTimeUpdate`                              |
| `setAutoQueueResources({}), setAutoQueueActiveRow(0)`     | On any `mediaPlayerResourceUpdate` call with `autoQueueShouldClear: true`         | `useMediaPlayerResourceUpdate`                  |
| `moveNowPlayingToHistory({ completed: true })`            | On track-ended (non add-by-RSS)                                                   | `handleEnded`                                   |
| `moveNowPlayingToHistory({ completed: false })`           | On skip-next button click                                                         | `TrackNextButton*`                              |
| `onAddByRSSPositionSave(t)`                               | On play, pause, and every ≥ 15 s of playback                                      | `handlePlay`, `handlePause`, `handleTimeUpdate` |
| `trackStatsChannel` / `trackStatsClip` / `trackStatsItem` | Once per load on `loadedmetadata`, **only** when logged in **and** not add-by-RSS | `handleLoadedMetadata`                          |
| `writeAnonymousPlaybackSnapshotFromPlayerState`           | On every `updateNowPlaying` while logged out                                      | `useQueueResourceUpdateNowPlaying`              |
| `clearAnonymousPlaybackSnapshot()`                        | On login                                                                          | `AnonymousPlaybackRestoreController`            |
| `globalPauseAtTime` set                                   | On clip / soundbite load (in `playWhenReady` effect)                              | `NonLiveMediaOrchestrator`                      |
| `globalPauseAtTime` cleared                               | On `timeupdate` when reached, or on chapter end with `end_time`                   | `NonLiveMediaOrchestrator`                      |

## Phase 1 deliverable-5 substitution

Phase 1's
[01-behavior-baseline-and-test-harness.md](../../../../../.llm/plans/completed/media-player-architecture-refactor/01-behavior-baseline-and-test-harness.md)
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
  [`useMediaPlayerResourceUpdate.nearEndClamp.test.tsx`](../../hooks/__tests__/useMediaPlayerResourceUpdate.nearEndClamp.test.tsx)
  pins the clamp inside `useMediaPlayerResourceUpdate` (clip, soundbite,
  podcast, video, music, zero-duration, missing-row, boundary cases).
- Anonymous restore (the rule `musicSessionRestoreCurrentTime` will
  cover for music): boundary cases added to
  [`anonymousPlaybackStorage.test.ts`](../../utils/anonymousPlaybackStorage.test.ts)
  for NaN, Infinity, large positions, negative positions, and
  zero-duration acceptance.
- Chapter selection (the rule a future helper will cover for chapter
  resume): boundary cases added to
  [`selectItemChapterForTime.test.ts`](../../utils/mediaPlayer/selectItemChapterForTime.test.ts)
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
  [`apps/web/src/test/mediaElementFake.ts`](../../test/mediaElementFake.ts).
- **Pure helpers** that the new policy will reuse — coverage extensions in
  [`selectItemChapterForTime.test.ts`](../../utils/mediaPlayer/selectItemChapterForTime.test.ts)
  and [`anonymousPlaybackStorage.test.ts`](../../utils/anonymousPlaybackStorage.test.ts).
- **Near-end clamp pinning** until Phase 2 centralizes the rule:
  [`useMediaPlayerResourceUpdate.nearEndClamp.test.tsx`](../../hooks/__tests__/useMediaPlayerResourceUpdate.nearEndClamp.test.tsx)
  (see the "Phase 1 deliverable-5 substitution" subsection above).
- **E2E specs** that drive the matrix end-to-end live under
  [`apps/web/e2e/`](../../../e2e/) prefixed with `media-player-` — including
  the four livestream specs from § 6b.

> Open **Phase 2** items (capture before extracting helpers):
>
> - Resolve the snapshot-clip seek inconsistency above.
> - Extract `playbackResumeNearEnd` and `musicSessionRestoreCurrentTime`
>   pure helpers per Phase 2 plan; consolidate the 5-second clamp in one
>   place; re-apply it inside `handleLoadedMetadata` if/when policy
>   converges.
