# Mobile data layer (`apps/mobile/src/data`)

Offline-first data layer for the Podverse mobile app. See the decision doc
[DOCS-MOBILE-DATA-LAYER-OFFLINE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md)
and the **mobile-data-layer** skill.

## Storage boundaries

Pick the store by what the data _is_ — do not mix responsibilities:

| Store                        | Use for                                                      | Not for                    |
| ---------------------------- | ------------------------------------------------------------ | -------------------------- |
| **SecureStore**              | Auth tokens (access / refresh)                               | Entities, prefs            |
| **AsyncStorage**             | Tiny key/value prefs (e.g. `uit` UI theme)                   | Tokens, entity collections |
| **SQLite** (`db/`)           | App entities + sync metadata (account, queue, add-by-rss, …) | Tokens                     |
| **Native cache** (car/watch) | Projected read model for CarPlay / Android Auto / watch      | Source of truth            |

**SQLite is phone-UI-only.** CarPlay, Android Auto, and watch surfaces read a separate native
cache because the JS runtime may be suspended; repositories that own queue / downloads / library
index project their state to that native cache on mutation (stubs until Track 12) — see
[DOCS-MOBILE-DATA-LAYER-OFFLINE.md §7.1](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md).

Never write auth tokens to SQLite or AsyncStorage.

## `db/` — SQLite + Drizzle

- `client.ts` — lazily opens `expo-sqlite` and exposes the Drizzle client (`getDb()`).
- `schema.ts` — Drizzle table definitions (`kv_meta`, `account_snapshot`, `queue_cache`,
  `add_by_rss_feed`, `download`). Domain tables arrive as forward-only migrations.
- `migrations.ts` — forward-only migration list (append-only; strictly increasing integer
  `version`).
- `runMigrations.ts` — applies pending migrations in a transaction, tracked via
  `PRAGMA user_version`.
- `index.ts` — `initializeDatabase()` (idempotent; called from `App.tsx` bootstrap, awaited by
  repositories).

Do **not** import `@podverse/orm` here (it is a server/Node ORM). Migrations are hand-authored
forward-only SQL; `drizzle-kit` codegen can be adopted later if schema management grows.

## Repository seam

Screens and hooks read through **repositories** — they never call `createMobileApiRequestService`
/ `req*` / `requestWithMobileAuthRefresh` for product data. Product-data API access lives only
inside repositories (auth bootstrap may still seed the session).

```
Screen / hook  →  repository  →  SQLite (source of truth for phone UI)
                              →  ApiRequestService (background sync)
                              →  native-cache projection (car / watch)
```

- `repositories/` — one module per domain. Methods take a `MobileAuthRequestContext` (from
  `useAuth()`) and return `@podverse/helpers` DTO shapes (same as web). Live domains:
  `accountRepository` (session snapshot), `queueRepository` (primary queue / now-playing /
  upcoming / history, offline-first via `queue_cache`, projects to the native cache on sync),
  `addByRssRepository` (followed add-by-RSS feeds in `add_by_rss_feed`, offline-capable list;
  persists the last `@podverse/parser-mapping` compat bundle per feed for full-resource playback —
  the follow/parse/unfollow API calls stay in the add-by-RSS hooks that orchestrate the flow).
  `downloadsRepository` (Phase F offline downloads index in `download`; source of truth for the
  Downloads library + local-file playback — **progressive only**, eligibility gated by
  `isItemDownloadable` in `src/downloads/` before insert; projects the completed set to the native
  cache on every mutation). `exampleRepository` is a scaffold proving the pattern.
- `sync/` — generic `readThrough` / `writeBehind` primitives + `kv_meta` watermark helpers
  (`readSyncWatermark`, `writeSyncWatermark`, `isWatermarkStale`).
- `nativeCache/` — `projectQueueSnapshotToNativeCache`, `projectDownloadsIndexToNativeCache`,
  `projectLibraryBrowseIndexToNativeCache`. Each stamps the versioned envelope (schema 12.1 /
  `380`) and forwards to the media-engine bridge, which persists durably on device (iOS/Android
  `PodverseNativeCache`, 12.2–12.3) so car/watch read it with JS dead. Repositories that own
  queue / downloads / library-index state **must** call the matching projection helper on every
  successful mutation and after sync reconcile — car/watch cannot read SQLite (see §7.1 of the
  decision doc). Bridge writes are best-effort (soft-fail) and never roll back the SQLite mutation.
  Call sites: `queueRepository` (queue), `downloadsRepository` (downloads), `accountRepository`
  (library browse from add-by-RSS subscriptions).
