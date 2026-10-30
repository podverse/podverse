**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

# 62 — Mobile E2E: ended livestream at sign-in restore

## Rows

- R2, R4, R7 (mobile): an ended livestream at the queue head is moved to History and not loaded.
- R11 (mobile): with a still-live livestream restored, playing a regular episode works.

## Runs after

- 61 (the behavior under test).
- 40 (seeds the ended live item `e2eLiveEnded01`, title "E2E Ended Livestream", in
  `tools/web/seed-e2e.mjs`). This plan adds no seed rows.

## Goal

One Maestro flow, `playback-ended-livestream-restore`, modeled on
`apps/mobile/e2e/playback-multi-device-handoff.yaml`. It uses the same seed script
(`scripts/seed-playback-now-playing.js`), the same shared login, and the same E2E markers
(`playback-active-e2e`, `playback-now-playing-title-e2e` from `PlaybackE2eStatus.tsx`).

Each case seeds the server now-playing row **before** signing in. Sign-in (anonymous to
authenticated) clears the last-playback snapshot and runs `adoptQueueHeadWhenPlayerEmpty`, so the
queue head is the only thing restore can load. A relaunch would restore the snapshot first and
skip the queue head.

## Files

apps/mobile/e2e/playback-ended-livestream-restore.yaml
scripts/mobile/e2e-test.sh
.cursor/skills/mobile-test-economics/SKILL.md

## Change 1 — new flow `apps/mobile/e2e/playback-ended-livestream-restore.yaml`

Header: `appId: com.podverse.app.next`, `name: Playback Ended Livestream Restore`, then a comment
block in the handoff flow's style. It says what the flow checks (sign-in restore reads the queue
head's status fresh; an ended livestream goes to History and is not loaded; a live one loads
paused and does not block playing an episode) and `Needs flow_needs_e2e_api.`

Steps, in order. Use `${TIMEOUT_*}` values from the shared ladder (**mobile-maestro-timeouts**).

Case 1, still live (runs first so its positive result proves the adopt ran):

1. `runFlow: shared/launch-and-connect.yaml` (clears state, so the app is signed out with no
   snapshot).
2. `runScript` `scripts/seed-playback-now-playing.js` with `E2E_ITEM_ID_TEXT: e2eLiveAud001`,
   `E2E_PLAYBACK_EVENT_KIND: play`, `E2E_PLAYBACK_POSITION: "0"`.
3. `runFlow: shared/login-seeded-user.yaml`.
4. `extendedWaitUntil` visible `id: playback-now-playing-title-e2e`, `text: "E2E Live Audio Stream"`,
   `timeout: ${TIMEOUT_SLOWEST}`.
5. `assertVisible` `id: playback-active-e2e`, `text: paused`.
6. `takeScreenshot: ended-livestream-restore-live-kept`.
7. R11: `openLink: podverse-next://episode/e2ePodResume01`, then
   `runFlow: shared/confirm-ios-open-dialog.yaml`, `assertVisible` `id: episode-detail-screen`,
   `tapOn` `id: "home-row-play-.*"`. Then `extendedWaitUntil` visible
   `id: playback-now-playing-title-e2e`, `text: "E2E Podcast Resume P > 0"`,
   `timeout: ${TIMEOUT_SLOW}`, and `assertVisible` `id: playback-active-e2e`, `text: playing`.
8. `tapOn` `id: mini-player-play-pause` to pause, so the next case's server write is not
   competing with a playing device.

Case 2, ended:

9. `runFlow: shared/launch-and-connect.yaml` (signed out again, snapshot gone).
10. `runScript` the seed script with `E2E_ITEM_ID_TEXT: e2eLiveEnded01`,
    `E2E_PLAYBACK_EVENT_KIND: play`, `E2E_PLAYBACK_POSITION: "0"`.
11. `runFlow: shared/login-seeded-user.yaml`.
12. `tapOn` `id: tab-my-library`, `assertVisible` `id: library-hub-screen`, `tapOn`
    `id: library-nav-history`, `assertVisible` `id: library-history-screen` (the handoff flow's
    steps).
13. `extendedWaitUntil` visible `text: "E2E Ended Livestream"`, `timeout: ${TIMEOUT_SLOWEST}`.
14. `assertNotVisible` `id: playback-now-playing-title-e2e`, `text: "E2E Ended Livestream"`. The
    marker either shows the next queue item or is absent when the player is empty. Either passes.
15. `takeScreenshot: ended-livestream-restore-history`.

Do not assert which item loads after the retire. The seeded account's upcoming rows depend on
earlier flows in the suite.

## Change 2 — `scripts/mobile/e2e-test.sh`

Add `playback-ended-livestream-restore` to the `flow_needs_e2e_api` case list, in alphabetical
position next to `playback-cross-device`. Do not add it to `flow_needs_test_assets`: both
enclosures come from the E2E asset base URL that `playback-multi-device-handoff` already uses
without that flag. The `all` suite picks up every top-level YAML on its own.

## Change 3 — `.cursor/skills/mobile-test-economics/SKILL.md`

- In the "Area smoke versus area full" table, Playback row, add
  `playback-ended-livestream-restore` after `playback-multi-device-handoff`. Keep the table's
  column padding consistent; do not run Prettier.
- Recount `apps/mobile/e2e/*.yaml` (top level, not `shared/`) after adding the flow, and update the
  "holds **N** top-level flows (`mobile:e2e:test:all` runs M; …)" sentence to the recounted
  numbers. `M` is N minus `tablet`, `perf-chip-switch` and `perf-scroll`.

## Tests

- The new Maestro flow above is the test. No unit tests in this plan.

## Release scratchpad

none
