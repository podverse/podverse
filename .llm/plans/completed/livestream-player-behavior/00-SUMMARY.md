# Livestream player behavior — summary

The request is [00-REQUEST.md](00-REQUEST.md). Prompts, models, and order are in `COPY-PASTA.md`
once the planning run assembles the set.

## Requirement ledger

Rows quote the request, the operator answers, or the accepted context. An ask that names both web
and mobile has one row per surface. Area letters are defined under `## Areas`.

- **R1** (area D) "for a live stream where the ended signal has been sent, we would not want it to automatically load in the player on both mobile or web" — web — Plan: 40, 41
- **R2** (area F) "for a live stream where the ended signal has been sent, we would not want it to automatically load in the player on both mobile or web" — mobile — Plan: 61, 62
- **R3** (area D) "Treat it like a finished item: move it to history, then load the next queue item paused, or leave the player empty if the queue is empty." — web — Plan: 40, 41
- **R4** (area F) "Treat it like a finished item: move it to history, then load the next queue item paused, or leave the player empty if the queue is empty." — mobile — Plan: 60, 61, 62
- **R5** (area A) "Trust only the fresh server status, so a stream that is really live is never hidden. No end-time or start-time heuristic." — shared decision helper both surfaces call — Plan: 10
- **R6** (area D) "Restore must use the item's current status from the server, not the copy persisted on the device." — web (anonymous restore, signed-in queue head) — Plan: 40, 41
- **R7** (area F) "Restore must use the item's current status from the server, not the copy persisted on the device." — mobile (last-playback snapshot, queue head) — Plan: 60, 61, 62
- **R8** (area D) "A restored or adopted now-playing item from another device is in scope for the ended-livestream rule." — web cross-device — Plan: 41
- **R9** (area F) "A restored or adopted now-playing item from another device is in scope for the ended-livestream rule." — mobile cross-device — Plan: 61
- **R10** (area B) "while the live stream was loaded, when I landed on the page, I then went and tried to play a regular item, an episode from a podcast, and I would tap the play button and nothing would happen. I'm not sure what would cause this. The issue happened on web." — find the cause and fix it — Plan: 20
- **R11** (area F) "I'm unsure if the same issue would happen on mobile." — question row: answer from the code, then plan any fix — Plan: 61 (answer, no fix), 62 (device check)
- **R12** (area E) "a duration should never stick around from a previous item, whether it be a live stream or non-live stream" / "Never carrying a duration from the previous item applies to every item change, live or not." — web — Plan: 50
- **R13** (area G) "a duration should never stick around from a previous item, whether it be a live stream or non-live stream" / "Never carrying a duration from the previous item applies to every item change, live or not." — mobile — Plan: 70, 73
- **R14** (area E) "a live stream should not have a duration ... That duration, in the case of live, should just be the words "live."" — web — Plan: 52
- **R15** (area G) "a live stream should not have a duration ... That duration, in the case of live, should just be the words "live."" — mobile — Plan: 72, 73
- **R16** (area E) "if you were to press that duration that says "live," it should take you to the current live moment within the live stream." — web — Plan: 52
- **R17** (area G) "if you were to press that duration that says "live," it should take you to the current live moment within the live stream." — mobile — Plan: 71, 72, 73
- **R18** (area E) "it could have a current playback time if you find it feasible" / "Nothing at the live point; how far behind live (for example `−0:42`) when rewound." — web left-hand time — Plan: 52
- **R19** (area G) "it could have a current playback time if you find it feasible" / "Nothing at the live point; how far behind live (for example `−0:42`) when rewound." — mobile left-hand time — Plan: 72, 73
- **R20** (area A) "I am wondering how apps typically handle rewinding to an earlier point within a live stream. Is there a standard convention for this?" — question row, answered in 00-REQUEST § Context given to the operator; the plan records the answer — Plan: 11
- **R21** (area A) "Is it something that only HLS can provide?" — question row, answered in 00-REQUEST § Context given to the operator; the plan records the answer — Plan: 11
- **R22** (area E) "we would like to be able to support that if content follows a known convention that is widely adopted" / "Rewind only when the stream reports a seekable window (HLS or DASH); progressive streams stay live-only. No app-side buffer for progressive streams." — web — Plan: 51, 52, 53
- **R23** (area C) "the window is detected from the media element or native player at runtime" — mobile media engine reports the seekable window and seeks within it on iOS and Android — Plan: 30, 31, 32
- **R24** (area G) "Rewind only when the stream reports a seekable window (HLS or DASH); progressive streams stay live-only. No app-side buffer for progressive streams." — mobile player UI — Plan: 71, 72, 73
- **R25** (area E) "After pausing a livestream ... Resume where it was paused if the stream still holds that moment; otherwise jump to live." — web — Plan: 51
- **R26** (area G) "After pausing a livestream ... Resume where it was paused if the stream still holds that moment; otherwise jump to live." — mobile — Plan: 71, 73 (native resume rule in 30, 31, 32 under R31)
- **R27** (area E) "On a progressive stream, "go to live" means reconnecting the stream." — web — Plan: 51
- **R28** (area C) "On a progressive stream, "go to live" means reconnecting the stream." / "a Live control that jumps to the live edge" — mobile media engine commands for live edge and reconnect — Plan: 30, 31, 32
- **R29** (area A) "Note how mobile should handle live similarly as web in many respects." — shared live policy both surfaces consume; record intentional divergences — Plan: 10, 11
- **R30** (area A) "I suspect that the ended signal should have been sent already." — question row: confirm from the code that a `liveEnd` podping re-parses the feed and stores the ended status, and name any gap — Plan: 12
- **R31** (area C, step 09) "Both web and mobile resume in place only when the paused position is at least the window start plus the 6 second margin from D5. Change mobile plan 30 native play() to match plan 11 resolveLiveResume." — mobile native resume rule — Plan: 30, 31, 32
- **R32** (area D, step 10) "Suppress the handoff prompt for an ended livestream queue head on both. Change web plan 41 to read item status before prompting, as mobile does in D37." — web — Plan: 41
- **R33** (area D, step 10) "When the status read fails (offline, 5xx), load the stored copy on both. Change web plans 40 and 41 (D21) to load the stored snapshot or queue row, matching mobile plan 60 load-stored." — web anonymous restore and signed-in queue head — Plan: 40, 41
- **R34** (area D, step 10) "a device that is not the active session does not write History for an ended queue head; the owning device retires it." — web — Plan: 41 (mobile side in 61, which prompt 61 also tells to wait for the first cross-device check-in)
- **R35** (area F, step 11) "Retire on any 404, on both. Change mobile plan 60 (D36) to match plans 10 and 40." — mobile — Plan: 60, 61

