# Mobile PG-3 / E2E device verification checklist

Use this checklist to confirm PG-3 artifacts plus dual-device E2E automation (steps 5.14–5.16).

## 1) Confirm master-plan completion status

```bash
rg -n '^5\.(14|15|16)\..*— done$' docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md
rg -n '\| (073|074|075)-[^|]*\|[^|]*\|[^|]*\|[^|]*\| done' docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md
```

## 2) Device matrix + helpers

```bash
bash scripts/mobile/ensure-devices.sh print-matrix
test -x scripts/mobile/ensure-devices.sh
test -f scripts/mobile/e2e-html-report.mjs
rg -n 'iPhone 17 Pro E2E|Pixel_6_Pro_API_33_e2e|MANUAL_IOS' scripts/mobile/run-expo-macos.sh .cursor/rules/mobile-ios-simulator.mdc
```

## 3) Required mobile Track 4/5 artifacts

```bash
test -f apps/mobile/eas.json
test -f apps/mobile/e2e/hello-world.yaml
test -f apps/mobile/e2e/TEST-ENV.md
test -f docs/operations/mobile/MOBILE-RELEASE-RUNBOOK.md
test -f .github/workflows/mobile-internal.yml
test ! -f .github/workflows/mobile-e2e-stub.yml
rg -n 'lint:mobile|apps/mobile' scripts/ci/lint-with-summary.mjs
# Mobile Maestro runs locally only (not in /test GitHub CI), same policy as web E2E.
```

## 4) npm-first mobile E2E (three terminals + test)

```bash
# T1 — Metro
npm run mobile:dev
# T2 / T3 — E2E install (--no-bundler)
npm run mobile:e2e:ios
npm run mobile:e2e:android
# T4 — Maestro + HTML report (strict: Metro + app already installed)
npm run mobile:e2e:test
npm run mobile:e2e:test -- hello-world,locale-switch-home-smoke
open .artifacts/mobile-e2e-reports/latest/index.html
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

## 5) Full repo validation commands (operator)

```bash
npm run build:packages
npm run lint
npm run test:unit
npm run test:e2e:api
```
