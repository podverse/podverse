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

## Toolchain

- **Node / npm:** from the repo Nix flake — use `./scripts/nix/with-env` from monorepo root (see
  [CURSOR-NIX-WITH-ENV.md](/docs/development/tooling/CURSOR-NIX-WITH-ENV.md)).
- **Expo CLI:** via `apps/mobile` workspace scripts once bootstrapped.
- **Xcode (iOS) and Android SDK:** installed locally outside Nix; required for simulators/devices and
  prebuild output.

## Commands from repo root

Always run from the **monorepo root** (see
[commands-from-monorepo-root](/.cursor/rules/commands-from-monorepo-root.mdc)). Use `-w apps/mobile`
when the workspace defines scripts.

```bash
./scripts/nix/with-env npm run build:packages   # prerequisite before Metro dev
./scripts/nix/with-env npm run start -w apps/mobile
```

For native iOS/Android builds use the Nix-stripping root scripts below (`npm run mobile:ios` /
`mobile:android`) — **not** `./scripts/nix/with-env npm run ios -w apps/mobile`, which runs
`xcodebuild` under the Nix toolchain and fails with the `-index-store-path` clang error.

Native prebuild, CocoaPods, and native builds use root scripts with a **macOS-native PATH**
(Nix/direnv stripped) so `xcodebuild` / Gradle use Xcode's clang, not the Nix clang wrapper:

```bash
npm run mobile:prebuild
npm run mobile:pod-install
npm run mobile:ios       # expo run:ios via macOS-native toolchain
npm run mobile:android   # expo run:android via macOS-native toolchain
```

`dev:mobile` (Metro) is not in `apps/mobile` — run it from the **monorepo root**. Metro is pure JS
and does not compile native code, so it runs fine under direnv:

```bash
./scripts/nix/with-env npm run dev:mobile
```

Do **not** wrap `mobile:ios` / `mobile:android` with `./scripts/nix/with-env`. They strip Nix
internally (see § Native builds and the `-index-store-path` clang error); they only need `node` on
PATH, which direnv already provides.

## Native toolchain prerequisites (outside Nix)

Install on the host machine (not provided by the repo flake):

| Platform | Requirement                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------- |
| iOS      | Xcode (current stable), Xcode Command Line Tools, CocoaPods (`gem install cocoapods` or Homebrew)     |
| Android  | Android Studio, Android SDK (API 35+), `ANDROID_HOME` or `ANDROID_SDK_ROOT`, platform-tools on `PATH` |
| Both     | Physical device or simulator/emulator for dev-client builds (steps 3.14–3.15)                         |

After first clone or dependency change, from **monorepo root** (not `apps/` or `apps/mobile/ios`):

```bash
npm run build:packages
npm run mobile:prebuild
npm run dev:mobile
```

[`mobile:prebuild`](/scripts/mobile/prebuild-macos.sh) runs `expo prebuild --no-install`, then
[`mobile:pod-install`](/scripts/mobile/pod-install-macos.sh) with a PATH that excludes Nix — required
when [direnv](/.envrc) (`use flake`) is active. Do **not** use `npm run dev:mobile -w @podverse/mobile`;
that script exists only at the repo root.

Or run iOS/Android via `npm run mobile:ios` / `npm run mobile:android` after prebuild + pods.

**Prerequisite:** run `npm run build:packages` before mobile dev or build. Metro consumes Tier A
packages via their compiled **`dist/`** (`main` / `types`), not TypeScript source. Metro does **not**
run `tsc` for you — after editing `packages/*`, rebuild or use a targeted watcher (see § Dev client
workflow).

## Dev client workflow

This app uses **`expo-dev-client`** (not Expo Go). Metro serves JavaScript; a **native dev-client app**
(`com.podverse.app.next`) must be built and installed separately.

### Two terminals (typical session)

| Terminal             | Command                                  | Role                                       |
| -------------------- | ---------------------------------------- | ------------------------------------------ |
| Mobile Metro         | `npm run dev:mobile`                     | Keep running — Expo + Metro on `:8081`     |
| Mobile iOS / Android | `npm run mobile:ios` or `mobile:android` | First install and after native dep changes |

VS Code preset tabs: [`.vscode/terminals.json`](/.vscode/terminals.json) (`Mobile`, `Mobile Metro`,
`Mobile iOS`, `Mobile Android`).

### First-time / after prebuild order

From **monorepo root**:

```bash
npm run build:packages
npm run mobile:prebuild          # once, or after app.config / native plugin changes
npm run dev:mobile               # terminal 1 — leave running
npm run mobile:ios -- --device   # terminal 2 — build + install dev client (Nix-safe toolchain)
```

