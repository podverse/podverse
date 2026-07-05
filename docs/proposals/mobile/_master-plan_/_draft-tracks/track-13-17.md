# Draft: Tracks 13–17 — mobile-only features

Reference:
[DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md)

## Track 13 — Offline downloads

13.1. Design download job queue module (native or RN background task). Model: Opus 4.8. Detail: [430-download-queue-design](/docs/proposals/mobile/_master-plan_/details/430-download-queue-design.md) — _TBD_
13.2. Choose storage: Expo FileSystem + background download or native download manager. Model: Codex 5.3. Detail: [431-download-storage-choice](/docs/proposals/mobile/_master-plan_/details/431-download-storage-choice.md) — _TBD_
13.3. Local metadata DB schema: item_id, path, size, status, enclosure URL hash. Model: Codex 5.3. Detail: [432-download-metadata-schema](/docs/proposals/mobile/_master-plan_/details/432-download-metadata-schema.md) — _TBD_
13.4. Download action from episode detail enqueues job and shows progress. Model: Codex 5.3. Detail: [433-download-from-episode](/docs/proposals/mobile/_master-plan_/details/433-download-from-episode.md) — _TBD_
13.5. My Library downloads section lists completed and in-progress items. Model: Codex 5.3. Detail: [434-library-downloads-list](/docs/proposals/mobile/_master-plan_/details/434-library-downloads-list.md) — _TBD_
13.6. Play downloaded item via engine `file://` path (Track 2.26). Model: Opus 4.8. Detail: [435-playback-from-download](/docs/proposals/mobile/_master-plan_/details/435-playback-from-download.md) — _TBD_
13.7. Storage quota policy and user-facing manage-storage screen. Model: Codex 5.3. Detail: [436-storage-quota-policy](/docs/proposals/mobile/_master-plan_/details/436-storage-quota-policy.md) — _TBD_
13.8. Auto-delete rules optional (oldest first when quota exceeded). Model: Codex 5.3. Detail: [437-auto-delete-policy](/docs/proposals/mobile/_master-plan_/details/437-auto-delete-policy.md) — _TBD_
13.9. Update native cache downloads index on download complete (Track 12). Model: Opus 4.8. Detail: [438-cache-downloads-index](/docs/proposals/mobile/_master-plan_/details/438-cache-downloads-index.md) — _TBD_
13.10. E2E: download episode offline mode play screenshot (network disabled). Model: Codex 5.3. Detail: [439-e2e-offline-play](/docs/proposals/mobile/_master-plan_/details/439-e2e-offline-play.md) — _TBD_

## Track 14 — Push notifications (FCM + UnifiedPush)

14.1. Integrate FCM for playstore flavor via `@react-native-firebase/messaging` or Expo notifications. Model: Codex 5.3. Detail: [440-fcm-integration-playstore](/docs/proposals/mobile/_master-plan_/details/440-fcm-integration-playstore.md) — _TBD_
14.2. Register device via existing `/account/fcm-device/create` wrapper on login. Model: Codex 5.3. Detail: [441-fcm-device-register](/docs/proposals/mobile/_master-plan_/details/441-fcm-device-register.md) — _TBD_
14.3. Update FCM device locale via `/account/fcm-device/update-locale` on locale change. Model: Codex 5.3. Detail: [442-fcm-locale-update](/docs/proposals/mobile/_master-plan_/details/442-fcm-locale-update.md) — _TBD_
14.4. Handle notification tap routing to episode/podcast screens (Track 15). Model: Codex 5.3. Detail: [443-notification-tap-routing](/docs/proposals/mobile/_master-plan_/details/443-notification-tap-routing.md) — _TBD_
14.5. Request notification permission contextually after user action. Model: Auto. Detail: [444-notification-permission-ux](/docs/proposals/mobile/_master-plan_/details/444-notification-permission-ux.md) — _TBD_
14.6. FOSS flavor: integrate UnifiedPush via existing `/account/up-device/*` endpoints. Model: Opus 4.8. Detail: [445-unifiedpush-foss-flavor](/docs/proposals/mobile/_master-plan_/details/445-unifiedpush-foss-flavor.md) — _TBD_
14.7. Document FCM as non-FOSS dependency in FOSS register (Track 20). Model: Auto. Detail: [446-fcm-fdroid-register](/docs/proposals/mobile/_master-plan_/details/446-fcm-fdroid-register.md) — _TBD_
14.8. E2E: mock push handler opens correct screen (where test harness allows). Model: Codex 5.3. Detail: [447-e2e-push-routing-stub](/docs/proposals/mobile/_master-plan_/details/447-e2e-push-routing-stub.md) — _TBD_

