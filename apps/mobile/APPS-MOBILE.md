# Contributor guide — `apps/mobile`

React Native + Expo prebuild workspace for the Podverse mobile app. LLM entrypoint:
[`AGENTS.md`](/apps/mobile/AGENTS.md). Master plan phasing:
[`mobile-master-plan-phasing`](/.cursor/skills/mobile-master-plan-phasing/SKILL.md).

Track 3 adds `package.json`, Expo config, and (after prebuild) generated `ios/` and `android/` trees.

## Project layout

Target structure (from
[DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md §2](/docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-MONOREPO-TARGET-STRUCTURE.md)):

```
apps/mobile/
  package.json              # mobile-only deps (added in Track 3)
  app.json / app.config.ts  # Expo config (prebuild)
  metro.config.js           # monorepo resolver + watchFolders
  tsconfig.json
  src/
    screens/                # RN screens (mirror web routes; native UI)
    navigation/             # tab + stack navigators
    hooks/                  # queue, auto-queue, playback wiring
    bridge/                 # NativePlaybackBridge
    state/                  # Account/Queue/AutoQueue providers
    storage/                # secure tokens, prefs, downloads metadata
  ios/                      # native iOS (CarPlay)
  android/                  # native Android (Android Auto)
  modules/                  # native modules (car/audio, downloads)
  e2e/                      # Maestro/Detox (NOT Playwright)
  AGENTS.md
  APPS-MOBILE.md
```

Generated trees (`ios/Pods/`, Android `build/`, `.expo/`) are gitignored and listed in
[`.cursorignore`](/.cursorignore).

## Media engine (`podverse-media-engine`)

First-party native media engine (PG-2b, Track 2) at `modules/podverse-media-engine/`. Single shared
`AVPlayer` (iOS) / Media3 `ExoPlayer` (Android) for phone, lock screen, and future CarPlay / Android
Auto now-playing. **Do not** use `react-native-track-player`.

- Bridge method/event contract and reserved native-cache write hooks:
  [modules/podverse-media-engine/README.md](modules/podverse-media-engine/README.md).
- TypeScript `NativePlaybackBridge` interface: `modules/podverse-media-engine/src/`.
- Car foundation constraints:
  [mobile-carplay-android-auto](/.cursor/rules/mobile-carplay-android-auto.mdc). Seamless car
  acceptance is **Track 12** (12.5–12.6, 12.17–12.18), not PG-2b.
- Spike go/no-go gate (step 2.34):
  [modules/podverse-media-engine/GO-NO-GO.md](modules/podverse-media-engine/GO-NO-GO.md) — **GO**
  (2026-07-13). Seamless CarPlay / Android Auto acceptance remains Track 12.

## Toolchain

- **Node / npm:** from the repo Nix flake — use `./scripts/nix/with-env` from monorepo root (see
  [CURSOR-NIX-WITH-ENV.md](/docs/development/tooling/CURSOR-NIX-WITH-ENV.md)).
- **Expo CLI:** via `apps/mobile` scripts after `npm run mobile:install` (standalone install — not a
  root workspace member).
- **Xcode (iOS) and Android SDK:** installed locally outside Nix; required for simulators/devices and
  prebuild output.

## Commands from repo root

Always run from the **monorepo root** (see
[commands-from-monorepo-root](/.cursor/rules/commands-from-monorepo-root.mdc)). Mobile is **outside**
the root npm workspace — do **not** use `-w @podverse/mobile` / `-w apps/mobile`. Use root scripts or
`npm --prefix apps/mobile`.

```bash
# One-shot: clean + root install + build:packages + mobile install
./scripts/nix/with-env npm run deps:init
# Optional iOS native trees + CocoaPods:
./scripts/nix/with-env npm run deps:init:native

# Or step-by-step:
./scripts/nix/with-env npm ci                 # server workspaces only (no Expo)
./scripts/nix/with-env npm run build:packages # prerequisite before Metro (shared dist/)
./scripts/nix/with-env npm run mobile:install # apps/mobile package-lock.json
./scripts/nix/with-env npm run mobile:dev
```

Root `rm -rf node_modules && npm i` (or root `npm ci`) does **not** install mobile — `apps/mobile`
is outside the npm workspaces. Use `deps:init` or `mobile:install` for that tree.

For native iOS/Android builds use the Nix-stripping root scripts below (`npm run mobile:ios` /
`mobile:android`) — **not** `./scripts/nix/with-env npm --prefix apps/mobile run ios`, which runs
`xcodebuild` under the Nix toolchain and fails with the `-index-store-path` clang error.

