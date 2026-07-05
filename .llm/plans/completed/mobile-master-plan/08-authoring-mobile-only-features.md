# Authoring: Tracks 13–17 — mobile-only features

**Phase:** B (parallel). **Output file:**
`docs/proposals/mobile/_master-plan_/_draft-tracks/track-13-17.md`

**Detail ID range:** 430–509

Reference:
[DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md)

Emit master-plan lines with **Model** on each step (see 01-authoring file).

## Track 13 — Offline downloads

| Step | Summary | Model | Detail ID |
| ---- | ------- | ----- | --------- |
| 13.1 | Design download job queue module (native or RN background task). | Opus 4.8 | 430-download-queue-design |
| 13.2 | Choose storage: Expo FileSystem + background download or native download manager. | Codex 5.3 | 431-download-storage-choice |
| 13.3 | Local metadata DB schema: item_id, path, size, status, enclosure URL hash. | Codex 5.3 | 432-download-metadata-schema |
| 13.4 | Download action from episode detail enqueues job and shows progress. | Codex 5.3 | 433-download-from-episode |
| 13.5 | My Library downloads section lists completed and in-progress items. | Codex 5.3 | 434-library-downloads-list |
| 13.6 | Play downloaded item via engine `file://` path (Track 2.26). | Opus 4.8 | 435-playback-from-download |
| 13.7 | Storage quota policy and user-facing manage-storage screen. | Codex 5.3 | 436-storage-quota-policy |
| 13.8 | Auto-delete rules optional (oldest first when quota exceeded). | Codex 5.3 | 437-auto-delete-policy |
| 13.9 | Update native cache downloads index on download complete (Track 12). | Opus 4.8 | 438-cache-downloads-index |
| 13.10 | E2E: download episode offline mode play screenshot (network disabled). | Codex 5.3 | 439-e2e-offline-play |

## Track 14 — Push notifications (FCM + UnifiedPush)

| Step | Summary | Model | Detail ID |
| ---- | ------- | ----- | --------- |
| 14.1 | Integrate FCM for playstore flavor via `@react-native-firebase/messaging` or Expo notifications. | Codex 5.3 | 440-fcm-integration-playstore |
| 14.2 | Register device via existing `/account/fcm-device/create` wrapper on login. | Codex 5.3 | 441-fcm-device-register |
| 14.3 | Update FCM device locale via `/account/fcm-device/update-locale` on locale change. | Codex 5.3 | 442-fcm-locale-update |
| 14.4 | Handle notification tap routing to episode/podcast screens (Track 15). | Codex 5.3 | 443-notification-tap-routing |
| 14.5 | Request notification permission contextually after user action. | Auto | 444-notification-permission-ux |
| 14.6 | FOSS flavor: integrate UnifiedPush via existing `/account/up-device/*` endpoints. | Opus 4.8 | 445-unifiedpush-foss-flavor |
| 14.7 | Document FCM as non-FOSS dependency in FOSS register (Track 20). | Auto | 446-fcm-fdroid-register |
| 14.8 | E2E: mock push handler opens correct screen (where test harness allows). | Codex 5.3 | 447-e2e-push-routing-stub |

## Track 15 — Deep links / universal links

| Step | Summary | Model | Detail ID |
| ---- | ------- | ----- | --------- |
| 15.1 | Configure iOS Associated Domains for podverse web URLs. | Codex 5.3 | 450-ios-associated-domains |
| 15.2 | Configure Android App Links intent filters for same URL patterns. | Codex 5.3 | 451-android-app-links |
| 15.3 | Map URL paths to screens: podcast, episode, playlist, clip, profile by id. | Codex 5.3 | 452-deep-link-path-map |
| 15.4 | Handle cold-start deep link before auth bootstrap completes. | Opus 4.8 | 453-cold-start-deep-link |
| 15.5 | Share sheet generates same URLs as web for cross-platform sharing. | Codex 5.3 | 454-share-url-parity |
| 15.6 | E2E: open app via test deep link and screenshot target screen. | Codex 5.3 | 455-e2e-deep-link-screenshot |

## Track 16 — Settings, prefs sync, OPML import/export

| Step | Summary | Model | Detail ID |
| ---- | ------- | ----- | --------- |
| 16.1 | Device prefs store (MMKV or AsyncStorage) mirroring web localSettings keys. | Codex 5.3 | 460-device-prefs-store |
| 16.2 | Sync playback prefs to server account-settings on login. | Codex 5.3 | 461-prefs-server-sync |
| 16.3 | Settings screen: locale, theme, playback defaults, notification toggles. | Codex 5.3 | 462-settings-screen |
| 16.4 | OPML import: file picker + parse OPML XML into feed URL list client-side. | Codex 5.3 | 463-opml-import-parse |
| 16.5 | OPML import: batch subscribe or add-by-rss each feed via API mutations. | Opus 4.8 | 464-opml-import-subscribe |
| 16.6 | OPML export: gather subscribed feed URLs and generate OPML document. | Codex 5.3 | 465-opml-export-generate |
| 16.7 | OPML export: share sheet save/send file to user-chosen destination. | Codex 5.3 | 466-opml-export-share |
| 16.8 | OPML error handling: invalid file, partial import report UI. | Codex 5.3 | 467-opml-error-handling |
| 16.9 | E2E: OPML import smoke with fixture file screenshot of results list. | Codex 5.3 | 468-e2e-opml-import |
| 16.10 | E2E: OPML export produces file and shows success state screenshot. | Auto | 469-e2e-opml-export |

## Track 17 — RN i18n runtime

| Step | Summary | Model | Detail ID |
| ---- | ------- | ----- | --------- |
| 17.1 | Choose RN i18n runtime: i18next + expo-localization (recommended). | Codex 5.3 | 470-i18n-runtime-choice |
| 17.2 | Copy or symlink web originals JSON for v1 (en-US, es, fr, el-GR). | Auto | 471-i18n-copy-originals-v1 |
| 17.3 | Wire locale detection from device + account-settings override. | Codex 5.3 | 472-i18n-locale-detection |
| 17.4 | Pass localized strings into RN components (no copy in shared packages). | Codex 5.3 | 473-i18n-component-wiring |
| 17.5 | Reuse `@podverse/helpers` timeFormatter for duration display. | Auto | 474-i18n-time-formatter |
| 17.6 | Plan medium-term `packages/i18n-catalog` extraction (document only). | Auto | 475-i18n-catalog-future |
| 17.7 | CI key-parity check between web and mobile locale files (optional script). | Codex 5.3 | 476-i18n-key-parity-ci |
| 17.8 | E2E: switch locale in settings and screenshot Home in second locale. | Codex 5.3 | 477-e2e-locale-switch |

## Verification

- Tracks 13–17 complete; Detail IDs 430–477; Model on every step.
- OPML import/export in Track 16 with E2E steps.
- UnifiedPush called out for FOSS flavor.
