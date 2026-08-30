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
npm run mobile:e2e:api:bg
```

Use the managed background API command for mobile E2E. The runner reseeds the database before
API-backed flows, so it must be able to stop and restart this API around the reseed. The foreground
`npm run mobile:e2e:api` command is for manually observing the API and is not valid for this
runner-managed workflow.

**Mobile E2E test-assets**

```bash
npm run mobile:e2e:test-assets:bg
```

Confirm the leave-running services before installing and running the suite:

**Mobile**

```bash
npm run mobile:e2e:api:health
npm run mobile:e2e:test-assets:health
```

Install the E2E app binary in **Mobile iOS**:

```bash
npm run mobile:e2e:ios
```

Install the E2E app binary in **Mobile Android**:

```bash
npm run mobile:e2e:android
```

Run the full phone suite in **Mobile Maestro**:

```bash
npm run mobile:e2e:test:all -- --platform ios
npm run mobile:e2e:test:all -- --platform android
```

Run the iOS and Android commands separately so each platform's report can be reviewed before the
next run replaces the `latest` report link. Each selected flow runs once per platform by default.
To opt into one end-of-suite retry pass for only failed flows, run
`MOBILE_E2E_FLOW_RETRIES=1 npm run mobile:e2e:test:all -- --platform ios` (and repeat for Android
if needed).

Run an individual flow when you need a focused regression check. Each command runs the selected
flow on both phone platforms; add `--platform ios` or `--platform android` before the flow name to
isolate one platform. These commands intentionally use the normal app-state behavior.

**Mobile Maestro**

```bash
npm run mobile:e2e:test -- add-by-rss
npm run mobile:e2e:test -- api-health
npm run mobile:e2e:test -- auth-login
npm run mobile:e2e:test -- auth-logout
npm run mobile:e2e:test -- auto-queue-advance
npm run mobile:e2e:test -- deep-link
npm run mobile:e2e:test -- detail-sort-prefs
npm run mobile:e2e:test -- engine-audio-spike
npm run mobile:e2e:test -- hello-world
npm run mobile:e2e:test -- home
npm run mobile:e2e:test -- library-downloads
npm run mobile:e2e:test -- library-playlists
npm run mobile:e2e:test -- library-subscriptions
npm run mobile:e2e:test -- locale-switch-home-smoke
npm run mobile:e2e:test -- membership-gate
npm run mobile:e2e:test -- notifications-inbox
npm run mobile:e2e:test -- opml
npm run mobile:e2e:test -- play-mini-player
npm run mobile:e2e:test -- podcast-episode
npm run mobile:e2e:test -- push
npm run mobile:e2e:test -- queue-add
npm run mobile:e2e:test -- search
npm run mobile:e2e:test -- search-unparsed
npm run mobile:e2e:test -- settings-select
npm run mobile:e2e:test -- subscriptions-anonymous
npm run mobile:e2e:test -- sync-log
npm run mobile:e2e:test -- tab-switch-playback
npm run mobile:e2e:test -- v4v
npm run mobile:e2e:test -- video-transition
```

Use `--reset-data` only when a flow requires an empty local SQLite database or prior local state is
contaminating the result. It resets the installed E2E app before the selected flow without
rebuilding the native binary. For example:

```bash
npm run mobile:e2e:test -- --reset-data --platform ios subscriptions-anonymous
```

Run the opt-in tablet flow separately when tablet coverage is required:

```bash
npm run mobile:e2e:test -- --platform ios tablet
npm run mobile:e2e:test -- --platform android tablet
```

Each run opens the generated report hub automatically. The hub links to the failures summary and
the platform-specific reports.
