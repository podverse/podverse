# Plan 02 — Prebuild and hello-world

**Steps:** 3.6, 3.7, 3.8, 3.9, 3.10
**Model:** Codex 5.3

## Detail references

- [045-expo-prebuild-initial](/docs/proposals/mobile/_master-plan_/details/045-expo-prebuild-initial.md)
- [046-hello-world-screen](/docs/proposals/mobile/_master-plan_/details/046-hello-world-screen.md)
- [047-hello-world-shared-package-smoke](/docs/proposals/mobile/_master-plan_/details/047-hello-world-shared-package-smoke.md)
- [048-native-toolchain-prerequisites](/docs/proposals/mobile/_master-plan_/details/048-native-toolchain-prerequisites.md)
- [049-mobile-gitignore](/docs/proposals/mobile/_master-plan_/details/049-mobile-gitignore.md)

## Tasks

1. Add RN entry (`index.js`, root `App`) and run `expo prebuild` to generate `ios/` and `android/`.
2. Implement hello-world screen (app name + version via `expo-constants`).
3. Import `@podverse/helpers` on screen after `npm run build:packages` (Metro dist smoke).
4. Document Xcode / Android SDK prerequisites in APPS-MOBILE (outside Nix shell).
5. Add gitignore rules for `.expo/`, Pods, Gradle/build outputs (align with `.cursorignore`).

## On completion

Mark steps **3.6, 3.7, 3.8, 3.9, 3.10** as `done` in the master plan and detail doc headers.

Simulator/emulator smoke is sufficient in this plan; physical devices are plan 04.
