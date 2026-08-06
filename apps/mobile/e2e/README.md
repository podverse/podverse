# Mobile E2E flows

**Run the tests:** [HOW-TO-RUN.md](./HOW-TO-RUN.md) (start there).

Track 5 locks mobile E2E on **Maestro**.

- Chosen framework: Maestro
- Rejected for v1: Detox (higher native wiring overhead for this Expo-first phase)

## Device matrix

| Role                   | iOS                             | Android                    |
| ---------------------- | ------------------------------- | -------------------------- |
| Manual (dev)           | `"iPhone 17 Pro"`               | `Pixel_6_Pro_API_33`       |
| Automated (E2E phone)  | `"iPhone 17 Pro E2E"`           | `Pixel_6_Pro_API_33_e2e`   |
| Automated (E2E tablet) | `"iPad Pro 13-inch (M4) E2E"`   | `Pixel_Tablet_API_33_e2e`  |

Tablet slots are **opt-in** (`npm run mobile:e2e:test -- tablet`); see
[HOW-TO-RUN.md § Tablet screenshots](./HOW-TO-RUN.md#tablet-screenshots-opt-in).

## Report slots (OS + form factor)

```text
.artifacts/mobile-e2e-reports/latest/
  index.html              # hub
  ios-phone/index.html
  android-phone/index.html
  ios-tablet/index.html   # when tablet flow runs
  android-tablet/index.html
```

Each slot HTML matches web E2E chrome (summary + Prev/Next Shot/Test/Error).

Use **separate terminals** for Metro and E2E installs. `npm run mobile:e2e:test` boots E2E
devices and runs Maestro, but it is **strict**: Metro must already be on `:8081`, and the app must
already be installed on each E2E slot (no auto-install, no background Metro).

Manual `npm run mobile:ios` / `mobile:android` default to manual device names.

## Directory and naming

Keep all mobile E2E specs under `apps/mobile/e2e/` (not repo-root Playwright paths).

Use one flow file per area:

- `apps/mobile/e2e/<area>.yaml`
- `<area>` is kebab-case (for example: `hello-world`, `auth-login`, `home-feed`)
- Do not use Detox-style `.e2e.ts` naming in this repo's mobile track
- Include `takeScreenshot` steps so the HTML report has images to show
- After every `launchApp` (especially with `clearState: true`), `runFlow: shared/connect-dev-client.yaml`
  before asserting app UI

`SPEC` naming follows the same basename without `.yaml` (for example `hello-world` maps to
`apps/mobile/e2e/hello-world.yaml`).

## Why we dismiss the dev menu (and the release-build alternative)

Local mobile E2E uses an **Expo development client** + Metro (`npm run mobile:dev`). After
`clearState`, the launcher and the first-run **developer menu** (Continue) show again. Flows do not
fight that by skipping `clearState`; they go through `shared/connect-dev-client.yaml`, which
connects to Metro and dismisses the menu before assertions. That is intentional for the fast
local loop (no full native rebuild on every JS change).

**CI-grade / release-path alternative** (not wired yet): run Maestro against a **non-dev-client**
preview/release binary (no launcher, no developer menu, no Metro). Today
[`eas.json`](../eas.json) has `internal` (`developmentClient: true`), `beta`, and `production` —
there is no dedicated simulator/preview E2E profile. Prefer that path for CI later; keep the dismiss
flow for day-to-day Metro E2E.

## Current flows

Top-level `apps/mobile/e2e/<area>.yaml` files (examples): `hello-world`, `locale-switch-home-smoke`,
`api-health`, `auth-login`, `auth-logout`, `deep-link`, `push`, `tab-switch-playback`,
`home`, `search`, `search-unparsed`, `podcast-episode`, `add-by-rss`. New top-level YAML is
auto-included in the full suite.

**Start here for how to run:** [HOW-TO-RUN.md](./HOW-TO-RUN.md) (§ Run all → `npm run mobile:e2e:test:all`).

```bash
# Full suite (after API-backed prep in HOW-TO-RUN)
npm run mobile:e2e:test:all

# Focused
npm run mobile:e2e:test -- hello-world
```

Thin Make aliases: `make mobile_e2e_test` / `make mobile_e2e_test_report_spec SPEC=…` call the same
npm test script (`SPEC=all` for the full suite).

## Parallel worktree guidance

Maestro YAML specs in `apps/mobile/e2e/**` are safe to author in parallel per feature Track and
worktree.

For setup and scoping patterns, follow
[`mobile-worktree-scope`](/.cursor/skills/mobile-worktree-scope/SKILL.md).

Do not assume native module work (`apps/mobile/ios`, `apps/mobile/android`, `apps/mobile/modules`)
is always conflict-free; isolate native edits in dedicated worktrees when bridge or build changes
overlap.

Test environment and seed expectations for UI-only vs API-backed flows:
`apps/mobile/e2e/TEST-ENV.md`.

After running, review screenshots from the hub at `.artifacts/mobile-e2e-reports/latest/index.html`
(slot reports: `ios-phone/index.html`, `android-phone/index.html`; raw Maestro HTML is
`maestro.html` beside each slot).