## Areas

Plan number blocks keep area steps from colliding on file names. Paths under "Starts from" are
where research begins, not a fixed file list.

### Area A — Shared live playback policy

- **Rows:** R5, R20, R21, R29, R30
- **Plan block:** 10–19
- **Starts from:** `packages/helpers/src/lib/liveItemVisibility.ts`, `packages/playback-core/src/`
  (`resolvePlaybackLoadDecision.ts`, `playbackTarget.ts`, `listenSession.ts`, `index.ts`),
  `packages/mq/src/functions/mq/rss/runLiveItemListener.ts` (read only, for R30).
- **Scope:** pure, surface-free helpers both apps call: whether a restored now-playing item is
  an ended livestream (server status only, no time heuristics); the live time display model
  (no duration, "Live" label, nothing at the live edge, behind-live offset when rewound); the
  resume-after-pause decision (resume inside the seekable window, otherwise go to live); and
  go-to-live meaning seek to the live edge or reconnect a progressive stream. Records the rewind
  answers and the web/mobile parity contract.
- **Depends on:** none.
- **Shares files with:** every other area imports its exports; `packages/playback-core/src/index.ts`
  and `packages/helpers` exports.

### Area B — Web play does nothing after a restored livestream

- **Rows:** R10
- **Plan block:** 20–29
- **Starts from:** `apps/web/src/components/MediaPlayer/Controller/MediaPlayerController.tsx`
  (mounts `NonLiveMediaMount`, `MediaPlayerControllerLiveStreamAudio`, and
  `MediaPlayerLiveStreamVideoWrapper` together), `NonLiveMediaOrchestrator.tsx`,
  `MediaPlayerControllerLiveStreamAV.tsx`, `Controller/LiveStream/`, and
  `MEDIA-PLAYER-DECISION-MATRIX.md` § 6a. E2E: `media-player-livestream-to-podcast-transition.spec.ts`.
