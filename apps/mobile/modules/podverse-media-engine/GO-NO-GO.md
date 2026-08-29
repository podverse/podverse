# podverse-media-engine — engine spike go/no-go gate (PG-2b step 2.34)

Detail: [113-engine-spike-gate](/docs/proposals/mobile/_master-plan_/phase-1/details/113-engine-spike-gate.md).
Car foundation:
[00-CAR-FOUNDATION.md](/.llm/plans/completed/phase-1/mobile-pg2b-media-engine-spike/00-CAR-FOUNDATION.md),
[mobile-carplay-android-auto](/.cursor/rules/mobile-carplay-android-auto.mdc).

**A GO means "safe to build player UI (Tracks 10/11) and car work (Track 12) on this engine." It does
NOT mean car is done.** Seamless CarPlay / Android Auto acceptance stays in Track 12 (see "Deferred"
below).

## Phone engine readiness (minimum GO)

| #   | Criterion                                                                           | Status | Evidence                                                                             |
| --- | ----------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| 1   | Single-engine `load` / `play` / `pause` / `seek` / `setRate` on iOS **and** Android | ✅     | `ios/PodverseAudioEngine.swift`, `android/.../PodverseAudioEngine.kt`; debug panel   |
| 2   | Background audio survives on both platforms (step 2.12)                             | ✅     | Device-verified; see README § "Background & after-kill behavior"                     |
| 3   | Lock-screen / media-session controls drive the **same** player instance             | ✅     | iOS shared `MPRemoteCommandCenter`; Android shared `MediaLibrarySession`             |
| 4   | JS events emitted incl. `ended`; JS adapter is the only RN entry point              | ✅     | `src/types.ts`, `apps/mobile/src/bridge/`; `rg NativeModules apps/mobile/src` → none |
| 5   | **No** `react-native-track-player`                                                  | ✅     | `rg react-native-track-player apps/mobile` → none                                    |
| 6   | After force-stop / swipe-away behavior documented honestly (step 2.13)              | ✅     | README § "Background & after-kill behavior" — kill-survival NOT required for GO      |

## Car foundation constraints (required for GO — not full car)

| #   | Constraint                                                                   | Status | Evidence / detail                                                                                 |
| --- | ---------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| C1  | One process-wide player; car now-playing binds to it                         | ✅     | `PodverseAudioEngine` singleton (iOS `.shared` / Kotlin `object`) — 083, 086, 12.9                |
| C2  | One shared `MPRemoteCommandCenter` / Media3 `MediaSession` (no second owner) | ✅     | 085, 088, 12.10                                                                                   |
| C3  | Android uses `MediaLibraryService` (stub browse OK)                          | ✅     | `PodverseMediaLibraryService` (`foregroundServiceType="mediaPlayback"`) — 087 → 12.11–12.13       |
| C4  | Native cache write hooks reserved (stubs OK)                                 | ✅     | `writeQueueSnapshot` / `writeDownloadsIndex` / `writeLibraryBrowseIndex` — 114 / 2.35 → 12.1–12.4 |
| C5  | iOS shared-player accessor usable without starting JS                        | ✅     | `PodverseAudioEngine.shared`, independent of Expo module lifecycle — 12.7–12.10                   |

## Native cache read spikes (Track 12.1–12.6 — landed)

