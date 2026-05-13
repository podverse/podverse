# Media player architecture refactor — summary

## Decision snapshot (confirmed)

- **Scope:** `apps/web` only (no native/mobile app in this repo).
- **Branch model:** long-lived `refactor/media-player`, rebased on
  `develop` periodically, merged once all phases are green.
- **Cutover style:** hard break. The new architecture is the only path;
  no parallel pipelines, no compatibility shims, no flagged dual-mode
  runtime.
- **Element architecture:** **single `<MediaElement>` component** for
  every **non-live** target (podcast, video, music, clips, add-by-RSS,
  etc.). Livestreams remain on the existing **video.js**-based legacy
  controllers (`MediaPlayerControllerLiveStreamAudio`,
  `MediaPlayerLiveStreamVideoWrapper`, `MediaPlayerControllerLiveStreamAV`)
  until the follow-up plan-set
  [`media-player-livestream-hls-migration`](../media-player-livestream-hls-migration/)
  lands.
- **Library retirement:** **not** in this plan-set. `video.js` stays in
  [`apps/web/package.json`](../../../../apps/web/package.json) at the
  same major line as today; no `hls.js` dependency is added here.
- **Music intent:** subsumed into the new load policy. The
  `MusicItemPlaybackIntent` union (`session_restore` / `explicit_play` /
  `fresh_transition`) survives as a field on the new
  `PlaybackLoadRequest`; the music session-restore use case is
  preserved end-to-end.
- **Queue load flow:** `useQueueResourcesLoadActive` returns the loaded
  upcoming resources to its caller. There is no shared mutable
  "pending playback intent" ref; each caller applies the load decision
  in-scope after its async work resolves.

## Follow-up plans

- **[`media-player-livestream-hls-migration`](../media-player-livestream-hls-migration/)**
  — retire `video.js`, fold livestreams into `<MediaElement>` (native
  HLS + `hls.js` as needed), and remove the legacy livestream
  controller tree. **Prerequisite:** this architecture-refactor
  plan-set must merge first. That plan-set is intentionally high-level
  today; expand it before execution.

## Trigger

The `apps/web` media player has crossed a complexity threshold:

- [`MediaPlayerControllerAV.tsx`](../../../../apps/web/src/components/MediaPlayer/Controller/MediaPlayerControllerAV.tsx)
  is ~800 lines with 18 ref-mirrors and a single ~280-line `useEffect`
  that binds every `<audio>`/`<video>` event listener.
- The decision "where does the next track start playing?" is computed
  in three places.
- A window `CustomEvent` bus (`SEEK`, `JUMP_BACK`, `JUMP_FORWARD`,
  `PAUSE_AT`) bridges UI buttons to the media element across 15 files.
- Recent feature work (anonymous resume, add-by-RSS resume, music
  session restore) each added new context refs because the existing
  model has no slot for them — clear design pressure.
- Live streams use video.js with imperative DOM creation that bypasses
  React; the controller's own bottom-of-file note documents that the
  dispose/recreate dance was needed because live↔non-live transitions
  were buggy. **Mitigation for that bug class stays in the legacy
  livestream path until the HLS follow-up plan-set replaces it.**

## Strategic outcome

A web media player with a small, typed core:

1. A **`PlaybackTarget`** discriminated union describing every possible
   "thing the player can play" (clip, soundbite, chapter, item-podcast,
   item-video, item-music + intent, add-by-RSS, livestream).
2. A **`resolvePlaybackLoadDecision(request, indices)`** pure function
   that owns every "where do we start, what state do we set" decision,
   with a safe default of `fresh_transition` for music.
3. A **`useMediaElementBridge`** hook that owns all imperative
   `<audio>` / `<video>` event wiring for **non-live** playback, and
   exposes typed control methods. (HLS attach/detach is **not** in
   this plan-set; it ships in the follow-up plan-set.)
