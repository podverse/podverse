# Execution order — mobile master plan authoring

Phases are **sequential** unless noted. Do not start the next phase until the prior phase completes.

## Recommended Cursor model per phase

| Phase | Prompts | Model | Why |
| ----- | ------- | ----- | --- |
| A | 1 | **Auto** | Transcribe pre-defined step tables to draft markdown |
| B | 2–10 | **Auto** | Same; parallel agents, no invention |
| C | 11 | **Opus 4.8** | Stitch, verify dependencies, parallel groups, completeness |

After `001-MASTER-PLAN.md` exists, use each step's **Model** field when authoring detail plans and
implementing work (see [00-SUMMARY.md](00-SUMMARY.md) § LLM model recommendations).

## Phase A — Foundation conventions (sequential, 1 agent)

Establishes numbering, placeholder links, Track 0/1/3/5 content, and **Model** per step before
parallel work.

1. [01-authoring-foundation-and-tooling.md](01-authoring-foundation-and-tooling.md) — **Auto**

**Output:** Append Tracks 0, 1, 3, 5 sections to a working draft at
`docs/proposals/mobile/_master-plan/_draft-tracks/` (or partial files per track — see authoring
file). If draft dir does not exist, create it during this phase.

**Wait for completion** before Phase B.

## Phase B — Parallel Track authoring (9 agents simultaneously)

After Phase A, run **all nine** authoring files in parallel. Each agent writes disjoint Track
numbers; no file conflicts if each agent writes only its assigned draft file:

| Agent | File | Tracks | Draft output | Model |
| ----- | ---- | ------ | -------------- | ----- |
| B1 | [02-authoring-native-media-engine.md](02-authoring-native-media-engine.md) | 2 | `_draft-tracks/track-02.md` | Auto |
| B2 | [03-authoring-cicd-release-store-safety.md](03-authoring-cicd-release-store-safety.md) | 4, 22 | `_draft-tracks/track-04-22.md` | Auto |
| B3 | [04-authoring-app-shell-nav-home.md](04-authoring-app-shell-nav-home.md) | 6, 7, 8 | `_draft-tracks/track-06-08.md` | Auto |
| B4 | [05-authoring-browse-content-screens.md](05-authoring-browse-content-screens.md) | 9 | `_draft-tracks/track-09.md` | Auto |
| B5 | [06-authoring-playback-queue-parity.md](06-authoring-playback-queue-parity.md) | 10, 11 | `_draft-tracks/track-10-11.md` | Auto |
| B6 | [07-authoring-car-layer.md](07-authoring-car-layer.md) | 12 | `_draft-tracks/track-12.md` | Auto |
| B7 | [08-authoring-mobile-only-features.md](08-authoring-mobile-only-features.md) | 13–17 | `_draft-tracks/track-13-17.md` | Auto |
| B8 | [09-authoring-multi-device-targets.md](09-authoring-multi-device-targets.md) | 18 | `_draft-tracks/track-18.md` | Auto |
| B9 | [10-authoring-membership-fdroid-deferrals.md](10-authoring-membership-fdroid-deferrals.md) | 19–21 | `_draft-tracks/track-19-21.md` | Auto |

Phase A agent also produces `_draft-tracks/track-00-01-03-05.md`.

**Wait for all nine Phase B agents to finish** before Phase C.

## Phase C — Assemble and finalize (sequential, 1 agent)

1. [11-authoring-assemble-and-finalize.md](11-authoring-assemble-and-finalize.md) — **Opus 4.8**

Stitches all draft Track files into `docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md`, adds
parallel-group annotations, dependency notes, open decisions, **Model** on every step, and verifies
every step has a placeholder detail link.

## After all phases

Operator: verify output (see [00-SUMMARY.md](00-SUMMARY.md)), optionally remove
`_draft-tracks/` after assembly, then archive plan set to
`.llm/plans/completed/mobile-master-plan/`.

No npm/make verification — documentation only.

## Parallel-group reference (for Phase C assembly)

These cross-Track groups may run in parallel **during implementation** (not during authoring):

| Group | Tracks | Prerequisite |
| ----- | ------ | ------------ |
| P0 | 0 | none |
| P1 | 1 | 0 (partial) |
| P2a | 2 (spike), 3 | 0, 1 recommended |
| P2b | 4, 5 | 3 |
| P3a | 6, 7 | 3, 5 |
| P3b | 2 (full engine) | 2 spike |
| P4 | 8, 9 | 6, 7 |
| P5 | 10, 11 | 1, 2, 6 |
| P6 | 12 | 2, 10 |
| P7 | 13, 14, 15, 16, 17 | 6, 10 (varies per feature) |
| P8 | 18 | 7, 11 |
| P9 | 19, 20, 21, 22 | MVP feature-complete |

Authoring agents do not need to implement these groups — Phase C documents them in the master plan.
