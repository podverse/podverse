# 386-ios-carplay-scene-config

**Master step:** 12.7
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Add a **CarPlay scene** configuration for audio apps so the OS can launch Podverse Next on
  CarPlay without the phone UI / JS runtime.
- Wire durable Expo config for:
  - `com.apple.developer.carplay-audio` (and framework audio entitlement as required by signing)
  - App Group **`group.com.podverse.app.next`**
  - `UIApplicationSceneManifest` / CarPlay scene delegate entry points
- Set `PodverseNativeCache.appGroupIdentifier` from `nil` to `group.com.podverse.app.next` so
  reads/writes use the shared container (JS writes + CarPlay scene reads).

## Operator portal (already done — do not re-request)

- App ID `com.podverse.app.next` exists on team Podverse LLC (`DF9KG8H54B`).
- CarPlay Audio App + CarPlay Audio App (CarPlay framework) enabled on that App ID.
- App Group `group.com.podverse.app.next` created and assigned to the App ID.
- Runbook: [CARPLAY-ENTITLEMENT.md](/apps/mobile/modules/podverse-media-engine/CARPLAY-ENTITLEMENT.md)

## Architecture notes

- Prefer an Expo config plugin / `app.config.ts` entitlements + infoPlist so prebuild regenerates
  signing-related keys; avoid one-off hand-edits of gitignored `ios/` that vanish on prebuild.
- Scene lifecycle owns template creation; engine remains `PodverseAudioEngine.shared`.
- On cold CarPlay connect, call `PodverseNativeCache.debugDump()` before any JS (spike 12.5).

## Implemented (this slice)

- `app.config.ts` → `ios.entitlements` (`com.apple.developer.carplay-audio`,
  `com.apple.security.application-groups` = `[group.com.podverse.app.next]`).
- `app.config.ts` → `ios.infoPlist.UIApplicationSceneManifest` declares only the CarPlay audio scene
  role (`CPTemplateApplicationSceneSessionRoleApplication` → `CPTemplateApplicationScene` /
  `PodverseCarPlaySceneDelegate`); phone app keeps its legacy AppDelegate window lifecycle.
- `PodverseCarPlaySceneDelegate.swift` (compiled into the PodverseMediaEngine pod, `@objc` name)
  connects, calls `PodverseNativeCache.debugDump()`, and sets a placeholder root template.
- `PodverseNativeCache.appGroupIdentifier = "group.com.podverse.app.next"`.
- Browse (12.8) and now-playing/remotes/play (12.9–12.10) intentionally deferred.

## Acceptance criteria

- Built app’s entitlements include CarPlay audio + App Group `group.com.podverse.app.next`.
- Info.plist declares CarPlay scene configuration.
- `PodverseNativeCache.appGroupIdentifier == "group.com.podverse.app.next"`.
- App still builds/runs on Simulator without requiring JS for scene registration.

## Verification

```bash
npm run mobile:prebuild
rg -n 'carplay-audio|application-groups|group.com.podverse.app.next|UIApplicationSceneManifest|CPTemplateApplicationScene' apps/mobile/ios apps/mobile/app.config.ts apps/mobile/plugins 2>/dev/null || true
rg -n 'appGroupIdentifier' apps/mobile/modules/podverse-media-engine/ios
```

## Depends on

- 12.1–12.6 native cache + iOS storage
- Operator App ID / CarPlay / App Group portal steps (complete)