4. A **`MediaPlayerControlsContext`** that publishes the bridge methods
   so buttons, sliders, and the keyboard handler call typed methods
   instead of firing window events. While a livestream is active,
   `isAttached` is `false` (no non-live bridge mounted) — matches
   today's behavior where seek/jump effectively no-op against the
   livestream element.
5. A **single `<MediaElement>`** component that renders `<audio>` or
   `<video>` for every **non-live** `PlaybackTarget` and is the only
   place in the app that touches `mediaRef.current` for that path.
6. A trimmed `MediaPlayerController` that watches its data inputs,
   builds `PlaybackLoadRequest`s, and calls
   `useMediaPlayerResourceUpdate` — nothing else. It **permanently**
   keeps a branch that renders the legacy livestream controllers when
   `target.kind === 'livestream'`.

## Behavior preservation contract

Phase 1 produces the contract. Every later phase is gated by it:

- A **fake `HTMLMediaElement`** test harness for orchestration tests.
- A **decision matrix doc** enumerating today's seek/state outcomes for
  every `(medium x source kind x trigger)` combination, including the
  current video.js live-stream behavior (documented for reuse by the
  follow-up HLS plan-set).
- An **E2E spec per playback flow** (music session restore, music
  explicit play, music track-ended, podcast resume, video resume, clip
  end-time stop, soundbite end-time stop, chapter seek, add-by-RSS
  resume, autoQueue transition, anonymous restore login, live-stream
  start/stop, live↔non-live transition, keyboard shortcuts).

Phases 2–6 must keep the harness and E2E green at every commit on the
refactor branch.

## In scope

- `apps/web/src/components/MediaPlayer/**`
- `apps/web/src/contexts/MediaPlayer*.tsx`,
  `apps/web/src/contexts/Queue*.tsx`,
  `apps/web/src/contexts/AutoQueue.tsx`
- `apps/web/src/hooks/useMediaPlayer*.tsx`,
  `apps/web/src/hooks/useQueueResource*.tsx`,
  `apps/web/src/hooks/useAutoQueueLoadResources.tsx`,
  `apps/web/src/hooks/usePlayAddByRSS.tsx`,
  `apps/web/src/hooks/useMediaElementBridge.ts` (new)
- `apps/web/src/lib/playback/**` (new)
- `apps/web/src/components/Queue/AnonymousPlaybackRestoreController.tsx`
- All 15 consumers of `EVENTS.MEDIA_PLAYER` in `apps/web/src/**`
- `apps/web/src/components/MediaPlayer/Controller/Audio/`,
  `apps/web/src/components/MediaPlayer/Controller/Video/`,
  `apps/web/src/components/MediaPlayer/Controller/LiveStream/` (legacy
  path preserved; not deleted in this plan-set)
- `apps/web/e2e/**` (new specs added in Phase 1)
- `.cursor/skills/media-player-architecture/SKILL.md` (new in Phase 6)
- `apps/web/AGENTS.md` (Phase 6 update)

## Out of scope

- API or management-API changes.
- Mobile / native app parity (no native app in this repo).
- AutoQueue selection algorithm or queue-API contract.
- Server-side stats tracking or playback-position persistence shape.
- Picture-in-Picture / Media Session API behavior changes (preserved at
  current parity; any improvement is a follow-up plan).
- **Retiring `video.js` or adding `hls.js`** — see
  [`media-player-livestream-hls-migration`](../media-player-livestream-hls-migration/).

## Definition of done

- Phase 1 harness + E2E specs are passing on `refactor/media-player`.
- Exactly **one** `<MediaElement>` component renders **non-live**
  audio and video. The legacy **audio + video** controllers for
  non-live are removed; **livestream** controllers remain.
- `video.js` remains in `apps/web/package.json`; livestream playback
  behaves identically to pre-refactor (proven by the Phase 1
  livestream E2E specs).
- `MediaPlayerControllerAV.tsx` is replaced (or trimmed to under 350
  lines) for the **non-live** path only and has no more than five
  `useRef` calls on any surviving file in that path.
