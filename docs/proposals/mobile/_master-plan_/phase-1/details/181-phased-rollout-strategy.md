# 181-phased-rollout-strategy

**Master step:** 22.7
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Define a **phased rollout** strategy using store percentage-rollout controls (Play staged rollout /
App Store phased release) to limit blast radius of a bad build.

## Strategy

- Start production at a small percentage (e.g. Play staged rollout 5–10%), monitor (184), then ramp.
- Halt/roll forward based on crash-free rate and API error rates; you **cannot un-ship**, only submit
  a fixed build (see rollback 182).
- App Store phased release (7-day ramp) for iOS; pause if regressions appear.
- Only begins after the **publish hold** is lifted (operator polish complete) and beta sign-off.

## Acceptance criteria

- Rollout uses staged/phased controls with explicit monitor-and-ramp gates.
- References monitoring (184) and rollback (182).

## Verification

- Doc-only; operator drives store rollout controls.
