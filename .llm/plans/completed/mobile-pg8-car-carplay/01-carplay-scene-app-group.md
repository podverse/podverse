# 01 — CarPlay scene + App Group + entitlements (12.7, 12.16 iOS)

**Cursor model:** Opus 4.8 (native/Expo wiring); Codex 5.3 for entitlement doc refresh
**Details:**
[386-ios-carplay-scene-config](/docs/proposals/mobile/_master-plan_/details/386-ios-carplay-scene-config.md),
[395-car-entitlements-declarations](/docs/proposals/mobile/_master-plan_/details/395-car-entitlements-declarations.md)

## Goal

Make the Next app a CarPlay audio app in **durable Expo config** and point the native cache at App
Group **`group.com.podverse.app.next`**. Portal App ID / CarPlay / group already exist — this step
is **code + prebuild**, not another Apple contact form.

## Do

1. Author/read details 386 + 395 (iOS section already updated for portal-complete).
2. Set `PodverseNativeCache.appGroupIdentifier = "group.com.podverse.app.next"` (replace `nil`).
3. Wire Expo so prebuild emits:
   - Entitlements: `com.apple.developer.carplay-audio` (+ framework key if required),
     `com.apple.security.application-groups` → `group.com.podverse.app.next`
   - Info.plist CarPlay / `UIApplicationSceneManifest` scene configuration for an audio CarPlay
     scene
4. Prefer a small config plugin under `apps/mobile/plugins/` (or documented `app.config.ts`
   entitlements) so gitignored `ios/` regenerates correctly — do not rely on one-off Xcode-only
   edits.
5. Add a Swift CarPlay scene / template application scene entry that can call
   `PodverseNativeCache.debugDump()` on connect (templates filled in step 2).
6. Update `CARPLAY-ENTITLEMENT.md` “what already exists in code” section once wired.
7. Mark master steps **12.7** + **12.16 iOS wiring** + Appendix C **386** / **395** as appropriate
   → `planned` was set at detailing; on implement → `done`. Check COPY-PASTA box.

## Do not

- Do not re-submit Apple CarPlay contact form.
- Do not change bundle id away from `com.podverse.app.next`.
- Do not implement full browse lists (step 2) or play (step 3).
- Do not run tests during agent work.
- Do not implement Podcasts/Music/Queue/History UX-parity IA.

## Skills / rules

- **mobile-carplay-android-auto**, **mobile-playback**, **mobile-expo-monorepo**

## Operator verify (after implement)

```bash
npm run mobile:prebuild
rg -n 'group.com.podverse.app.next|carplay-audio|CPTemplateApplicationScene|UIApplicationSceneManifest' apps/mobile/ios apps/mobile/app.config.ts apps/mobile/plugins apps/mobile/modules/podverse-media-engine/ios
```
