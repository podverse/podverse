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
npm run mobile:e2e:api
```

Restart this after API fixture code changes (`PODVERSE_E2E_FIXTURES` / search / add-by-RSS
fixtures) — `e2e-api.sh` rebuilds on start. The Maestro runner fails fast if `/api/v2/health`
does not report `fixturesEnabled: true`.

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
> playhead jump on expand and collapse. See
> `.llm/plans/completed/mobile-pg5-video-gaps/01-video-surface-reparent.md`.

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
```

Playback flows (`play-mini-player`, `auto-queue-advance`) additionally need **Mobile E2E
test-assets** (`npm run mobile:e2e:test-assets` on `:2111`) leave-running for real media:

```bash
npm run mobile:e2e:test -- play-mini-player
# or: npm run mobile:e2e:test -- auto-queue-advance
```

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
flows fail closed if `:4230` is down (`e2e-test.sh` checks before Maestro).

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

## Tablet screenshots (opt-in)

Track 18.5 — verifies multi-column Home and podcast split detail on tablet viewports. **Not** part
of `mobile:e2e:test:all` (phone matrix stays unchanged). Uses dedicated E2E tablet devices:

| Slot           | Device                          |
| -------------- | ------------------------------- |
| iOS tablet     | `iPad Pro 13-inch (M4) E2E`     |
| Android tablet | `Pixel_Tablet_API_33_e2e`       |

**Mobile Metro** (leave running, API-backed):

```bash
npm run mobile:dev:e2e
```

**Mobile E2E API** (leave running):

```bash
npm run mobile:e2e:api
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

| Message / symptom                                                                          | Fix                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Metro not listening on 8081                                                                | **Mobile Metro**: `npm run mobile:dev` (UI-only) or `npm run mobile:dev:e2e` (API-backed / full suite)                                                                                                                                              |
| App not installed on E2E iOS                                                               | **Mobile iOS**: `npm run mobile:e2e:ios`                                                                                                                                                                                                            |
| App not installed on E2E Android                                                           | **Mobile Android**: `npm run mobile:e2e:android`                                                                                                                                                                                                    |
| App not installed on E2E iOS / Android tablet                                              | **Mobile iOS** / **Mobile Android**: `npm run mobile:e2e:ios:tablet` / `npm run mobile:e2e:android:tablet`                                                                                                                                          |
| `podcast-detail-split` missing on tablet flow                                              | Flow sets landscape; ensure tablet device is wide enough (`iPad Pro 13-inch (M4) E2E` / `Pixel_Tablet_API_33_e2e`). Re-run `ensure-devices.sh e2e-tablet`                                                                                            |
| API-backed flow cannot reach API (`:4230`)                                                 | **Mobile E2E API**: `npm run mobile:e2e:api`; then in **Mobile** `npm run mobile:e2e:api:health`                                                                                                                                                    |
| Runner exits: “Mobile E2E API … is stale (no fixtures)”                                    | API was started before fixture code. **Mobile E2E API**: stop and `npm run mobile:e2e:api` (rebuilds; health must show `fixturesEnabled: true`)                                                                                                     |
| Runner exits: playback flows need tools/test-assets on :2111                               | **Mobile E2E test-assets**: `npm run mobile:e2e:test-assets`; health: `npm run mobile:e2e:test-assets:health`                                                                                                                                       |
| Empty search / no `search-result-row-0` / no `rss-feed-play-first`                         | Same stale-API issue, or seed missing — runner auto-seeds; restart API if fixtures flag is false                                                                                                                                                    |
| `rss-playback-active` never appears after Play                                             | Restart **Mobile E2E test-assets** (`npm run mobile:e2e:test-assets` — binds `0.0.0.0` so IPv4/`10.0.2.2` works). Reload app after JS rewrite changes.                                                                                              |
| Network Error / “Could not sign in” / `tab-home` not visible in API-backed or `:all` runs  | Metro is UI-only (`mobile:dev`). **Mobile Metro**: stop it, run `npm run mobile:dev:e2e`, reload/reinstall the app so it targets `:4230`                                                                                                            |
| Runner exits: “Metro on :8081 is UI-only”                                                  | Same as above — API-backed / full-suite flows require `mobile:dev:e2e` (guard in `e2e-test.sh`)                                                                                                                                                     |
| API start says port 4230 already in use                                                    | Free the port or stop managed process: `npm run mobile:e2e:api:stop`                                                                                                                                                                                |
| Stuck on Expo “Development Build” launcher                                                 | Flows should run `shared/launch-and-connect.yaml` (retries Dev Client connect)                                                                                                                                                                      |
| Assertion fails; screenshot shows “developer menu” / Continue                              | Same shared flow dismisses the one-time Expo dev-client menu (see below)                                                                                                                                                                            |
| `App crashed or stopped` / fail on “Development servers” mid-suite; SpringBoard screenshot | Dev Client relaunch flake after `clearState` (not a feature bug). `launch-and-connect` retries connect; runner re-runs only failed flows once (`MOBILE_E2E_FLOW_RETRIES`, default `1`). Focused check: `npm run mobile:e2e:test -- podcast-episode` |
| Maestro missing                                                                            | Install via repo flake (`maestro`) or [Maestro docs](https://docs.maestro.dev/getting-started/installing-maestro)                                                                                                                                   |
| `play-mini-player` Android: Maestro `full-player-close` tap does not dismiss               | Expected for now — the flow uses `pressKey: Back` on Android (same `onClose` / `BackHandler` path). **Manually tap Close once** on an Android AVD/device before release to confirm real input dismisses the full player.                            |

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

The runner also re-runs **only failed** flow YAMLs once per platform after a suite pass
(`MOBILE_E2E_FLOW_RETRIES=1` by default; set `0` to disable). Reports prefer the latest pass for
a flow title when both a failed and a retry `commands-*.json` exist.

Read the **failed slot** HTML (error banner + ❌ screenshot) before changing app code.

First-time native setup (once): `npm run mobile:install`, `npm run build:packages`,
`npm run mobile:prebuild` — see [APPS-MOBILE.md](../APPS-MOBILE.md).

More context (device names, flow naming): [README.md](./README.md).
