# 04 — iOS native (CarPlay, patches, deployment target)

**Cursor model:** Opus 5.5 · **Reasoning:** high

## Goal

Make iOS prebuild + run work on Expo SDK 57 / Xcode 27: port the CarPlay
AppDelegate plugin to Swift, raise the iOS deployment target to 16.4,
retire obsolete patch scripts, and confirm local module Swift still
compiles.

## Preconditions

- Checkpoint A green (Prompt 03 ran `type-check:mobile` + mobile unit tests).
- Locked decisions: iOS floor **16.4**; never commit `apps/mobile/ios`.

## Ownership

- **Owns:** iOS-facing plugins, podspecs, iOS keys in `app.config.ts`,
  patch scripts + callers, media-engine / perf-probe **iOS** sources if
  ExpoModulesCore APIs force it
- **Must not:** Android gradle / `androidStatusBar` / edge-to-edge insets
  (Prompt 05); billing JS; package pins

## Files

### Config plugins

1. [`apps/mobile/plugins/withPodverseCarPlay.js`](../../../../apps/mobile/plugins/withPodverseCarPlay.js)
2. [`apps/mobile/plugins/withPodverseSplashScreen.js`](../../../../apps/mobile/plugins/withPodverseSplashScreen.js)
3. [`apps/mobile/plugins/withPodverseIosPodBuildSettings.js`](../../../../apps/mobile/plugins/withPodverseIosPodBuildSettings.js)
4. [`apps/mobile/plugins/ios-pod-build-settings.rb`](../../../../apps/mobile/plugins/ios-pod-build-settings.rb)

### App config (iOS only)

5. [`apps/mobile/app.config.ts`](../../../../apps/mobile/app.config.ts) —
   `expo-build-properties` `ios.deploymentTarget: '16.4'`; update comments
   that say SDK 52 / RN 0.76; keep CarPlay entitlement comments and the
   **no CarPlay-only `UIApplicationSceneManifest`** guard

### Local modules (iOS)

6. `apps/mobile/modules/podverse-media-engine/ios/PodverseMediaEngine.podspec`
   — platform `:ios => '16.4'`
7. `apps/mobile/modules/podverse-perf-probe/ios/PodversePerfProbe.podspec`
   — same
8. Swift under `modules/podverse-media-engine/ios/` only if
   `ExpoModulesCore` 57 requires API adjustments

### Patch scripts and callers

9. `scripts/mobile/patch-expo-cli-xcode27.sh` — **retire** (Expo CLI 57
   already knows Device Hub). Delete the script and remove calls from:
   - root `package.json` → `mobile:install`
   - `scripts/mobile/run-expo-macos.sh`
   - `scripts/mobile/reset-macos.sh`
10. `scripts/mobile/patch-expo-localization-xcode26.sh` — **retire**
    (fixed upstream in SDK 53+). Delete + remove callers same as above.
11. `scripts/mobile/patch-fmt-xcode26.sh` — **re-check** after a clean
    pod install. Keep only if fmt still needs the consteval workaround on
    the SDK 57 CocoaPods tree; otherwise delete + remove calls from
    `pod-install-macos.sh`.
12. `scripts/mobile/ensure-expo-sqlite-vendored-sources.sh` — **re-check**.
    Keep if expo-sqlite 57 still copies amalgamation into `ios/` only
    during podspec eval; otherwise delete + remove callers.
13. `scripts/mobile/ensure-ios-pod-build-settings.sh` — keep; align floor
    with 16.4 if it hardcodes 15.x.

## CarPlay plugin — required behavior

SDK 57 template AppDelegate is **Swift** (`class AppDelegate: ExpoAppDelegate`),
not Objective-C `AppDelegate.mm`.

Rewrite `withPodverseCarPlay` to use `withAppDelegate` (or the SDK 57
config-plugin path that edits the Swift AppDelegate) so that:

1. CarPlay framework is imported where needed.
2. A phone `UIWindowScene` / scene-delegate path still re-attaches the
   existing RN window (do **not** lose the phone UI when CarPlay connects).
3. `application(_:configurationForConnecting:options:)` (or the Swift
   equivalent) returns CarPlay configuration for CarPlay sessions and the
   phone scene delegate otherwise.
4. **Regression guard stays:** do **not** add a CarPlay-only
   `UIApplicationSceneManifest` to Info.plist / `app.config.ts`.

Update the file header comments to describe the Swift AppDelegate world
(future-forward; no “we used to patch Obj-C”).

After editing, run a local prebuild (operator or agent as part of verify
prep) and confirm the generated AppDelegate contains the injected pieces.
Do not commit `ios/`.

## Splash plugin

Regenerate splash once and confirm `withPodverseSplashScreen` still finds
the storyboard nodes it repairs (empty `<subviews/>` → logo ImageView).
Adjust selectors / XML only if SDK 57 splash layout changed.

## Deployment target 16.4

Set consistently:

- `expo-build-properties` → `ios.deploymentTarget: '16.4'`
- Both local podspecs
- Pod floor in `withPodverseIosPodBuildSettings` / ruby helper /
  `ensure-ios-pod-build-settings.sh` (clamp below 16.4 up to 16.4; do not
  lower the app target)

## Finish

```bash
npm run mobile:reset
```

Do not leave a half-edited `ios/` tree as the source of truth.

## Done when

- CarPlay plugin patches Swift AppDelegate successfully on prebuild
- Deployment target is 16.4 across config + podspecs + pod floor
- Obsolete Xcode 26/27 Expo CLI / localization patches removed from
  install / run scripts
- fmt / sqlite scripts kept or removed with evidence from the SDK 57 tree
- `mobile:reset` completed
- **Agent iOS build gate green**

## Agent verify (required)

```bash
npm run mobile:reset
npm run mobile:ios -- --device "iPhone 17 Pro"
```

If the iOS build fails, fix plugins / podspecs / scripts / Swift within
ownership and re-run until green, or **stop** with the failure log. Do not
require the operator to tap through the app for this gate — a successful
install/build is enough. Optional: if Metro is already running, a launch
check is a bonus, not required to end the prompt.