- **Depends on:** none.
- **Shares files with:** area E (controller files, decision matrix § 6), area D (decision
  matrix, restore path if the cause sits there).

### Area C — Mobile media engine live window

- **Rows:** R23, R28
- **Plan block:** 30–39
- **Starts from:** `apps/mobile/modules/podverse-media-engine/` (`src/NativePlaybackBridge.ts`,
  `src/types.ts`, `src/bridgeCommandSerialization.ts`, `ios/`, `android/`).
- **Scope:** report the live seekable window and live-edge position from the native players,
  seek inside it, seek to the live edge, and reconnect a progressive stream. Bridge contract only;
  no player UI.
- **Depends on:** none.
- **Shares files with:** area G (bridge types and hooks it consumes).

### Area D — Web ended-livestream restore

- **Rows:** R1, R3, R6, R8
- **Plan block:** 40–49
- **Starts from:** `apps/web/src/utils/anonymousPlaybackStorage.ts`,
  `apps/web/src/components/Queue/AnonymousPlaybackRestoreController.tsx`,
  `apps/web/src/hooks/useMediaPlayerControllerQueueHeadLoading.ts`,
  `apps/web/src/hooks/useQueueResourcesLoadActive.tsx`,
  `apps/web/src/hooks/useQueueResourceMoveNowPlayingToHistory.tsx`,
  `apps/web/src/lib/crossDevicePlayback/`, and `MEDIA-PLAYER-DECISION-MATRIX.md` § 2, § 6, § 7.
- **Depends on:** area A (ended-livestream decision helper), area B (the restored-livestream
  state its fix touches).
- **Shares files with:** area B and area E (decision matrix); area E possibly the livestream E2E
  specs.

### Area E — Web live player time and controls

- **Rows:** R12, R14, R16, R18, R22, R25, R27
- **Plan block:** 50–59
- **Starts from:** `apps/web/src/components/MediaPlayer/Sliders/MediaPlayerProgress.tsx`,
  `Desktop/MediaPlayerControlsDesktop.tsx`, `Mobile/MediaPlayerControlsMobile.tsx` (already has a
  `liveEdge` style), `Controller/MediaPlayerControllerLiveStreamAV.tsx`,
  `Controller/livestreamSourceType.ts`, `Controller/NonLiveMediaOrchestrator.tsx` (where
  `mpDuration` is set), and `media-player-livestream-hls-start.spec.ts` with seed item
  `e2eLiveHlsA01`.
- **Depends on:** area A (display model, resume and go-to-live decisions), area B (shared
  controller files).
- **Shares files with:** area B (controller files), area G (i18n catalog keys for the Live
  label, if new), area D (decision matrix, livestream E2E specs).

### Area F — Mobile ended-livestream restore

- **Rows:** R2, R4, R7, R9, R11
- **Plan block:** 60–69
- **Starts from:** `apps/mobile/src/playback/PlaybackProvider.tsx` (`restoreFromSnapshot`,
  `lastPlaybackRestoreSettled`, `session_restore` queue-head load),
  `apps/mobile/src/lib/playback/lastPlaybackStorage.ts`,
  `apps/mobile/src/lib/playback/engineSourceAdoption.ts`,
  `apps/mobile/src/playback/crossDevice/crossDevicePlaybackPolicy.ts`.
