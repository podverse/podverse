**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

# 73 — Mobile E2E: livestream time and controls in the full player

## Rows

R13, R15, R17, R19, R24, R26

## Runs after

53, 62, 70, 72

- 53 seeds `e2eLiveHlsRw01` ("E2E Live HLS Rewind Stream", channel `e2eLiveAvChn01`) whose
  enclosure is the 120-second static EVENT playlist `e2e-hls-rewind-event.m3u8`: live edge near
  102 s, rewindable.
- 62 edits the same two registration files (`scripts/mobile/e2e-test.sh` and the
  mobile-test-economics skill); keep its entries.
- 70 and 72 are the behavior under test (71 comes in through 72).

## Files

apps/mobile/e2e/livestream-player-controls.yaml
scripts/mobile/e2e-test.sh
.cursor/skills/mobile-test-economics/SKILL.md

## Goal

One Maestro flow, `livestream-player-controls`, that plays an episode, then a livestream with no
rewindable window, then one with a rewindable window, and checks the full player's progress band
and transport row for each. Model it on `apps/mobile/e2e/player-screen.yaml` (deep link to an
episode detail, play from `home-row-play-*`, open the full player from `mini-player`, close it with
`full-player-close` on iOS and Back on Android) and read state from the E2E markers in
`PlaybackE2eStatus.tsx` (`playback-active-e2e` text `playing` / `paused`,
`playback-now-playing-title-e2e`).

Seeded items used (all in `tools/web/seed-e2e.mjs`):

| Item | Why |
| --- | --- |
| `e2ePodChap0001` | An episode with a duration, played first (R13). |
| `e2eLiveHlsA01` "E2E Live HLS Audio Stream" | 6-second EVENT playlist: live, window too short to rewind. |
| `e2eLiveHlsRw01` "E2E Live HLS Rewind Stream" | 120-second EVENT playlist: live, rewindable. |

The progressive live item `e2eLiveAud001` is not used: its enclosure is a short MP3 that ends
within seconds, which would advance the queue mid-flow. Progressive reconnect is covered by the
native plans' own checks (31, 32).

## Change 1 — new flow `apps/mobile/e2e/livestream-player-controls.yaml`

Header: `appId: com.podverse.app.next`, `name: Livestream Player Controls`, then a comment block
in `player-screen.yaml`'s style saying what the flow checks: a livestream shows a Live control
where an episode shows its duration, the skip buttons and scrubber appear only when the stream
keeps a rewindable window, skip back shows the time behind live, play after a pause resumes in
place when the stream still holds that moment, and Live returns to the live moment and plays. End
the block with `Needs flow_needs_e2e_api + flow_needs_test_assets.`

Use `${TIMEOUT_*}` values from the shared ladder (**mobile-maestro-timeouts**). Define a local
close-full-player block by repeating `player-screen.yaml`'s two `runFlow` `when: platform` blocks
(iOS `tapOn: id: full-player-close`; Android `pressKey: Back`) followed by
`extendedWaitUntil: notVisible: id: full-player-screen` with `${TIMEOUT_SLOW}`. "Close the full
player" below means that sequence.

Steps, in order:

1. `runFlow: shared/launch-and-connect.yaml`, then `runFlow: shared/login-seeded-user.yaml`.

**Episode first (R13 setup).**

2. `openLink: podverse-next://episode/e2ePodChap0001`, `runFlow: shared/confirm-ios-open-dialog.yaml`,
   `extendedWaitUntil` visible `id: episode-detail-screen` (`${TIMEOUT_SLOWER}`).
3. `tapOn` `id: home-row-play-e2ePodChap0001`; `extendedWaitUntil` visible `id: playback-active-e2e`
   `text: playing` (`${TIMEOUT_SLOW}`).
4. `tapOn` `id: mini-player`; `extendedWaitUntil` visible `id: full-player-screen`
   (`${TIMEOUT_SLOW}`). `extendedWaitUntil` visible `id: full-player-duration` (`${TIMEOUT_SLOW}`;
   the duration arrives with the load hint or the first native sample). `assertNotVisible`
   `id: full-player-live-control`.
5. Close the full player.

**Live, no rewindable window (R13, R15, R24).**

6. `openLink: podverse-next://episode/e2eLiveHlsA01`, confirm dialog, wait for
   `episode-detail-screen` as in step 2.
7. `tapOn` `id: home-row-play-e2eLiveHlsA01`; `extendedWaitUntil` visible
   `id: playback-now-playing-title-e2e` `text: "E2E Live HLS Audio Stream"` (`${TIMEOUT_SLOW}`).
