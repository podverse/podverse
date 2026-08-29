# Podverse Mobile — master plan phases

The mobile master plan is split into **phases**. Each phase has its own plan document and its own
`details/` directory. Phase 1 is closed history; Phase 2 is where active work happens.

| Phase                                                   | Theme                                      | Driven by                | State      |
| ------------------------------------------------------- | ------------------------------------------ | ------------------------ | ---------- |
| [Phase 1](phase-1/001-MASTER-PLAN.md)                   | Framework build-out (Tracks 0–23)          | **Agent-led**            | **closed** |
| [Phase 2](phase-2/001-MASTER-PLAN-PHASE-2.md)           | Legacy-parity features + visual polish     | **Operator-guided**      | **active** |
| [Phase 3](phase-3/001-MASTER-PLAN-PHASE-3.md)           | V4V (LNURL boosts, Alby, boostagrams)      | Operator-guided          | not started |
| [Phase 4](phase-4/001-MASTER-PLAN-PHASE-4.md)           | Wear OS watch + Android TV                 | Operator-guided          | not started |
| [Phase 5](phase-5/001-MASTER-PLAN-PHASE-5.md)           | Native store IAP                           | Operator-guided          | not started |

## Phase 1 vs Phase 2 — the difference that matters

**Phase 1 was agent-led.** The operator asked for a parallel group, the agent detailed every step,
wrote COPY-PASTA prompts, and implemented them with minimal review in between. That was the right
trade for building scaffolding — navigation, playback engine, data layer, CI, E2E harness — where
correctness is mostly objective and web parity is documented in code.

**Phase 2 is operator-guided.** The remaining work is product and UX judgment: what the app should
*feel* like, which legacy behaviors to keep, which to drop, and what "done" looks like on a screen.
Agents no longer choose scope. The operator drives with **screenshots of the legacy app**
(`../podverse-rn`, the v4 mobile app) and the agent's job is to **ask questions first** and only then
propose a plan.

See [`.cursor/skills/mobile-legacy-screenshot-planning/SKILL.md`](/.cursor/skills/mobile-legacy-screenshot-planning/SKILL.md)
for the screenshot intake workflow, and
[`.cursor/skills/mobile-master-plan-phasing/SKILL.md`](/.cursor/skills/mobile-master-plan-phasing/SKILL.md)
for how phases are detailed and implemented.

## Directory layout

```text
docs/proposals/mobile/_master-plan_/
  PHASES.md                        # this file
  _draft-tracks/                   # Phase 1 assembly fragments (historical)
  phase-1/
    001-MASTER-PLAN.md             # closed; 376 done, 22 carried forward
    details/                       # 374 detail docs (historical)
  phase-2/
    001-MASTER-PLAN-PHASE-2.md     # active
    details/                       # grows as areas are detailed
  phase-3/ phase-4/ phase-5/       # plan stubs; details authored when the phase starts
```

Completed Phase 1 execution plan sets were removed after their outcomes were captured in the phase
plans. Phase 2 sets go to `.llm/plans/active/mobile-p2-<area>/` and are removed when the area closes.

## Detail ID bands

Phase 1 IDs (000–602) are frozen — do not reuse or renumber them. Phase 2 and later use their own
bands so IDs stay globally unique:

| Phase | Band      | Notes                                                       |
| ----- | --------- | ----------------------------------------------------------- |
| 1     | 000–602   | Frozen. 595–599 moved to `phase-2/details/` (still 5xx IDs) |
| 2     | 700–899   | Legacy-parity areas + operational backlog                   |
| 3     | 900–929   | V4V                                                         |
| 4     | 930–969   | Watch + TV                                                  |
| 5     | 970–999   | IAP                                                         |

Before assigning a new ID, grep the target phase's `details/` and Appendix C for collisions.