On later days (JS-only changes): start Metro; open the already-installed dev client on device/simulator.
Re-run `mobile:ios` / `mobile:android` when native deps, plugins, or prebuild output change.

Pressing **`i`** or **`a`** in the Metro terminal only works **after** the dev client is installed.
Until then you get `No development build (com.podverse.app.next) for this project is installed`.

### iOS simulator or device selection (Expo SDK 52)

Use **`--device`**, not `--simulator` (removed in current Expo CLI):

```bash
xcrun simctl list devices available              # see what you have first
npm run mobile:ios -- --device                   # interactive picker (preferred)
npm run mobile:ios -- --device "iPhone 16 Pro"   # named sim (iOS 18+ example)
npm run mobile:ios -- --device "iPhone 17 Pro"   # named sim (iOS 26+ / Xcode 26 example)
```

Do **not** copy-paste **`iPhone 15` / `iPhone 15 Pro`** from old guides — those are legacy templates on
iOS 17 runtimes, not iOS 15 OS, and are often absent on Xcode 26 machines. If a name is ambiguous (same
model on multiple runtimes), pass the UDID from `simctl list`.

Boot a sim before `xcrun simctl launch booted …`:

```bash
xcrun simctl boot "iPhone 16 Pro"
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

## Dependency stack (npm workspaces)

Mobile shares the monorepo root install with web/API. Four layers keep Expo SDK 52 and RN 0.76.9
reliable — keep all of them; see **mobile-expo-monorepo** skill for failure modes.

| Layer | Location                                    | Role                                                                                                                                                           |
| ----- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | [`.npmrc`](/.npmrc) `legacy-peer-deps=true` | Disable npm auto-install of `expo@*` peers (prevents root `expo@57`)                                                                                           |
| 2     | Root `package.json` `overrides`             | Pin `expo` / `react-native` versions across the tree                                                                                                           |
| 3     | Root mobile toolchain `devDependencies`     | `expo`, `react-native`, `react`, Metro **0.81.5** toolchain set (`metro-cache`, `metro-transform-plugins`, `metro-resolver`, …) for hoisted plugin `require()` |
| 4     | `apps/mobile/package.json`                  | Runtime deps + explicit `expo-dev-*` pins                                                                                                                      |

Layer 1 applies repo-wide (npm has no mobile-only scope). Version pinning is layers 2–4, not `.npmrc`
alone.

### Expo SDK upgrade

When upgrading SDK, update all four layers together, then verify:

```bash
npm install
npm why expo
npm why react-native
npm run mobile:prebuild
npm run dev:mobile
```

Use `npx expo install --fix` in `apps/mobile` for layer 4; bump overrides and root devDeps to match.

## Troubleshooting

### `cd: apps/mobile/ios does not exist`

You are probably in `apps/`, not the repo root. From `apps/mobile/ios`, `cd ../..` lands in
`apps/` — so `rm -rf apps/mobile/ios` and `cd apps/mobile/ios` resolve to non-existent
`apps/apps/mobile/...`. Use absolute paths or `cd` to the monorepo root first:

```bash
cd /path/to/podverse
rm -rf apps/mobile/ios apps/mobile/android
npm run mobile:prebuild
```

### `Cannot find module 'expo/config-plugins'`

`expo-dev-launcher` (config plugin) was hoisted to **root** `node_modules` while `expo@52` stayed under
`apps/mobile/node_modules`. The plugin does `require('expo/config-plugins')` from root and fails.

Fix: root `package.json` **mobile toolchain devDependencies** (`expo@52`, `react-native@0.76.9`,
`react@18.3.1`, Metro **0.81.5** toolchain set) so hoisted dev-client plugins can
`require('expo/config-plugins')`. Mobile still declares `expo` in `apps/mobile/package.json`; root
`overrides` + `.npmrc` keep the SDK at 52 (not 57). Run `npm install` from **repo root**, then re-run
`npm run mobile:prebuild`. Do **not** symlink `expo` into root `node_modules`.

### `ReactAppDependencyProvider` / Metro `ERR_PACKAGE_PATH_NOT_EXPORTED`

npm workspaces hoisted **expo@57** and **react-native@0.86** (from `expo-dev-client` peer `expo@*`)
to the repo root. That makes CocoaPods think RN ≥ 0.77 and makes `npm run dev:mobile` pick the wrong
Expo CLI/Metro stack.

Fix: root [`.npmrc`](/.npmrc) sets `legacy-peer-deps=true` and root `package.json` `overrides` pin
`expo@52` / `react-native@0.76.9`, plus root mobile toolchain devDependencies (see **mobile-expo-monorepo**
skill). After changing those, run `npm install` from repo root, then re-run prebuild + `pod install`.

Mobile scripts use `expo` from npm workspace `PATH` (root-hoisted `expo@52`, pinned by overrides).

### `react-native/package.json` not found (during prebuild / pod install)

Hoisted `expo-modules-core` and `expo-dev-*` at root evaluate podspecs with
`require('react-native/package.json')` from root `node_modules`. If `react-native` exists only under
`apps/mobile/node_modules`, those backticks fail (non-fatal noise) and can break pod resolution.

Fix: root `devDependencies` includes `react-native@0.76.9` and `react@18.3.1` (see **mobile-expo-monorepo**
skill). Run `npm install`, then re-run prebuild / `pod install`.

### `Cannot find module 'metro-cache'` / `metro-transform-plugins` / other `metro-*` (Metro / dev:mobile)

`@expo/metro-config` and `@expo/cli` are hoisted to root with `expo`, but Metro sub-packages may stay
nested under `metro/node_modules` instead of flat at root. Add the full Metro **0.81.5** toolchain set to
root devDependencies (Metro version for RN 0.76 — `metro-cache`, `metro-transform-plugins`,
`metro-resolver`, `metro-cache-key`, …), `npm install` from **repo root**, then retry `npm run dev:mobile`.
Verify hoisting from repo root: `ls -d node_modules/metro-transform-plugins`.

### `Unable to resolve react-native-web` / Web Bundling failed (Metro)

Expo auto-enables **web** when `react-dom` resolves from the monorepo (hoisted for `apps/web`). Mobile is
native dev-client only and does not install `react-native-web`, so web bundling fails (`Web is waiting on
http://localhost:8081` or pressing **`w`** in Metro).

