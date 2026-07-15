# Mobile E2E API + DB harness

**Master plan:** [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
**Steps:** 5.17–5.20
**Detail IDs:** 076–079
**Status:** planned (not implemented)

## Goal

Give Maestro API-backed flows the same kind of deterministic stack web E2E already has:
Postgres/Valkey via `make test_deps`, seed data, and a dedicated long-lived API — without reusing
Playwright ports or forcing UI-only smokes through DB setup.

## Locked decisions

| Item | Decision |
| ---- | -------- |
| API profile / port | `apiMobileE2e` @ **4230** |
| DB / Valkey | Share `make test_deps` (5732 / 6679) |
| Seed | Reuse `make e2e_seed_web` / `tools/web/seed-e2e.mjs` |
| Default `mobile:e2e:test` | Stays UI-only (no auto deps) |
| Login/logout Maestro | **Blocked** until this set is `done` (6.11 / 6.12) |

## Outputs

- `apiMobileE2e` in `packages/helpers-config`
- Make `mobile_e2e_deps` / `mobile_e2e_seed` (+ API lifecycle scripts/npm)
- Expo/public API base URL wiring for iOS `localhost` + Android `10.0.2.2`
- TEST-ENV / HOW-TO-RUN / APPS-MOBILE / mobile-e2e-screenshots updates
- Minimal API-health Maestro smoke (not auth login)

## Out of scope

- Playwright process ownership for mobile
- Full auth login/logout Maestro (Track 6.11 / 6.12)
- Management-api / management seed for mobile
- Gating hello-world / locale smoke on `test_deps`