Native prebuild, CocoaPods, and native builds use root scripts with a **macOS-native PATH**
(Nix/direnv stripped) so `xcodebuild` / Gradle use Xcode's clang, not the Nix clang wrapper:

```bash
npm run mobile:prebuild
npm run mobile:pod-install
npm run mobile:ios       # expo run:ios via macOS-native toolchain
npm run mobile:android   # expo run:android via macOS-native toolchain

# ESLint (root eslint.config.mjs Tier D / RN override; also part of npm run lint)
npm run mobile:lint
npm run mobile:lint:fix
```

`mobile:dev` (Metro; alias `dev:mobile`) is a **root** script that runs `npm --prefix apps/mobile run start`. Metro is
pure JS and does not compile native code, so it runs fine under direnv:

```bash
./scripts/nix/with-env npm run mobile:dev
```

Do **not** wrap `mobile:ios` / `mobile:android` with `./scripts/nix/with-env`. They strip Nix
internally (see § Native builds and the `-index-store-path` clang error); they only need `node` on
PATH, which direnv already provides.

## Native toolchain prerequisites (outside Nix)

Install on the host machine (not provided by the repo flake):

| Platform | Requirement                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------- |
| iOS      | Xcode (current stable), Xcode Command Line Tools, CocoaPods (`gem install cocoapods` or Homebrew) |
| Android  | Android Studio (SDK + emulator), `ANDROID_HOME` (default `~/Library/Android/sdk`), JDK 17+        |
| Both     | Physical device or simulator/emulator for dev-client builds (steps 3.14–3.15)                     |

**Android JDK:** `npm run mobile:android` uses [`run-expo-macos.sh`](/scripts/mobile/run-expo-macos.sh),
which sets `JAVA_HOME` from Android Studio’s bundled JBR when unset. You do not need a separate system
JDK if Studio is installed. Prefer a **phone** AVD (e.g. `Pixel_6_Pro_API_33`), not a tablet:

```bash
"$HOME/Library/Android/sdk/emulator/emulator" -list-avds
npm run mobile:android -- --device Pixel_6_Pro_API_33
```

After first clone or dependency change, from **monorepo root** (not `apps/` or `apps/mobile/ios`):

```bash
npm run deps:init:native   # clean + installs + build:packages + prebuild/pods
npm run mobile:dev
```

If `ios/` / `android/` were wiped mid-prebuild (or `prebuild:clean` failed), recover with:

```bash
npm run mobile:reset
```

That reinstalls mobile JS deps, runs `expo prebuild --clean --no-install`, then CocoaPods via the
macOS-native helper. Prefer it over chaining bare `prebuild:clean` + `mobile:pod-install`.

Equivalent step-by-step:

```bash
npm ci
npm run build:packages
npm run mobile:install
npm run mobile:prebuild
npm run mobile:dev
```

[`mobile:prebuild`](/scripts/mobile/prebuild-macos.sh) runs `expo prebuild --no-install`, then
[`mobile:pod-install`](/scripts/mobile/pod-install-macos.sh) with a PATH that excludes Nix — required
when [direnv](/.envrc) (`use flake`) is active. Do **not** use `npm run start -w @podverse/mobile`;
mobile is not a root workspace member — use `npm run mobile:install` / `mobile:dev` / `--prefix`.

Or run iOS/Android via `npm run mobile:ios` / `npm run mobile:android` after prebuild + pods.

**Prerequisite:** run `npm run build:packages` before mobile dev or build. Metro consumes Tier A
packages via their compiled **`dist/`** (`main` / `types`) through `file:` links, not TypeScript
source. Metro does **not** run `tsc` for you — after editing `packages/*`, rebuild or use a targeted
watcher (see § Dev client workflow).

## Dev client workflow

This app uses **`expo-dev-client`** (not Expo Go). Metro serves JavaScript; a **native dev-client app**
(`com.podverse.app.next`) must be built and installed separately.

### Two terminals (typical session)

| Terminal             | Command                                  | Role                                       |
| -------------------- | ---------------------------------------- | ------------------------------------------ |
| Mobile Metro         | `npm run mobile:dev`                     | Keep running — Expo + Metro on `:8081`     |
| Mobile iOS / Android | `npm run mobile:ios` or `mobile:android` | First install and after native dep changes |