Fix: [`app.config.ts`](/apps/mobile/app.config.ts) sets `platforms: ['ios', 'android']` to exclude web.
Use **`i`** / **`a`**, dev-client QR, or `npm run mobile:ios` / `mobile:android` — not **`w`**. iOS/Android
bundles are unaffected by this error.

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

After changing helpers exports or Tier A sources: `npm run build:packages`, restart `npm run dev:mobile`, reload
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

### `No development build (com.podverse.app.next) is installed` (Metro **`i`** / **`a`**)

`npm run dev:mobile` starts Metro only. The dev-client native app is not Expo Go — it must be built
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

### `Missing script: dev:mobile`

`dev:mobile` is defined in the **root** [package.json](/package.json), not in `apps/mobile/package.json`.
Run `npm run dev:mobile` from the monorepo root. Do not use `-w @podverse/mobile` with that script name.

### Linux lockfile refresh

From repo root (requires Docker):

```bash
bash ./scripts/development/update-lockfile-linux.sh
npm install
```

Do not run the script from `apps/mobile/ios` — paths are relative to the monorepo root.

## Metro monorepo configuration

When `metro.config.js` is added (Track 3), it must support the npm workspace layout:

- **`watchFolders`:** include the **repository root** so Metro resolves hoisted `@podverse/*`
  symlinks and shared dependencies (e.g. axios, uuid, date-fns).
- **`resolver.nodeModulesPaths`:** search `apps/mobile/node_modules` and root `node_modules`.
- **`@podverse/*` resolution:** resolve to each package's published entry (`dist/index.js` per
  `"main"` in package.json — e.g.
  [packages/helpers/package.json](/packages/helpers/package.json)).

Do **not** point Metro at Tier A **source** trees; NodeNext `.js` specifiers in package source are for
Node apps only. Re-run `npm run build:packages` after changing shared packages.

Import style in app source is **Tier D** (extensionless relatives). See
[DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md](/docs/development/tooling/DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md).

## Testing

| Tier          | Where                    | How                                                                 |
| ------------- | ------------------------ | ------------------------------------------------------------------- |
| Shared policy | `packages/playback-core` | Vitest (included in root `test:unit`)                               |
| Mobile app    | `apps/mobile`            | Vitest when configured (excluded from root `test:unit` until ready) |
| Mobile E2E    | `apps/mobile/e2e/`       | Maestro or Detox — **not** `make e2e_*`                             |

Root lint excludes `apps/mobile` until RN ESLint is fully wired; root config already defines Tier D
overrides for when source files appear.

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

## Related docs

- [DOCS-MOBILE-LLM-CURSOR-SETUP.md](/docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-LLM-CURSOR-SETUP.md)
- [DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md)
- [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
