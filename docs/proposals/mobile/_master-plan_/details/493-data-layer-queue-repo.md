# 493-data-layer-queue-repo

**Master step:** 9b.4
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Queue / now-playing / upcoming / history repository backed by SQLite with background sync via
  existing queue `req*` wrappers.
- Migrate `usePrimaryQueue` / `useQueueResources` to read through the repository (same public hook
  API if possible).
- Prerequisite for Track 10 (PG-7) — queue store must use this repository, not direct fetch.
- On every successful local queue mutation (and after sync reconcile), call
  `projectQueueSnapshotToNativeCache` (stub OK until Track 12). CarPlay / Android Auto / watch
  complications read that cache — **not** SQLite.

## Acceptance criteria

- Library queue + history screens work offline with last-synced data
- Pull-to-refresh / focus triggers sync
- Mutations (when added in Track 10) write local then sync
- DTOs match web queue resource shapes
- Queue repository mutations invoke native-cache projection hooks (stubs acceptable until Track 12
  storage); documented in repository module comments

## Web parity references

- [DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md)
- [DOCS-MOBILE-DATA-LAYER-OFFLINE.md §7.1](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md)
- Web: `apps/web/src/contexts/Queue.tsx`, queue resource hooks
- Car: [DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md)

## Verification

```bash
npm run mobile:e2e:test -- library
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