VS Code preset tabs: [`.vscode/terminals.json`](/.vscode/terminals.json) (`Mobile`, `Mobile E2E prep`,
`Mobile Metro`, `Mobile iOS`, `Mobile Android`, `Mobile E2E API`, `Mobile E2E test`).

### First-time / after prebuild order

From **monorepo root**:

```bash
npm run build:packages
npm run mobile:prebuild          # once, or after app.config / native plugin changes
npm run mobile:dev               # terminal 1 — leave running
npm run mobile:ios -- --device "iPhone 17 Pro"   # terminal 2 — named sim (no picker)
```

On later days (JS-only changes): start Metro; open the already-installed dev client on device/simulator.
Re-run `mobile:ios` / `mobile:android` when native deps, plugins, or prebuild output change.

Pressing **`i`** or **`a`** in the Metro terminal only works **after** the dev client is installed.
Until then you get `No development build (com.podverse.app.next) for this project is installed`.

### iOS simulator or device selection (Expo SDK 52)

Use **`--device` with a fixed name**, not `--simulator` (removed in current Expo CLI). Manual vs
E2E use **different device slots** (same app id `com.podverse.app.next`):

| Role            | iOS                   | Android                  |
| --------------- | --------------------- | ------------------------ |
| Manual (dev)    | `"iPhone 17 Pro"`     | `Pixel_6_Pro_API_33`     |
| Automated (E2E) | `"iPhone 17 Pro E2E"` | `Pixel_6_Pro_API_33_e2e` |

`npm run mobile:ios` / `mobile:android` default to **manual** names when `--device` is omitted.
`npm run mobile:e2e:*` boots and targets **E2E** names only (`bash scripts/mobile/ensure-devices.sh`).
Avoid bare `--device` unless you intentionally want the interactive picker (e.g. physical USB device).

```bash
xcrun simctl list devices available              # see what you have first
npm run mobile:ios -- --device "iPhone 17 Pro"   # manual named sim
npm run mobile:android -- --device Pixel_6_Pro_API_33
bash scripts/mobile/ensure-devices.sh e2e        # create/boot E2E twins
```

Do **not** copy-paste **`iPhone 15` / `iPhone 15 Pro`** from old guides — those are legacy templates on
iOS 17 runtimes, not iOS 15 OS, and are often absent on Xcode 26 machines. If a name is ambiguous (same
model on multiple runtimes), pass the UDID from `simctl list`.

Boot a **manual** sim before `xcrun simctl launch booted …`:

```bash
xcrun simctl boot "iPhone 17 Pro"
open -a Simulator
```

Physical device: `npm run mobile:ios -- --device` with USB connected (interactive list).

Install missing runtimes in **Xcode → Settings → Platforms** when `xcodebuild` says a platform is not
installed.

### Shared packages: build vs watch

| When                                                               | Command                                                       |
| ------------------------------------------------------------------ | ------------------------------------------------------------- |
| Session start / after pull                                         | `npm run build:packages`                                      |
| Editing `apps/mobile/src/**` only                                  | Metro fast refresh — no package build                         |
| Editing `packages/helpers` (or other `@podverse/*` mobile imports) | `npm run build:watch -w packages/helpers` in a spare terminal |

Full `npm run watch:packages` watches ~20 packages (same as web `dev:main:all`) — use targeted
`build:watch -w …` for mobile unless you are changing many shared packages.

## Dependency stack (standalone install)

Mobile is **outside** the root npm workspace. Server `npm ci` never installs Expo/RN. Keep the
pieces below; see **mobile-expo-monorepo** skill for failure modes.

| Piece            | Location                                       | Role                                                  |
| ---------------- | ---------------------------------------------- | ----------------------------------------------------- |
| Mobile lockfile  | `apps/mobile/package-lock.json`                | Committed; `npm run mobile:install`                   |
| Peer-deps policy | `apps/mobile/.npmrc` (`legacy-peer-deps=true`) | Stop `expo@*` peers pulling expo@57                   |
| Pins             | `apps/mobile/package.json` `overrides` + deps  | Expo SDK 52 / RN 0.76.9 + expo-dev-*                  |
| Shared packages  | `file:../../packages/helpers` (etc.)           | Symlinks into `apps/mobile/node_modules/@podverse/*`  |
| Metro            | `apps/mobile/metro.config.js`                  | Watch `packages/`; resolve from mobile `node_modules` |

Root `package.json` lists **explicit server apps** in `workspaces` (not `apps/*`) and must not carry
Expo / React Native / Metro toolchain deps.

### Expo SDK upgrade

