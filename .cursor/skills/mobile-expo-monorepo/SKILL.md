---
name: mobile-expo-monorepo
description: Expo SDK 52 as a standalone install under apps/mobile — own lockfile, file: shared packages, Metro. Use when mobile npm install, prebuild, pod install, or dev:mobile fails.
---

# Mobile Expo (standalone install)

`apps/mobile` is **outside** the root npm workspace. Server `develop` / `staging` / `main` CI and Docker
`npm ci` never install Expo or React Native. Mobile has its own lockfile and release track.

## Layout (authoritative)

| Piece                | Location                                                    | Purpose                                                                                         |
| -------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Standalone package   | `apps/mobile/package.json`                                  | Expo SDK 52 / RN 0.76.9 runtime + `overrides`                                                   |
| Mobile lockfile      | `apps/mobile/package-lock.json`                             | Committed; install with `npm install --prefix apps/mobile` or `npm run mobile:install`          |
| Peer-deps policy     | `apps/mobile/.npmrc` (`legacy-peer-deps=true`)              | Stop `expo@*` peers pulling expo@57 / RN 0.86                                                   |
| Shared packages      | `"@podverse/helpers": "file:../../packages/helpers"` (etc.) | Symlink into `apps/mobile/node_modules/@podverse/*`                                             |
| Metro                | `apps/mobile/metro.config.js`                               | `watchFolders` → `packages/`; `nodeModulesPaths` → mobile `node_modules` only; symlinks enabled |
| Helpers runtime deps | `date-fns`, `he`, `uuid` in `apps/mobile/package.json`      | `file:` packages do not install their deps into mobile; declare them on mobile for Metro        |

Root `package.json` **must not** list `apps/mobile` in `workspaces`, and **must not** carry `expo` /
`react-native` / `metro-*` deps or Expo `overrides`.

Prefer durable layout fixes. Do **not** recommend root-hoisting Expo, `ln -sf` into root
`node_modules/`, or `NODE_PATH` workarounds.

## Prefer composite root scripts (agent guidance)

When telling the operator what to run for mobile deps / native setup, **prefer one root script**
over multi-step recipes. Bundle steps that usually go together:

| Goal                                         | Prefer                                  | Avoid listing by default                                              |
| -------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------- |
| Clean + root + packages + mobile JS install  | `npm run deps:init`                     | `clean:node_modules` → `npm ci` → `build:packages` → `mobile:install` |
| Same + expo prebuild + CocoaPods             | `npm run deps:init:native`              | The above plus separate `mobile:prebuild` / `mobile:pod-install`      |
| Failed prebuild / wiped ios+android recovery | `npm run mobile:reset`                  | Bare `prebuild:clean` then `mobile:pod-install`                       |
| Metro only (deps already installed)          | `npm run dev:mobile`                    | `npm --prefix apps/mobile run start`                                  |
| Native run (after prebuild exists)           | `npm run mobile:ios` / `mobile:android` | Long `expo run:*` / `cd apps/mobile` chains                           |
| Re-run pods only                             | `npm run mobile:pod-install`            | Raw `pod install` under Nix/direnv                                    |
| Re-generate native trees + pods              | `npm run mobile:prebuild`               | `expo prebuild` + separate pod step                                   |
| Force clean native regen (deps already OK)   | `npm run mobile:prebuild -- --clean`    | `npm --prefix apps/mobile run prebuild:clean` alone                   |

Give the step-by-step breakdown only when debugging a specific failing stage. Wrap JS installs with
`./scripts/nix/with-env` when the agent/sandbox needs the flake; do **not** wrap `mobile:ios` /
`mobile:android` / `mobile:prebuild` / `mobile:pod-install` (they strip Nix themselves).

## Local workflow

From **monorepo root**:

```bash
# Preferred one-shot (root + mobile JS; keeps lockfiles):
./scripts/nix/with-env npm run deps:init
# Or with iOS native trees + CocoaPods:
./scripts/nix/with-env npm run deps:init:native

# Day-to-day after deps exist:
./scripts/nix/with-env npm run dev:mobile
npm run mobile:ios -- --device "iPhone 17 Pro"
```