## Track 15 — Deep links / universal links

15.1. Configure iOS Associated Domains for podverse web URLs. Model: Codex 5.3. Detail: [450-ios-associated-domains](/docs/proposals/mobile/_master-plan_/details/450-ios-associated-domains.md) — _TBD_
15.2. Configure Android App Links intent filters for same URL patterns. Model: Codex 5.3. Detail: [451-android-app-links](/docs/proposals/mobile/_master-plan_/details/451-android-app-links.md) — _TBD_
15.3. Map URL paths to screens: podcast, episode, playlist, clip, profile by id. Model: Codex 5.3. Detail: [452-deep-link-path-map](/docs/proposals/mobile/_master-plan_/details/452-deep-link-path-map.md) — _TBD_
15.4. Handle cold-start deep link before auth bootstrap completes. Model: Opus 4.8. Detail: [453-cold-start-deep-link](/docs/proposals/mobile/_master-plan_/details/453-cold-start-deep-link.md) — _TBD_
15.5. Share sheet generates same URLs as web for cross-platform sharing. Model: Codex 5.3. Detail: [454-share-url-parity](/docs/proposals/mobile/_master-plan_/details/454-share-url-parity.md) — _TBD_
15.6. E2E: open app via test deep link and screenshot target screen. Model: Codex 5.3. Detail: [455-e2e-deep-link-screenshot](/docs/proposals/mobile/_master-plan_/details/455-e2e-deep-link-screenshot.md) — _TBD_

## Track 16 — Settings, prefs sync, OPML import/export

16.1. Device prefs store (MMKV or AsyncStorage) mirroring web localSettings keys. Model: Codex 5.3. Detail: [460-device-prefs-store](/docs/proposals/mobile/_master-plan_/details/460-device-prefs-store.md) — _TBD_
16.2. Sync playback prefs to server account-settings on login. Model: Codex 5.3. Detail: [461-prefs-server-sync](/docs/proposals/mobile/_master-plan_/details/461-prefs-server-sync.md) — _TBD_
16.3. Settings screen: locale, theme, playback defaults, notification toggles. Model: Codex 5.3. Detail: [462-settings-screen](/docs/proposals/mobile/_master-plan_/details/462-settings-screen.md) — _TBD_
16.4. OPML import: file picker + parse OPML XML into feed URL list client-side. Model: Codex 5.3. Detail: [463-opml-import-parse](/docs/proposals/mobile/_master-plan_/details/463-opml-import-parse.md) — _TBD_
16.5. OPML import: batch subscribe or add-by-rss each feed via API mutations. Model: Opus 4.8. Detail: [464-opml-import-subscribe](/docs/proposals/mobile/_master-plan_/details/464-opml-import-subscribe.md) — _TBD_
16.6. OPML export: gather subscribed feed URLs and generate OPML document. Model: Codex 5.3. Detail: [465-opml-export-generate](/docs/proposals/mobile/_master-plan_/details/465-opml-export-generate.md) — _TBD_
16.7. OPML export: share sheet save/send file to user-chosen destination. Model: Codex 5.3. Detail: [466-opml-export-share](/docs/proposals/mobile/_master-plan_/details/466-opml-export-share.md) — _TBD_
16.8. OPML error handling: invalid file, partial import report UI. Model: Codex 5.3. Detail: [467-opml-error-handling](/docs/proposals/mobile/_master-plan_/details/467-opml-error-handling.md) — _TBD_
16.9. E2E: OPML import smoke with fixture file screenshot of results list. Model: Codex 5.3. Detail: [468-e2e-opml-import](/docs/proposals/mobile/_master-plan_/details/468-e2e-opml-import.md) — _TBD_
16.10. E2E: OPML export produces file and shows success state screenshot. Model: Auto. Detail: [469-e2e-opml-export](/docs/proposals/mobile/_master-plan_/details/469-e2e-opml-export.md) — _TBD_

