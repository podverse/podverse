# PG-3 — Track 4 CI/CD + Track 5 mobile E2E

**Parallel group:** PG-3 (Tracks 4 and 5)
**Master plan:** [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
**Steps:** 4.1–4.25, 5.1–5.13
**Detail IDs:** 150–174, 060–072

## Goal

Stand up a **store-safe** mobile release track (separate `.next` app id, workflows isolated from
server publish) and a **Maestro** E2E + screenshot harness with Make targets and a non-blocking CI
stub.

## Open decisions locked this phase

| Decision      | Choice                         | Rationale                                      |
| ------------- | ------------------------------ | ---------------------------------------------- |
| CI tooling    | **EAS Build + EAS Submit**     | Expo already in use; EAS Update (4.19) aligns  |
| E2E framework | **Maestro**                    | Master-plan default; YAML flows, lower wiring  |

Fastlane and Detox are **not** implemented in PG-3 (escape hatches only if revisited later).

## Outputs

- `.github/workflows/mobile-*.yml` (internal / staging-beta / production-submit)
- `apps/mobile/eas.json` profiles: `internal`, `beta`, `production`
- `docs/operations/mobile/MOBILE-RELEASE-RUNBOOK.md` (+ related ops docs)
- `apps/mobile/e2e/` Maestro flows + Makefile `mobile_e2e_*` targets
- abcmemory / skill updates for mobile E2E screenshots

## Prerequisites

- Track 3 hello-world `done` (bundle id `com.podverse.app.next`)
- PG-2b engine spike **GO** (not required for CI/E2E scaffolding, but recommended)

## Out of scope

- Submitting to production Podverse listings / convergence execution (gate criteria only in 4.25)
- Full feature E2E beyond hello-world
- Fastlane lanes, Detox setup
- Player/car Tracks 10–12

## After this phase

Operator can run `make mobile_e2e_test_report_spec SPEC=hello-world` and continue PG-4 (auth/nav)
or PG-5 (engine video) per phasing skill.
