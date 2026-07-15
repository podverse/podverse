---
name: mobile-maestro-timeouts
description: Prefer fastest Maestro wait timeouts via shared TIMEOUT_* ladder; use when writing or editing apps/mobile/e2e YAML flows.
---

# Mobile Maestro timeout ladder

Keep Maestro waits short. Fail fast; bump only when a run proves a tier is too aggressive.

## Optimize for fast failure (operator time is precious)

A failing flow that waits the full timeout on a doomed assertion wastes operator time on every
run. Minimize wall-clock-to-failure:

1. **Tightest justifiable timeout.** Pick the fastest ladder tier the happy path can hit. A
   network login that normally lands in ~1-2s should assert with `TIMEOUT_SLOW` (8s), not
   `TIMEOUT_SLOWEST`. When it fails, you eat 8s, not 20s+.
2. **Don't stack redundant waits.** One `extendedWaitUntil` on the decisive `testID` per phase.
   Avoid asserting several intermediate elements that each carry their own timeout.
3. **Prefer one decisive post-condition.** Assert the element that only exists on success (e.g.
   `tab-home` after login). If it never appears, the single wait fails once instead of many.
4. **Keep flows lean.** The dominant cost of a failing API-backed flow is usually app cold-launch +
   Metro connect, not the assertion. Share `launchApp` / connect steps via `e2e/shared/` and don't
   relaunch mid-flow unless the test requires it.

## Canonical values (`apps/mobile/e2e/shared/timeouts.env`)

| Name              | ms    | Typical use                                                 |
| ----------------- | ----- | ----------------------------------------------------------- |
| `TIMEOUT_FASTEST` | 2000  | Immediate UI swap already on-screen                         |
| `TIMEOUT_FASTER`  | 3000  | Quick local navigation                                      |
| `TIMEOUT_FAST`    | 5000  | Default after connect / most asserts (`connect-dev-client`) |
| `TIMEOUT_SLOW`    | 8000  | Network-backed login / first authenticated shell            |
| `TIMEOUT_SLOWER`  | 12000 | Health polls / slower API readiness                         |
| `TIMEOUT_SLOWEST` | 20000 | Last resort only                                            |

`scripts/mobile/e2e-test.sh` sources that env file and passes `-e TIMEOUT_*=…` into Maestro.

In YAML use `${TIMEOUT_FAST}` (etc.), **never** invent ad-hoc `15000` / `60000` literals.

## Rules

1. **Default to the fastest tier** that might succeed. Prefer `TIMEOUT_FAST` over `TIMEOUT_SLOW`.
2. **Only raise** after a real timeout flake (screenshot shows the expected UI arrived late).
3. Raise **one step** at a time (fast → slow → slower → slowest).
4. Share login / connect flows under `e2e/shared/` so timeouts stay consistent.
5. Do **not** use long sleeps (`waitForAnimationToEnd` without need). Prefer `extendedWaitUntil` on a `testID`.

## API-backed flows

`auth-login`, `auth-logout`, `tab-switch-playback`, `api-health` need **Mobile E2E API**
(`npm run mobile:e2e:api` on `:4230`) **leave-running**. Restarting Metro/`mobile:dev:e2e` does
**not** require restarting the API if it is already healthy. `e2e-test.sh` exits early if `:4230`
is down for those flow names.
