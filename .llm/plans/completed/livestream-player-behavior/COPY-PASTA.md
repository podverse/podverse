# Livestream player behavior — COPY-PASTA

How to use:

1. Select **Cursor model** and **Reasoning** in the Cursor UI (the line above each fence).
1. Copy the fenced block only, paste, and the agent runs it.
1. Tick the box when that prompt is done.

Request and settled review answers: [00-REQUEST.md](./00-REQUEST.md). Ledger and decisions:
[00-SUMMARY.md](./00-SUMMARY.md). Order and file ownership:
[00-EXECUTION-ORDER.md](./00-EXECUTION-ORDER.md).

**Optional — run the set unattended (Root tab):**
`./scripts/abcplan/run.sh run livestream-player-behavior`. It runs one fresh agent per prompt on
that prompt's model, stops at the first blocker, and resumes with
`./scripts/abcplan/run.sh run livestream-player-behavior --resume 'Your answer.'`. The script
passes `--parallel`, so every prompt under one phase heading runs at once. Prompts in one phase
share no file, and none of them writes the release scratchpad: each puts its entry in its final
message, and prompt 73 appends them. Running them one after the other is also correct.

Phases run in order; prompts inside a phase run at once.

| Phase | Prompts | Model and reasoning |
| --- | --- | --- |
| 1 | 10, 12, 20, 30, 50, 70 | 20 Opus 5.5 extra high; 10, 12, 30, 50, 70 Cursor Grok 4.7 extra high |
| 2 | 11, 53, 60 | 11, 60 Cursor Grok 4.7 extra high; 53 Cursor Grok 4.7 medium |
| 3 | 31, 32, 40, 51, 61 | 31, 32 Opus 5.5 high; 51, 61 Opus 5.5 extra high; 40 Cursor Grok 4.7 extra high |
| 4 | 52, 62, 71 | 71 Opus 5.5 extra high; 52 Cursor Grok 4.7 extra high; 62 Cursor Grok 4.7 medium |
| 5 | 41, 72 | 41 Opus 5.5 high; 72 Cursor Grok 4.7 extra high |
| 6 | 73 | Cursor Grok 4.7 medium |

Why the expensive ones: 20 changes the web multi-tab session role, which is concurrency between
tabs and devices. 31 and 32 are native media engine work on AVFoundation and ExoPlayer. 51 owns
the live element lifecycle every web live control builds on. 61 and 71 change cold-start restore
and live session control inside `PlaybackProvider.tsx`, which several prompts edit. 41 decides
which device owns an ended queue head across sessions. Fast stays off.

If a Cursor Grok 4.7 prompt stalls or makes the same mistake twice, rerun it one reasoning level
higher (after extra high, **Codex 5.3 · high**), and record the change on the prompt here.

## Phase 1

- [x] **10 — Shared decision: keep or retire a restored livestream**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/livestream-player-behavior/10-restored-livestream-decision.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D1–D3, R5; any 404
retires, and a failed read keeps the item so the caller loads its stored copy).
Status comes only from a fresh server read; no start-time or end-time heuristic.
When the code is done, build the two packages later prompts read from dist, in this order:
npm run build -w packages/helpers, then npm run build -w packages/playback-core. You are the only
prompt in this phase that builds packages.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. This plan appends no scratchpad entry.
When the plan is done, move 10-restored-livestream-decision.md to
.llm/plans/completed/livestream-player-behavior/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

- [x] **12 — Parser marks a live item ended when it leaves the feed**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/livestream-player-behavior/12-parser-ends-departed-live-items.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D7, D8, R30).
Mark departed live items Ended, scheduled ones included; never invent an end_time.
Do not build packages; prompt 10 builds helpers and playback-core in this phase.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. Do not edit release-notes/scratchpad.md: put
the plan's release scratchpad entry in your final message under "Release notes entry". Prompt 73
appends it.
When the plan is done, move 12-parser-ends-departed-live-items.md to
.llm/plans/completed/livestream-player-behavior/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

- [x] **20 — Web: a tab of the active session plays here when no tab holds audio**

