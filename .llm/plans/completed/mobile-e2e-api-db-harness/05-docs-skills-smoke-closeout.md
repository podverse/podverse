# Plan 05 — docs, skills, API-health smoke, archive

Read and finish detail
[079-e2e-expo-api-url](/docs/proposals/mobile/_master-plan_/details/079-e2e-expo-api-url.md).

## Work

1. Update operator docs:
   - [`apps/mobile/e2e/TEST-ENV.md`](/apps/mobile/e2e/TEST-ENV.md)
   - [`apps/mobile/e2e/HOW-TO-RUN.md`](/apps/mobile/e2e/HOW-TO-RUN.md)
   - [`apps/mobile/APPS-MOBILE.md`](/apps/mobile/APPS-MOBILE.md) (Testing § pointer)
2. Update [`.cursor/skills/mobile-e2e-screenshots/SKILL.md`](/.cursor/skills/mobile-e2e-screenshots/SKILL.md):
   for API-backed areas, instruct operators to run `make mobile_e2e_deps`, `make mobile_e2e_seed`,
   and the mobile E2E API start before Maestro; keep UI-only path unchanged.
3. Add a **minimal** Maestro smoke under `apps/mobile/e2e/` (e.g. `api-health.yaml`) that asserts
   something reachable only with API up — **not** login/logout. If the app still lacks a network UI
   surface, prefer a documented diagnostics `testID` added in plan 04, or a flow that fails clearly
   when API/base URL is misconfigured.
4. Confirm details **210** / **211** still state blocked until 5.17–5.20 `done` (already authored).
5. Mark master steps **5.17–5.20** and Appendix C **076–079** → `done` (reconcile any leftover
   `planned`); set detail headers to `done`.
6. Mark all COPY-PASTA prompts `[x]`; move
   `.llm/plans/active/mobile-e2e-api-db-harness/` →
   `.llm/plans/completed/mobile-e2e-api-db-harness/` per **plan-completion**.

## Do not

- Implement 6.11 login or 6.12 logout Maestro in this prompt.

## Done when

```bash
rg -n 'mobile_e2e_deps|4230|api-health|API-backed' apps/mobile/e2e/ .cursor/skills/mobile-e2e-screenshots/SKILL.md
test ! -d .llm/plans/active/mobile-e2e-api-db-harness
test -d .llm/plans/completed/mobile-e2e-api-db-harness
```

## Operator verification (end of set — cumulative)

Do **not** paste leave-running Metro/API into one shell with Maestro. Follow
[HOW-TO-RUN.md](/apps/mobile/e2e/HOW-TO-RUN.md) (five terminals for API-backed).

```bash
# One-shot prep
make mobile_e2e_deps
make mobile_e2e_seed

# Separate terminals (leave running):
#   npm run mobile:dev:e2e
#   npm run mobile:e2e:api
# Separate terminals (exit when done):
#   npm run mobile:e2e:ios
#   npm run mobile:e2e:android

# After Metro + installs + API are up:
npm run mobile:e2e:test -- hello-world
npm run mobile:e2e:test -- api-health
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
