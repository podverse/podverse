# 381-ios-native-cache-storage

**Master step:** 12.2
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Persist the three native-cache JSON payloads on iOS so a future CarPlay scene (and spike 12.5)
  can read them **without starting the JS runtime**.
- Preferred: **App Group** container file(s) or `UserDefaults(suiteName:)` shared with the app /
  CarPlay scene; document the chosen path in the media-engine README.
- Wire `writeQueueSnapshot` / `writeDownloadsIndex` / `writeLibraryBrowseIndex` in
  `PodverseMediaEngineModule.swift` (and any shared Swift helper) to **durable** writes — replace
  no-op / log-only stubs.
- Atomic replace (write temp + rename) or equivalent so readers never see truncated JSON.
- Expose a small **native read helper** (Swift) used by spike 12.5 and later CarPlay templates —
  not a JS-only read path for production car UI.

## Architecture notes

- Same process / extension boundary as CarPlay scene will use (12.7+). If App Group is chosen,
  reserve the group id in entitlements docs (full CarPlay entitlement may wait for 12.7 / 12.16).
- If App Group is blocked until CarPlay entitlement, use the app’s Application Support /
  Documents file container for v1 spike **and** document the migration to App Group when the
  CarPlay scene lands — do not leave two competing schemas.
- Engine owns transport; cache storage is co-located in `podverse-media-engine` iOS sources.

## Edge cases

- Concurrent writes from JS: last-write-wins per payload file is OK for v1
- Corrupt JSON: native reader returns empty tree + logs; never crash
- Large library index: keep denormalized; no paging in v1 storage layer

## Acceptance criteria

- After a phone-session write, killing the app leaves readable files/defaults on disk
- Bridge write methods persist all three payloads for schema from 12.1
- README documents storage location + read helper entry point
- No dependency on Metro / JS for native read

## Web parity references

- [DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md)
- [380-native-cache-schema](/docs/proposals/mobile/_master-plan_/details/380-native-cache-schema.md)

## Verification

```bash
# After implement — operator: write from app, force-quit, inspect container / App Group
rg -n 'writeQueueSnapshot|NativeCache|App Group|suiteName' \
  apps/mobile/modules/podverse-media-engine/ios
```

## Depends on

- 12.1 schema — this phase
