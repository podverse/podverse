# How to run mobile E2E

From the **monorepo root**. Use the VS Code / Cursor tabs from
[`.vscode/terminals.json`](../../../.vscode/terminals.json) — exact names below. Do not paste
leave-running processes into the same shell as one-shot commands — Metro and the mobile E2E API
block forever until stopped.

## Run all E2E (primary)

This is the full suite: every top-level `apps/mobile/e2e/<area>.yaml` (auto-discovered; `shared/`
is excluded). Use the **API-backed** stack — most flows hit `:4230` and/or seed login.

**Mobile** (one-shot prep; exits):

```bash
make mobile_e2e_deps
```

(`make mobile_e2e_seed` is optional here — `npm run mobile:e2e:test:all` / any API-backed
`mobile:e2e:test` run seeds via `make mobile_e2e_seed` before Maestro.)

**Mobile Metro** (leave running):

```bash
npm run mobile:dev:e2e
```

**Mobile iOS** (wait until it finishes):

```bash
npm run mobile:e2e:ios
```

**Mobile Android** (wait until it finishes):

```bash
npm run mobile:e2e:android
```

**Mobile E2E API** (leave running):

```bash
npm run mobile:e2e:api:bg
```

Restart this after API fixture code changes (`PODVERSE_E2E_FIXTURES` / search / add-by-RSS
fixtures) — `e2e-api.sh` rebuilds on start. The Maestro runner fails fast if `/api/v2/health`
does not report `fixturesEnabled: true`. The runner briefly stops and restarts this managed API
around its database reseed so Postgres can be recreated without invalidating the API connection
pool.

**Mobile E2E test-assets** (leave running — required for add-by-RSS play / real media):

```bash
npm run mobile:e2e:test-assets
```

Serves the same `tools/test-assets` fixtures as web Playwright on port **2111**. The Maestro
runner fails fast when a playback flow needs `:2111` and it is not listening. Stop with
`npm run mobile:e2e:test-assets:stop`.

**Mobile Maestro** (exit when done — this is the “run all” command):

```bash
npm run mobile:e2e:test:all
```

Equivalent: `npm run mobile:e2e:test -- all`.

