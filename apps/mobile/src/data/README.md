# Mobile data layer (`apps/mobile/src/data`)

Offline-first data layer for the Podverse mobile app. See the decision doc
[DOCS-MOBILE-DATA-LAYER-OFFLINE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md)
and the **mobile-data-layer** skill.

## Storage boundaries

Pick the store by what the data _is_ — do not mix responsibilities:

| Store                        | Use for                                                           | Not for                    |
| ---------------------------- | ----------------------------------------------------------------- | -------------------------- |
| **SecureStore**              | Auth tokens (access / refresh)                                    | Entities, prefs            |
| **AsyncStorage**             | Tiny key/value prefs (e.g. `uit`, playback `pmt`, home media tab) | Tokens, entity collections |
| **SQLite** (`db/`)           | App entities + sync metadata (account, queue, add-by-rss, …)      | Tokens                     |
| **Native cache** (car/watch) | Projected read model for CarPlay / Android Auto / watch           | Source of truth            |

**SQLite is phone-UI-only.** CarPlay, Android Auto, and watch surfaces read a separate native
cache because the JS runtime may be suspended; repositories that own queue / downloads / library
index project their state to that native cache on mutation (stubs until Track 12) — see
[DOCS-MOBILE-DATA-LAYER-OFFLINE.md §7.1](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md).

Never write auth tokens to SQLite or AsyncStorage.

## Prefs store notes (Track 16.1)

- Unified prefs store lives in `src/prefs/prefsStore.ts` and exposes typed `getPref`, `setPref`,
  and `hydratePrefs`.
- Playback preference key is **`pmt`** (`audio` | `video`; default **`video`**) for web parity.
- Home-tab media selection remains **`preferred_media_type`** (`podcasts` / `episodes` / `clips` /
  `artists` / `albums` / `tracks`) and is intentionally separate from `pmt`.

## `db/` — SQLite + Drizzle

- `client.ts` — lazily opens `expo-sqlite` and exposes the Drizzle client (`getDb()`).
- `schema.ts` — Drizzle table definitions (`kv_meta`, `account_snapshot`, `queue_cache`,
  `add_by_rss_feed`, `download`, `subscribed_channel`, `channel_item`, `channel_item_window`,
  `channel_seen`, `channel_live_status`, `sync_event_log`). Domain tables arrive as forward-only
  migrations.
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
  `channelItemsRepository` (episodes for followed directory channels in `channel_item`, so a
  subscription browses and plays with no connection — not only the episodes downloaded as media
  files; each channel keeps a bounded window tracked in `channel_item_window`, with the depth,
  staleness, and reconciliation rules in the pure sibling `channelItemWindow.ts`).
  `downloadsRepository` (Phase F offline downloads index in `download`; source of truth for the
  Downloads library + local-file playback — **progressive only**, eligibility gated by
  `isItemDownloadable` in `src/downloads/` before insert; projects the completed set to the native
  cache on every mutation). `channelSeenRepository` (one `last_seen_at` per subscription in
  `channel_seen`, plus the unseen counts derived from the episodes already stored, so badges work
  signed out and offline; reconciles with the account in both directions, later timestamp winning,
  with the pure rules in `channelSeenSync.ts`). `channelLiveStatusRepository` (which subscriptions
  are broadcasting, in `channel_live_status` — the one row element the device cannot derive, since
  live items are excluded from every regular item query; directory statuses come from one queued
  call to the subscribed live-item endpoint, add-by-RSS from the parsed bundle already on disk, with
  the trust window and status-ranking rules in `channelLiveStatus.ts`). `syncEventLogRepository`
  (capped diagnostic record of background sync
  failures in `sync_event_log`, surfaced at More ▸ Sync log; local-only, with the cap and eviction
  rule in the pure sibling `syncEventLog.ts`). `exampleRepository` is a scaffold proving the pattern.
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
