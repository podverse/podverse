# How to run mobile E2E

From the **monorepo root**. Use the VS Code / Cursor tabs from
[`.vscode/terminals.json`](/.vscode/terminals.json) — exact names below. Do not paste
leave-running processes into the same shell as one-shot commands. Metro, the mobile E2E API,
and test-assets block until you stop them.

This file is a **numbered runbook**. Do **not** run Maestro until
[section 6](#6-run-maestro). One-flow commands, the
[complete area list](#complete-area-list), and `:all` live there. They need the earlier
tiers, a native tree, leave-running services, health checks, and installed E2E binaries.

A cold wipe (`clean:all`, `mobile:reset`) lives in
[FULL-REPO-VERIFICATION-COMMANDS.md](/docs/testing/FULL-REPO-VERIFICATION-COMMANDS.md).
Use that file from step 0 when you want every repo test after a reset. This file is the
mobile slice plus the unit / API / web steps that must come first.

## 1. Before mobile — unit, API, and web

Finish these before any Maestro command. Skip this section only when those tiers already
passed on this checkout and you are debugging a mobile flow.

**Root** — package and app unit tests (does **not** include `apps/mobile`):

```bash
npm run test:unit
```

**Mobile** — mobile Vitest and type-check (standalone install; excluded from root
`test:unit` and root `type-check`):

```bash
npm --prefix apps/mobile run test
npm run type-check:mobile
```

**Root** — static checks and builds (full-repo pass):

```bash
npm run lint
npm run type-check
npm run openapi:check
npm run i18n:validate
npm run build
```

**Root** — API integration plus web and management-web Playwright (HTML reports):

```bash
make test_deps
make e2e_test_report
```

`e2e_test_report` starts the web E2E servers, runs API integration tests, then all web and
management-web variants. On macOS it opens the report hub when it finishes.

API integration only (still needs `make test_deps`):

```bash
npm run test:e2e:api
```

## 2. First-time native (once per machine)

Do this once per machine, after an Expo / React Native upgrade, or when the generated
`ios/` / `android/` trees do not match the installed packages. `mobile:e2e:ios` and
`mobile:e2e:android` assume those trees already exist.

**Mobile**:

```bash
npm run mobile:install
npm run build:packages
npm run mobile:prebuild
```

For a clean recover (reinstall mobile deps, then prebuild), use `npm run mobile:reset`
instead of `mobile:install` + `mobile:prebuild`. Detail:
[APPS-MOBILE.md](/apps/mobile/APPS-MOBILE.md).

The `video-transition` flow needs the committed fixture
`tools/test-assets/assets/e2e/videos/e2e-video-short-30s.mp4`. If it is missing,
regenerate E2E media once (idempotent, skip-if-exists):

**Root**:

```bash
npm run generate:e2e-media -w podverse-test-assets
```

## 3. Prepare test databases

Every full-suite or API-backed run. **Mobile** (one-shot; exits):

```bash
make mobile_e2e_deps
```

`npm run mobile:e2e:test:all` and any API-backed `mobile:e2e:test` run also call
`make mobile_e2e_seed` before Maestro. You do not need a separate seed step.

MQ is not a mobile E2E prerequisite. Local Artemis maps to host port `5684` because Maestro
device discovery reserves localhost `5555–5683` for emulator ADB. The runner exits **78**
if another host service sits in that range — see [Blocked runs](#blocked-runs-exit-78).

## 4. Leave-running services

Start these and leave them up. Do not continue until each tab is listening.

**Mobile Metro** (leave running — must be the E2E variant, not `mobile:dev`):

```bash
npm run mobile:dev:e2e
```

That injects iOS `http://localhost:4230/api/v2` and Android `http://10.0.2.2:4230/api/v2`,
plus `EXPO_PUBLIC_MOBILE_E2E=1` and `EXPO_PUBLIC_MOBILE_V4V_ENABLED=1`. After changing
those flags, reload or reinstall the app so Metro rebundles.

**Mobile E2E API** (leave running):

```bash
npm run mobile:e2e:api:bg
```

Restart this after API fixture code changes (`PODVERSE_E2E_FIXTURES` / search / add-by-RSS
fixtures) — `e2e-api.sh` rebuilds on start. The Maestro runner fails fast if `/api/v2/health`
does not report `fixturesEnabled: true`. The runner briefly stops and restarts this managed
API around its database reseed so Postgres can be recreated without invalidating the API
connection pool. Do not restart the API just because Metro restarted.

**Mobile E2E test-assets** (leave running — required for the full suite and any playback
flow):

```bash
npm run mobile:e2e:test-assets
```

Serves the same `tools/test-assets` fixtures as web Playwright on port **2111**. Enclosure
URLs in the seed point at `http://localhost:2111/e2e/audio/...`. On Android E2E the app
rewrites that host to `10.0.2.2`. Stop with `npm run mobile:e2e:test-assets:stop`.

## 5. Confirm health, then install the app

**Mobile** (one-shot; exits):

```bash
npm run mobile:e2e:api:health
npm run mobile:e2e:test-assets:health
```

Do not install or run Maestro until both health commands succeed. The API health payload
must show `fixturesEnabled: true`.

**Mobile iOS** (wait until it finishes):

```bash
npm run mobile:e2e:ios
```

**Mobile Android** (wait until it finishes):

```bash
npm run mobile:e2e:android
```

## 6. Run Maestro

**Mobile Maestro** (exit when done). Prefer one platform at a time so you can read the
report before the next run replaces `latest`.

### One flow

`<area>` is the basename of `apps/mobile/e2e/<area>.yaml` (not `shared/`).

```bash
npm run mobile:e2e:test -- --platform ios <area>
npm run mobile:e2e:test -- --platform android <area>
```

Omit `--platform` to run both phones. Bare `npm run mobile:e2e:test` is UI-only
`hello-world` only. Which stack each area needs is in
[One flow at a time](#one-flow-at-a-time).

### Complete area list

Every phone `<area>` you can pass. Each line is one top-level file under
`apps/mobile/e2e/`. Prefer iOS first; fix it, then run the same area on Android.

**iOS**

```bash
npm run mobile:e2e:test -- --platform ios add-by-rss
npm run mobile:e2e:test -- --platform ios api-health
npm run mobile:e2e:test -- --platform ios auth-login
npm run mobile:e2e:test -- --platform ios auth-logout
npm run mobile:e2e:test -- --platform ios auto-queue-advance
npm run mobile:e2e:test -- --platform ios browse
npm run mobile:e2e:test -- --platform ios deep-link
npm run mobile:e2e:test -- --platform ios detail-sort-prefs
npm run mobile:e2e:test -- --platform ios engine-audio-spike
npm run mobile:e2e:test -- --platform ios hello-world
npm run mobile:e2e:test -- --platform ios home
npm run mobile:e2e:test -- --platform ios library-downloads
npm run mobile:e2e:test -- --platform ios library-playlists
npm run mobile:e2e:test -- --platform ios locale-switch-home-smoke
npm run mobile:e2e:test -- --platform ios membership-gate
npm run mobile:e2e:test -- --platform ios notifications-inbox
npm run mobile:e2e:test -- --platform ios offline-mode
npm run mobile:e2e:test -- --platform ios opml
npm run mobile:e2e:test -- --platform ios play-mini-player
npm run mobile:e2e:test -- --platform ios playback-multi-device-handoff
npm run mobile:e2e:test -- --platform ios playback-offline-reconciliation
npm run mobile:e2e:test -- --platform ios podcast-episode
npm run mobile:e2e:test -- --platform ios popularity-tracking
npm run mobile:e2e:test -- --platform ios push
npm run mobile:e2e:test -- --platform ios queue-add
npm run mobile:e2e:test -- --platform ios search
npm run mobile:e2e:test -- --platform ios search-unparsed
npm run mobile:e2e:test -- --platform ios settings-downloads
npm run mobile:e2e:test -- --platform ios settings-select
npm run mobile:e2e:test -- --platform ios subscriptions-anonymous
npm run mobile:e2e:test -- --platform ios sync-log
npm run mobile:e2e:test -- --platform ios tab-switch-playback
npm run mobile:e2e:test -- --platform ios v4v
npm run mobile:e2e:test -- --platform ios video-transition
```

**Android**

```bash
npm run mobile:e2e:test -- --platform android add-by-rss
npm run mobile:e2e:test -- --platform android api-health
npm run mobile:e2e:test -- --platform android auth-login
npm run mobile:e2e:test -- --platform android auth-logout
npm run mobile:e2e:test -- --platform android auto-queue-advance
npm run mobile:e2e:test -- --platform android browse
npm run mobile:e2e:test -- --platform android deep-link
npm run mobile:e2e:test -- --platform android detail-sort-prefs
npm run mobile:e2e:test -- --platform android engine-audio-spike
npm run mobile:e2e:test -- --platform android hello-world
npm run mobile:e2e:test -- --platform android home
npm run mobile:e2e:test -- --platform android library-downloads
npm run mobile:e2e:test -- --platform android library-playlists
npm run mobile:e2e:test -- --platform android locale-switch-home-smoke
npm run mobile:e2e:test -- --platform android membership-gate
npm run mobile:e2e:test -- --platform android notifications-inbox
npm run mobile:e2e:test -- --platform android offline-mode
npm run mobile:e2e:test -- --platform android opml
npm run mobile:e2e:test -- --platform android play-mini-player
npm run mobile:e2e:test -- --platform android playback-multi-device-handoff
npm run mobile:e2e:test -- --platform android playback-offline-reconciliation
npm run mobile:e2e:test -- --platform android podcast-episode
npm run mobile:e2e:test -- --platform android popularity-tracking
npm run mobile:e2e:test -- --platform android push
npm run mobile:e2e:test -- --platform android queue-add
npm run mobile:e2e:test -- --platform android search
npm run mobile:e2e:test -- --platform android search-unparsed
npm run mobile:e2e:test -- --platform android settings-downloads
npm run mobile:e2e:test -- --platform android settings-select
npm run mobile:e2e:test -- --platform android subscriptions-anonymous
npm run mobile:e2e:test -- --platform android sync-log
npm run mobile:e2e:test -- --platform android tab-switch-playback
npm run mobile:e2e:test -- --platform android v4v
npm run mobile:e2e:test -- --platform android video-transition
```

`tablet` is opt-in and is not part of `:all`. See
[Tablet screenshots](#tablet-screenshots-opt-in).

### Full phone suite

```bash
npm run mobile:e2e:test:all -- --platform ios
npm run mobile:e2e:test:all -- --platform android
```

Equivalent without a platform filter (both phones in one run):
`npm run mobile:e2e:test:all` or `npm run mobile:e2e:test -- all`.

`--parallel` (`npm run mobile:e2e:test:all:parallel`) runs both slots at once. It is
opt-in: both devices then compete with Metro, the API, and the Maestro JVM, which is what
produces wedged-device blocks. Use it for a green-suite sweep; leave it off while
debugging.

## 7. Open reports

**Mobile**:

```bash
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/index.html
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

`failures.json` is the compact fail index. Slot pages list flows fails-first and link into
`flows/<slug>/index.html`. Hub cards open slot summaries in a new tab.

Flow pages show sequence-aware command order when Maestro provides sequence metadata.
Legacy logs without that metadata are labeled as having unavailable ordering.
`failures.json` also includes the failed step and raw command-log path.

The runbook ends here. Everything below is reference (scoped flows, tablet, failures).

## One flow at a time

The command pattern and the [complete area list](#complete-area-list) are in
[section 6](#6-run-maestro). After [sections 3–5](#3-prepare-test-databases) are up, run
**one** area in **Mobile Maestro**. Prefer iOS first; fix it, then run the same area on
Android so a shared launch failure does not burn a full Android pass. `shared/` YAML is
not a selector. The groups below are the same areas, split by required stack.

```bash
npm run mobile:e2e:test -- --platform ios <area>
npm run mobile:e2e:test -- --platform android <area>
```

Omit `--platform` to run both phones. Bare `npm run mobile:e2e:test` is UI-only
`hello-world` only.

New top-level `apps/mobile/e2e/<area>.yaml` files are included in `:all` automatically. If
a new flow needs the E2E API when run alone, add its basename to `flow_needs_e2e_api` in
[`scripts/mobile/e2e-test.sh`](/scripts/mobile/e2e-test.sh). If it needs `:2111`, add it to
`flow_needs_test_assets` in the same script.

### UI-only areas

**Mobile Metro** may be `npm run mobile:dev` (no `:4230`). API and test-assets are
optional. Still install with `mobile:e2e:ios` / `mobile:e2e:android`.

```bash
npm run mobile:e2e:test -- hello-world
npm run mobile:e2e:test -- locale-switch-home-smoke
npm run mobile:e2e:test -- settings-select
npm run mobile:e2e:test -- sync-log
```

### API-backed areas

Same stack as [sections 3–5](#3-prepare-test-databases). Test-assets on `:2111` are
optional for this group.

`membership-gate` logs in as the seeded **Trial** `e2e-user`, taps Podcast Index directory
**Add** (`unparsedfixture`), and asserts the real
`membership.feature_not_available_for_account_type` **403** surfaces the premium gate
modal → **Renew** → Membership screen.

Seeded login: `e2e-user@example.com` / `Test!1Aa`.

```bash
npm run mobile:e2e:test -- api-health
npm run mobile:e2e:test -- auth-login
npm run mobile:e2e:test -- auth-logout
npm run mobile:e2e:test -- browse
npm run mobile:e2e:test -- deep-link
npm run mobile:e2e:test -- detail-sort-prefs
npm run mobile:e2e:test -- home
npm run mobile:e2e:test -- library-playlists
npm run mobile:e2e:test -- membership-gate
npm run mobile:e2e:test -- notifications-inbox
npm run mobile:e2e:test -- offline-mode
npm run mobile:e2e:test -- opml
npm run mobile:e2e:test -- playback-multi-device-handoff
npm run mobile:e2e:test -- podcast-episode
npm run mobile:e2e:test -- popularity-tracking
npm run mobile:e2e:test -- push
npm run mobile:e2e:test -- queue-add
npm run mobile:e2e:test -- search
npm run mobile:e2e:test -- search-unparsed
npm run mobile:e2e:test -- settings-downloads
npm run mobile:e2e:test -- subscriptions-anonymous
```

### API + test-assets areas

`:2111` must be listening (`npm run mobile:e2e:test-assets`).

The **`v4v`** flow plays a seeded episode to reach the full player, then taps
Value-for-Value. That button is hidden by default; `mobile:dev:e2e` sets
`EXPO_PUBLIC_MOBILE_V4V_ENABLED=1` so it renders.

`video-transition` uses **Play E2E video** on More → E2E → Playback
(`testID=e2e-play-video-item`). That Playback row is hidden unless
`EXPO_PUBLIC_MOBILE_E2E=1`. Maestro asserts RN placeholder `testID`s and screenshots; it
cannot confirm live video frames.
After changing `PodverseVideoSurfaceView`, play the video item on an iOS simulator,
Android emulator, and a physical device and confirm live frames (not static artwork) with
no reload or playhead jump on expand and collapse.

```bash
npm run mobile:e2e:test -- add-by-rss
npm run mobile:e2e:test -- auto-queue-advance
npm run mobile:e2e:test -- engine-audio-spike
npm run mobile:e2e:test -- library-downloads
npm run mobile:e2e:test -- play-mini-player
npm run mobile:e2e:test -- playback-offline-reconciliation
npm run mobile:e2e:test -- tab-switch-playback
npm run mobile:e2e:test -- v4v
npm run mobile:e2e:test -- video-transition
```

### Clean local state between flows

`launchApp: clearState` resets the session, but signed-out subscriptions are retained by
the product. Use `--reset-data` when a flow requires an empty local SQLite database. The
runner resets app data before each selected flow and retry; relaunches inside the flow
still test persistence.

On iOS the runner copies the installed E2E app, uninstalls it, and reinstalls that copy.
Android uses `pm clear`. Neither path rebuilds the native app. The app must already be
installed in the selected E2E slot.

**Mobile Maestro**:

```bash
npm run mobile:e2e:test -- --reset-data --platform ios subscriptions-anonymous
```

### Skipping the reseed

`--skip-seed` reuses the database from the previous run and skips the API stop/start
around it. Use it when re-running the same flow against a code fix and the data state is
already correct:

```bash
npm run mobile:e2e:test -- --skip-seed --platform ios subscriptions-anonymous
```

Do not use it for the first run of a flow, after switching platforms, or for a flow whose
expectations depend on fresh fixtures.

Maestro waits use `apps/mobile/e2e/shared/timeouts.env` (`TIMEOUT_FASTEST` …
`TIMEOUT_SLOWEST`). Prefer the fastest tier that can work; see **mobile-maestro-timeouts**.

## Tablet screenshots (opt-in)

Verifies multi-column Home and podcast split detail on tablet viewports. **Not** part of
`mobile:e2e:test:all`. Use dedicated E2E tablet devices:

| Slot           | Device                      |
| -------------- | --------------------------- |
| iOS tablet     | `iPad Pro 13-inch (M4) E2E` |
| Android tablet | `Pixel_Tablet_API_33_e2e`   |

Leave-running stack is the same as [sections 4–5](#4-leave-running-services) (Metro E2E,
API, test-assets, health). Then install tablet slots and run the flow.

**Mobile iOS** / **Mobile Android** (exit when done):

```bash
npm run mobile:e2e:ios:tablet
npm run mobile:e2e:android:tablet
```

**Mobile Maestro** (exit when done):

```bash
npm run mobile:e2e:test -- tablet
```

Then open:

```bash
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-tablet/index.html
open .artifacts/mobile-e2e-reports/latest/android-tablet/index.html
```

## If something fails

| Message / symptom                                                                          | Fix                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Metro not listening on 8081                                                                | **Mobile Metro**: `npm run mobile:dev` (UI-only) or `npm run mobile:dev:e2e` (API-backed / full suite)                                                                                                                                                   |
| App not installed on E2E iOS                                                               | **Mobile iOS**: `npm run mobile:e2e:ios`                                                                                                                                                                                                                 |
| App not installed on E2E Android                                                           | **Mobile Android**: `npm run mobile:e2e:android`                                                                                                                                                                                                         |
| App not installed on E2E iOS / Android tablet                                              | **Mobile iOS** / **Mobile Android**: `npm run mobile:e2e:ios:tablet` / `npm run mobile:e2e:android:tablet`                                                                                                                                               |
| `full-player-two-column` missing on tablet flow                                            | Flow sets landscape; ensure tablet device is wide enough (`iPad Pro 13-inch (M4) E2E` / `Pixel_Tablet_API_33_e2e`). Re-run `ensure-devices.sh e2e-tablet`                                                                                                |
| API-backed flow cannot reach API (`:4230`)                                                 | **Mobile E2E API**: `npm run mobile:e2e:api:bg`; then in **Mobile** `npm run mobile:e2e:api:health`                                                                                                                                                      |
| Runner exits: “Mobile E2E API … is stale (no fixtures)”                                    | API was started before fixture code. **Mobile E2E API**: stop and `npm run mobile:e2e:api:bg` (rebuilds; health must show `fixturesEnabled: true`)                                                                                                       |
| Runner exits: playback flows need tools/test-assets on :2111                               | **Mobile E2E test-assets**: `npm run mobile:e2e:test-assets`; health: `npm run mobile:e2e:test-assets:health`                                                                                                                                            |
| Empty search / no `search-result-row-0` / no `rss-feed-row-first`                          | Same stale-API issue, or seed missing — runner auto-seeds; restart API if fixtures flag is false                                                                                                                                                         |
| `add-by-rss-home-playback-active` never appears after Play                                 | Restart **Mobile E2E test-assets** (`npm run mobile:e2e:test-assets` — binds `0.0.0.0` so IPv4/`10.0.2.2` works). Reload app after JS rewrite changes.                                                                                                   |
| Network Error / “Could not sign in” / `tab-home` not visible in API-backed or `:all` runs  | Metro is UI-only (`mobile:dev`). **Mobile Metro**: stop it, run `npm run mobile:dev:e2e`, reload/reinstall the app so it targets `:4230`                                                                                                                 |
| Runner exits: “Metro on :8081 is UI-only”                                                  | Same as above — API-backed / full-suite flows require `mobile:dev:e2e` (guard in `e2e-test.sh`)                                                                                                                                                          |
| API start says port 4230 already in use                                                    | Free the port or stop managed process: `npm run mobile:e2e:api:stop`                                                                                                                                                                                     |
| Stuck on Expo “Development Build” launcher                                                 | Flows should run `shared/launch-and-connect.yaml` (retries Dev Client connect)                                                                                                                                                                           |
| Assertion fails; screenshot shows “developer menu” / Continue                              | Same shared flow dismisses the one-time Expo dev-client menu (see below)                                                                                                                                                                                 |
| `App crashed or stopped` / fail on “Development servers” mid-suite; SpringBoard screenshot | Dev Client relaunch flake after `clearState` (not a feature bug). `launch-and-connect` retries connect; optionally set `MOBILE_E2E_FLOW_RETRIES` to retry only failed flows after the suite. Focused check: `npm run mobile:e2e:test -- podcast-episode` |
| Repeated flow starts with prior subscriptions or local rows                                | `clearState` preserves product data by design. Run the affected flow with `--reset-data` from **Mobile Maestro**                                                                                                                                         |
| Runner exits **78**: “BLOCKED by the test environment”                                     | The environment, not the flow, broke (see [Blocked runs](#blocked-runs-exit-78) below). Read the printed reason, then `bash scripts/mobile/ensure-devices.sh recover-e2e-android` or `recover-e2e-ios`                                                   |
| Runner exits **78**: “a service in the adb scan range (5555-5683) will hang Maestro”       | A non-ADB listener is using reserved host ports. Move that listener outside the range; local Artemis uses host `:5684` and container `:5672`                                                                                                             |
| Maestro produces no output on iOS; simulator looks fine                                    | Driver acquisition hang — the runner reports `blocked: startup`. `bash scripts/mobile/ensure-devices.sh recover-e2e-ios` kills stale `maestro-driver-ios` processes and reboots the simulator                                                            |
| Android screenshot shows “System UI isn’t responding” / “Podverse Next keeps stopping”     | System dialog above the app; every tap goes to it. Do **not** tap Close app / Wait — reboot the emulator with `recover-e2e-android` and reduce host load                                                                                                 |
| Android launcher still asks for a URL every flow                                           | `adb reverse tcp:8081 tcp:8081` did not take. Re-run `bash scripts/mobile/ensure-devices.sh e2e-android`; check `adb reverse --list`                                                                                                                     |
| Maestro missing                                                                            | Install via repo flake (`maestro`) or [Maestro docs](https://docs.maestro.dev/getting-started/installing-maestro)                                                                                                                                        |
| `play-mini-player` Android: Maestro `full-player-close` tap does not dismiss               | Expected for now — the flow uses `pressKey: Back` on Android (same `onClose` / `BackHandler` path). **Manually tap Close once** on an Android AVD/device before release to confirm real input dismisses the full player.                                 |

### Blocked runs (exit 78)

A run can fail because the environment stopped working rather than because a flow is
wrong. Waiting on one of these looks like waiting on a slow test. The runner detects them
instead of waiting them out, and exits **78** — distinct from exit 1, because no flow in
that run passed or failed on its merits.

Evidence lands in `.artifacts/mobile-e2e-reports/<run>/`: per-invocation Maestro output
under `logs/<seq>-<label>.log`, and device state under
`diagnostics/<timestamp>-<label>/`. The runner recovers the disposable E2E device once
per platform, re-runs only the flows that never got a result, and exits 78 with operator
instructions if it is blocked again.

**Before any Maestro run**, two guards fail fast rather than hanging:

- **adb scan range conflict.** Maestro's device discovery opens an adb connection to every
  localhost port in **5555–5683** and waits forever for a reply. An unrelated service
  listening in that range hangs Maestro at startup with a healthy device. The runner
  probes for this and refuses to start. It affects iOS and Android identically —
  `--platform` is not a workaround. Move the listener outside the range; local Artemis
  uses host `:5684` and container `:5672`.
- **Device canary.** Each selected device gets a bounded `maestro hierarchy` probe
  (~20 s when healthy) before the database is reseeded, so a wedged device is reported in
  seconds instead of after minutes of setup.

During a run, the watchdog ends the invocation when:

| Reason    | Meaning                                                                                                                                                 | Recovery                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `startup` | Maestro never reached the device (no slot artifacts). On iOS, usually a failed `maestro-driver-ios` acquisition — the log stops after the system banner | `bash scripts/mobile/ensure-devices.sh recover-e2e-ios`            |
| `device`  | ANR/crash dialog focused, emulator not answering `adb`, or an unresponsive simulator                                                                    | `recover-e2e-android` / `recover-e2e-ios`                          |
| `stalled` | No log growth and no new slot artifacts while the device looks healthy                                                                                  | Read the log tail first — this is often a host fault, not a device |
| `timeout` | `MOBILE_E2E_RUN_TIMEOUT_SECONDS` exceeded (opt-in)                                                                                                      | —                                                                  |

If every probe says the device is healthy and Maestro still produces nothing, the fault is
on the host. `kill -QUIT <maestro-jvm-pid>` dumps its threads into the log; a stack in
`dadb.AdbReader.readMessage` or `dadb.Dadb$Companion.list` is device discovery hanging on
a host socket — the adb-scan-range conflict above.

Knobs (defaults are the supported configuration):

| Variable                                   | Default | Meaning                                             |
| ------------------------------------------ | ------- | --------------------------------------------------- |
| `MOBILE_E2E_STALL_TIMEOUT_SECONDS`         | `300`   | No log growth and no new slot artifacts ⇒ blocked   |
| `MOBILE_E2E_STARTUP_TIMEOUT_SECONDS`       | `180`   | Maestro never reached the device ⇒ blocked          |
| `MOBILE_E2E_RUN_TIMEOUT_SECONDS`           | `0`     | Hard per-invocation ceiling; `0` = stall check only |
| `MOBILE_E2E_WATCHDOG_INTERVAL_SECONDS`     | `15`    | Device-health poll interval                         |
| `MOBILE_E2E_IOS_DRIVER_GRACE_SECONDS`      | `90`    | Grace before a missing `maestro-driver-ios` counts  |
| `MOBILE_E2E_ANDROID_RECOVERIES`            | `1`     | Emulator reboots allowed before giving up           |
| `MOBILE_E2E_IOS_RECOVERIES`                | `1`     | Simulator reboots allowed before giving up          |
| `MOBILE_E2E_ANDROID_WATCHDOG`              | `1`     | `0` disables Android health polling                 |
| `MOBILE_E2E_IOS_WATCHDOG`                  | `1`     | `0` disables iOS health polling                     |
| `MOBILE_E2E_DEVICE_CANARY`                 | `1`     | `0` skips the pre-run device probe                  |
| `MOBILE_E2E_DEVICE_CANARY_TIMEOUT_SECONDS` | `120`   | Canary patience before declaring the device blocked |

### Dev-client developer menu

`launchApp` with `clearState: true` resets Expo’s “seen developer menu” flag, so the
onboarding sheet (“This is the developer menu…” with **Continue**) appears **every** E2E
launch after the JS bundle loads. It covers app UI and will fail `assertVisible` on
`testID`s if left up.

Top-level flows use `shared/launch-and-connect.yaml`, which wraps `launchApp` +
`shared/connect-dev-client.yaml` in a Maestro `retry` (mid-suite iOS relaunches can blank
out before “Development servers”). That shared connect flow: (1) taps the Metro URL,
(2) taps **Continue** to dismiss the onboarding card, (3) closes the dev-menu bottom
sheet it reveals (tapping the dimmed scrim above the sheet), (4) waits for
`hello-world-screen`. Tapping **Continue** alone is not enough — it only opens the full
dev menu, which still covers the app. New flows must
`runFlow: shared/launch-and-connect.yaml` — do not assert app UI before it finishes.

The runner executes each flow once per platform by default. Set `MOBILE_E2E_FLOW_RETRIES`
to a positive number to opt into end-of-suite retries of only failed flow YAMLs. Reports
prefer the latest pass for a flow title when both a failed and a retry `commands-*.json`
exist.

Read the **failed slot** HTML (error banner + ❌ screenshot) before changing app code.

More context (device names, flow naming): [README.md](./README.md). Environment and seed
contract: [TEST-ENV.md](./TEST-ENV.md).

---

### Sample test prompt

run the following and if you encounter errors, try to fix them. if you are unsure what an appropriate fix is then write the questions in a document to defer the fixes to later when you can ask the operator for help. you may need to run

npm run mobile:dev:e2e
npm run mobile:e2e:api:bg
npm run mobile:e2e:api:bg:stop
npm run mobile:e2e:test-assets

although at the time i am writing this i have already run:
npm run mobile:dev:e2e
npm run mobile:e2e:api:bg
npm run mobile:e2e:test-assets

This is the test command i want you to run and fix any errors in until it passes, else explain questions you have and defer the work to later.

npm run mobile:e2e:test -- --platform ios (test name)
