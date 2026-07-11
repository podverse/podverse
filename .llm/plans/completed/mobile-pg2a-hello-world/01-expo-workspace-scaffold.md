# Plan 01 — Expo workspace scaffold

**Steps:** 3.1, 3.2, 3.3, 3.4, 3.5
**Model:** Codex 5.3

## Detail references

- [040-mobile-package-json](/docs/proposals/mobile/_master-plan_/details/040-mobile-package-json.md)
- [041-expo-config-separate-bundle-id](/docs/proposals/mobile/_master-plan_/details/041-expo-config-separate-bundle-id.md)
- [042-metro-config-monorepo](/docs/proposals/mobile/_master-plan_/details/042-metro-config-monorepo.md)
- [043-mobile-tsconfig](/docs/proposals/mobile/_master-plan_/details/043-mobile-tsconfig.md)
- [044-root-mobile-npm-scripts](/docs/proposals/mobile/_master-plan_/details/044-root-mobile-npm-scripts.md)

## Tasks

1. Create or finalize `apps/mobile/package.json` with Expo prebuild + dev-client deps and
   `@podverse/helpers`.
2. Add `app.config.ts` with separate bundle id `com.podverse.app.next` (iOS + Android).
3. Add `metro.config.js` with repo-root `watchFolders` and dual `nodeModulesPaths`.
4. Add `tsconfig.json` extending base with `jsx: react-native` and `moduleResolution: bundler`.
5. Add root `dev:mobile`, `mobile:ios`, `mobile:android` scripts; sync APPS-MOBILE command docs.

## On completion

Mark steps **3.1, 3.2, 3.3, 3.4, 3.5** as `done` in the master plan and detail doc headers.
