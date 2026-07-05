# Draft: Track 12 — CarPlay / Android Auto + native cache

**Prerequisites:** Track 2 engine spike + Track 10 native cache write path.

**App-closed requirement:** CarPlay and Android Auto must browse and play from native cache when the
JS runtime is not running (CarPlay simulator / Android DHU with app force-stopped).

Reference:
[DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md)

## Track 12 — CarPlay / Android Auto

12.1. Define native cache schema: queue snapshot, downloads index, library browse index JSON. Model: Opus 4.8. Detail: [380-native-cache-schema](/docs/proposals/mobile/_master-plan_/details/380-native-cache-schema.md) — _TBD_
12.2. Implement iOS native cache storage (App Group or file container) writable from JS bridge. Model: Opus 4.8. Detail: [381-ios-native-cache-storage](/docs/proposals/mobile/_master-plan_/details/381-ios-native-cache-storage.md) — _TBD_
12.3. Implement Android native cache storage (SharedPreferences or Room) writable from JS bridge. Model: Opus 4.8. Detail: [382-android-native-cache-storage](/docs/proposals/mobile/_master-plan_/details/382-android-native-cache-storage.md) — _TBD_
12.4. JS queue store calls cache write on every queue/auto-queue/download change. Model: Opus 4.8. Detail: [383-js-cache-write-path](/docs/proposals/mobile/_master-plan_/details/383-js-cache-write-path.md) — _TBD_
12.5. Spike: verify native reads cache with JS runtime not started (CarPlay simulator). Model: Opus 4.8. Detail: [384-spike-cache-read-no-js-ios](/docs/proposals/mobile/_master-plan_/details/384-spike-cache-read-no-js-ios.md) — _TBD_
12.6. Spike: verify native reads cache with app force-stopped (Android DHU). Model: Opus 4.8. Detail: [385-spike-cache-read-no-js-android](/docs/proposals/mobile/_master-plan_/details/385-spike-cache-read-no-js-android.md) — _TBD_
12.7. iOS: add CarPlay scene configuration in Info.plist and entitlements. Model: Opus 4.8. Detail: [386-ios-carplay-scene-config](/docs/proposals/mobile/_master-plan_/details/386-ios-carplay-scene-config.md) — _TBD_
12.8. iOS: implement CarPlay `CPListTemplate` browse tree from native cache. Model: Opus 4.8. Detail: [387-ios-carplay-browse-templates](/docs/proposals/mobile/_master-plan_/details/387-ios-carplay-browse-templates.md) — _TBD_
12.9. iOS: bind CarPlay now-playing to shared AVPlayer instance from media engine. Model: Opus 4.8. Detail: [388-ios-carplay-now-playing](/docs/proposals/mobile/_master-plan_/details/388-ios-carplay-now-playing.md) — _TBD_
12.10. iOS: handle CarPlay remote commands via MPRemoteCommandCenter shared with engine. Model: Opus 4.8. Detail: [389-ios-carplay-remote-commands](/docs/proposals/mobile/_master-plan_/details/389-ios-carplay-remote-commands.md) — _TBD_
12.11. Android: implement Media3 `MediaLibraryService` foreground service. Model: Opus 4.8. Detail: [390-android-media-library-service](/docs/proposals/mobile/_master-plan_/details/390-android-media-library-service.md) — _TBD_
12.12. Android: expose browse tree MediaItems from native cache for Android Auto. Model: Opus 4.8. Detail: [391-android-auto-browse-tree](/docs/proposals/mobile/_master-plan_/details/391-android-auto-browse-tree.md) — _TBD_
12.13. Android: connect Android Auto to service not Activity (app-closed requirement). Model: Opus 4.8. Detail: [392-android-auto-app-closed](/docs/proposals/mobile/_master-plan_/details/392-android-auto-app-closed.md) — _TBD_
12.14. Include offline/downloaded items in car browse tree from cache downloads index. Model: Opus 4.8. Detail: [393-car-offline-items-in-tree](/docs/proposals/mobile/_master-plan_/details/393-car-offline-items-in-tree.md) — _TBD_
12.15. Car play action uses same enclosure/file URL resolution as phone engine. Model: Opus 4.8. Detail: [394-car-playback-url-resolution](/docs/proposals/mobile/_master-plan_/details/394-car-playback-url-resolution.md) — _TBD_
12.16. Document CarPlay/Android Auto entitlement and Play Console declaration steps. Model: Codex 5.3. Detail: [395-car-entitlements-declarations](/docs/proposals/mobile/_master-plan_/details/395-car-entitlements-declarations.md) — _TBD_
12.17. Manual test checklist: DHU browse+play with phone app never opened. Model: Auto. Detail: [396-dhu-test-checklist](/docs/proposals/mobile/_master-plan_/details/396-dhu-test-checklist.md) — _TBD_
12.18. Manual test checklist: CarPlay simulator launch from background. Model: Auto. Detail: [397-carplay-simulator-checklist](/docs/proposals/mobile/_master-plan_/details/397-carplay-simulator-checklist.md) — _TBD_
12.19. E2E not fully automatable — document manual car QA gate in release runbook. Model: Auto. Detail: [398-car-manual-qa-gate](/docs/proposals/mobile/_master-plan_/details/398-car-manual-qa-gate.md) — _TBD_
12.20. Update abcmemory rule: car surfaces are native-only, not JS track-player browse. Model: Codex 5.3. Detail: [399-abcmemory-car-native-only](/docs/proposals/mobile/_master-plan_/details/399-abcmemory-car-native-only.md) — _TBD_
12.21. Parallel worktree: car native module (`ios/`, `android/`) isolated from RN UI worktrees. Model: Auto. Detail: [400-car-parallel-worktree](/docs/proposals/mobile/_master-plan_/details/400-car-parallel-worktree.md) — _TBD_
