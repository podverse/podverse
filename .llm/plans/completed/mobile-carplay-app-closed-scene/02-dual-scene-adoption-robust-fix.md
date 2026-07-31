# 02 — Robust fix: phone UIWindowScene + CarPlay scene (dual-scene adoption)

**Model:** Opus 4.8
**Only if Step 1 FAILED** (dynamic declaration did not cold-launch CarPlay app-closed).

## Goal

Adopt `UIScene` for **both** the phone and CarPlay so iOS can cold-launch CarPlay with the phone app
force-quit, **without** breaking the phone window (no black screen). This is the configuration in
Apple's CarPlay Developer Guide: an Info.plist `UIApplicationSceneManifest` declaring a
`UIWindowSceneSessionRoleApplication` (phone) **and** a
`CPTemplateApplicationSceneSessionRoleApplication` (CarPlay), with
`UIApplicationSupportsMultipleScenes = true`.

## Why the phone scene is the hard part

Expo SDK 52 / RN `EXAppDelegateWrapper` (`RCTAppDelegate`) creates the `UIWindow` and starts React
Native in `application:didFinishLaunchingWithOptions:` (legacy window lifecycle). If we declare a
scene manifest, iOS stops creating that implicit window — so we must move RN root/window creation
into a **phone `UIWindowSceneDelegate`**. Getting this wrong reproduces the black screen.

## Do (durable Expo config plugin — extend `withPodverseCarPlay.js` or add a sibling)

1. **Phone SceneDelegate** (`PodversePhoneSceneDelegate`, ObjC or Swift) conforming to
   `UIWindowSceneDelegate`:
   - `scene:willConnectToSession:options:` → create `UIWindow(windowScene:)`, build the RN root view
     controller from the app delegate's React factory, set as `rootViewController`, `makeKeyAndVisible`.
   - Reuse the RN factory that `EXAppDelegateWrapper`/`RCTAppDelegate` exposes (SDK 52: the app
     delegate holds the `RCTReactNativeFactory` / root-view-factory; call its
     `viewWithModuleName:` / `createRootViewController` equivalent). Confirm exact API from
     `node_modules/expo`/`react-native` headers in the installed SDK 52 build.
   - Forward `openURLContexts` / `continueUserActivity` to `RCTLinkingManager` so deep links still
     work under scenes.
2. **AppDelegate**: keep `configurationForConnectingSceneSession` returning the CarPlay config for
   the CarPlay role AND the phone config (`PodversePhoneSceneDelegate` / `UIWindowScene`) for
   `UIWindowSceneSessionRoleApplication`. Remove the legacy window creation from
   `didFinishLaunchingWithOptions` **only** once the phone scene delegate owns the window (avoid
   double windows).
3. **Info.plist** (via plugin `withInfoPlist`): add `UIApplicationSceneManifest` with
   `UIApplicationSupportsMultipleScenes = true` and BOTH scene roles:
   - `UIWindowSceneSessionRoleApplication` → `PodversePhoneSceneDelegate`
   - `CPTemplateApplicationSceneSessionRoleApplication` → `PodverseCarPlaySceneDelegate`
4. Keep everything in `apps/mobile/plugins/` so `mobile:prebuild` regenerates `ios/` correctly.

## Acceptance criteria

- `npm run mobile:prebuild` emits Info.plist with both scene roles + supports-multiple-scenes true.
- Phone app launches to real UI (no black screen; `RCTKeyWindow()` non-nil; SafeArea renders).
- CarPlay connects and browses/plays with the phone app force-quit (Step 3 proves it).
- Deep links (`podverse-next://`) still open from a cold phone launch.

## Do not

- Do not declare a CarPlay-only manifest (that caused the black screen).
- Do not create a second `AVPlayer` / `MPRemoteCommandCenter`.
- Do not hand-edit gitignored `ios/` as the source of truth — must be plugin-driven.
- Do not run unit/E2E suites during agent work.

## Risk / fallback

If full phone-scene adoption proves too invasive on SDK 52 (RN factory API mismatch), STOP and
record findings; fall back to the dynamic-only path from Step 1 plus a documented limitation, and
open a follow-up to revisit on the next Expo SDK bump (SDK 53+ ships a scene-based template).

## References

- Apple CarPlay Developer Guide (dual-scene manifest example) — see WebSearch notes in chat history.
- Expo issue on scene lifecycle requirement (SDK 55/56 / Xcode 27) — same migration shape.
