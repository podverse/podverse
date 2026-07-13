---
name: mobile-expo-monorepo
description: Expo SDK 52 as a standalone install under apps/mobile — own lockfile, file: shared packages, Metro. Use when mobile npm install, prebuild, pod install, or dev:mobile fails.
---

# Mobile Expo (standalone install)

`apps/mobile` is **outside** the root npm workspace. Server `develop` / `staging` / `main` CI and Docker
`npm ci` never install Expo or React Native. Mobile has its own lockfile and release track.

## Layout (authoritative)

| Piece              | Location                                                    | Purpose                                                                                         |
| ------------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Standalone package | `apps/mobile/package.json`                                  | Expo SDK 52 / RN 0.76.9 runtime + `overrides`                                                   |
| Mobile lockfile    | `apps/mobile/package-lock.json`                             | Committed; install with `npm install --prefix apps/mobile` or `npm run mobile:install`          |
| Peer-deps policy   | `apps/mobile/.npmrc` (`legacy-peer-deps=true`)              | Stop `expo@*` peers pulling expo@57 / RN 0.86                                                   |
| Shared packages    | `"@podverse/helpers": "file:../../packages/helpers"` (etc.) | Symlink into `apps/mobile/node_modules/@podverse/*`                                             |
| Metro              | `apps/mobile/metro.config.js`                               | `watchFolders` → `packages/`; `nodeModulesPaths` → mobile `node_modules` only; symlinks enabled |
| Helpers runtime deps | `date-fns`, `he`, `uuid` in `apps/mobile/package.json`    | `file:` packages do not install their deps into mobile; declare them on mobile for Metro       |

Root `package.json` **must not** list `apps/mobile` in `workspaces`, and **must not** carry `expo` /
`react-native` / `metro-*` deps or Expo `overrides`.

Prefer durable layout fixes. Do **not** recommend root-hoisting Expo, `ln -sf` into root
`node_modules/`, or `NODE_PATH` workarounds.

## Local workflow

From **monorepo root**:

```bash
# Preferred one-shot (root + mobile JS; keeps lockfiles):
npm run deps:init
# Or with iOS native trees + CocoaPods:
npm run deps:init:native

# Equivalent step-by-step:
npm ci                          # server workspaces only (no Expo)
npm run build:packages          # helpers, design-tokens, … → dist/
npm run mobile:install          # apps/mobile package-lock.json
npm run mobile:prebuild
npm run dev:mobile              # Metro (dev client)
# First native install:
npm run mobile:ios -- --device
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

| Symptom                                        | Cause                                          | Fix                                                                                |
| ---------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| `Cannot find module '@podverse/helpers'`       | Forgot `mobile:install` or `file:` link broken | `npm run mobile:install` after package path changes                                |
| Metro cannot resolve package after shared edit | Stale `dist/`                                  | `npm run build:packages` (or watch)                                                |
| `Unable to resolve "date-fns/…"` from helpers  | Helpers dep not in mobile `node_modules`       | Add the dep to `apps/mobile/package.json`; `npm run mobile:install`                |
| `expo/config-plugins` not found                | Incomplete mobile install / wrong expo version | Reinstall under `apps/mobile`; check overrides pin SDK 52                          |
| glog / Nix SDK errors on pod install           | direnv/Nix `DEVELOPER_DIR`                     | Use `npm run mobile:prebuild` / `mobile:pod-install` (scripts unset Nix pollution) |
| `Unable to resolve react-native-web`           | Expo auto web without RN-web                   | `platforms: ['ios', 'android']` in `app.config.ts`                                 |
| Root `npm ci` installs Expo                    | Mobile re-added to root workspaces             | Keep explicit server app list in root `workspaces`                                 |

## Commands (repo root)

```bash
npm run deps:init
npm run deps:init:native
npm run mobile:install
npm run build:packages
npm run mobile:prebuild
npm run mobile:pod-install
npm run dev:mobile
npm run mobile:ios -- --device
npm run mobile:android
```

**iOS simulator names (agents):** prefer `--device` (interactive). Named examples: `"iPhone 16 Pro"` or
`"iPhone 17 Pro"`. Do **not** suggest iPhone 15 family — see
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