- **Depends on:** area A (ended-livestream decision helper), area B (R11 compares the web cause
  with mobile).
- **Shares files with:** area G (`PlaybackProvider.tsx`).

### Area G — Mobile live player time and controls

- **Rows:** R13, R15, R17, R19, R24, R26
- **Plan block:** 70–79
- **Starts from:** `apps/mobile/src/components/player/FullPlayerScrubber.tsx`
  (`usePlaybackDuration`, `full-player-duration`), `MiniPlayerProgress.tsx`,
  `apps/mobile/src/playback/playbackProgressStore.ts`, `playbackTransport.ts`, and
  `PlaybackProvider.tsx` (play and resume paths). Maestro: `player-screen.yaml`,
  `add-by-rss-livestream.yaml`.
- **Depends on:** area A (display model and decisions), area C (bridge window and live-edge
  commands), area E (web live controls are the parity source), area F (`PlaybackProvider.tsx`).
- **Shares files with:** area F (`PlaybackProvider.tsx`), area C (bridge), area E (i18n catalog
  keys).

## Waves

Areas in one wave plan at the same time. A later wave builds on an earlier area's plan.

| Wave | Areas | Why it waits |
| --- | --- | --- |
| 1 | A, B, C | — |
| 2 | D, E, F | D, E, and F call area A's helpers; D and E share web controller and restore files with B; F answers R11 against B's cause |
| 3 | G | uses area C's bridge contract, follows area E's web controls, and edits `PlaybackProvider.tsx` after area F |

## Decisions to review

Product choices the area steps made that the request did not settle. Each item names the planning
step and the plan it lives in. Numbers D1, D2, … are for referring to items in review answers.

**Reviewed.** The operator's answers are in `00-REQUEST.md` § Review of the first planning pass.
D44–D47 are settled as rows R31–R35, and D37 now also applies to web (R34). D20, D21, D23 and D36
are replaced by those answers. D38 stays as plan 61 has it. Every other item is accepted as
planned.

### Step 02 — area A, shared live playback policy

- **D1** (plan 10) When the server gives no answer on restore (offline, timeout, 5xx), keep the livestream loaded, so a stream that is really live is never hidden. Alternative: retire it whenever the status can't be confirmed.
- **D2** (plan 10) An item that returns 404 on restore is retired like an ended stream. Alternative: keep it.
- **D3** (plan 10) A scheduled stream on restore is kept; only Ended or missing retires.
- **D4** (plan 11) Pressing Live while paused jumps to the live moment and starts playing. It always acts, even when already at live, which on a progressive stream means a reconnect. Alternatives: jump without playing, or do nothing when already at live.
- **D5** (plan 11) Thresholds: the first 10 seconds behind live still count as live, rewind appears only for windows of at least 30 seconds, and seeks stay 6 seconds inside the window start. Alternative: other values, for example a 60-second minimum.
- **D6** (plan 11) Remote control of a livestream playing on another device stays a Live label only, with no remote rewind or go-to-live. Alternative: add a `go_live` or `seek` command for live items.
- **D7** (plan 12) The parser marks departed live items Ended, scheduled ones included, and does not invent an `end_time`. Alternative: the API sends the item's archive flag and restore reads it.
- **D8** (plan 12) A live item republished as a regular item is marked Ended and no longer archived. The leftover live record is not deleted, so the recording stays out of regular episode lists. Turning it into a normal episode is left as separate work.

### Step 03 — area B, web Play does nothing after a restored livestream

