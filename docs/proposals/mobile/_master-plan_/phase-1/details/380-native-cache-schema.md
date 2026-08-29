# 380-native-cache-schema

**Master step:** 12.1
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Own the **canonical JSON schema** for the three native-cache payloads that car / watch read
  when JS is dead:
  1. **Queue snapshot** — now-playing + upcoming (skip/advance, now-playing metadata)
  2. **Downloads index** — completed local files (`file://` / sandbox paths)
  3. **Library browse index** — podcast / playlist / category roots for car templates
- Align TypeScript types in `apps/mobile/src/data/nativeCache/` with the documented schema
  (extend `NativeCacheQueueEntry`, `NativeCacheDownloadEntry`, `NativeCacheBrowseNode` as needed).
- Document versioning (`schemaVersion: 1`) and forward-compat rules (native ignores unknown keys;
  JS never drops required keys without a version bump).
- Update engine README § native cache to point at this schema as source of truth (replace “v0
  draft” language).

## Architecture notes

- Dual-store: SQLite = phone UI only; native cache = CarPlay / Android Auto / watch
  ([DOCS-MOBILE-DATA-LAYER-OFFLINE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md)
  §7.1,
  [DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md)).
- Policy stays in `@podverse/playback-core`; native stores opaque snapshots.
- Keep payloads small and denormalized for native list rendering (title, artwork URL, playable
  URL / file path, idText). Do not embed full DTOs.
- Existing projection helpers + bridge method names (`writeQueueSnapshot`,
  `writeDownloadsIndex`, `writeLibraryBrowseIndex`) from 2.35 / 114 remain the write API.

## Suggested field sets (finalize in implementation)

### Queue snapshot

- `schemaVersion`, `updatedAtMs`
- `nowPlayingIdText: string | null`
- `entries[]`: `idText`, `title`, `artworkUrl`, `mediaUrl` (remote or `file://`), optional
  `durationMs`, `podcastTitle`

### Downloads index

- `schemaVersion`, `updatedAtMs`
- `entries[]`: `idText`, `title`, `filePath` (absolute sandbox), optional `artworkUrl`,
  `mediaUrl`, `bytes`

### Library browse index

- `schemaVersion`, `updatedAtMs`
- `nodes[]`: `idText`, `title`, `kind` (`podcast` | `playlist` | `category`), optional
  `artworkUrl`, `childCount`

## Edge cases / cross-track deps

- Empty snapshots must be valid JSON (car shows empty tree, not crash)
- Downloads paths must match what Track 13 writes (absolute, readable by native process)
- Auto-queue is in-memory today — document that car queue snapshot is **manual queue +
  now-playing** until auto-queue persists (see projection.ts audit comments)
- Do not invent a second schema for MediaLibraryService / CarPlay — both read this cache

## Acceptance criteria

- Single markdown schema section (this detail + short pointer in engine README) is authoritative
- TS projection types match schema; compile-time fields used by write path
- No SQLite handles or Drizzle types leak into native payload
- Cross-refs: 12.2–12.4 storage/write path; 12.14 offline car browse; 2.35 / 114 hooks

## Web parity references

- N/A (mobile-only car contract)
- [114-engine-native-cache-hooks](/docs/proposals/mobile/_master-plan_/phase-1/details/114-engine-native-cache-hooks.md)
- [331-native-cache-queue-write](/docs/proposals/mobile/_master-plan_/phase-1/details/331-native-cache-queue-write.md)
- [438-cache-downloads-index](/docs/proposals/mobile/_master-plan_/phase-1/details/438-cache-downloads-index.md)
- [mobile-carplay-android-auto](/.cursor/rules/mobile-carplay-android-auto.mdc)

## Verification

```bash
rg -n 'schemaVersion|NativeCacheQueueEntry|DownloadsIndexProjection' apps/mobile/src/data/nativeCache
rg -n 'writeQueueSnapshot|writeDownloadsIndex|writeLibraryBrowseIndex' \
  apps/mobile/modules/podverse-media-engine/README.md
```

## Depends on

- 2.35 / 114 contract stubs — done
- 10.22 / 13.9 projection call sites — done (stubs)
