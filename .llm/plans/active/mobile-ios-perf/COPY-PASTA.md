# COPY-PASTA — iOS chip-tap and Episodes fling perf

Paste one prompt at a time. Operator gesture steps stay above the fence; stop the turn after `--arm` when the prompt says so.

## Checklist

- [ ] **01 — Operator baseline (existing harness)**

**Cursor model:** Codex 5.3
**Reasoning:** medium

Operator first: **Mobile Metro** running `npm run mobile:dev:perf`, only `"iPhone 17 Pro"` booted, real library loaded. Reload the app between the three captures.

```
Read and execute .llm/plans/active/mobile-ios-perf/01-operator-baseline.md

Arm with --manual --arm --device ios, stop this turn, wait for the operator to finish the gesture and reply, then --collect. Repeat for three captures. Record numbers in docs/development/mobile/MOBILE-PERF-BASELINES.md.

Do not run tests during agent work; leave operator verification commands at the end.
```

- [ ] **02 — Fill iOS measurement gaps**

**Cursor model:** Codex 5.3
**Reasoning:** high

```
Read and execute .llm/plans/active/mobile-ios-perf/02-harness-ios-gaps.md

Implement the native frame probe, JS frame sampler, chip pressin and Browse marks, CoverImage image.load and NO_IMAGES switch, row-cost counters, and perf-report --gesture/--profile with unit tests.

Do not run tests during agent work; leave operator verification commands at the end.
```

- [ ] **03 — Operator diagnosis session**

**Cursor model:** Codex 5.3
**Reasoning:** medium

Operator first: rebuild after 02 if the native module is new (`npm run mobile:ios -- --device "iPhone 17 Pro"`), then **Mobile Metro** with `mobile:dev:perf` (and later `mobile:dev:perf:noimages`).

```
Read and execute .llm/plans/active/mobile-ios-perf/03-operator-diagnose.md

For each variant: arm, stop this turn for the named gesture, collect on reply. Accept or reject H1–H5 in MOBILE-PERF-BASELINES.md with numbers.

Do not run tests during agent work; leave operator verification commands at the end.
```

- [ ] **04 — Gated fixes**

**Cursor model:** Codex 5.3
**Reasoning:** high

```
Read and execute .llm/plans/active/mobile-ios-perf/04-gated-fixes.md

Implement only the fixes chosen by the 03 findings table. Each change states a prediction and a gate; revert any that miss (mobile-perf-measured-claims).

Do not run tests during agent work; leave operator verification commands at the end.
```

- [ ] **05 — Seeded iOS regression gates**

**Cursor model:** Codex 5.3
**Reasoning:** medium

```
Read and execute .llm/plans/active/mobile-ios-perf/05-seeded-ios-gates.md

Update the seed to reproduce 03 traits, add perf-browse-chip-switch.yaml, wire iOS frame gates in perf-report, update MOBILE-PERF-BASELINES.md and MOBILE-CHIP-TAP.md.

Do not run tests during agent work; leave operator verification commands at the end.
```
