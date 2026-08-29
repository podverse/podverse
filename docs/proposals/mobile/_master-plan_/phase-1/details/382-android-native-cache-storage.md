# 382-android-native-cache-storage

**Master step:** 12.3
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Persist the three native-cache JSON payloads on Android so `MediaLibraryService` / DHU spike
  (12.6) can read them with the Activity and JS runtime stopped.
- Preferred: app-private files under `filesDir` / `noBackupFilesDir`, or a small Room /
  SharedPreferences store — document choice in media-engine README.
- Wire `writeQueueSnapshot` / `writeDownloadsIndex` / `writeLibraryBrowseIndex` in
  `PodverseMediaEngineModule.kt` to durable writes (replace log-only stubs).
- Shared Kotlin reader used by `PodverseMediaLibraryService` (later 12.11–12.12) and spike 12.6.
- Atomic write semantics (temp + rename or transactional prefs) for each payload.

## Architecture notes

- Android Auto connects to the **service**, not the Activity — storage must be process-readable
  by the media service process (same app UID / same package).
- Do not require Google Play Services for cache storage.
- Align JSON with 12.1; do not invent Android-only field names.

## Edge cases

- Force-stop clears in-memory state but must leave files on disk (verify in 12.6)
- Multi-process: if service and UI are separate processes, use a storage API safe across both
  (files + careful locking, or ContentProvider — prefer simple files for v1)
- Corrupt JSON → empty browse tree + log

## Acceptance criteria

- Bridge writes survive process death
- Native reader can load all three payloads without Expo / JS
- README documents paths + reader API
- Stub comment in `PodverseMediaLibraryService` updated to point at real reader

## Web parity references

- [DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md)
- [380-native-cache-schema](/docs/proposals/mobile/_master-plan_/phase-1/details/380-native-cache-schema.md)

## Verification

```bash
rg -n 'writeQueueSnapshot|NativeCache|filesDir|SharedPreferences' \
  apps/mobile/modules/podverse-media-engine/android
```

## Depends on

- 12.1 schema — this phase
