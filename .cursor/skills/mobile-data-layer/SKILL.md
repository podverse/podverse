---
name: mobile-data-layer
description: Offline-first mobile data layer — SQLite/Drizzle repositories, background sync, storage boundaries. Use when adding or changing apps/mobile data fetching, local persistence, queue/history/add-by-RSS storage, or sync.
---

# Mobile data layer (offline-first)

Screens and hooks **read through repositories**. The local SQLite DB is the source of truth; the
API syncs in the background via existing `@podverse/helpers-requests` / `ApiRequestService`.

Authoritative decision:
[DOCS-MOBILE-DATA-LAYER-OFFLINE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md).

## Do

- Put schema, migrations, and DB client under `apps/mobile/src/data/db/`.
- Put domain access under `apps/mobile/src/data/repositories/` (queue, account, add-by-rss, …).
- Call repositories from screens/hooks; keep the same DTO shapes as web (`@podverse/helpers`).
- Use **SecureStore** for auth tokens only; **AsyncStorage/MMKV** for tiny prefs (`uit`, media
  type); **SQLite** for app entities; **filesystem** for downloaded media files.
- After add-by-RSS parse + poll succeeds, run `@podverse/parser-mapping` and upsert into SQLite.
- On queue/download/library-index mutations, call **native cache projection** hooks (stubs OK until
  Track 12). Car / watch / Auto read that cache — **not** SQLite. See decision doc §7.1.

## Don't

- Do **not** call `createMobileApiRequestService` / `req*` / `requestWithMobileAuthRefresh` from
  screens for product data once the repository seam exists (auth bootstrap may still seed session).
- Do **not** store tokens or secrets in SQLite or AsyncStorage.
- Do **not** import `@podverse/orm` or `@podverse/parser` in mobile.
- Do **not** invent a second add-by-RSS type model — reuse helpers DTOs + parser-mapping outputs.
- Do **not** treat episode **file** downloads as a substitute for the data layer; files are Track 13
  rows pointing at filesystem paths in the same DB.
- Do **not** assume CarPlay, Android Auto, or watch complications can read Drizzle/SQLite when JS is
  dead — always project to the native cache.

## Dual-store (phone vs car/watch)

| Store | Readers |
| ----- | ------- |
| SQLite | RN UI only |
| Native cache | CarPlay, Android Auto, watch complications |

## Sync sketch

1. UI reads DB (instant).
2. Repository marks stale / missing → background fetch → upsert → UI updates.
3. Mutations: optimistic local write when safe → API → reconcile → **project native cache**.
4. Offline: queue mutations; flush when online.

## Related

- **mobile-playback** — playback policy + native bridge
- **mobile-carplay-android-auto** rule — native cache fed from repository writes
- [DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md §4.1](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md)
  — add-by-RSS server parse + client mapping