| #           | Criterion                                                                                              | Status                                              | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 12.5        | iOS native code reads durable cache with JS not started                                                | ✅\*                                                | `ios/PodverseNativeCache.swift` `read` / `debugDump`; [NATIVE-CACHE-SPIKE-IOS.md](./NATIVE-CACHE-SPIKE-IOS.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 12.6        | Android native code reads durable cache with app force-stopped                                         | ✅                                                  | `PodverseMediaLibraryService.onCreate` → `PodverseNativeCache.debugDump`; [NATIVE-CACHE-SPIKE-ANDROID.md](./NATIVE-CACHE-SPIKE-ANDROID.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 12.11–12.15 | Android Auto browses the native cache (Library + Downloads) and plays via the shared engine app-closed | ✅ pending operator DHU                             | `PodverseMediaLibraryService` (`onConnect` / `onGetChildren` / `onAddMediaItems` / `onPlaybackResumption`) + `PodverseNativeCacheModel`; operator proof [ANDROID-AUTO-DHU-CHECKLIST.md](./ANDROID-AUTO-DHU-CHECKLIST.md), declaration [ANDROID-AUTO-DECLARATION.md](./ANDROID-AUTO-DECLARATION.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 12.7–12.10  | CarPlay browses the native cache (Library + Downloads) and plays via the shared engine app-closed      | ✅ app-closed cold-launch smoke-tested (2026-07-28) | `PodverseCarPlaySceneDelegate` (scene connect → `debugDump`, Library/Downloads templates, download play → `CPNowPlayingTemplate`) + `PodverseCarPlayCacheModel`; entitlement + App Group in `app.config.ts` / `PodverseNativeCache.appGroupIdentifier`. **App-closed cold-launch + scene connect + App Group cache read proven** (phone force-quit → tap Podverse on CarPlay Home → cold-launch, container resolved, root template rendered) via dynamic AppDelegate scene ([withPodverseCarPlay.js](/apps/mobile/plugins/withPodverseCarPlay.js), no Info.plist manifest — see [.llm/plans/completed/phase-1/mobile-carplay-app-closed-scene](/.llm/plans/completed/phase-1/mobile-carplay-app-closed-scene/)). Visual browse-row render + playback with real content deferred to [car-ux-parity](/docs/proposals/mobile/car-ux-parity/000-OVERVIEW.md) (empty root = empty cache, not a defect). Runbook [CARPLAY-SIMULATOR-CHECKLIST.md](./CARPLAY-SIMULATOR-CHECKLIST.md), entitlement [CARPLAY-ENTITLEMENT.md](./CARPLAY-ENTITLEMENT.md) |

\* iOS file-level proof (container read, Metro not attached) landed first; the in-scene CarPlay
`debugDump` proof now runs from `PodverseCarPlaySceneDelegate` on scene connect (operator Simulator
run pending).

## Deferred — seamless car (NOT this gate)

These remain Track 12 operator acceptance; do **not** mark car "done" at 2.34:

- **12.7–12.15** — full CarPlay / Android Auto browse trees, now-playing bind, offline items in tree
  (Android Auto **and** CarPlay Library+Downloads scaffolds landed; CarPlay app-closed cold-launch
  smoke-tested 2026-07-28, Android Auto pending operator DHU proof). Full browse-tree / tabbed UX
  parity with podverse-rn (Podcasts | Music | Queue | History) deferred to
  [car-ux-parity](/docs/proposals/mobile/car-ux-parity/000-OVERVIEW.md).
- **12.16** — CarPlay entitlement + App Group provisioning (done for `com.podverse.app.next`) —
  operator: [CARPLAY-ENTITLEMENT.md](./CARPLAY-ENTITLEMENT.md)
- **12.17 / 12.18** — Android Auto DHU + CarPlay simulator manual checklists —
  [ANDROID-AUTO-DHU-CHECKLIST.md](./ANDROID-AUTO-DHU-CHECKLIST.md),
  [CARPLAY-SIMULATOR-CHECKLIST.md](./CARPLAY-SIMULATOR-CHECKLIST.md)

Seamless car browse when JS is dead depends on the **native cache** (12.1–12.4 storage), not on keeping
the JS runtime or Activity alive.

## Gate decision

**Operator decision: GO**

**Date:** 2026-07-13

All phone-engine criteria (1–6) and car foundation constraints (C1–C5) are satisfied. Kill-survival
after force-stop is **not** required — background audio + honest after-kill documentation are enough.

## No-go remediation

If background audio regresses on a platform, or a car foundation constraint cannot hold, **stop before
Tracks 10/11/12** and revise Track 2 with the operator:

- Background audio fails (iOS): re-check `AVAudioSession` category/activation and `UIBackgroundModes`.
- Background audio fails (Android): re-check foreground-service start timing and notification.
- If a second player/session/command-center owner is required for car: revisit 083/085/086/088 before
  building UI — do not work around it in Track 10/11.
- File each failure as a follow-up referenced from this gate before re-running.