When upgrading SDK, update **`apps/mobile` only**, then verify:

```bash
npm run mobile:install
npm --prefix apps/mobile why expo
npm --prefix apps/mobile why react-native
npm run mobile:prebuild
npm run mobile:dev
```

Use `npx expo install --fix` from `apps/mobile` for runtime deps; keep `overrides` aligned.

## Troubleshooting

### `Cannot read properties of undefined (reading 'extract')` during prebuild

Expo SDK 52 `@expo/cli` expects **`tar` v6** (CJS default export with `.extract`). A `tar@7`
override breaks clean prebuild after wiping `ios/` / `android/`. Keep
`apps/mobile/package.json` `overrides.tar` at **`6.2.1`**, then recover with:

```bash
npm run mobile:reset
```

Do **not** chain bare `npm --prefix apps/mobile run prebuild:clean` + `npm run mobile:pod-install`
when native dirs were already deleted mid-failure — `mobile:reset` reinstalls mobile deps, runs
clean prebuild non-interactively, then pods.

### `cd: apps/mobile/ios does not exist`

You are probably in `apps/`, not the repo root. From `apps/mobile/ios`, `cd ../..` lands in
`apps/` — so `rm -rf apps/mobile/ios` and `cd apps/mobile/ios` resolve to non-existent
`apps/apps/mobile/...`. Use absolute paths or `cd` to the monorepo root first:

```bash
cd /path/to/podverse
rm -rf apps/mobile/ios apps/mobile/android
npm run mobile:prebuild
```

### `Cannot find module '@podverse/helpers'` (or design-tokens)

Mobile `file:` links are missing or stale. From repo root:

```bash
npm run build:packages
npm run mobile:install
```

### `DOMParser.parseFromString: mimeType "undefined" is not valid` (`expo run:ios --device`)

Expo `@expo/plist` calls `parseFromString(xml)` with one argument while listing USB devices
(usbmux). `@xmldom/xmldom@0.9.x` requires an explicit mimeType and throws. Mobile must pin
**`@xmldom/xmldom@0.8.10`** in `apps/mobile/package.json` overrides (do **not** copy the root
`0.9.10` pin used for video.js). After changing the override:

```bash
npm run mobile:install
npm run mobile:ios -- --device
```

Quick unblock without reinstall: target a named simulator (may skip usbmux probing):

```bash
xcrun simctl list devices available
npm run mobile:ios -- --device "iPhone 16 Pro"
```

### `Unable to resolve "date-fns/…"` (or `he` / `uuid`) from `@podverse/helpers`

Metro only searches `apps/mobile/node_modules`. `@podverse/helpers` is a `file:` link; its
dependencies are not auto-installed into the mobile tree. Declare the same runtime deps on
`apps/mobile` (`date-fns`, `he`, `uuid`), then:

```bash
npm run mobile:install
```

Restart `npm run mobile:dev` and reload the sim (`r`).

### `Cannot find module 'expo/config-plugins'` / wrong Expo major

Reinstall under `apps/mobile` and confirm overrides pin SDK 52. Do **not** add Expo to the root
lockfile.

```bash
npm run mobile:install
npm run mobile:prebuild
```

### `Unable to resolve react-native-web` / Web Bundling failed (Metro)

Expo may try **web** if `react-dom` is visible from the monorepo. Mobile is native dev-client only.
Fix: [`app.config.ts`](/apps/mobile/app.config.ts) sets `platforms: ['ios', 'android']`. Use **`i`** /
**`a`**, or `npm run mobile:ios` / `mobile:android` — not **`w`**.

### Root `npm ci` installs Expo / audit fails on expo-dev-launcher

Mobile was re-added to root `workspaces` or Expo was restored under root `devDependencies`. Remove
it; keep the explicit server app list and standalone `apps/mobile` install.

### `pod install` / Xcode SDK errors (glog / `unable to find sdk: iphoneos`)

CocoaPods compiles glog with the iOS SDK. When **direnv** loads the Nix flake ([`.envrc`](/.envrc)
`use flake`), Nix sets **`DEVELOPER_DIR` and `SDKROOT` to a Nix apple-sdk** (no iPhoneOS SDKs). `xcrun`
and glog configure then fail (`unable to find sdk: iphoneos`; log may show `/nix/store/...`). Nix `bash`
and `coreutils` on PATH can also break native compiles (`C compiler cannot create executables`). Avoiding
`./scripts/nix/with-env` alone is not enough — the pollution comes from direnv itself.

