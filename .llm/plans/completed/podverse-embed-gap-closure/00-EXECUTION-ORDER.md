# Podverse Embed gap closure — execution order

## Prerequisites

- Original plan set complete under `.llm/plans/completed/podverse-embed/`.
- Read [`00-SUMMARY.md`](./00-SUMMARY.md) for gap inventory and out-of-scope items.

## Phase table

| # | Phase | Outcome |
| --- | --- | --- |
| 1 | Playback guardrail hardening | All three guardrail flags enforced at shared playback/layout entry points |
| 2 | E2E matrix and fixtures | Seed + specs cover Phase 5 matrix gaps (scroll, heights, invalid IDs, visibility) |
| 3 | Share builder E2E and cleanup | Builder handoff tests for remaining entity contexts; remove dead placeholder component |

## Dependency notes

- Phase 1 is independent; can run first.
- Phase 2 seed changes must land before extending E2E specs in the same phase.
- Phase 3 is independent of Phase 2 but should run after operator has run Phase 2 seed if both run in one session.

## File order

1. [`01-playback-guardrail-hardening.md`](./01-playback-guardrail-hardening.md) (completed)
2. [`02-e2e-matrix-and-fixtures.md`](./02-e2e-matrix-and-fixtures.md) (completed)
3. [`03-share-builder-e2e-and-cleanup.md`](./03-share-builder-e2e-and-cleanup.md) (completed)

Use [`COPY-PASTA.md`](./COPY-PASTA.md) for execution prompts.
