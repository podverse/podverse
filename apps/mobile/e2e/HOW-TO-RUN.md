# How to run mobile E2E

From the **monorepo root**, use **four terminals**. Do not skip ahead — the test command
fails if Metro is down or the app is missing on an E2E device.

```bash
# Terminal 1 — leave running
npm run mobile:dev

# Terminal 2 — wait until it finishes
npm run mobile:e2e:ios

# Terminal 3 — wait until it finishes
npm run mobile:e2e:android

# Terminal 4
npm run mobile:e2e:test
```

Then open the **hub**, then the slot that matters:

```bash
open .artifacts/mobile-e2e-reports/latest/index.html
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

That is the happy path for the default `hello-world` smoke. Slot reports match web E2E chrome
(summary + Prev/Next Error). Tablet slots (`ios-tablet`, `android-tablet`) appear when those
devices are wired into the matrix later.

## Optional

```bash
# One named flow
npm run mobile:e2e:test -- hello-world

# Several flows
npm run mobile:e2e:test -- hello-world,locale-switch-home-smoke
```

## If something fails

| Message / symptom                                             | Fix                                                                                                               |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Metro not listening on 8081                                   | Run Terminal 1: `npm run mobile:dev`                                                                              |
| App not installed on E2E iOS                                  | Run Terminal 2: `npm run mobile:e2e:ios`                                                                          |
| App not installed on E2E Android                              | Run Terminal 3: `npm run mobile:e2e:android`                                                                      |
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

First-time native setup (once): `npm run mobile:install`, `npm run build:packages`, `npm run mobile:prebuild` — see [APPS-MOBILE.md](../APPS-MOBILE.md).

More context (device names, flow naming): [README.md](./README.md).
