# 05 — Android native (gradle, Media3, edge-to-edge)

**Cursor model:** Opus 5.5 · **Reasoning:** high

## Goal

Make Android prebuild + run work on Expo SDK 57: convert local modules to
the Expo module Gradle plugin, compile against API 36 / Kotlin 2.1, and
handle mandatory edge-to-edge (remove deprecated `androidStatusBar`).

## Preconditions

- Prompt 01 and Prompt 02 complete.
- Prompt 04 iOS build gate green.
- Locked decisions: never commit `apps/mobile/android`; edge-to-edge on;
  remove `androidStatusBar`.

## Ownership

- **Owns:** Android module gradle + Kotlin, Android-only `app.config.ts`
  keys, inset / keyboard call sites listed below
- **Must not:** rework CarPlay / iOS plugins; billing JS; package pins

## Files

### Local modules — Gradle

1. `apps/mobile/modules/podverse-media-engine/android/build.gradle`
2. `apps/mobile/modules/podverse-perf-probe/android/build.gradle`

Convert each from the SDK 52-era
`apply from: ExpoModulesCorePlugin.gradle` / `applyKotlinExpoModulesCorePlugin()`
pattern to the SDK 57 template style:

```gradle
plugins {
  id 'com.android.library'
  id 'expo-module-gradle-plugin'
}
```

- Fallback / default `compileSdk` / `targetSdk` → **36** (not 35).
- Keep Media3 dependencies on media-engine; version stays `1.4.1` unless
  compile against API 36 / AGP 8.12 / Gradle 9.3 fails — then bump Media3
  only as far as needed and note the version in a short module comment
  (future-forward: why that version is required).
- Preserve `media3-exoplayer-hls` at the same version as exoplayer.

### Local modules — Kotlin

3. Kotlin under `modules/podverse-media-engine/android/src/main/java/...`
   especially `PodverseMediaLibraryService.kt`,
   `PodverseMediaEngineModule.kt`, audio / cache / video surface classes
4. `modules/podverse-perf-probe/android/.../PodversePerfProbeModule.kt`

Fix ExpoModulesCore 57 / Kotlin 2.1 compile errors only. Do not redesign
Android Auto behavior.

### App config (Android only)

5. `apps/mobile/app.config.ts` — **remove** the `androidStatusBar` block.
   Do not add a replacement status-bar config that fights edge-to-edge.
   Leave iOS keys alone (04 owns those).

### Edge-to-edge / insets audit

Confirm these already pad with `useSafeAreaInsets` / `SafeAreaView`, and
fix any Android chrome that draws under system bars after edge-to-edge:

6. `apps/mobile/src/components/screen/HeaderBar.tsx`
7. `apps/mobile/src/screens/player/FullPlayerScreen.tsx`
8. `apps/mobile/src/components/primitives/MoreMenu.tsx`
9. `apps/mobile/src/components/content/ManagedCopyModal.tsx`
10. `apps/mobile/src/components/screen/ModalSafeArea.tsx`
11. Tab bar / root chrome in `apps/mobile/src/navigation/index.tsx`
12. Keyboard: if a screen uses `KeyboardAvoidingView` or relies on
    `adjustResize`, verify it still works with edge-to-edge; fix the
    minimum needed for focus fields (login, search, OPML, checkout).

Prefer `react-native-safe-area-context` 5.x. Do not introduce a second
inset system.

## Steps

1. Convert both module `build.gradle` files; set SDK fallbacks to 36.
2. `npm run mobile:reset` then attempt Android compile; fix Kotlin /
   Media3 as errors appear.
3. Remove `androidStatusBar` from `app.config.ts`.
4. Audit and fix insets / keyboard.
5. End with another `npm run mobile:reset` so the tree matches plugins.

## Done when

- Both local Android modules use `expo-module-gradle-plugin`
- App builds for `Pixel_6_Pro_API_33`
- `androidStatusBar` is gone
- Primary chrome respects safe-area insets on Android
- **Agent Android build gate green**

## Agent verify (required)

```bash
npm run mobile:reset
npm run mobile:android -- --device Pixel_6_Pro_API_33
```

If the Android build fails, fix gradle / Kotlin / Media3 / insets within
ownership and re-run until green, or **stop** with the failure log. A
successful install/build is enough for this gate; full UI smoke is Prompt 06.
