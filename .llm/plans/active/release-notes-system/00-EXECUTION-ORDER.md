# Release notes system — execution order

Phases run in sequence. Wait for every prompt in a phase to finish before starting the next.

## Phase 1 — podverse foundation (sequential)

1. **01 — Format and tone spec.** Everything else reads this contract.
2. **02 — Scripts and Make.** The hooks, CI, and publish gate all call `check.mjs`.
3. **03 — Agent rules and hooks.** Needs the scripts from 02.

## Phase 2 — podverse integration (parallel, 2 agents)

- **04 — CI and publish integration.** Owns `.github/workflows/*`, `scripts/publish/*`,
  `scripts/mobile/eas-android.sh`, `scripts/publish/README.md`.
- **05 — Seed podverse current version.** Owns `apps/*/release-notes/*` only.

The two touch no file in common. 05 must not edit scripts; if a script bug blocks it, stop and
report instead of fixing it.

## Phase 3 — sibling repos (parallel, 2 agents)

- **06 — metaboost rollout.** Works only in `../metaboost`.
- **07 — partytime and podverse-mcp rollout.** Works only in `../partytime` and `../podverse-mcp`.

Both copy from the podverse implementation and must not edit podverse.

## Final step

The last prompt to finish archives the plan set and lists every operator command from the whole
set, in run order: unit tests for the scripts, check runs per repo, hook smoke tests, and the
one-time operator steps (hook install, first stamp and freeze dry runs).

## Estimated time

- Sequential: about 4–5 hours of agent work.
- With the two parallel phases: about 3 hours.
