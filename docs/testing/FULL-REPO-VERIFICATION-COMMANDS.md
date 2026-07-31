# Full Repo Verification Commands

Run all commands from the monorepo root.

## 1) Infrastructure prerequisites

**Docker** (starts Postgres + Valkey test deps)

```bash
make test_deps
```

**Docker** (optional, only for broker-backed MQ integration tests)

```bash
make test_deps_mq
```

## 2) Static quality gates

**Root**

```bash
npm run lint
npm run type-check
npm run openapi:check
npm run i18n:validate
```

## 3) Full build pass

**Root**

```bash
npm run build
```

## 4) Unit + API integration + web/management-web E2E

**Root**

```bash
npm run test:unit
npm run test:e2e:api
make e2e_test_report
open .artifacts/e2e-reports/latest/index.html
```

## 5) Optional broker-backed worker integration

Use this when validating Artemis-backed worker flows (for example OPML worker queue integration).

**Root**

```bash
PODVERSE_RUN_MQ_INTEGRATION=1 npm run test -w apps/workers -- runOpmlImport.integration.test.ts
```

## 6) Mobile full-suite E2E (Maestro)

Bring up leave-running services first:

**Mobile Metro**

```bash
npm run mobile:dev:e2e
```

**Mobile E2E API**

```bash
npm run mobile:e2e:api
```

**Mobile E2E test-assets**

```bash
npm run mobile:e2e:test-assets
```

Install app binaries on E2E devices:

**Mobile iOS**

```bash
npm run mobile:e2e:ios
```

**Mobile Android**

```bash
npm run mobile:e2e:android
```

Run full mobile suite:

**Mobile Maestro**

```bash
npm run mobile:e2e:test:all
```

Open reports:

**Mobile**

```bash
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

## 7) One-command core regression (non-mobile)

If you want a single command for core repo verification (unit + API + web/management-web reports):

**Root**

```bash
npm run test:reports
```
