# 04 — Maestro tablet screenshots (18.5)

**Detail doc:** [514-e2e-tablet-screenshots](/docs/proposals/mobile/_master-plan_/phase-1/details/514-e2e-tablet-screenshots.md)
**Model:** Codex 5.3
**Requires:** plans 02–03 (responsive layouts to screenshot).

## Tasks

1. Add a focused Maestro flow under `apps/mobile/e2e/` (e.g. `e2e/tablet.yaml` / `tablet` area):
   - Launch, assert `home-screen`, screenshot `tablet-home`.
   - Open a seeded podcast, assert `podcast-detail-split`, screenshot `tablet-podcast-detail`.
   - Follow **mobile-maestro-timeouts** for waits; assert a real element before each screenshot
     (**e2e-screenshot-verified-element**).
2. Provision a **tablet target** as **opt-in** in `scripts/mobile/ensure-devices.sh` and the E2E run
   scripts — iOS iPad simulator + an Android tablet AVD — gated by an env flag / area so the default
   phone matrix is unchanged. Reuse the report-slot pattern from **mobile-e2e-screenshots** (add
   `ios-tablet` / `android-tablet` slots).
3. Document the tablet run in [HOW-TO-RUN.md](/apps/mobile/e2e/HOW-TO-RUN.md).

## Acceptance

- `npm run mobile:e2e:test -- tablet` yields `tablet-home` + `tablet-podcast-detail` in the report
  slot; default phone matrix unaffected.
- Screenshots show multi-column Home and the two-pane podcast detail.

## Do not

- Do not add the tablet target to the default PR E2E gate.
- Do not run tests during agent work (operator verifies at end).

## Phase completion

This is the **last** plan in the set. When done, archive
`.llm/plans/active/mobile-pg10-tablet/` → `.llm/plans/completed/phase-1/mobile-pg10-tablet/` per
**plan-completion**, and confirm all six steps are `done` in the master plan Tracks + Appendix C.
