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

**Mobile**

```bash
make mobile_e2e_deps
```

Seed the shared E2E fixtures:

**Mobile**

```bash
make mobile_e2e_seed
```

Run each of these in its own leave-running tab:

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

Install the E2E app binary in **Mobile iOS**:

```bash
npm run mobile:e2e:ios
```

Install the E2E app binary in **Mobile Android**:

```bash
npm run mobile:e2e:android
```

Run the final suite in **Mobile Maestro**:

```bash
npm run mobile:e2e:test:all
npm run mobile:e2e:test -- tablet
```

Each selected flow runs once per platform by default. To opt into one end-of-suite retry pass for
only failed flows, run `MOBILE_E2E_FLOW_RETRIES=1 npm run mobile:e2e:test:all`.

Each run opens the generated report hub automatically. The hub links to the failures summary and
the platform-specific reports.
