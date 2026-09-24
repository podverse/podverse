# 05 — Seeded iOS regression gates

**Cursor model:** Codex 5.3
**Reasoning:** medium

## Goal

Make seeded iOS runs show the same problem class 03 found, then gate chip and fling numbers so a regression fails the report.

## Deliverables

1. Seed changes for traits 03 named (large artwork and/or row volume) — only what is needed.
2. `apps/mobile/e2e/perf-browse-chip-switch.yaml`.
3. `perf-report --device ios` reports frames for `perf-scroll` (native probe) and fails when over the gate in baselines.
4. Confirm targets with 03 data (proposed defaults: chip press→selected ≤100 ms; chip total p95 ≤300 ms iOS; Episodes fling UI frames over 33 ms ≤5%).
5. Update `MOBILE-PERF-BASELINES.md` and `MOBILE-CHIP-TAP.md`; remove "iOS has no frame timing" from known-bad once the probe ships.