- **D9** (plan 20) An orphaned tab of the active session becomes `idle`, not `remote`: it loads the local queue head paused, and the next Play claims. Alternative: a fourth role, or routing commands to the tab.
- **D10** (plan 20) The tab asks the other tabs, then waits 1 second. Alternative: wait the 12-second silence window, which would swallow Play for 12 seconds.
- **D11** (plan 20) Browsers without `BroadcastChannel` stay `remote`, as today. Alternative: assume `idle`, which could start a second audio tab.
- **D12** (plan 20) An idle tab does not publish a release (`resource: null`) to the shared state, so other devices keep "Paused on {device}" until the next local Play claims. Alternative: clear the shared state on load.
- **D13** (plan 20) Local restore findings are left to areas D and E and recorded in plan 20 without changes, because they are not the cause of R10.

### Step 04 — area C, mobile media engine live window

- **D14** (plans 30–32) The resume-after-pause rule lives in the native `play()` for live sources, so the in-app button, lock screen, headset, notification, CarPlay and Android Auto behave the same. Alternative: JavaScript only, through area A's helper, which leaves lock-screen and car play resuming stale buffered audio on a progressive stream.
- **D15** (plan 30) `goToLive()` always starts playback, even when paused. Alternative: keep the pause state.
- **D16** (plan 30) No DASH on mobile: iOS cannot play it, Android has no DASH dependency, and no shared helper classifies `.mpd` links. Alternative: add the Android DASH package for Android-only rewind.
- **D17** (plan 31) The iOS lock screen hides its skip and scrub controls for a live stream that can't rewind. Alternative: leave them visible as controls that do nothing.

### Step 05 — area D, web ended-livestream restore

- **D18** (plan 41) An explicit take-over ("Play Here") is outside the ended-livestream rule, matching mobile plan 61. Alternative: refuse to load an ended livestream on take-over through the existing `load_failed` report.
- **D19** (plan 41) The move to history sends no `last_played_at` and no event kind, so loading a page doesn't change how recent the row looks. Alternative: a `complete` event stamped with the current time.
- **D20** (plan 40) Signed-out retire clears the stored snapshot, including on any 404. Alternative: keep the snapshot and load nothing.
- **D21** (plans 40, 41) A failed status read (offline, 5xx, 410) loads nothing and keeps the snapshot or queue row, which matches today's result. Alternative: load the stored copy, as mobile does (D47).
- **D22** (plan 41) Add by RSS livestreams are excluded, because there is no fresh server status to read. Alternative: re-parse the feed.
- **D23** (plan 41) The handoff prompt can still name an ended queue head; choosing Switch moves it to history and keeps the local item playing. Alternative: read the item before showing the prompt and suppress it, as mobile does (D37), which puts an async read into the synchronous `shouldLoadQueueResource`.

### Step 06 — area E, web live player time and controls

- **D24** (plan 52) Rewind controls are hidden, not disabled, when the window can't rewind. Area G copies this.
- **D25** (plan 51) No DASH on web, because the web player has no DASH engine (same call as D16). Alternative: add a DASH player.
- **D26** (plans 50, 51) Live position lives only in a new store; `mpDuration` stays 0 and `mpCurrentTime` isn't driven for live. Alternative: feed the live timeline into the existing player context.
- **D27** (plan 51) Add by RSS livestreams stay on the episode player, which keeps its credential and blocked-host handling, and register with the same store. Alternative: move them onto the live player.
- **D28** (plan 51) An element that hasn't played yet reads as at live, so a restored livestream shows Live. Alternative: show a behind-live time from the window.
- **D29** (plan 51) The resume rule applies only after the element has played and then paused. Alternative: apply it on every play.
- **D30** (plan 51) A progressive reconnect mounts a fresh element for database livestreams and calls `reloadAt(0)` for Add by RSS. Alternative: reload the source on the same element.
- **D31** (plan 52) On the narrow mobile-web bar, a non-rewindable stream shows a static Live label; the full-screen player has the Live button. Alternative: a tappable button on the bar's thin top edge.
- **D32** (plan 53) A new 120-second HLS fixture and seed item for the rewind test. Alternative: make the existing 6-second item longer.