8. `tapOn` `id: mini-player`; `extendedWaitUntil` visible `id: full-player-live-control`
   (`${TIMEOUT_SLOW}`). Then `assertVisible` `id: full-player-live-progress-block`, and
   `assertNotVisible` each of: `full-player-duration`, `full-player-position`,
   `full-player-scrubber`, `full-player-live-behind`, `full-player-jump-back`,
   `full-player-jump-forward`. `assertVisible` `id: full-player-play-pause`.
9. `takeScreenshot: livestream-player-live-only`.
10. Close the full player.

**Live, rewindable window (R15, R19, R24, R26, R17).**

11. `openLink: podverse-next://episode/e2eLiveHlsRw01`, confirm dialog, wait for
    `episode-detail-screen`.
12. `tapOn` `id: home-row-play-e2eLiveHlsRw01`; `extendedWaitUntil` visible
    `id: playback-now-playing-title-e2e` `text: "E2E Live HLS Rewind Stream"` (`${TIMEOUT_SLOW}`),
    then `extendedWaitUntil` visible `id: playback-active-e2e` `text: playing` (`${TIMEOUT_SLOW}`).
13. `tapOn` `id: mini-player`; `extendedWaitUntil` visible `id: full-player-live-control`
    (`${TIMEOUT_SLOW}`). `extendedWaitUntil` visible `id: full-player-scrubber` (`${TIMEOUT_SLOW}`;
    the window arrives with the first progress sample). `assertVisible` `id: full-player-jump-back`
    and `id: full-player-jump-forward`. `assertNotVisible` `id: full-player-duration` and
    `id: full-player-live-behind` (playback starts at the live edge).
14. `takeScreenshot: livestream-player-rewindable-at-live`.
15. R19: `tapOn` `id: full-player-jump-back` four times (each moves 10 s back; the first lands
    inside the 10-second live tolerance, the next three put the playhead about 40 s behind).
    `extendedWaitUntil` visible `id: full-player-live-behind` (`${TIMEOUT_FAST}`).
    `takeScreenshot: livestream-player-behind-live`.
16. R26: `tapOn` `id: full-player-play-pause`; `extendedWaitUntil` visible `id: playback-active-e2e`
    `text: paused` (`${TIMEOUT_FAST}`). `tapOn` `id: full-player-play-pause`; `extendedWaitUntil`
    visible `id: playback-active-e2e` `text: playing` (`${TIMEOUT_SLOW}`). `assertVisible`
    `id: full-player-live-behind`: the static window still holds the paused moment, so playback
    resumed there instead of jumping to live. `takeScreenshot: livestream-player-resumed-in-place`.
17. R17: `tapOn` `id: full-player-live-control`; `extendedWaitUntil` notVisible
    `id: full-player-live-behind` (`${TIMEOUT_SLOW}`); `assertVisible` `id: playback-active-e2e`
    `text: playing`. `takeScreenshot: livestream-player-back-at-live`.
18. Live plays from paused: `tapOn` `id: full-player-play-pause`; wait for `playback-active-e2e`
    `text: paused` (`${TIMEOUT_FAST}`). `tapOn` `id: full-player-live-control`; `extendedWaitUntil`
    visible `id: playback-active-e2e` `text: playing` (`${TIMEOUT_SLOW}`).
19. `tapOn` `id: full-player-play-pause` and wait for `playback-active-e2e` `text: paused`, so the
    seeded account's now-playing state is quiet for later flows. Close the full player.

Steps 15–17 must run without added waits: the fixture's live edge stays near 102 s while the
playhead moves at real time, so about 40 s behind becomes "at live" after roughly half a minute of
play. Do not add `waitForAnimationToEnd` or fixed sleeps between them.

## Change 2 — `scripts/mobile/e2e-test.sh`

Add `livestream-player-controls` to both the `flow_needs_e2e_api` and the
`flow_needs_test_assets` case lists (the HLS fixtures are served by the test-assets host, as for
`hls-playback`), in alphabetical position (after `library-playlists` / `library-downloads`
respectively, before the next entry). Keep plan 62's `playback-ended-livestream-restore` entry.
The `all` suite picks up every top-level YAML on its own.

## Change 3 — `.cursor/skills/mobile-test-economics/SKILL.md`

- In the "Area smoke versus area full" table, Playback row, add `livestream-player-controls` to
  the escalation list after the entry plan 62 added (`playback-ended-livestream-restore`). Keep the
  table's column padding as it is; do not run Prettier.
- Recount `apps/mobile/e2e/*.yaml` (top level, not `shared/`) after adding the flow, and update the
  "holds **N** top-level flows (`mobile:e2e:test:all` runs M; …)" sentence to the recounted
  numbers. `M` is N minus `tablet`, `perf-chip-switch`, and `perf-scroll`.

## Tests

The new Maestro flow is the test, on iOS and Android. No unit tests in this plan (plans 70 and 71
carry them).

## Release scratchpad

none