## Track 17 — RN i18n runtime

17.0. Cross-app fix: web + management-web load `compiled/` messages. Model: Codex 5.3. Detail: [483-i18n-runtime-load-compiled](/docs/proposals/mobile/_master-plan_/details/483-i18n-runtime-load-compiled.md) — planned
17.1. Choose RN i18n runtime: i18next + expo-localization (recommended). Model: Codex 5.3. Detail: [470-i18n-runtime-choice](/docs/proposals/mobile/_master-plan_/details/470-i18n-runtime-choice.md) — planned
17.2. Copy web originals JSON for v1 spike; superseded by 17.13. Model: Auto. Detail: [471-i18n-copy-originals-v1](/docs/proposals/mobile/_master-plan_/details/471-i18n-copy-originals-v1.md) — planned
17.3. Wire locale detection from device + account-settings override. Model: Codex 5.3. Detail: [472-i18n-locale-detection](/docs/proposals/mobile/_master-plan_/details/472-i18n-locale-detection.md) — planned
17.4. Pass localized strings into RN components (no copy in shared packages). Model: Codex 5.3. Detail: [473-i18n-component-wiring](/docs/proposals/mobile/_master-plan_/details/473-i18n-component-wiring.md) — planned
17.5. Reuse `@podverse/helpers` timeFormatter for duration display. Model: Auto. Detail: [474-i18n-time-formatter](/docs/proposals/mobile/_master-plan_/details/474-i18n-time-formatter.md) — planned
17.6. Phased `packages/i18n-catalog` migration; see 17.9–17.13. Model: Auto. Detail: [475-i18n-catalog-future](/docs/proposals/mobile/_master-plan_/details/475-i18n-catalog-future.md) — planned
17.7. CI key-parity check: mobile ⊆ consumer keys. Model: Codex 5.3. Detail: [476-i18n-key-parity-ci](/docs/proposals/mobile/_master-plan_/details/476-i18n-key-parity-ci.md) — planned
17.8. E2E: switch locale in settings and screenshot Home in second locale. Model: Codex 5.3. Detail: [477-e2e-locale-switch](/docs/proposals/mobile/_master-plan_/details/477-e2e-locale-switch.md) — planned
17.9. Create `packages/i18n-catalog` scaffold. Model: Codex 5.3. Detail: [478-i18n-catalog-scaffold](/docs/proposals/mobile/_master-plan_/details/478-i18n-catalog-scaffold.md) — planned
17.10. Extract cross-app keys into `shared/`. Model: Codex 5.3. Detail: [479-i18n-extract-shared-layer](/docs/proposals/mobile/_master-plan_/details/479-i18n-extract-shared-layer.md) — planned
17.11. Migrate web consumer namespaces to `consumer/`. Model: Codex 5.3. Detail: [480-i18n-migrate-consumer-web](/docs/proposals/mobile/_master-plan_/details/480-i18n-migrate-consumer-web.md) — planned
17.12. Migrate management namespaces to `management/`. Model: Codex 5.3. Detail: [481-i18n-migrate-management](/docs/proposals/mobile/_master-plan_/details/481-i18n-migrate-management.md) — planned
17.13. Mobile bundles merged catalog JSON via i18next. Model: Codex 5.3. Detail: [482-i18n-mobile-catalog-import](/docs/proposals/mobile/_master-plan_/details/482-i18n-mobile-catalog-import.md) — planned