Root `rm -rf node_modules && npm i` is **not** enough for mobile. Use `deps:init` (or
`mobile:install` after a root install). Script: [`scripts/dev/deps-init.sh`](/scripts/dev/deps-init.sh).

Edit a shared package → rebuild packages (or `build:watch`) → Metro reloads from `packages/*/dist`.

## Expo SDK upgrade checklist

Update **inside `apps/mobile` only**:

1. `apps/mobile/package.json` deps + `overrides` (expo, react-native, expo-dev-*).
2. Keep `legacy-peer-deps=true` in `apps/mobile/.npmrc` unless a clean install proves otherwise.
3. Regenerate `apps/mobile/package-lock.json` (`npm run mobile:install`).
4. `npm run mobile:prebuild` then `npm run mobile:ios` / `mobile:android`.

Do **not** add Expo back to the root lockfile.

## Common failures

| Symptom                                                                   | Cause                                                                      | Fix                                                                                |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `Cannot find module '@podverse/helpers'`                                  | Forgot `mobile:install` or `file:` link broken                             | `npm run mobile:install` after package path changes                                |
| Metro cannot resolve package after shared edit                            | Stale `dist/`                                                              | `npm run build:packages` (or watch)                                                |
| `Unable to resolve "date-fns/…"` from helpers                             | Helpers dep not in mobile `node_modules`                                   | Add the dep to `apps/mobile/package.json`; `npm run mobile:install`                |
| `expo/config-plugins` not found                                           | Incomplete mobile install / wrong expo version                             | Reinstall under `apps/mobile`; check overrides pin SDK 52                          |
| `Cannot read properties of undefined (reading 'extract')` during prebuild | `tar` v7 override breaks `@expo/cli` (SDK 52 expects tar 6 default export) | Keep `overrides.tar` at `6.2.1`; then `npm run mobile:reset`                       |
| glog / Nix SDK errors on pod install                                      | direnv/Nix `DEVELOPER_DIR`                                                 | Use `npm run mobile:prebuild` / `mobile:pod-install` (scripts unset Nix pollution) |
| `Unable to resolve react-native-web`                                      | Expo auto web without RN-web                                               | `platforms: ['ios', 'android']` in `app.config.ts`                                 |
| Root `npm ci` installs Expo                                               | Mobile re-added to root workspaces                                         | Keep explicit server app list in root `workspaces`                                 |

## Commands (repo root)

Prefer composites first; use the finer-grained scripts only when isolating a failure:

```bash
# One-shots
./scripts/nix/with-env npm run deps:init
./scripts/nix/with-env npm run deps:init:native
npm run mobile:reset

# Day-to-day
./scripts/nix/with-env npm run dev:mobile
npm run mobile:ios -- --device "iPhone 17 Pro"
npm run mobile:android -- --device Pixel_6_Pro_API_33

# Finer-grained (debug / partial reruns)
npm run mobile:install
npm run build:packages
npm run mobile:prebuild
npm run mobile:prebuild -- --clean
npm run mobile:pod-install
```

**`tar` override (Expo SDK 52):** keep `apps/mobile/package.json` `overrides.tar` on **`6.2.1`**.
`tar@7` breaks `expo prebuild` (`reading 'extract'`). Revisit only when upgrading past SDK 52 /
`@expo/cli` that supports tar 7's named exports.

**Default devices (agents):** always name them — `"iPhone 17 Pro"` and `Pixel_6_Pro_API_33`. Never
bare `--device` (interactive picker). See
[mobile-ios-simulator](/.cursor/rules/mobile-ios-simulator.mdc).

## CI / publish

- Server `/test`, `publish-staging`, `publish-main`: **never** build or publish mobile.
- Deferred: `/testmobile` (macOS runner, Vitest + Maestro) once mobile has a test harness.
- Marketing version: `bump-version.sh` bumps `apps/mobile/package.json` explicitly (not via
  `npm query .workspace`).

## Design tokens

Mobile depends on `@podverse/design-tokens` via `file:`. It is on `build:packages`. Do not import
`@podverse/ui`. Theme alignment: **mobile-theme-parity** skill.

## Marketing version

`apps/mobile/app.config.ts` sets `version` from `apps/mobile/package.json`. Re-run prebuild after a
bump if native trees exist.