**Cursor model:** Opus 5.5 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/livestream-player-behavior/20-web-orphaned-session-tab-role.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D9–D13, R10).
An orphaned tab of the active session becomes idle after a 1-second tab search; browsers without
BroadcastChannel stay remote. Export settleAudioTabSearch() as the plan names it: plan 41's unit
test calls it. In MEDIA-PLAYER-DECISION-MATRIX.md edit only the sections your plan names, then run
npx prettier --write on that one file.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. Do not edit release-notes/scratchpad.md: put
the plan's release scratchpad entry in your final message under "Release notes entry". Prompt 73
appends it.
When the plan is done, move 20-web-orphaned-session-tab-role.md to
.llm/plans/completed/livestream-player-behavior/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

- [x] **30 — Media engine live window: bridge contract**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/livestream-player-behavior/30-media-engine-live-window-contract.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D14–D16, R31).
Native play() resumes in place only when the paused position is at least the window start plus
the 6-second margin; otherwise it goes to live. goToLive() always starts playback. No DASH on
mobile. Plans 31 and 32 implement this contract natively; plan 71 consumes it in JS.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. This plan appends no scratchpad entry.
When the plan is done, move 30-media-engine-live-window-contract.md to
.llm/plans/completed/livestream-player-behavior/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

- [x] **50 — Web: every load sets the duration, and live items never take a stale one**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/livestream-player-behavior/50-web-duration-reset-and-live-safe-non-live-element.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (R12, D26).
Decide liveness from the item, not from the kind of load. Plan 51 edits
NonLiveMediaOrchestrator.tsx after you; keep your change there to what the plan names.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. Do not edit release-notes/scratchpad.md: put
the plan's release scratchpad entry in your final message under "Release notes entry". Prompt 73
appends it.
When the plan is done, move 50-web-duration-reset-and-live-safe-non-live-element.md to
.llm/plans/completed/livestream-player-behavior/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

- [x] **70 — Mobile: no item shows the previous item's duration, and a livestream never has one**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/livestream-player-behavior/70-mobile-duration-reset-every-item.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D42, D43, R13).
PlaybackProvider.tsx is large: Grep the anchors the plan names (playTarget, the progress
handler) instead of reading it whole. Do not touch restoreFromSnapshot,
adoptQueueHeadWhenPlayerEmpty, or the handoff-prompt useEffect; plan 61 edits them in Phase 3.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. Do not edit release-notes/scratchpad.md: put
the plan's release scratchpad entry in your final message under "Release notes entry". Prompt 73
appends it.
When the plan is done, move 70-mobile-duration-reset-every-item.md to
.llm/plans/completed/livestream-player-behavior/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

## Phase 2

- [x] **11 — Shared live position policy and the web/mobile livestream contract**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/livestream-player-behavior/11-live-position-policy.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D4–D6, R20, R21, R29,
R31).
Export LIVE_WINDOW_START_MARGIN_SECONDS (6); plans 31 and 32's parity tests import it. Keep plan
10's exports in packages/playback-core/src/index.ts and package.json.
When the code is done, run npm run build -w packages/playback-core so Phase 3 reads the new
exports from dist. You are the only prompt in this phase that builds packages.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. This plan appends no scratchpad entry.
When the plan is done, move 11-live-position-policy.md to
.llm/plans/completed/livestream-player-behavior/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

- [x] **53 — E2E: a two-minute live HLS fixture with a rewindable window**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/livestream-player-behavior/53-e2e-hls-rewind-fixture-and-seed.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D32).
Run npm run generate:e2e-media -w podverse-test-assets as the plan says and keep the generated
playlists and segments in the tree. If ffmpeg-static is missing, finish the seed and matrix edits and report BLOCKED
naming the missing dependency. Plan 40 adds its own seed rows next to yours in Phase 3. In
MEDIA-PLAYER-DECISION-MATRIX.md edit only § 6c, then run npx prettier --write on that one file.
Do not build packages.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. This plan appends no scratchpad entry.
When the plan is done, move 53-e2e-hls-rewind-fixture-and-seed.md to
.llm/plans/completed/livestream-player-behavior/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

