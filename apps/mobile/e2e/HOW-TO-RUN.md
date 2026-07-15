# How to run mobile E2E

From the **monorepo root**. Do not paste leave-running processes into the same shell as one-shot
commands — Metro and the mobile E2E API block forever until stopped.

## UI-only (four terminals)

Default smoke (`hello-world`) does **not** need deps, seed, or API.

```bash
# Terminal 1 — leave running
npm run mobile:dev

# Terminal 2 — wait until it finishes
npm run mobile:e2e:ios

# Terminal 3 — wait until it finishes
npm run mobile:e2e:android

# Terminal 4 — Maestro (exit when done)
npm run mobile:e2e:test
# or: npm run mobile:e2e:test -- hello-world
# or: npm run mobile:e2e:test -- hello-world,locale-switch-home-smoke
```

## API-backed (five terminals)

Use this for `api-health` and future auth/home/library flows. Terminal 1 must inject E2E API hosts
via `mobile:dev:e2e` (iOS `http://localhost:4230`, Android `http://10.0.2.2:4230`).

```bash
# One-shot prep (any terminal; exits)
make mobile_e2e_deps
make mobile_e2e_seed

# Terminal 1 — Metro with E2E API env (leave running)
npm run mobile:dev:e2e

# Terminal 2 — wait until it finishes
npm run mobile:e2e:ios

# Terminal 3 — wait until it finishes
npm run mobile:e2e:android

# Terminal 4 — API on :4230 (leave running)
npm run mobile:e2e:api

# Terminal 5 — Maestro (exit when done)
npm run mobile:e2e:test -- api-health
# or: npm run mobile:e2e:test -- auth-login
# or: npm run mobile:e2e:test -- auth-logout
# or: npm run mobile:e2e:test -- tab-switch-playback
```

Optional convenience: instead of a leave-running Terminal 4, start the API in the background from
the prep shell, then health-check:

```bash
npm run mobile:e2e:api:bg
npm run mobile:e2e:api:health
# when finished with API-backed runs:
npm run mobile:e2e:api:stop
```

Seeded login credential for future auth flows: `e2e-user@example.com` / `Test!1Aa`.

**Mobile E2E API** does not need a restart when you only restart Metro / `mobile:dev:e2e`. Keep it
leave-running; use `npm run mobile:e2e:api:health` in **Mobile** if unsure. Auth/tab flows fail
closed if `:4230` is down (`e2e-test.sh` checks before Maestro).

Maestro waits use `apps/mobile/e2e/shared/timeouts.env` (`TIMEOUT_FASTEST` … `TIMEOUT_SLOWEST`).
Prefer the fastest tier that can work; see **mobile-maestro-timeouts**.

## Reports

After Maestro finishes:

```bash
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/index.html
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

`failures.json` is the compact fail index (best starting point when debugging). Slot pages list
flows fails-first and link into `flows/<slug>/index.html` (error + screenshots). Hub cards open
slot summaries in a new tab. Tablet slots (`ios-tablet`, `android-tablet`) appear when those
devices are wired into the matrix later.

## If something fails

| Message / symptom                                             | Fix                                                                                                               |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Metro not listening on 8081                                   | Terminal 1: `npm run mobile:dev` (UI-only) or `npm run mobile:dev:e2e` (API-backed)                               |
| App not installed on E2E iOS                                  | Terminal 2: `npm run mobile:e2e:ios`                                                                              |
| App not installed on E2E Android                              | Terminal 3: `npm run mobile:e2e:android`                                                                          |
| API-backed flow cannot reach API (`:4230`)                    | Terminal 4: `npm run mobile:e2e:api`; then in another shell `npm run mobile:e2e:api:health`                       |
| API start says port 4230 already in use                       | Free the port or stop managed process: `npm run mobile:e2e:api:stop`                                              |
| Stuck on Expo “Development Build” launcher                    | Flows should run `shared/connect-dev-client.yaml` after `launchApp`                                               |
| Assertion fails; screenshot shows “developer menu” / Continue | Same shared flow dismisses the one-time Expo dev-client menu (see below)                                          |
| Maestro missing                                               | Install via repo flake (`maestro`) or [Maestro docs](https://docs.maestro.dev/getting-started/installing-maestro) |

### Dev-client developer menu

`launchApp` with `clearState: true` resets Expo’s “seen developer menu” flag, so the
onboarding sheet (“This is the developer menu…” with **Continue**) appears **every** E2E launch
after the JS bundle loads. It covers app UI and will fail `assertVisible` on `testID`s if left up.

`shared/connect-dev-client.yaml` already: (1) taps the Metro URL, (2) taps **Continue** to dismiss
the onboarding card, (3) closes the dev-menu bottom sheet it reveals (tapping the dimmed scrim
above the sheet), (4) waits for `hello-world-screen`. Tapping **Continue** alone is not enough — it
only opens the full dev menu (Reload / Go home / …), which still covers the app. New flows that
clear state must `runFlow` that file after every `launchApp` — do not assert app UI before it
finishes.

Read the **failed slot** HTML (error banner + ❌ screenshot) before changing app code.

First-time native setup (once): `npm run mobile:install`, `npm run build:packages`,
`npm run mobile:prebuild` — see [APPS-MOBILE.md](../APPS-MOBILE.md).

More context (device names, flow naming): [README.md](./README.md).
