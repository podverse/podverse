# 04 — Queue / now-playing / history repository

Implement master step **9b.4**. **Required before Track 10 (PG-7).**

## Detail docs

- [493-data-layer-queue-repo](/docs/proposals/mobile/_master-plan_/details/493-data-layer-queue-repo.md)

## Decision / skills

- [DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md)
- [DOCS-MOBILE-DATA-LAYER-OFFLINE.md §7.1](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md)
- **mobile-data-layer**, **mobile-playback**

## Tasks

1. Schema + `queueRepository` for primary queue, now-playing, upcoming, history (match web queue
   resource DTO shapes via helpers subpaths).
2. Background sync via existing queue `ApiRequestService` methods inside the repository only.
3. Migrate `usePrimaryQueue` / `useQueueResources` (and Library queue/history screens) to read
   through the repository — prefer keeping the same public hook API.
4. On every successful local queue mutation and after sync reconcile, call
   `projectQueueSnapshotToNativeCache` (**stub OK** until Track 12). Document in the repo module.
5. Read path: UI reads SQLite first; stale/missing triggers background fetch.
6. Mark **9b.4** / **493** `done`.

## Acceptance

- Library queue + history work offline with last-synced data
- Pull-to-refresh / focus triggers sync
- Projection hook invoked on mutations (stub acceptable)
- No direct `req*` from those screens/hooks for product data

Do not run tests during agent work.
