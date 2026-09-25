---
name: mobile-test-economics
description: Choose the cheapest verification tier that can hold a mobile claim. Use when deciding whether a change needs a unit test, a repository test, one Maestro flow, both platforms, or the full suite.
---

# Mobile test economics

The default has been "run it on a device." Most claims do not belong there. Each rung below is
roughly an order of magnitude more expensive than the one above it, so a claim belongs on the
**highest** rung that can hold it.

## The ladder, cheapest first

| Rung                                              | Cost                    | What it should own                                                             |
| ------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------ |
| Pure function + Vitest                            | milliseconds, no device | Arithmetic, policy, planners, mappers, invariants                              |
| Repository test with a fake or in-memory database | seconds                 | Persistence shape, ordering, dedupe, outbox rules                              |
| One Maestro flow, one platform                    | minutes                 | That the wiring exists: navigation, boot, gating, reachability                 |
| Both platforms                                    | double                  | Anything platform-specific: native modules, accessibility trees, back behavior |
| Full suite (43 flows × 2)                         | an evening              | Pre-release regression only                                                    |

## The extraction move

When a device flow is the only thing proving a calculation, extract the calculation and test it
directly; leave the flow proving only that the screen calls it. This is the single biggest saver.

Examples already in the tree: the full player's peek and condense math (`fullPlayerLayout`), the
reconcile planner's conflict and adoption branches, primary-queue selection by medium, and the
outbox's one-now-playing-per-queue invariant. All of those are pure and covered in milliseconds.
Debugging any of them on a simulator is paying minutes for what costs nothing.

## What a device flow is uniquely for

A Maestro flow should prove things only a device can see:

- a screen mounts and is reachable
- a deep link lands
- a native module answers
- an element is in the accessibility tree
- a real media file plays

Layout arithmetic, copy, and policy are not in that list. Put those on a cheaper rung.

## Area smoke versus area full

`apps/mobile/e2e/` holds **43** top-level flows (42 on the phone matrix; `tablet` is opt-in and
excluded from `mobile:e2e:test:all`). Running them all to learn whether one change broke something
is the most expensive possible way to find out.

Group by area. Run the area you touched **in full**, one platform first, plus the **smoke** of any
area your change can reach. Both platforms only when the change is platform-specific, or the first
run passed and you need the second as proof.

| Area                | Smoke              | The rest of the area                                                                                                                                                                                                       |
| ------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Boot and shell      | `hello-world`      | `api-health`, `deep-link`, `locale-switch-home-smoke`, `popularity-tracking` (`tablet` is opt-in only)                                                                                                                     |
| Auth and membership | `auth-login`       | `auth-logout`, `membership-gate`                                                                                                                                                                                           |
| Discovery           | `home`             | `browse`, `search`, `search-unparsed`, `podcast-episode`, `artist`, `album`, `add-by-rss`, `subscriptions-anonymous`, `detail-sort-prefs`                                                                                  |
| Library and queue   | `queue-screen`     | `queue-add`, `library-playlists`, `library-downloads`                                                                                                                                                                      |
| Playback            | `play-mini-player` | `player-screen`, `track`, `playback-resume-on-relaunch`, `playback-multi-device-handoff`, `auto-queue-advance`, `video-transition`, `make-clip`, `alternate-enclosure`, `engine-audio-spike`, `tab-switch-playback`, `v4v` |
| Sync and offline    | `offline-mode`     | `playback-offline-reconciliation`, `error-log`, `opml`                                                                                                                                                                      |
| Settings and more   | `settings-select`  | `settings-downloads`, `notifications-inbox`, `push`                                                                                                                                                                        |

Recount the YAML under `apps/mobile/e2e/*.yaml` (not `shared/`) before treating this table as
complete — a new flow belongs in the area it actually exercises.

## Stop rules

A dead end should cost one hypothesis, not an evening.

- **Two failed hypotheses on the same assertion is the limit.** Write the deferred problem with the
  evidence already in context and move on; do not keep the loop alive hoping.
- **Re-run a flow to test flakiness once.** A third run is not new evidence.
- **A green run does not need a confirming run** unless you just tightened a timeout.
- **If the stack is the suspect, triage in this order:** is Metro serving, is the E2E API healthy,
  is test-assets up, is the device booted, and only then rebuild. Rebuilding the dev client first
  costs several cycles that a health check ends in seconds.

## Budget routing

The expensive combination is a high-reasoning model held open across device iteration. Spend the
strong model once on diagnosis and on deciding what the product should do, then hand mechanical
edits, reruns, and report reading to a fast model.

An agent that has been looping on a device for many turns should stop and hand back rather than
continue.

## Related

- **abce2efulltestdebug** / **abce2etestdebug** — how to debug a flow once you have decided a
  device run is the right rung
- **mobile-e2e-screenshots** — how to run the flow and read the report
- **mobile-maestro-timeouts** — measure a wait before raising it
- **unit-test-priority-confident** — device-only logic ranks first for extraction
