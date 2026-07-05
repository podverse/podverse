# Contributor guide — `apps/mobile`

React Native + Expo prebuild workspace for the Podverse mobile app. LLM entrypoint:
[`AGENTS.md`](/apps/mobile/AGENTS.md). Master plan phasing:
[`mobile-master-plan-phasing`](/.cursor/skills/mobile-master-plan-phasing/SKILL.md).

This directory may exist as **docs-only** before Track 3 adds `package.json` and native projects.

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
./scripts/nix/with-env npm run ios -w apps/mobile
./scripts/nix/with-env npm run android -w apps/mobile
./scripts/nix/with-env npm run prebuild -w apps/mobile
```

Optional root convenience scripts (when added to root `package.json`):

```bash
./scripts/nix/with-env npm run dev:mobile
./scripts/nix/with-env npm run mobile:ios
./scripts/nix/with-env npm run mobile:android
```

**Prerequisite:** run `npm run build:packages` before mobile dev or build. Metro consumes Tier A
packages via their compiled **`dist/`** (`main` / `types`), not TypeScript source.

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

| Tier              | Where                         | How                                      |
| ----------------- | ----------------------------- | ---------------------------------------- |
| Shared policy     | `packages/playback-core`      | Vitest (included in root `test:unit`)    |
| Mobile app        | `apps/mobile`                 | Vitest when configured (excluded from root `test:unit` until ready) |
| Mobile E2E        | `apps/mobile/e2e/`            | Maestro or Detox — **not** `make e2e_*`  |

Root lint excludes `apps/mobile` until RN ESLint is fully wired; root config already defines Tier D
overrides for when source files appear.

## CI and build graph

- `apps/mobile` is **not** on `build:packages` or `build:apps`; native builds use a separate macOS CI
  track (see master plan Track 20).
- Mobile dependencies live in `apps/mobile/package.json` only to limit root lockfile churn.

## Related docs

- [DOCS-MOBILE-LLM-CURSOR-SETUP.md](/docs/proposals/mobile/monorepo-llm-setup/DOCS-MOBILE-LLM-CURSOR-SETUP.md)
- [DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md)
- [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
