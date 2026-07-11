---
name: mobile-worktree-scope
description: Scope parallel Cursor sessions per mobile master-plan Track using git-worktree-sibling — which tracks can run concurrently vs must stay sequential (native vs RN UI).
---

# Mobile worktree scope (parallel Tracks)

Use when the operator runs **multiple Cursor sessions** on mobile work, or when an agent should
recommend isolating native vs JS work in separate checkouts.

## Worktree mechanics

Follow **git-worktree-sibling** for directory naming and setup:

- Primary checkout stays on `develop` at `podverse`
- Feature worktrees: `podverse_<branch_slug>` as siblings under `repos/pv/`
- Run `make local_env_worktree_setup` and `npm install` in new worktrees

Scope each session to **one Track or PG group** plus the shared packages that Track needs.

## Parallel groups (from master plan)

| Group | Tracks  | Safe to parallelize   | Prerequisites        |
| ----- | ------- | --------------------- | -------------------- |
| PG-0  | 0       | —                     | none                 |
| PG-1  | 1       | Track 3 (after 0.6+)  | Track 0 partial      |
| PG-2a | 3       | Tracks 4, 5           | Track 0              |
| PG-2b | 2 spike | Tracks 3, 4, 5        | 0, 1 recommended     |
| PG-3  | 4, 5    | **each other**        | Track 3 hello-world  |
| PG-4  | 6, 7    | **each other**        | 3, 5                 |
| PG-5  | 2 full  | Tracks 8, 9           | 2 spike, 1           |
| PG-6  | 8, 9    | **each other**        | 6, 7                 |
| PG-7  | 10, 11  | **each other**        | 1, 2, 6              |
| PG-8  | 12      | 13, 14, 15            | 2, 10                |
| PG-9  | 13–17   | mostly **each other** | 6, 10 varies         |
| PG-10 | 18      | 19, 20                | 7, 11                |
| PG-11 | 19–21   | **each other**        | MVP feature-complete |

Re-read Appendix C in [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
before recommending; completed steps may unlock groups early.

## Native vs RN UI isolation

Use **separate worktrees** when edits would conflict or require different toolchains:

| Work kind                        | Typical paths                              | Parallel with                          |
| -------------------------------- | ------------------------------------------ | -------------------------------------- |
| RN screens, hooks, navigation    | `apps/mobile/src/**`                       | Other RN UI tracks                     |
| Native media engine / car module | `apps/mobile/ios/`, `android/`, `modules/` | RN UI **if** bridge API stable         |
| CarPlay / Android Auto native    | `ios/`, `android/`, `modules/`             | RN UI via cache contract               |
| Maestro/Detox specs              | `apps/mobile/e2e/**`                       | Feature Track authoring (5.13)         |
| `packages/playback-core`         | `packages/playback-core/**`                | Track 1; mobile consumes after publish |

**Do not** mix web (`apps/web`) and mobile (`apps/mobile`) in one agent session — different
toolchains and import tiers.

## Session scoping prompts

```text
Work only in apps/mobile/src/ and packages/playback-core. Mirror web queue behavior from
apps/web/src/contexts/AutoQueue.tsx. Do not import @podverse/ui.
```

```text
Work only in apps/mobile/modules/ and apps/mobile/ios/. Implement the native car cache read path.
Do not change RN navigation.
```

## Related

- **mobile-master-plan-phasing** — PG workflow and COPY-PASTA execution
- **git-worktree-sibling** — create and name worktrees
- Master plan steps 5.13, 12.21 (parallel worktree guidance)