- The window `CustomEvent` bus for player control is removed; the
  `MEDIA_PLAYER` group is deleted from
  [`events.ts`](../../../../apps/web/src/constants/events.ts).
- Every "where do we seek on load" decision is computed by
  `resolvePlaybackLoadDecision` and nowhere else.
- `pendingPlaybackLoadRef` does not exist;
  `useQueueResourcesLoadActive` returns its loaded resources.
- The music session-restore use case continues to work
  (anonymous-snapshot resume + queue-resource resume), proven by a
  dedicated E2E spec from Phase 1.
- `.cursor/skills/media-player-architecture/SKILL.md` exists and is
  linked from
  [`apps/web/AGENTS.md`](../../../../apps/web/AGENTS.md).
- Branch passes `npm run lint`, `npm run test:unit`, and
  `make e2e_test_web_report`, then merges to `develop`.

### A note on "no behavior change"

The contract is that **observable user-facing behavior** matches
pre-refactor across the matrix in Phase 1 and across every E2E spec.
That is the bar this plan gates on. It is realistic to expect a small
number of incidental shifts after merge that the matrix did not
catch — for example, an event ordering nuance during live↔non-live
transitions, a one-frame timing change before `loadedmetadata`, or a
keyboard handler edge case that no spec exercised. Treat any such
report as a **bug to fix on `develop`**, not as evidence the refactor
failed; the new architecture makes those fixes much easier than the
status quo. Aim for zero regressions, plan for "very few, fixable
quickly," and resist re-litigating the architecture decision based on
the long tail.

## Rollback path

The plan ships behind a long-lived `refactor/media-player` branch and
merges as a single squash (or a small ordered series). If a serious
regression surfaces post-merge that cannot be fixed forward in a day:

1. **Revert the merge commit on `develop`** (`git revert -m 1
   <merge-sha>` or revert each phase commit if landed individually).
   This restores the legacy controller tree, the `EVENTS.MEDIA_PLAYER`
   bus, `pendingPlaybackLoadRef`, and the per-medium `<MediaElement>`s.
2. **Cut a hotfix release** on `develop` post-revert.
3. **Resume work on `refactor/media-player`** by rebasing on the
   reverted `develop` and addressing the regression with new specs
   added to Phase 1's matrix before the next merge attempt.

Two properties make this rollback cheap:

- **Hard cutover, no flag.** No runtime dual-mode means the revert is
  purely a code rollback; there is no flag to flip and no migrated
  data to back-fill.
- **Pure-helper isolation.** New files under `apps/web/src/lib/playback/**`
  and `apps/web/src/components/MediaPlayer/MediaElement/**` have no
  callers outside the refactored player tree, so reverting the parent
  changes orphans them harmlessly. They can stay deleted or be kept
  on the branch for the next attempt.

There is no DB migration, no env-var change, and no infra change in
this plan-set, so a revert needs no coordinated cleanup.

## Primary risks

- **Behavior regressions in seldom-exercised flows** (soundbite
  end-time stop, chapter end-time clear, autoQueue repeat, live stream
  with multiple enclosure sources). Phase 1 explicitly seeds an E2E
  spec per flow.
- **Long-lived branch divergence.** Phase 1 changes are deliberately
  test-only so the branch starts cheap; commit-by-commit each phase
  keeps CI green so rebases stay tractable.
- **Discovery surprise on loader refactor.** Phase 3a includes an
  explicit ripgrep audit for `setActiveQueueUpcomingResources`
  consumers; current audit shows only `MediaPlayerController` reads
  the state. If a reader appears later, fall back to the scoped-token
  ref strategy described in 3a.
- **Livestream + controls context.** While a livestream plays,
  `useMediaPlayerControls()` may report `isAttached: false`. UI must
  disable or no-op seek/jump the same way today's window events
  effectively no-op for livestream playback.