- [x] **60 — Mobile restored-livestream helpers**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/livestream-player-behavior/60-mobile-restored-livestream-helpers.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D34, D35, R35; D36 is
superseded: any not-found from a fresh read retires).
Mobile reads @podverse/playback-core from dist; prompt 10 built plan 10's exports. Do not build
packages. Prompt 11 rebuilds playback-core during this phase, so if a mobile type-check fails on
a @podverse/playback-core import, wait and rerun it once before treating it as your error.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. This plan appends no scratchpad entry.
When the plan is done, move 60-mobile-restored-livestream-helpers.md to
.llm/plans/completed/livestream-player-behavior/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

## Phase 3

- [x] **31 — Media engine live window: iOS**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/livestream-player-behavior/31-media-engine-live-window-ios.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D14, D15, D17, R31).
Implement plan 30's contract as it now stands in the tree. The resume margin is
LIVE_WINDOW_START_MARGIN_SECONDS from @podverse/playback-core (6 seconds). Prompt 32 edits the
Android engine at the same time; edit only the iOS files and your parity test.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. Do not edit release-notes/scratchpad.md: put
the plan's release scratchpad entry in your final message under "Release notes entry". Prompt 73
appends it.
When the plan is done, move 31-media-engine-live-window-ios.md to
.llm/plans/completed/livestream-player-behavior/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

- [x] **32 — Media engine live window: Android**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/livestream-player-behavior/32-media-engine-live-window-android.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D14–D16, R31).
Implement plan 30's contract as it now stands in the tree. Report window and live edge on one
stable timeline (ExoPlayer positions are relative to a moving window). The resume margin is
LIVE_WINDOW_START_MARGIN_SECONDS from @podverse/playback-core (6 seconds). Prompt 31 edits the
iOS engine at the same time; edit only the Android files and your parity test.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. Do not edit release-notes/scratchpad.md: put
the plan's release scratchpad entry in your final message under "Release notes entry". Prompt 73
appends it.
When the plan is done, move 32-media-engine-live-window-android.md to
.llm/plans/completed/livestream-player-behavior/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

- [x] **40 — Web: anonymous restore retires an ended livestream**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/livestream-player-behavior/40-web-anonymous-restore-ended-livestream.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (R33; D20 and D21 are
superseded: any 404 retires and clears the snapshot, and a failed read loads the stored copy).
Plan 41 imports fetchFreshRestoredItem by path after you; keep the exported names the plan gives.
Plan 53's seed rows are already in tools/web/seed-e2e.mjs and seedConstants.ts; add yours next to
them and keep theirs. Plan 62 relies on your seeded item e2eLiveEnded01 ("E2E Ended
Livestream"). In MEDIA-PLAYER-DECISION-MATRIX.md edit only the sections your plan names, then run
npx prettier --write on that one file.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. Do not edit release-notes/scratchpad.md: put
the plan's release scratchpad entry in your final message under "Release notes entry". Prompt 73
appends it.
When the plan is done, move 40-web-anonymous-restore-ended-livestream.md to
.llm/plans/completed/livestream-player-behavior/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

- [x] **51 — Web: one live position store for every live element**

**Cursor model:** Opus 5.5 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/livestream-player-behavior/51-web-live-position-store.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D25–D30, R22, R25, R27).
Use plan 11's resolveLiveResume and live policy from @podverse/playback-core; do not restate its
thresholds. Keep plan 50's edits in NonLiveMediaOrchestrator.tsx. Plan 52 builds the controls on
your store and useLiveMediaSnapshot; name the final exports in your final message.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. Do not edit release-notes/scratchpad.md: put
the plan's release scratchpad entry in your final message under "Release notes entry". Prompt 73
appends it.
When the plan is done, move 51-web-live-position-store.md to
.llm/plans/completed/livestream-player-behavior/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

- [x] **61 — Mobile cold-start restore retires ended livestreams**

**Cursor model:** Opus 5.5 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/livestream-player-behavior/61-mobile-restore-retires-ended-livestreams.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D33–D39, R35; D36 is
superseded: any not-found from a fresh read retires).
The History write for an ended queue head happens only on the device that owns the head (R34). If
adoptQueueHeadWhenPlayerEmpty can run before this session's first cross-device check-in has
settled, wait for it before deciding ownership, as web plan 41 does; do not write History while
the role is unknown. Report in your final message how you settled this.
Keep plan 70's edits in PlaybackProvider.tsx (playTarget and the progress handler). Plan 71
edits the same file in Phase 4: name any shared useCallback you add and the module constant
RESTORED_QUEUE_HEAD_RETIRE_LIMIT in your final message.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. Do not edit release-notes/scratchpad.md: put
the plan's release scratchpad entry in your final message under "Release notes entry". Prompt 73
appends it.
When the plan is done, move 61-mobile-restore-retires-ended-livestreams.md to
.llm/plans/completed/livestream-player-behavior/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

