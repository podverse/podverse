# Execution order — PG-5 video gap remediation

Two independent plans. **Plan 01 is the priority** (feature is likely visually broken in the full
player); Plan 02 is a process/CI hardening that can run in parallel.

## Phase 1 (priority, sequential within itself)

- **01-video-surface-reparent.md** — Opus 4.8. Native + RN. Must be verified on a real device /
  simulator+emulator because the failure mode (modal occlusion) is invisible to Maestro.

## Phase 2 (parallel with Phase 1)

- **02-mobile-unit-test-ci-gate.md** — Codex 5.3. Docs + CI wiring only; no native code.

## Notes

- Do not run tests during implementation; end each plan with the operator verify block.
- These plans are remediation for already-`done` master steps 2.20/2.28/2.32/2.33 — do **not** flip
  master-plan statuses back; if a fix materially changes behavior, add a short addendum note to the
  relevant detail doc (099 for surface reparent) rather than rewriting history.
