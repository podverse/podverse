# Authoring: Track 12 — CarPlay / Android Auto + native cache

**Phase:** B (parallel). **Output file:**
`docs/proposals/mobile/_master-plan_/_draft-tracks/track-12.md`

**Detail ID range:** 380–429

Reference:
[DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md)

**Prerequisite:** Track 2 engine spike + Track 10 native cache write path.

**Default model for this Track:** Opus 4.8 (native car layer; app-closed requirement).

Emit master-plan lines with **Model** on each step (see 01-authoring file).

## Track 12 — CarPlay / Android Auto

| Step | Summary | Model | Detail ID |
| ---- | ------- | ----- | --------- |
| 12.1 | Define native cache schema: queue snapshot, downloads index, library browse index JSON. | Opus 4.8 | 380-native-cache-schema |
| 12.2 | Implement iOS native cache storage (App Group or file container) writable from JS bridge. | Opus 4.8 | 381-ios-native-cache-storage |
| 12.3 | Implement Android native cache storage (SharedPreferences or Room) writable from JS bridge. | Opus 4.8 | 382-android-native-cache-storage |
| 12.4 | JS queue store calls cache write on every queue/auto-queue/download change. | Opus 4.8 | 383-js-cache-write-path |
| 12.5 | Spike: verify native reads cache with JS runtime not started (CarPlay simulator). | Opus 4.8 | 384-spike-cache-read-no-js-ios |
| 12.6 | Spike: verify native reads cache with app force-stopped (Android DHU). | Opus 4.8 | 385-spike-cache-read-no-js-android |
| 12.7 | iOS: add CarPlay scene configuration in Info.plist and entitlements. | Opus 4.8 | 386-ios-carplay-scene-config |
| 12.8 | iOS: implement CarPlay `CPListTemplate` browse tree from native cache. | Opus 4.8 | 387-ios-carplay-browse-templates |
| 12.9 | iOS: bind CarPlay now-playing to shared AVPlayer instance from media engine. | Opus 4.8 | 388-ios-carplay-now-playing |
| 12.10 | iOS: handle CarPlay remote commands via MPRemoteCommandCenter shared with engine. | Opus 4.8 | 389-ios-carplay-remote-commands |
| 12.11 | Android: implement Media3 `MediaLibraryService` foreground service. | Opus 4.8 | 390-android-media-library-service |
| 12.12 | Android: expose browse tree MediaItems from native cache for Android Auto. | Opus 4.8 | 391-android-auto-browse-tree |
| 12.13 | Android: connect Android Auto to service not Activity (app-closed requirement). | Opus 4.8 | 392-android-auto-app-closed |
| 12.14 | Include offline/downloaded items in car browse tree from cache downloads index. | Opus 4.8 | 393-car-offline-items-in-tree |
| 12.15 | Car play action uses same enclosure/file URL resolution as phone engine. | Opus 4.8 | 394-car-playback-url-resolution |
| 12.16 | Document CarPlay/Android Auto entitlement and Play Console declaration steps. | Codex 5.3 | 395-car-entitlements-declarations |
| 12.17 | Manual test checklist: DHU browse+play with phone app never opened. | Auto | 396-dhu-test-checklist |
| 12.18 | Manual test checklist: CarPlay simulator launch from background. | Auto | 397-carplay-simulator-checklist |
| 12.19 | E2E not fully automatable — document manual car QA gate in release runbook. | Auto | 398-car-manual-qa-gate |
| 12.20 | Update abcmemory rule: car surfaces are native-only, not JS track-player browse. | Codex 5.3 | 399-abcmemory-car-native-only |
| 12.21 | Parallel worktree: car native module (`ios/`, `android/`) isolated from RN UI worktrees. | Auto | 400-car-parallel-worktree |

## Verification

- Steps 12.1–12.21; Detail IDs 380–400; Model on every step.
- App-closed requirement explicit in intro and spikes.