## Phase 4

- [x] **52 — Web: Live control, behind-live time, live scrubber, and skip buttons**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/livestream-player-behavior/52-web-live-controls-and-time.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D24, D28, D31, R14, R16,
R18, R22).
Read prompt 51's final message in .artifacts/plan-runner/livestream-player-behavior/51.md for the
store's export names. Reuse media.livestream.live for the Live label; add media_player.go_to_live
and media_player.behind_live to all four consumer originals. Plan 72 reuses these keys on mobile.
Rewind controls are hidden, not disabled, when the window can't rewind. In
MEDIA-PLAYER-DECISION-MATRIX.md edit only the sections your plan names, then run
npx prettier --write on that one file.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. Do not edit release-notes/scratchpad.md: put
the plan's release scratchpad entry in your final message under "Release notes entry". Prompt 73
appends it.
When the plan is done, move 52-web-live-controls-and-time.md to
.llm/plans/completed/livestream-player-behavior/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

- [x] **62 — Mobile E2E: ended livestream at sign-in restore**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/livestream-player-behavior/62-mobile-ended-livestream-e2e.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (R11, D33).
Use the seeded item e2eLiveEnded01 from plan 40; add no seed rows. Use the shared TIMEOUT_*
ladder (mobile-maestro-timeouts). Plan 73 adds its own flow to scripts/mobile/e2e-test.sh and the
mobile-test-economics skill after you; make targeted insertions only.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. This plan appends no scratchpad entry.
When the plan is done, move 62-mobile-ended-livestream-e2e.md to
.llm/plans/completed/livestream-player-behavior/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

- [x] **71 — Mobile: hold the live window in JS, add Go to Live, and keep skips inside the window**

**Cursor model:** Opus 5.5 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/livestream-player-behavior/71-mobile-live-window-store-and-session-controls.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D41, R17, R24, R26, R31).
Use plan 30's bridge contract as it stands in the tree: goToLive() for Live, plain play() to
resume (the engine applies the 6-second margin). Read prompt 61's final message in
.artifacts/plan-runner/livestream-player-behavior/61.md and keep plans 61 and 70's edits in
PlaybackProvider.tsx; Grep your anchors instead of reading the file whole.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. Do not edit release-notes/scratchpad.md: put
the plan's release scratchpad entry in your final message under "Release notes entry". Prompt 73
appends it.
When the plan is done, move 71-mobile-live-window-store-and-session-controls.md to
.llm/plans/completed/livestream-player-behavior/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

## Phase 5

- [x] **41 — Web: signed-in queue head retires an ended livestream**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/livestream-player-behavior/41-web-queue-head-ended-livestream.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D18, D19, D22, R32–R34;
D21 and D23 are superseded: a failed read loads the queue row's copy, and the handoff prompt is
suppressed for an ended or missing livestream head after a fresh read).
Plan 20's settleAudioTabSearch() and plan 40's fetchFreshRestoredItem are in the tree; edit no
cross-device file. A remote tab writes no History; ownership waits for the first check-in. In
MEDIA-PLAYER-DECISION-MATRIX.md edit only the sections your plan names and keep plans 20, 40, 52,
and 53's edits, then run npx prettier --write on that one file.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. Do not edit release-notes/scratchpad.md: put
the plan's release scratchpad entry in your final message under "Release notes entry". Prompt 73
appends it.
When the plan is done, move 41-web-queue-head-ended-livestream.md to
.llm/plans/completed/livestream-player-behavior/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