Fix: from **repo root**, use `npm run mobile:prebuild` or `npm run mobile:pod-install` — these call
[scripts/mobile/pod-install-macos.sh](/scripts/mobile/pod-install-macos.sh), which unsets `NIX_*` +
`DEVELOPER_DIR` + `SDKROOT`, re-derives Xcode via `xcode-select -p`, trims PATH to macOS tools (keeping
`node` from direnv), then resolves the iOS SDK. Requires Xcode (not just CLT), CocoaPods, and Node on
PATH (direnv). If SDK resolution still fails: `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`
then `xcodebuild -runFirstLaunch`.

### `iOS Bundling failed` / Node `crypto` (or other Node stdlib) from `@podverse/helpers`

Importing the **`@podverse/helpers` barrel** (`import { … } from '@podverse/helpers'`) pulls the full
`dist/index.js`, which re-exports Node-only modules (e.g. `hash.js` → `crypto`). Metro cannot bundle those
for React Native — the dev client shows a **white screen** while the Metro terminal reports bundling failed.

Fix: import **mobile-safe subpaths** only (no Node builtins in that file), e.g.
`import { DEFAULT_LOCALE } from '@podverse/helpers/locales'`. Add new subpaths in
[`packages/helpers/package.json`](/packages/helpers/package.json) `exports` when mobile needs more symbols.
Keep [`metro.config.js`](/apps/mobile/metro.config.js) `resolver.unstable_enablePackageExports = true`.

After changing helpers exports or Tier A sources: `npm run build:packages`, restart `npm run mobile:dev`, reload
the sim (`r` in Metro or re-open the app).

### `fmt` / `FMT_STRING` / `consteval` errors with Xcode 26+

React Native 0.76 bundles **fmt 11.0.2** (via `RCT-Folly`). **Xcode 26+** (Apple clang 21) enforces
C++20 `consteval` more strictly, so `xcodebuild` fails compiling the `fmt` pod:

```
call to consteval function 'fmt::basic_format_string<...>' is not a constant expression
```

(`format-inl.h`; exit code 65.) This is unrelated to Nix/direnv — glog may compile successfully before
`fmt` fails.

Fix: [`scripts/mobile/pod-install-macos.sh`](/scripts/mobile/pod-install-macos.sh) runs
[`patch-fmt-xcode26.sh`](/scripts/mobile/patch-fmt-xcode26.sh) after every `pod install` (disables
`FMT_USE_CONSTEVAL` in `Pods/fmt/include/fmt/base.h`). From **repo root**:

```bash
npm run mobile:pod-install
npm run mobile:ios -- --device "iPhone 16 Pro"
```

