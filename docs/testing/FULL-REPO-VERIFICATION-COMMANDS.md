# Full Local Infrastructure Test

Run these commands from the monorepo root, in order.

## 0. Optional cold dependency install

Use this before the reset below when validating dependency or lockfile changes, or when diagnosing
module-resolution problems. It removes and reinstalls root and standalone mobile dependencies using
their lockfiles, including dependencies for the web E2E seeder workspace. It also builds shared
packages; the reset below is still required for clean app output and caches.

**Root**

```bash
npm run deps:init:ci
```

## 1. Reset and prepare generated state

Stop any running dev, build, or E2E processes first. This removes generated build output, TypeScript
build info, Next.js output, and local build caches without touching `node_modules` or test databases.
Shared packages are rebuilt afterward because their workspace exports resolve to `dist/`.

**Root**

```bash
npm run clean:all
npm run clean:cache
npm run build:packages
```

## 2. Unit tests

**Root**

```bash
npm run test:unit
```

**Mobile**

```bash
npm --prefix apps/mobile run test
```

## 3. Static checks and builds

**Root**

```bash
npm run lint
npm run type-check
npm run openapi:check
npm run i18n:validate
npm run build
```

## 4. Web, management-web, and API E2E

**Root**

```bash
make test_deps
make e2e_test_report
```

`e2e_test_report` runs API integration tests plus all web and management-web E2E variants, then
opens the generated report hub automatically on macOS.

## 5. Mobile native dependency sync

Regenerate the native trees and CocoaPods after the dependency install and before installing an E2E
binary. `mobile:e2e:ios` and `mobile:e2e:android` assume the generated native projects already match
the installed Expo and React Native packages.

**Mobile**

```bash
npm run mobile:reset
```

## 6. Mobile E2E

Prepare the test dependencies once:

**Mobile**

```bash
make mobile_e2e_deps
```

Run the required leave-running services in their named tabs:

**Mobile Metro**

```bash
npm run mobile:dev:e2e
```

**Mobile E2E API**

```bash
npm run mobile:e2e:api:bg
```

**Mobile E2E test-assets**

```bash
npm run mobile:e2e:test-assets:bg
```

The runner seeds API-backed fixtures and manages the E2E API restart around reseeding. Test-assets
are required by the full suite because it includes real-media playback flows. Confirm both services
before continuing:

**Mobile**

```bash
npm run mobile:e2e:api:health
npm run mobile:e2e:test-assets:health
```

MQ is not a mobile E2E prerequisite. Local Artemis is mapped to host port `5684` because Maestro's
host-side device discovery reserves localhost ports `5555–5683` for Android emulator ADB endpoints;
its container port remains `5672`. The runner exits **78** with diagnostics if it detects another
conflict. See
[mobile E2E blocked-run handling](/apps/mobile/e2e/HOW-TO-RUN.md#blocked-runs-exit-78) for details.

Install the E2E binaries:

**Mobile iOS**

```bash
npm run mobile:e2e:ios
```

**Mobile Android**

```bash
npm run mobile:e2e:android
```

Run the phone suite one platform at a time in **Mobile Maestro**, reviewing each report before the
next run replaces `latest`:

```bash
npm run mobile:e2e:test:all -- --platform ios
npm run mobile:e2e:test:all -- --platform android
```

Run a focused flow on one platform while debugging:

```bash
npm run mobile:e2e:test -- --platform ios subscriptions-anonymous
npm run mobile:e2e:test -- --platform android add-by-rss
```

Use `--reset-data` for a flow that requires empty local SQLite state, or `--skip-seed` when
re-running against already-correct fixtures. Tablet coverage is opt-in with the `tablet` selector.
See [HOW-TO-RUN.md](/apps/mobile/e2e/HOW-TO-RUN.md) for flow discovery, retries, reports, and
watchdog settings.
