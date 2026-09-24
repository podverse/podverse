# Execution order — iOS chip-tap and Episodes fling perf

> The Home chip-switch set is closed after thumbnails
> ([mobile-chip-switch-smooth](../../completed/mobile-chip-switch-smooth/00-CLOSED.md)).
> Same-frame list keeping is parked in
> [mobile-home-switch-followups](../mobile-home-switch-followups/00-EXECUTION-ORDER.md).
> Do not run 04-gated-fixes for the chip switch from this set.

## Order

1. [01-operator-baseline.md](./01-operator-baseline.md) — Home chip taps on real library (existing harness)
2. [02-harness-ios-gaps.md](./02-harness-ios-gaps.md) — Frame probe, Browse marks, images A/B, report flags
3. [03-operator-diagnose.md](./03-operator-diagnose.md) — Real-library diagnosis session (H1–H5)
4. [04-gated-fixes.md](./04-gated-fixes.md) — Fixes chosen by 03 findings
5. [05-seeded-ios-gates.md](./05-seeded-ios-gates.md) — Seed traits, Browse flow, iOS frame gates

## Why this order

- Baseline with the current harness before changing measurement code.
- Measurement gaps must land before the diagnosis session.
- Fixes and seeded gates depend on which hypotheses 03 accepts.