- [x] **72 — Mobile full player: Live in place of the duration, behind-live time, and a window scrubber**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/livestream-player-behavior/72-mobile-full-player-live-controls.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D24, D40, R15, R17, R19,
R24).
Read prompt 71's final message in .artifacts/plan-runner/livestream-player-behavior/71.md for the
live store's export names. Reuse the catalog keys plan 52 added (media.livestream.live,
media_player.go_to_live, media_player.behind_live); add no catalog keys. Rewind controls are
hidden, not disabled, when the window can't rewind.
Another prompt runs at the same time; edit only the files your plan lists, and scope any
type-check or formatter to them. Do not run tests. Do not edit release-notes/scratchpad.md: put
the plan's release scratchpad entry in your final message under "Release notes entry". Prompt 73
appends it.
When the plan is done, move 72-mobile-full-player-live-controls.md to
.llm/plans/completed/livestream-player-behavior/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

## Phase 6

- [x] **73 — Mobile E2E: livestream time and controls in the full player; then archive the set**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/livestream-player-behavior/73-mobile-livestream-player-controls-e2e.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md.
Use the seeded item e2eLiveHlsRw01 from plan 53. Keep plan 62's entries in
scripts/mobile/e2e-test.sh and the mobile-test-economics skill. Run the skip-back,
pause-and-resume, and Live steps without added waits; the fixture's live edge stays near 102 s.
Do not run tests. This plan has no scratchpad entry of its own.

Append to release-notes/scratchpad.md every "Release notes entry" from the final messages of
prompts 12, 20, 50, 70, 31, 32, 40, 51, 61, 52, 71, 41, and 72 in
.artifacts/plan-runner/livestream-player-behavior/ (12.md, 20.md, …), in that order, unchanged.
Skip one that already appears in the scratchpad. If a final message has no entry, take it from
that plan's "## Release scratchpad" section in .llm/plans/completed/livestream-player-behavior/.

Then close the set. Confirm every other numbered plan is in
.llm/plans/completed/livestream-player-behavior/. Move
73-mobile-livestream-player-controls-e2e.md, 00-REQUEST.md, 00-SUMMARY.md,
00-EXECUTION-ORDER.md, and COPY-PASTA.md there, and remove the empty active directory.

End with the cumulative verification for the whole set, assuming no earlier prompt was tested.
One fenced bash block per tab, fish-safe, labeled with the tab name. Tell the operator that
Docker, Mobile E2E Metro, Mobile E2E API, Mobile E2E test-assets, and Mobile E2E iOS or Mobile
E2E Android must be running, and that Mobile E2E API and Mobile E2E test-assets must be restarted
after the package build and asset generation so they serve the new seed rows and the rewind HLS
fixture. Do not put leave-running commands in the blocks. Say that plans 31 and 32 changed native
Swift and Kotlin, so the Mobile block prebuilds before the E2E app installs. After the blocks,
copy the device checks from plans 31 and 32 (in completed/) as a checklist: lock-screen and
notification resume, the 6-second margin on e2eLiveHlsRw01, and the progressive reconnect, which
no Maestro flow covers. Also list any device check or open item earlier final messages reported,
including how prompt 61 settled the cross-device check-in wait.

Root:
npm run build:packages
npm run generate:e2e-media -w podverse-test-assets
npm run i18n:compile
npm run i18n:validate
npm run lint
npm run type-check
npm run type-check:mobile
npm run test:unit
npm --prefix apps/mobile run test
make e2e_test_web_report_spec SPEC=e2e/media-player-cross-device-remote.spec.ts,e2e/media-player-anonymous-restore.spec.ts,e2e/media-player-livestream-queue-restore.spec.ts,e2e/media-player-livestream-live-controls.spec.ts,e2e/media-player-livestream-hls-start.spec.ts,e2e/media-player-livestream-audio-start.spec.ts,e2e/media-player-livestream-video-start.spec.ts,e2e/media-player-livestream-to-podcast-transition.spec.ts,e2e/media-player-podcast-to-livestream-transition.spec.ts
open .artifacts/e2e-reports/latest/index.html

Mobile:
npm run mobile:install
npm run mobile:prebuild

Mobile E2E iOS:
npm run mobile:e2e:ios

Mobile E2E Android:
npm run mobile:e2e:android

Mobile Maestro:
npm run mobile:e2e:test -- playback-ended-livestream-restore,livestream-player-controls,player-screen,add-by-rss-livestream
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

- [ ] **abcaicast** (optional)

After this set, do you want an abcaicast for this work?
