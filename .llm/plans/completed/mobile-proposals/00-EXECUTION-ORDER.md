# Execution order — mobile proposals

Phases are **sequential** unless noted. Do not start the next phase until the previous phase is
complete.

## Phase 1 — Track A: Monorepo + LLM setup (sequential)

Run in order; each doc builds on the prior assessment.

1. [01-monorepo-current-state.md](01-monorepo-current-state.md) — current repo readiness
2. [02-monorepo-target-structure.md](02-monorepo-target-structure.md) — target layout + structural changes
3. [03-llm-cursor-setup.md](03-llm-cursor-setup.md) — Cursor rules, skills, indexing

**Wait for all three to finish** before Phase 2.

## Phase 2 — Track B: App development process

1. **First (blocking):** [04-process-overview-architecture.md](04-process-overview-architecture.md)
   — overview and screen map; other Track B docs reference it.

2. **Parallel (3 agents):** After 04 completes, run these simultaneously:

   - [05-process-shared-vs-divergent.md](05-process-shared-vs-divergent.md)
   - [06-process-playback-queue-parity.md](06-process-playback-queue-parity.md)
   - [07-process-mobile-only-features.md](07-process-mobile-only-features.md)

   **Wait for all three to finish** before step 3.

3. **Last:** [08-process-roadmap-milestones.md](08-process-roadmap-milestones.md) — roadmap
   synthesizes 04–07.

## After all phases

Operator: verify output files (see [00-OVERVIEW.md](00-OVERVIEW.md)), then archive plan set to
`.llm/plans/completed/mobile-proposals/` when satisfied.

No npm/make verification — documentation only.
