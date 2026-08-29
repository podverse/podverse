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
- **CarPlay scene declared dynamically** via Expo config plugin
  [`withPodverseCarPlay.js`](/apps/mobile/plugins/withPodverseCarPlay.js), which injects
  `application:configurationForConnectingSceneSession:options:` into AppDelegate to return the
  `PodverseCarPlaySceneDelegate` config for `CPTemplateApplicationSceneSessionRoleApplication`.
  **No `UIApplicationSceneManifest`** — a CarPlay-only manifest suppressed the phone `UIWindowScene`
  (`RCTKeyWindow()` nil → `RNCSafeAreaProvider` crash → black phone screen). The `carplay-audio`
  entitlement (not a manifest) registers the CarPlay Home icon and cold-launches the app.
- `PodverseCarPlaySceneDelegate.swift` (compiled into the PodverseMediaEngine pod, `@objc` name)
  connects, calls `PodverseNativeCache.debugDump()`, and builds Library/Downloads + play templates;
  `CarPlay` framework linked via the podspec.
- `PodverseNativeCache.appGroupIdentifier = "group.com.podverse.app.next"`.

## App-closed proof (2026-07-28)

App-closed cold-launch **smoke-tested PASS**: phone app force-quit → tap Podverse on CarPlay Home →
`PodverseNext` cold-launches (new pid, phone not foregrounded), App Group container resolves, root
template renders. See the Phase 1 mobile master plan for the implementation and verification history.
Visual browse-row render + playback with real content deferred to
[car-ux-parity](/docs/proposals/mobile/car-ux-parity/000-OVERVIEW.md) (empty root = empty cache; the
UX-parity set restructures the root IA to Podcasts | Music | Queue | History anyway).

## Acceptance criteria

- Built app’s entitlements include CarPlay audio + App Group `group.com.podverse.app.next`.
- AppDelegate returns the CarPlay scene config dynamically (via `withPodverseCarPlay.js`); **no**
  `UIApplicationSceneManifest` in Info.plist.
- `PodverseNativeCache.appGroupIdentifier == "group.com.podverse.app.next"`.
- App still builds/runs on Simulator without requiring JS for scene registration, and the phone app
  launches with no black screen (SafeArea intact).

## Verification

```bash
npm run mobile:prebuild
# expect: carplay-audio + application-groups entitlements, the injected AppDelegate scene method,
# and NO UIApplicationSceneManifest
rg -n 'carplay-audio|application-groups|group.com.podverse.app.next|configurationForConnectingSceneSession|CPTemplateApplicationScene' apps/mobile/ios apps/mobile/app.config.ts apps/mobile/plugins 2>/dev/null || true
rg -n 'UIApplicationSceneManifest' apps/mobile/ios apps/mobile/app.config.ts 2>/dev/null && echo 'WARN: manifest present (regression)' || echo 'ok: no scene manifest'
rg -n 'appGroupIdentifier' apps/mobile/modules/podverse-media-engine/ios
```

## Depends on

- 12.1–12.6 native cache + iOS storage
- Operator App ID / CarPlay / App Group portal steps (complete)