### Step 07 — area F, mobile ended-livestream restore

- **D33** (plan 61) R11 needs no mobile fix: mobile has one player per account session, and its session id stays the same across restarts and token refresh, so the phone never sees its own active session as remote. Alternative: copy web's plan 20 fix. Plan 62's flow still checks the symptom on a device.
- **D34** (plans 60, 61) Livestreams are now saved for restore, marked `is_live`, and checked fresh on restore. Alternative: never save livestreams, which today leaves the previous episode's snapshot to restore instead.
- **D35** (plan 61) Every signed-in queue head that is a plain item gets a fresh read, not only known livestreams, because server queue resources carry no `item.live_item`. Alternative: check only known-live heads, which misses heads web wrote during a livestream.
- **D36** (plan 60) A 404 retires only an item already known to be live; a regular episode that 404s restores as today. Alternative: retire on any 404, as plan 10's rule (D2) and web plan 40 (D20) do.
- **D37** (plan 61) The history write is skipped when another session is the active device, and the handoff prompt is suppressed without a history write; the device that owns that queue head retires it. Alternative: write History from any device. Web shows the prompt instead (D23).
- **D38** (plan 61) A source the native engine still holds at cold start is left alone, because unloading it needs `destroy()`, which on Android stops the media service and drops a connected car session. Alternative: check it fresh and destroy it. Step 07 flagged this one as worth review.
- **D39** (plan 61) Add by RSS livestream queue heads keep today's behavior: mobile never writes livestreams to the server queue, and restore does not parse feeds.

### Step 08 — area G, mobile live player time and controls

- **D40** (plan 72) The mobile mini player stays an empty edge fill for livestreams, matching the remote mini player. Alternative: web's edge scrubber or a Live label (compare D31).
- **D41** (plan 71) The behind-live time keeps updating while paused, from a once-a-second re-read gated on the app being active. Alternative: freeze the number while paused.
- **D42** (plan 70) During a load, the old duration stays on screen until the new title appears, and both change in one render. Alternative: clear it when the load starts, which shows a blank duration under the old title.
- **D43** (plan 70) A failed load shows the new item at its own start position, and Retry starts there. Before, it kept the previous item's position.

### Mismatches between steps

- **D44** Resume margin: plan 30 makes native `play()` resume in place when the paused position is at or after the window start. Plan 11's `resolveLiveResume`, which web uses, requires the window start plus a 6-second margin (D5). Step 08 asks that one of them change so mobile and web agree.
- **D45** 404 on restore: plan 10 (D2) and web plan 40 (D20) retire on any 404; mobile plan 60 (D36) retires only items already known to be live.
- **D46** Handoff prompt for an ended queue head: web shows it and Switch moves the head to history (D23); mobile suppresses it (D37).
- **D47** Status read fails on restore: plan 10 returns `keep` / `status-unavailable` (D1). Web plans 40 and 41 read that as keep the snapshot or row but load nothing (D21). Mobile plan 60 loads the stored copy (`load-stored`). Web and mobile therefore differ when offline at launch.

## Order

First planning pass: step 01 split the request into areas A–G across three waves.

Second pass after the first review: rows R31–R35 make web and mobile agree on the resume margin,
404 retire, handoff prompt suppression, the stored-copy load when the status read fails, and
which device writes History. Step 09 revises area C's plans 30–32. Step 10 revises area D's
plans 40–41. Step 11 revises area F's plans 60–62. The three steps edit separate plans and run
at once. Plan 11's shared contract text was updated by hand to match.

Close filled the ledger and assembled six implementation phases in `00-EXECUTION-ORDER.md` and
`COPY-PASTA.md`. Prompt 61 also tells mobile to wait for the first cross-device check-in before
the History write, matching web plan 41 (R34).