Then open reports (see [Reports](#reports) below).

### Seed vs static assets (web alignment)

API-backed mobile flows reuse the **web E2E seed** (`make mobile_e2e_seed` → `e2e_seed_web`) and
the **fixture-enabled mobile E2E API** (`PODVERSE_E2E_FIXTURES=1` on `:4230`). List/detail flows
(search, podcast/episode rows) use that API data without media.

**Playback flows** (add-by-RSS play after submit, and later episode play) also need
`tools/test-assets` on **2111** — the same server web Playwright starts. Enclosure URLs in the
seed and add-by-RSS fixtures already point at `http://localhost:2111/e2e/audio/...`. On Android
E2E, the app rewrites that host to `10.0.2.2`.

The **`video-transition`** flow (real video mini→full) needs the committed video fixture
`tools/test-assets/assets/e2e/videos/e2e-video-short-30s.mp4`. If it is missing, regenerate the
E2E media fixtures once (idempotent, skip-if-exists) and reseed:

```bash
npm run generate:e2e-media -w podverse-test-assets
make mobile_e2e_seed
```

It plays via the `EXPO_PUBLIC_MOBILE_E2E`-gated **Play E2E video** button on Home
(`testID=e2e-play-video-item`) because there is no video browse/search UI yet.

> **Structural only — verify frames on-device.** `video-transition` (and `engine-audio-spike`) assert
> RN placeholder `testID`s + screenshots; Maestro **cannot** confirm that live video frames rendered
> or detect surface occlusion. After changing the native `PodverseVideoSurfaceView` / surface host,
> manually verify on an iOS simulator, Android emulator, **and** a physical device: play the video
> item, expand to the full player, and confirm live frames (not the static artwork) with no reload /
> playhead jump on expand and collapse. See the Phase 1 mobile master plan's Track 2 video notes.

New top-level `apps/mobile/e2e/<area>.yaml` files are included automatically. If a new flow needs
the E2E API when run alone, add its basename to `flow_needs_e2e_api` in
[`scripts/mobile/e2e-test.sh`](../../../scripts/mobile/e2e-test.sh). If it needs `:2111`, add it to
`flow_needs_test_assets` in the same script.

## Unit tests (pure modules — no device)

Separate from Maestro E2E: the `podverse-media-engine` pure-TS suites (bridge command serialization

- playback error taxonomy) run under Vitest with no React Native / Expo imports. `apps/mobile` is a
  standalone install (own lockfile, not a root workspace), so it is **excluded** from root
  `npm run test:unit` — run it with `--prefix`:

```bash
npm --prefix apps/mobile run test
```

Config: [`apps/mobile/vitest.config.ts`](../vitest.config.ts) (Node env; `include` scoped to
`modules/podverse-media-engine/src/**/*.test.ts`). Also runs non-blocking in CI on `develop` pushes
that touch `apps/mobile/**` (`.github/workflows/mobile-internal.yml`).

## Scoped / UI-only runs

Default bare `npm run mobile:e2e:test` runs only `hello-world` (UI-only smoke). Pass one or more
areas for a focused run:

```bash
npm run mobile:e2e:test -- hello-world
npm run mobile:e2e:test -- home,search
```

For first-failure debugging, run one platform at a time. Fix the first flow on iOS before running
that same flow on Android; this avoids spending a full Android pass on a shared launch or feature
failure. The default command still runs both phone platforms for deliberate regression runs.

```bash
npm run mobile:e2e:test -- --platform ios home
npm run mobile:e2e:test -- --platform android home
```

### Clean local state between flows

`launchApp: clearState` resets the session, but signed-out subscriptions are intentionally retained
by the product. Use `--reset-data` when a flow requires an empty local SQLite database. The runner
resets app data before each selected flow and retry attempt, while relaunches inside the flow still
test persistence normally.

**Mobile Maestro**:

```bash
npm run mobile:e2e:test -- --reset-data --platform ios subscriptions-anonymous
```

On iOS, the runner copies the installed E2E app, uninstalls it, and reinstalls that copy. Android
uses `pm clear`. Neither path rebuilds the native app. The app must already be installed in the
selected E2E slot.

### UI-only stack

Default smoke (`hello-world`) does **not** need deps, seed, or API.

**Mobile Metro** (leave running):

```bash
npm run mobile:dev
```

**Mobile iOS** / **Mobile Android** (same as full suite):

```bash
npm run mobile:e2e:ios
npm run mobile:e2e:android
```

**Mobile Maestro**:

```bash
npm run mobile:e2e:test
# or: npm run mobile:e2e:test -- hello-world,locale-switch-home-smoke
```

### API-backed scoped stack

Use this for `api-health`, auth, home/search/library-style flows, etc. **Mobile Metro** must inject
E2E API hosts via `mobile:dev:e2e` (iOS `http://localhost:4230/api/v2`, Android
`http://10.0.2.2:4230/api/v2`).

Prep + leave-running Metro / API / installs: same as [Run all E2E](#run-all-e2e-primary), then:

```bash
npm run mobile:e2e:test -- api-health
# or: npm run mobile:e2e:test -- auth-login
# or: npm run mobile:e2e:test -- auth-logout
# or: npm run mobile:e2e:test -- deep-link
# or: npm run mobile:e2e:test -- push
# or: npm run mobile:e2e:test -- tab-switch-playback
# or: npm run mobile:e2e:test -- queue-add
# or: npm run mobile:e2e:test -- membership-gate
```

The **`membership-gate`** flow needs the API only (no `:2111`). It logs in as the seeded **Trial**
`e2e-user`, taps Podcast Index directory **Add** (`unparsedfixture`), and asserts the real
`membership.feature_not_available_for_account_type` **403** surfaces the premium gate modal →
**Renew** → Membership screen (and the logged-out Membership screen shows the **Sign Up** CTA).

Playback flows (`play-mini-player`, `auto-queue-advance`, `v4v`) additionally need **Mobile E2E
test-assets** (`npm run mobile:e2e:test-assets` on `:2111`) leave-running for real media:

```bash
npm run mobile:e2e:test -- play-mini-player
# or: npm run mobile:e2e:test -- auto-queue-advance
# or: npm run mobile:e2e:test -- v4v
```

The **`v4v`** flow plays a seeded episode to reach the full player, then taps the Value-for-Value
button and asserts the placeholder screen. The V4V button is **hidden by default** (store policy,
detail 359); `mobile:dev:e2e` sets `EXPO_PUBLIC_MOBILE_V4V_ENABLED=1` so the button renders for E2E.
After changing that flag you must **reload/reinstall** the app so Metro rebundles the new value.

Optional convenience: instead of leave-running **Mobile E2E API**, start the API in the background
from **Mobile**, then health-check:

```bash
npm run mobile:e2e:api:bg
npm run mobile:e2e:api:health
# when finished with API-backed runs:
npm run mobile:e2e:api:stop
```

Seeded login credential for auth flows: `e2e-user@example.com` / `Test!1Aa`.

**Mobile E2E API** does not need a restart when you only restart Metro / `mobile:dev:e2e`. Keep it
leave-running; use `npm run mobile:e2e:api:health` in **Mobile** if unsure. Auth/tab/full-suite
flows fail closed if `:4230` is down (`e2e-test.sh` checks before Maestro). Use the managed
background command above because the runner owns the API lifecycle during its database reseed.

Maestro waits use `apps/mobile/e2e/shared/timeouts.env` (`TIMEOUT_FASTEST` … `TIMEOUT_SLOWEST`).
Prefer the fastest tier that can work; see **mobile-maestro-timeouts**.

## Reports

After Maestro finishes, in **Mobile**:

```bash
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/index.html
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

`failures.json` is the compact fail index (best starting point when debugging). Slot pages list
flows fails-first and link into `flows/<slug>/index.html` (error + screenshots). Hub cards open
slot summaries in a new tab. Tablet slots (`ios-tablet`, `android-tablet`) appear when you run
the opt-in tablet flow (see [Tablet screenshots](#tablet-screenshots-opt-in) below).

Flow pages show sequence-aware command order when Maestro provides sequence metadata. Legacy logs
without that metadata are labeled as having unavailable ordering instead of implying that their raw
JSON order is execution order. `failures.json` also includes the failed step and raw command-log
path.

## Tablet screenshots (opt-in)

Track 18.5 — verifies multi-column Home and podcast split detail on tablet viewports. **Not** part
of `mobile:e2e:test:all` (phone matrix stays unchanged). Uses dedicated E2E tablet devices:

| Slot           | Device                      |
| -------------- | --------------------------- |
| iOS tablet     | `iPad Pro 13-inch (M4) E2E` |
| Android tablet | `Pixel_Tablet_API_33_e2e`   |

**Mobile Metro** (leave running, API-backed):

```bash
npm run mobile:dev:e2e
```

**Mobile E2E API** (leave running):

```bash
npm run mobile:e2e:api:bg
```

**Mobile E2E test-assets** (leave running — tablet now opens real playback in full-player):

```bash
npm run mobile:e2e:test-assets
```

**Mobile iOS** / **Mobile Android** (install on tablet slots; exit when done):

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
| `podcast-detail-split` missing on tablet flow                                              | Flow sets landscape; ensure tablet device is wide enough (`iPad Pro 13-inch (M4) E2E` / `Pixel_Tablet_API_33_e2e`). Re-run `ensure-devices.sh e2e-tablet`                                                                                                |
| API-backed flow cannot reach API (`:4230`)                                                 | **Mobile E2E API**: `npm run mobile:e2e:api:bg`; then in **Mobile** `npm run mobile:e2e:api:health`                                                                                                                                                      |
| Runner exits: “Mobile E2E API … is stale (no fixtures)”                                    | API was started before fixture code. **Mobile E2E API**: stop and `npm run mobile:e2e:api:bg` (rebuilds; health must show `fixturesEnabled: true`)                                                                                                       |
| Runner exits: playback flows need tools/test-assets on :2111                               | **Mobile E2E test-assets**: `npm run mobile:e2e:test-assets`; health: `npm run mobile:e2e:test-assets:health`                                                                                                                                            |
| Empty search / no `search-result-row-0` / no `rss-feed-play-first`                         | Same stale-API issue, or seed missing — runner auto-seeds; restart API if fixtures flag is false                                                                                                                                                         |
| `rss-playback-active` never appears after Play                                             | Restart **Mobile E2E test-assets** (`npm run mobile:e2e:test-assets` — binds `0.0.0.0` so IPv4/`10.0.2.2` works). Reload app after JS rewrite changes.                                                                                                   |
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

A run can fail because the _environment_ stopped working rather than because a flow is wrong.
Waiting on one of these looks exactly like waiting on a slow test, which is what makes them
expensive. The runner detects them instead of waiting them out, and exits **78** — deliberately
distinct from exit 1, because no flow in that run passed or failed on its merits.

Evidence lands in `.artifacts/mobile-e2e-reports/<run>/`: per-invocation Maestro output under
`logs/<seq>-<label>.log`, and device state under `diagnostics/<timestamp>-<label>/` (screenshot,
focused-window dump, `am_anr` events and logcat tail on Android; device info, driver processes and
app log on iOS). The runner recovers the disposable E2E device once per platform, re-runs only the
flows that never got a result, and exits 78 with operator instructions if it is blocked again.

**Before any Maestro run**, two guards fail fast rather than hanging:

- **adb scan range conflict.** Maestro's device discovery opens an adb connection to every
  localhost port in **5555–5683** and waits forever for a reply, so an unrelated service listening
  in that range hangs Maestro at startup with a completely healthy device. The runner probes for
  this and refuses to start. It affects iOS and Android identically — `--platform` is not a
  workaround. Move the listener outside the range; local Artemis uses host `:5684` and container
  `:5672`. This is a host-port reservation, not an MQ prerequisite for mobile E2E.
- **Device canary.** Each selected device gets a bounded `maestro hierarchy` probe (~20 s when
  healthy) before the database is reseeded, so a wedged device is reported in seconds instead of
  after minutes of setup.

During a run, the watchdog ends the invocation when:

| Reason    | Meaning                                                                                                                                                 | Recovery                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `startup` | Maestro never reached the device (no slot artifacts). On iOS, usually a failed `maestro-driver-ios` acquisition — the log stops after the system banner | `bash scripts/mobile/ensure-devices.sh recover-e2e-ios`            |
| `device`  | ANR/crash dialog focused, emulator not answering `adb`, or an unresponsive simulator                                                                    | `recover-e2e-android` / `recover-e2e-ios`                          |
| `stalled` | No log growth and no new slot artifacts while the device looks healthy                                                                                  | Read the log tail first — this is often a host fault, not a device |
| `timeout` | `MOBILE_E2E_RUN_TIMEOUT_SECONDS` exceeded (opt-in)                                                                                                      | —                                                                  |

If every probe says the device is healthy and Maestro still produces nothing, the fault is on the
host. `kill -QUIT <maestro-jvm-pid>` dumps its threads into the log; a stack in
`dadb.AdbReader.readMessage` or `dadb.Dadb$Companion.list` is device _discovery_ hanging on a host
socket — the adb-scan-range conflict above.

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

### Skipping the reseed

`--skip-seed` reuses the database from the previous run, removing the reseed and the API
stop/start around it. Use it when re-running the same flow against a code fix and the data state is
already correct:

```bash
npm run mobile:e2e:test -- --skip-seed --platform ios subscriptions-anonymous
```

Do not use it for the first run of a flow, after switching platforms, or for a flow whose
expectations depend on fresh fixtures — a stale database produces a failure that looks like a
product defect.

### Running both slots at once

`--parallel` runs the iOS and Android slots simultaneously instead of one after the other, which
roughly halves the ~55-minute full-suite wall clock. Each slot's output is buffered to
`<run>/ios-phone.log` / `<run>/android-phone.log` and printed when it finishes, so the two streams
stay readable.

```bash
npm run mobile:e2e:test:all:parallel
```

It is opt-in because both devices then compete with Metro, the API, and the Maestro JVM for the
same cores, and host contention is what produces the wedged-device blocks above. Use it for a
green-suite sweep; leave it off while debugging a specific failure.

### Dev-client developer menu

`launchApp` with `clearState: true` resets Expo’s “seen developer menu” flag, so the
onboarding sheet (“This is the developer menu…” with **Continue**) appears **every** E2E launch
after the JS bundle loads. It covers app UI and will fail `assertVisible` on `testID`s if left up.

Top-level flows use `shared/launch-and-connect.yaml`, which wraps `launchApp` +
`shared/connect-dev-client.yaml` in a Maestro `retry` (mid-suite iOS relaunches can blank out
before “Development servers”). That shared connect flow: (1) taps the Metro URL, (2) taps
**Continue** to dismiss the onboarding card, (3) closes the dev-menu bottom sheet it reveals
(tapping the dimmed scrim above the sheet), (4) waits for `hello-world-screen`. Tapping
**Continue** alone is not enough — it only opens the full dev menu (Reload / Go home / …), which
still covers the app. New flows must `runFlow: shared/launch-and-connect.yaml` — do not assert
app UI before it finishes.

The runner executes each flow once per platform by default. Set `MOBILE_E2E_FLOW_RETRIES` to a
positive number to opt into end-of-suite retries of only failed flow YAMLs. Reports prefer the
latest pass for a flow title when both a failed and a retry `commands-*.json` exist.

Read the **failed slot** HTML (error banner + ❌ screenshot) before changing app code.

First-time native setup (once): `npm run mobile:install`, `npm run build:packages`,
`npm run mobile:prebuild` — see [APPS-MOBILE.md](../APPS-MOBILE.md).

More context (device names, flow naming): [README.md](./README.md).