Workaround until an Expo/RN upgrade ships fmt ≥ 12.1.0 (see
[fmtlib/fmt#4740](https://github.com/fmtlib/fmt/issues/4740),
[react-native#56225](https://github.com/facebook/react-native/pull/56225)).

### `switch must be exhaustive` in `expo-localization` / `LocalizationModule.swift` (Xcode 26)

iOS 26 added `Calendar.Identifier` cases. Expo SDK 52's `expo-localization@16.0.1` switch has no
`@unknown default`, so Swift fails with `switch must be exhaustive` (xcodebuild exit 65). The repo
patches that file via
[`patch-expo-localization-xcode26.sh`](/scripts/mobile/patch-expo-localization-xcode26.sh) after
`mobile:install` and before `mobile:ios`. From **repo root**:

```bash
npm run mobile:install
npm run mobile:ios -- --device "iPhone 17 Pro"
```

Upstream fix is in Expo SDK 53+; do not bump Expo solely for this while mobile stays on SDK 52.

### `No development build (com.podverse.app.next) is installed` (Metro **`i`** / **`a`**)

`npm run mobile:dev` starts Metro only. The dev-client native app is not Expo Go — it must be built
once with `expo run:ios` / `expo run:android` (`npm run mobile:ios` / `mobile:android`, or
`npm run mobile:ios -- --device`). See § Dev client workflow.

### `xcodebuild` exited with error code 70 / Unable to find a destination

Xcode could not use the simulator Expo selected (stale UUID, booted sim on an old iOS runtime, or
simulator platform not installed). Log may say `iOS X.X is not installed` — download the runtime in
**Xcode → Settings → Platforms**.

Fix: `xcrun simctl list devices available`, then target a valid sim explicitly:

```bash
npm run mobile:ios -- --device "iPhone 17 Pro"
```

Use a UDID if the name is ambiguous. Or open
[`PodverseNext.xcworkspace`](/apps/mobile/ios/PodverseNext.xcworkspace) in Xcode, pick a valid
destination, and Run (⌘R).

### `Unknown arguments: --simulator` (`expo run:ios`)

Expo SDK 52 uses **`--device`** for simulators and physical devices, not `--simulator`:

```bash
npm run ios -w @podverse/mobile -- --device "iPhone 17 Pro"
```

### `Missing script: mobile:dev`

`mobile:dev` is defined in the **root** [package.json](/package.json), not in `apps/mobile/package.json`
(`dev:mobile` is a compatibility alias). Run `npm run mobile:dev` from the monorepo root. Do not use
`-w @podverse/mobile` with that script name.

### Linux lockfile refresh

From repo root (requires Docker):

```bash
bash ./scripts/development/update-lockfile-linux.sh
npm install
```

Do not run the script from `apps/mobile/ios` — paths are relative to the monorepo root.

## Metro monorepo configuration

`apps/mobile/metro.config.js` watches `packages/` and resolves modules from
**`apps/mobile/node_modules` only** (standalone install — not root workspaces).

- **`watchFolders`:** `packages/` so Metro sees shared package `dist/` after `build:packages`.
- **`resolver.nodeModulesPaths`:** `apps/mobile/node_modules` only (keeps Expo/RN isolated from root).
- **`@podverse/*`:** `file:` links → each package `"main"` / `exports` entry under `dist/`.
- **Transitive deps of `file:` packages** (`date-fns`, `he`, `uuid` from `@podverse/helpers`, etc.)
  must be listed as **direct** `apps/mobile` dependencies so they install under
  `apps/mobile/node_modules`. Root-hoisted copies are invisible to this Metro config.

Do **not** point Metro at Tier A **source** trees; NodeNext `.js` specifiers in package source are for
Node apps only. Re-run `npm run build:packages` after changing shared packages.

Import style in app source is **Tier D** (extensionless relatives). See
[DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md](/docs/development/tooling/DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md).

## Testing

| Tier          | Where                    | How                                                                 |
| ------------- | ------------------------ | ------------------------------------------------------------------- |
| Shared policy | `packages/playback-core` | Vitest (included in root `test:unit`)                               |
| Mobile app    | `apps/mobile`            | Vitest when configured (excluded from root `test:unit` until ready) |
| Mobile E2E    | `apps/mobile/e2e/`       | Maestro (`e2e/<area>.yaml`) — **not** `make e2e_*`                  |

Track 5 locks mobile E2E on Maestro. Naming convention:

- `apps/mobile/e2e/<area>.yaml` (`<area>` in kebab-case)
- `SPEC=<area>` maps to the same basename without `.yaml` for mobile E2E targets

Canonical mobile E2E report root: `.artifacts/mobile-e2e-reports/latest/` (separate from web
`.artifacts/e2e-reports/`). Hub at `latest/index.html`; per-slot reports at
`latest/ios-phone/index.html` and `latest/android-phone/index.html` (tablet slots reserved).

**Operator how-to (shortest path):** [e2e/HOW-TO-RUN.md](./e2e/HOW-TO-RUN.md)

Operator commands from monorepo root — **separate terminals** for leave-running processes. Full
matrix: [e2e/HOW-TO-RUN.md](./e2e/HOW-TO-RUN.md).

UI-only (four terminals):

```bash
# T1 — Metro (leave running)
npm run mobile:dev

# T2 / T3 — install/launch on E2E slots (--no-bundler; exits when done)
npm run mobile:e2e:ios
npm run mobile:e2e:android

# T4 — Maestro + HTML report (strict: requires Metro + installed app)
npm run mobile:e2e:test
npm run mobile:e2e:test -- hello-world
npm run mobile:e2e:test -- hello-world,locale-switch-home-smoke
open .artifacts/mobile-e2e-reports/latest/index.html
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html

# Thin Make aliases (same as mobile:e2e:test; do not auto-install or start Metro)
make mobile_e2e_test
make mobile_e2e_test_report_spec SPEC=hello-world
```

API-backed (five terminals; Track 5 harness; no auth login/logout yet):

```bash
# One-shot prep (any shell; exits)
make mobile_e2e_deps
make mobile_e2e_seed

# T1 — leave running: npm run mobile:dev:e2e
# T2 / T3 — exits: npm run mobile:e2e:ios / mobile:e2e:android
# T4 — leave running: npm run mobile:e2e:api
# T5 — exits:
npm run mobile:e2e:test -- api-health
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

Do **not** paste `mobile:dev:e2e` or `mobile:e2e:api` into the same one-line shell sequence as
Maestro — those block until stopped. Prefer `mobile:e2e:api:bg` + `mobile:e2e:api:health` only when
you intentionally want a background API from the prep shell.

Manual day-to-day (separate devices; not E2E slots): `npm run mobile:ios` /
`npm run mobile:android`.

Use optional SPEC args (or Make `SPEC=<area>`) mapping to `apps/mobile/e2e/<area>.yaml`. Mobile
E2E is Maestro-only for this track: do not use Playwright and do not use web `make e2e_*` targets.

For API base URL, seed expectations, and the API-backed smoke flow (`api-health`) see
`apps/mobile/e2e/TEST-ENV.md`.

Root `npm run lint` / `npm run lint:fix` include `apps/mobile` via a dedicated ESLint step (mobile is
outside npm workspaces). Use `npm run mobile:lint` / `mobile:lint:fix` to lint only mobile. Tier D /
RN overrides live in root `eslint.config.mjs`. Type-check and `test:unit` still skip mobile until RN
tsc/Vitest enrollment.

## i18n runtime

- Runtime: `i18next` + `react-i18next` + `expo-localization` (no `next-intl` in mobile runtime).
- Source catalogs come from `packages/i18n-catalog` layered merge output (`shared + consumer + mobile`).
- Mobile runtime loads generated `apps/mobile/i18n/compiled/*.json`.
- Locale boot order:
  1. Detect device locale with `expo-localization`
  2. Fallback to `DEFAULT_LOCALE` from `@podverse/helpers/locales`
  3. Apply account locale override when available (see `src/i18n/index.ts`)
- Duration formatting uses `@podverse/helpers/timeFormatter` so mobile and web stay aligned.
- `start` runs `prestart` → `i18n-compile` to ensure compiled catalogs exist before Metro startup.

Generate mobile compiled locale catalogs from repo root:

```bash
npm run i18n:compile
```

## Marketing version (`X.Y.Z`)

Store-facing marketing version comes from `apps/mobile/package.json` `"version"`, which
[`scripts/publish/bump-version.sh`](/scripts/publish/bump-version.sh) updates with every other workspace.
[`app.config.ts`](/apps/mobile/app.config.ts) imports that field (`version: packageJson.version`) so Expo
prebuild, `expo-constants`, and native `CFBundleShortVersionString` / `versionName` stay aligned without a
second manual edit.

Monotonic **build numbers** (`CFBundleVersion`, `versionCode`) are CI-only and planned for master plan step
4.17 — not in app config yet. See
[DOCS-MOBILE-VERSIONING-RELEASE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-VERSIONING-RELEASE.md).

After a version bump, re-run prebuild if native `ios/` / `android/` trees already exist so Info.plist /
Gradle pick up the new marketing version.

## CI and build graph

- `apps/mobile` is **not** on `build:packages` or `build:apps`; native builds use a separate macOS CI
  track (see master plan Track 20).
- Mobile runtime dependencies live in `apps/mobile/package.json`. Root **mobile toolchain
  devDependencies** (`expo`, `react`, `react-native`, Metro **0.81.5** toolchain set) exist so npm-hoisted
  Expo plugins and Metro config resolve at the repo root (see **mobile-expo-monorepo** skill).

### PG-3 CI tooling and account costs

- CI tooling decision for Track 4 is **EAS Build + EAS Submit**. Fastlane is documented as a future
  escape hatch, not a PG-3 implementation target.
- Store account prerequisites for the `.next` app remain:
  - Apple Developer Program: approximately **$99/year**
  - Google Play Console registration: approximately **$25 one-time**
- EAS pricing can change; do not hardcode plan prices in repo docs. Use
  [Expo pricing](https://expo.dev/pricing) as the source of truth for current free/paid tier limits.
- Free tier and local `expo run:*` workflows are still valid for early internal development.

### Store identity isolation (`.next`) checklists

`apps/mobile/app.config.ts` is the source of truth for next-gen store identity and currently uses
`com.podverse.app.next` for both iOS `bundleIdentifier` and Android `applicationId`.

Store-safety rule for PG-3 through step 4.25: **never** upload next-gen binaries to existing
Podverse production listings.

App Store Connect checklist (operator):

- Create a separate App Store Connect app record for Podverse Next.
- Use bundle id `com.podverse.app.next` (do not reuse prod Podverse bundle id).
- Keep TestFlight/internal/external testing scoped to the new listing only.
- Do not connect this app record to production Podverse release pipelines.

Google Play Console checklist (operator):

- Create a separate Play Console app for `com.podverse.app.next` (or a clearly isolated testing app).
- Keep internal/closed testing tracks scoped to the next-gen listing only.
- Do not upload `com.podverse.app.next` artifacts to production Podverse listing/tracks.
- Keep signing and release credentials isolated from existing production app workflows.

### Workflow isolation from server publish

Mobile release workflows are intentionally isolated from server release workflows:

- Mobile: `.github/workflows/mobile-internal.yml`, `mobile-staging-beta.yml`,
  `mobile-production-submit.yml`
- Server publish: `.github/workflows/publish-staging.yml`, `publish-main.yml`

Do not add `needs:` coupling between these groups. Mobile workflows must never block server publish
jobs, and server publish workflows must not depend on mobile jobs.

### Runner and signing guidance (PG-3)

Runner choice by job type:

- iOS simulator E2E and iOS-native mobile jobs use `runs-on: macos-latest` (Xcode/simulator required).
- EAS cloud builds can run from macOS or Linux orchestration jobs because compile/signing happens in
  EAS infrastructure; this repo currently keeps mobile workflow stubs on macOS for consistency.
- Android emulator UI testing can run on macOS or Linux with Android SDK/AVD, but default test target
  remains `Pixel_6_Pro_API_33` (no tablet AVD default).

Signing and secrets checklist:

- Use `EXPO_TOKEN` in CI runtime for authenticated EAS CLI operations.
- Prefer EAS-managed credentials for iOS certificates/profiles and Android keystores.
- Keep `.next` app credentials isolated from current production app credentials until convergence
  decision step 4.25.
- Never commit signing artifacts, keystores, `.p12`, provisioning profiles, or API keys to git.

### Branch channels and versions (PG-3)

Branch-to-channel mapping for the next-gen `.next` app:

| Branch    | Workflow                                         | Distribution channel target                           |
| --------- | ------------------------------------------------ | ----------------------------------------------------- |
| `develop` | `.github/workflows/mobile-internal.yml`          | Internal-only testing (`internal` profile)            |
| `staging` | `.github/workflows/mobile-staging-beta.yml`      | Beta channel (`beta` profile; TestFlight/Play beta)   |
| `main`    | `.github/workflows/mobile-production-submit.yml` | Production submit (`production` profile, manual gate) |

Production submit is manual-gated and should promote only QA-validated binaries. Rollouts should
stay staged (App Store phased release / Play staged rollout), not instant 100% rollout.

Versioning policy:

- Marketing version (`X.Y.Z`) comes from `apps/mobile/package.json` and is synced by
  [`scripts/publish/bump-version.sh`](/scripts/publish/bump-version.sh) (mobile included explicitly).
- Build numbers must remain monotonic (`CFBundleVersion` / `versionCode`) for `.next` builds.
- Preferred mechanism is EAS profile auto-increment once `apps/mobile/eas.json` profiles are fully
  wired; do not reset build-number sequences between channels.

### OTA policy and EAS profiles (PG-3)

OTA policy boundary:

- Use **EAS Update** only for JavaScript/content-only changes.
- Any native-impacting change (Expo config plugins, prebuild output, native modules, iOS/Android
  project changes, ABI-affecting deps) requires a new store build and submit flow.

EAS profile source of truth:

- `apps/mobile/eas.json` defines `internal`, `beta`, and `production` profiles.
- Mobile workflows use those profiles directly for branch-channel mapping.
- Build numbers use profile-level `autoIncrement` to keep `CFBundleVersion` / `versionCode`
  monotonic for `.next`.

Store metadata as code:

- Keep next-gen listing metadata under `apps/mobile/store-metadata/`.
- Do not sync these assets to existing Podverse production listings before step 4.25.

## Related docs

- [DOCS-MOBILE-LLM-CURSOR-SETUP.md](/docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-LLM-CURSOR-SETUP.md)
- [DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md)
- [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
- [MOBILE-RELEASE-RUNBOOK.md](/docs/operations/mobile/MOBILE-RELEASE-RUNBOOK.md)
- [MOBILE-BETA-TESTER-ONBOARDING.md](/docs/operations/mobile/MOBILE-BETA-TESTER-ONBOARDING.md)
- [podverse-media-engine README](modules/podverse-media-engine/README.md) — bridge contract + cache hooks
