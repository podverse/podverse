# 01 — Operator baseline (existing harness)

**Cursor model:** Codex 5.3
**Reasoning:** medium

## Goal

Three Home chip-tap captures on the operator's real library on `"iPhone 17 Pro"`, using the harness as it stands today (no code changes). Record the first post-urgent-clear iOS numbers on real data in [MOBILE-PERF-BASELINES.md](../../../../docs/development/mobile/MOBILE-PERF-BASELINES.md).

## Preconditions

- Exactly one iOS simulator booted: `"iPhone 17 Pro"`.
- App loaded against the local Dev API with the operator's real subscriptions.
- **Mobile Metro:** `npm run mobile:dev:perf` (`EXPO_PUBLIC_MOBILE_PERF=1`).
- Reload the app between captures (arm does not clear the timeline).

## Gesture

From Home, tap Podcasts → Episodes → Artists → Episodes → Podcasts as fast as possible, then wait three seconds.

## Agent loop (three times)

1. **Mobile:** `node scripts/mobile/perf-report.mjs --manual --arm --device ios`
2. Stop this turn. Wait for the operator to finish the gesture and reply.
3. **Mobile:** `node scripts/mobile/perf-report.mjs --manual --collect --device ios`
4. Ask the operator to reload the app before the next arm.

## Record

Append a dated table under Home chip switch for "Manual iOS post-urgent-clear, real library, 3 runs" with prefsGate / read / paint / total p95 medians and largest stage. Note commit / dirty tree.
