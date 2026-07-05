---
name: mobile-expo-monorepo
description: Expo SDK 52 in the Podverse npm workspace — hoisting, prebuild, Metro, CocoaPods. Use when mobile npm install, prebuild, pod install, or dev:mobile fails.
---

# Mobile Expo monorepo (npm workspaces)

Use when `@podverse/mobile` hits dependency resolution, `expo prebuild`, Metro, or iOS `pod install`
errors tied to **wrong Expo/RN versions** or **split `node_modules` layout**.

## Fix quality (no manual unblocks)

Prefer a **durable repo fix** over operator-only workarounds. Do **not** recommend or implement:

- `ln -sf` into `node_modules/`
- `NODE_PATH=…` for Expo CLI
- Pinning random packages at root without understanding hoisting
- Disabling `expo-dev-client` to dodge plugin resolution

Invest in layout + lockfile + script changes unless the truer fix is disproportionate (e.g. upstream
bug requiring a one-line version pin with a linked issue).

## Layout (authoritative)

Four complementary layers — keep all of them; do not remove `legacy-peer-deps` without a proven
alternative (Expo documents it for npm monorepos; npm has no narrower `autoInstallPeers: false`).

| Layer | Mechanism | Location | Purpose |
| ----- | --------- | -------- | ------- |
| 1 | `legacy-peer-deps=true` | root `.npmrc` | Stop npm auto-installing latest **expo@57** for `expo@*` peers |
| 2 | `overrides` for `expo` / `react-native` | root `package.json` | Pin SDK 52 / RN 0.76.9 across the tree when packages are installed |
| 3 | Root mobile toolchain devDeps | root `package.json` | `expo@52`, `react-native@0.76.9`, `react@18.3.1`, Metro **0.81.5** toolchain set (`metro-cache`, `metro-transform-plugins`, `metro-resolver`, …) — hoisted plugins can `require('expo/config-plugins')`, `react-native/package.json`, and flat `metro-*` siblings |
| 4 | Explicit `expo-dev-*` deps | `apps/mobile/package.json` | Pin dev-client stack to SDK 52-compatible versions |

Mobile still declares runtime `expo` / `react` / `react-native` in `apps/mobile/package.json`. Expo CLI
scripts use `expo …` via npm workspace `PATH` (root-hoisted `expo@52` from layer 3 + layer 2).

**Tradeoff:** layer 1 applies repo-wide (web/API peer warnings are suppressed too). Accept this for
npm + Expo in a mixed monorepo; do not migrate to pnpm or remove layer 1 unless deliberately tested.

After changing any layer: `npm install` from **monorepo root**, then re-run prebuild + pods.

## Expo SDK upgrade checklist

When bumping Expo SDK (e.g. 52 → 54), update **all four layers together**:

1. **Layer 2** — root `package.json` `overrides` for `expo`, `react-native`, and nested `expo-dev-*`
   override blocks; align with target SDK.
2. **Layer 3** — root `devDependencies`: `expo`, `react-native`, `react`, and the full Metro toolchain
   set at the version that matches the new RN release (e.g. `metro-cache`, `metro-transform-plugins`,
   `metro-resolver`, … — all the same Metro version).
3. **Layer 4** — `apps/mobile/package.json` via `npx expo install --fix` or SDK release notes; keep
   explicit `expo-dev-launcher`, `expo-dev-menu`, etc. pinned.
4. **Layer 1** — keep `legacy-peer-deps=true` in `.npmrc` unless a clean install proves otherwise.

Then from repo root:

```bash
npm install
npm why expo
npm why react-native
npm run mobile:prebuild
npm run dev:mobile
```

Confirm `npm why expo` and `npm why react-native` show only the target SDK versions (no stray newer
major such as expo@57 or RN@0.86 at root).

## Common failures

