# 383-js-cache-write-path

**Master step:** 12.4
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Finish the JS → native write path so every successful mutation of queue / downloads / library
  browse state **persists** via durable bridge methods (12.2–12.3), not `__DEV__` stubs only.
- Update `apps/mobile/src/data/nativeCache/projection.ts`:
  - `projectQueueSnapshotToNativeCache` → `nativePlaybackBridge.writeQueueSnapshot`
  - `projectDownloadsIndexToNativeCache` → already forwards `writeDownloadsIndex`; ensure payload
    matches 12.1 (`schemaVersion`, etc.)
  - `projectLibraryBrowseIndexToNativeCache` → `writeLibraryBrowseIndex`
- Audit call sites:
  - Queue: already via `queueRepository` (10.22) — keep repository-only projection
  - Downloads: already via `downloadsRepository` (13.9)
  - Library browse: add projection from the repository/sync path that owns subscribed podcasts /
    playlists index (wire if missing)
- Soft-fail: bridge errors must not roll back SQLite mutations (log in `__DEV__` / production
  warn once).

## Architecture notes

- Screens/hooks must not call bridge write methods directly — repositories / projection helpers
  only (**mobile-data-layer**, **mobile-carplay-android-auto**).
- Serialize with `JSON.stringify` of schema-shaped objects from 12.1.
- Auto-queue remains in-memory: document; do not invent persistence in this step unless already
  planned elsewhere.

## Edge cases

- Rapid queue edits: last write wins; optional coalesce debounce only if documented (default sync)
- Empty queue / empty downloads: still write valid empty payloads
- JS-only contexts (tests / web?): bridge soft-fail already patterned in downloads projection

## Acceptance criteria

- All three projection helpers call the matching bridge write with schema-versioned JSON
- No remaining “Track 12 storage not wired” stub as the sole behavior on iOS/Android device builds
- Call-site audit comment in `projection.ts` updated to reflect durable writes
- Unit or focused test optional for serialization helper if extracted

## Web parity references

- [331-native-cache-queue-write](/docs/proposals/mobile/_master-plan_/phase-1/details/331-native-cache-queue-write.md)
- [438-cache-downloads-index](/docs/proposals/mobile/_master-plan_/phase-1/details/438-cache-downloads-index.md)
- [380-native-cache-schema](/docs/proposals/mobile/_master-plan_/phase-1/details/380-native-cache-schema.md)

## Verification

```bash
rg -n 'projectQueueSnapshotToNativeCache|projectDownloadsIndexToNativeCache|projectLibraryBrowseIndexToNativeCache' \
  apps/mobile/src
rg -n 'writeQueueSnapshot|writeLibraryBrowseIndex' apps/mobile/src/data/nativeCache
```

## Depends on

- 12.1–12.3 — this phase
- 10.22, 13.9 call sites — done
