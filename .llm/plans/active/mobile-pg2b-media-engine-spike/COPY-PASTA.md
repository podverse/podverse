# COPY-PASTA — PG-2b media-engine audio spike

Detailing includes **car foundation** constraints (`00-CAR-FOUNDATION.md`). Paste prompts **one at a
time** to **implement**. After each prompt, mark listed steps **`done`** (Tracks + Appendix C +
detail headers). Do not run tests during agent work.

Read `00-CAR-FOUNDATION.md` before Step 1.

## Step 1 — Module scaffold, bridge, cache-hook contract — done

**Cursor model:** Opus 4.8

Plan file archived to `.llm/plans/completed/mobile-pg2b-media-engine-spike/01-module-scaffold-and-bridge.md`.

```text
Read 00-CAR-FOUNDATION.md and execute .llm/plans/active/mobile-pg2b-media-engine-spike/01-module-scaffold-and-bridge.md.
Implement master-plan steps 2.1–2.3 and 2.35 contract/stubs (details 080–082, 114).
Reserve writeQueueSnapshot / writeDownloadsIndex / writeLibraryBrowseIndex. Do not use react-native-track-player.
Mark those steps done when complete. Do not run tests during agent work; end with operator verify commands.
```

## Step 2 — iOS audio — done

**Cursor model:** Opus 4.8

Plan file archived to `.llm/plans/completed/mobile-pg2b-media-engine-spike/02-ios-audio-session-nowplaying.md`.

```text
Read 00-CAR-FOUNDATION.md and execute .llm/plans/active/mobile-pg2b-media-engine-spike/02-ios-audio-session-nowplaying.md.
Implement steps 2.4–2.6 (details 083–085). Single shared AVPlayer + shared MPRemoteCommandCenter for future CarPlay.
Mark done when complete.
```

## Step 3 — Android audio — done

**Cursor model:** Opus 4.8

Plan file archived to `.llm/plans/completed/mobile-pg2b-media-engine-spike/03-android-exoplayer-service.md`.

```text
Read 00-CAR-FOUNDATION.md and execute .llm/plans/active/mobile-pg2b-media-engine-spike/03-android-exoplayer-service.md.
Implement steps 2.7–2.9 (details 086–088). Single ExoPlayer + MediaLibraryService (stub browse OK) + shared MediaSession.
Mark done when complete.
```

## Step 4 — Events and JS adapter — done

**Cursor model:** Opus 4.8

Plan file archived to `.llm/plans/completed/mobile-pg2b-media-engine-spike/04-events-and-js-adapter.md`.

```text
Read and execute .llm/plans/active/mobile-pg2b-media-engine-spike/04-events-and-js-adapter.md.
Implement steps 2.10–2.11 (details 089–090). Mark done when complete.
```

## Step 5 — Spikes — scaffolding ready, pending operator device runs

**Cursor model:** Opus 4.8

Scaffolding done: README § "Background & after-kill behavior" documents the expected OS policy, and
`apps/mobile/modules/podverse-media-engine/SPIKE-NOTES.md` holds the operator checklist + result
tables. **2.12–2.13 stay `planned`** until the operator runs the device spikes, fills in
`SPIKE-NOTES.md` with real results, and commits — then mark 2.12/2.13 `done` and archive plan 05.

```text
Read and execute .llm/plans/active/mobile-pg2b-media-engine-spike/05-background-kill-spikes.md.
Operator completes 2.12–2.13 spike notes; commit notes. Mark steps done when notes exist.
```

## Step 6 — Go/no-go gate — done (gate authored; final GO conditional)

**Cursor model:** Codex 5.3

Gate authored: `apps/mobile/modules/podverse-media-engine/GO-NO-GO.md` (linked from README + APPS-MOBILE).
Engine/car-foundation constraints are GO; step 2.34 marked `done`. Plan file archived to
`.llm/plans/completed/mobile-pg2b-media-engine-spike/06-spike-go-no-go-gate.md`. **Final GO and full
set archival are conditional on Step 5** (operator 2.12/2.13 device sign-off in `SPIKE-NOTES.md`).

```text
Read 00-CAR-FOUNDATION.md and execute .llm/plans/active/mobile-pg2b-media-engine-spike/06-spike-go-no-go-gate.md.
Implement step 2.34 (detail 113). Include car-foundation constraints and deferred seamless proofs (12.5–12.6, 12.17–12.18).
Mark done. Archive the plan set to completed/ when PG-2b is finished.
```

## Final verification (after all steps)

**Cursor model:** Auto

```text
Confirm steps 2.1–2.13, 2.34, and 2.35 are done in docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md.
Provide cumulative operator verification commands for the PG-2b spike. Remind that seamless CarPlay/AA still requires Track 12.
```