| Symptom | Cause | Truer fix |
| ------- | ----- | --------- |
| `expo/config-plugins` not found | `expo-dev-launcher` hoisted to root without root `expo@52` | Root mobile toolchain devDeps + overrides + reinstall |
| `react-native/package.json` not found (pod install) | Hoisted `expo-modules-core` / dev-client at root without root `react-native` | Add `react-native@0.76.9` (+ `react@18.3.1`) to root devDependencies |
| `metro-cache` / `metro-transform-plugins` / other `metro-*` not found (Metro start) | `@expo/metro-config` / `@expo/cli` at root; Metro sub-packages nested under `metro/node_modules` | Add the full Metro **0.81.5** toolchain set to root devDependencies (matches RN 0.76 Metro) |
| `ReactAppDependencyProvider` | Root hoisted **expo@57** / **RN 0.86** | `.npmrc` + root `overrides` + reinstall |
| Metro `ERR_PACKAGE_PATH_NOT_EXPORTED` | Wrong Expo CLI / Metro from hoisted expo@57 | Local expo CLI in `start` script + layout fix |
| `cd apps/mobile/ios` missing | Wrong cwd (`apps/` not repo root) or prebuild failed | Run from repo root; fix prebuild first |
| glog / `unable to find sdk: iphoneos` (Nix path in log) | **direnv** [`.envrc`](/.envrc) (`use flake`) sets `DEVELOPER_DIR`/`SDKROOT` to a Nix apple-sdk (no iPhoneOS SDKs) and puts Nix on PATH | `npm run mobile:prebuild` or `npm run mobile:pod-install` — [scripts/mobile/pod-install-macos.sh](/scripts/mobile/pod-install-macos.sh) unsets `NIX_*` + `DEVELOPER_DIR` + `SDKROOT`, re-derives Xcode via `xcode-select -p`, then resolves SDK |
| `Unable to resolve react-native-web` (Web Bundling failed) | Monorepo hoists `react-dom` for web apps; Expo auto-enables web without `react-native-web` in mobile | Set `platforms: ['ios', 'android']` in [apps/mobile/app.config.ts](/apps/mobile/app.config.ts); use **`i`**/**`a`**/dev client, not **`w`** |
| `No development build … is installed` (Metro **`i`**/**`a`**) | `dev:mobile` is Metro only; native dev client not built yet | `npm run ios -w @podverse/mobile -- --device` (or `mobile:ios`) — see [APPS-MOBILE.md § Dev client workflow](/apps/mobile/APPS-MOBILE.md) |
| `xcodebuild` error 70 / Unable to find a destination | Stale/booted sim UUID or iOS simulator runtime not installed for current Xcode SDK | `xcrun simctl list devices available`; install runtime in Xcode → Platforms; `npm run ios -w @podverse/mobile -- --device "…"` |
| `Unknown arguments: --simulator` | Expo SDK 52 removed `--simulator` | Use `--device "iPhone …"` or `--device` (interactive) |
| `ls node_modules/metro-*` fails | Verification run from `apps/mobile/ios` (or other subdir) | Run `ls` from **monorepo root** where hoisted Metro packages live |

## Commands (repo root)

```bash
npm install
npm run build:packages
npm run mobile:prebuild
npm run dev:mobile
```

Re-run pods only (after `ios/` exists):

```bash
npm run mobile:pod-install
```

`dev:mobile` is a **root-only** script — do not scope it with `-w @podverse/mobile`.

**Dev client:** `dev:mobile` is Metro only. First native install: `npm run ios -w @podverse/mobile -- --device`
(or `mobile:ios` / `mobile:android`). Expo SDK 52 uses **`--device`**, not `--simulator`. Full flow:
[APPS-MOBILE.md § Dev client workflow](/apps/mobile/APPS-MOBILE.md).

**iOS simulator names (agents):** prefer `npm run mobile:ios -- --device` (interactive). Named examples:
`"iPhone 16 Pro"` or `"iPhone 17 Pro"`. Do **not** suggest iPhone 15 / iPhone 15 Pro — see
[mobile-ios-simulator](/.cursor/rules/mobile-ios-simulator.mdc). List sims:
`xcrun simctl list devices available`; boot before `simctl launch booted`.

iOS native steps use [scripts/mobile/prebuild-macos.sh](/scripts/mobile/prebuild-macos.sh) and
[scripts/mobile/pod-install-macos.sh](/scripts/mobile/pod-install-macos.sh): `expo prebuild --no-install`
then `pod install` with a macOS toolchain PATH. When [`.envrc`](/.envrc) (`use flake`) is active,
direnv/Nix sets `DEVELOPER_DIR`/`SDKROOT` to a Nix apple-sdk — the pod script **unsets `NIX_*` +
`DEVELOPER_DIR` + `SDKROOT` first**, re-derives Xcode via `/usr/bin/xcode-select -p`, trims PATH to
macOS tools (keeping `node` from the caller), then resolves `SDKROOT`. Node for the Podfile stays on
PATH from direnv. Required on any mac with direnv + flake, not only `./scripts/nix/with-env`.

## Portable toolchain scripts

Mobile native scripts under [scripts/mobile/](/scripts/mobile/) must work on **any contributor mac**
(Apple Silicon or Intel, any Xcode/iOS SDK version). Do **not** hardcode:

- SDK version strings (e.g. `iphoneos26.5`) — use `xcrun --sdk iphoneos` and `iPhoneOS*.sdk` glob fallback
- User-specific paths (`/Users/...`) or machine-only toolchain locations

**Do** discover at runtime:

- `DEVELOPER_DIR` via `/usr/bin/xcode-select -p` after unsetting Nix pollution; fallback to
  `/Applications/Xcode.app/Contents/Developer` only when `xcode-select` is empty, under `/nix/*`, or missing
- `node` / `pod` via `command -v` (Nix, Homebrew, gem)
- Homebrew via both `/opt/homebrew/bin` and `/usr/local/bin`

When adding or editing mobile toolchain scripts, keep this discovery-first pattern.

Metro hoisting sanity check (from repo root):

```bash
ls -d node_modules/metro-transform-plugins node_modules/metro-cache-key node_modules/metro-resolver
```

Contributor detail: [APPS-MOBILE.md](/apps/mobile/APPS-MOBILE.md) § Troubleshooting, § Marketing version.

## Design tokens in the workspace graph

Mobile may depend on `@podverse/design-tokens` (Tier 3 package, RN-safe). It is **not** part of
`build:packages` today — add to mobile `package.json` when Track 0.20 lands. Do not import
`@podverse/ui`. Theme alignment: **mobile-theme-parity** skill.

## Marketing version

`apps/mobile/app.config.ts` sets `version` from `apps/mobile/package.json`. Root
[`bump-version.sh`](/scripts/publish/bump-version.sh) already bumps workspace `package.json` files — no
separate app.config edit on release. Re-run prebuild after a bump if native trees exist.
