---
name: mobile-data-layer
description: Offline-first mobile data layer — SQLite/Drizzle repositories, background sync, storage boundaries. Use when adding or changing apps/mobile data fetching, local persistence, queue/history/add-by-RSS storage, or sync.
---

# Mobile data layer (offline-first)

Screens and hooks **read through repositories**. The local SQLite DB is the source of truth; the
API syncs in the background via existing `@podverse/helpers-requests` / `ApiRequestService`.

Authoritative decision:
[DOCS-MOBILE-DATA-LAYER-OFFLINE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md).

## Offline listening is a headline feature

Offline is not a degraded mode to tolerate; it is a reason people choose a podcast app. Treat it as
a product requirement when planning any mobile screen.

Concretely, **everything a user is subscribed to must be readable offline** — not just the channel
row, but the items and related content the UI needs to browse and play:

- Subscribed channels, including add-by-RSS feeds.
- Items (episodes) for those channels, not only the ones already downloaded.
- Related content those screens render (artwork references, chapters, transcripts metadata).

Screens that filter, sort, or search **subscribed** content read the local store, so they behave
identically with no connection. Network search (Podcast Index, directory browse) is a separate,
online-only surface.

A background sync reconciles local storage with the server and with add-by-RSS feeds whenever the
network is available, so what is stored converges on what is current. Plan that sync explicitly when
adding a new locally-backed surface — do not assume a one-time fetch is enough.

That sync runs through the app's serial queue, one job at a time, with a user-facing label — it does
not schedule itself and it never sits on the startup path. Interactive work stays out of the queue.
See [`mobile-sync-orchestration`](/.cursor/rules/mobile-sync-orchestration.mdc).

Signed-out users get this too; see
[`mobile-anonymous-vs-account-features`](/.cursor/rules/mobile-anonymous-vs-account-features.mdc).

## Do

- Put schema, migrations, and DB client under `apps/mobile/src/data/db/`.
- Put domain access under `apps/mobile/src/data/repositories/` (queue, account, add-by-rss, …).
- Call repositories from screens/hooks; keep the same DTO shapes as web (`@podverse/helpers`).
- Use **SecureStore** for secrets only — auth tokens, and add-by-RSS feed Basic Auth credentials
  (`addByRssCredentialStore`, keyed by account + feed URL, with a non-secret SQLite index since
  SecureStore cannot list keys); **AsyncStorage/MMKV** for tiny prefs (`uit`, media type);
  **SQLite** for app entities; **filesystem** for downloaded media files. Never put a feed
  username or password in SQLite, AsyncStorage, the error log, or a follow request.
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
- Do **not** treat a cache hit as “skip the server” (`stored ?? fetch`) on a detail screen. Paint
  the cache, then lazy-correct when online (see below).

## Dual-store (phone vs car/watch)

| Store        | Readers                                    |
| ------------ | ------------------------------------------ |
| SQLite       | RN UI only                                 |
| Native cache | CarPlay, Android Auto, watch complications |

## Sync sketch

1. UI reads DB (instant).
2. Repository marks stale / missing → background fetch → upsert → UI updates.
3. Mutations: optimistic local write when safe → API → reconcile → **project native cache**.
4. Offline: queue mutations; flush when online.

## Cache first, then lazy-correct from the server

A cache hit is first paint, not a reason to skip the network. Opening a screen that already has a
stored DTO must:

1. **Paint the cache immediately** — no spinner that waits on the server when a stored copy exists.
2. **Fetch the same resource** on the interactive path (not the serial sync queue) when online.
3. **Apply the server copy only when it differs** — compare the payloads and keep the current React
   state when they match, so an identical refresh does not re-render.
4. **Write the fresher copy back** into the repository when a row already exists. Do not insert
   browse/search items into the subscribed-item store just because a detail screen fetched them.
5. **Keep the cached UI if the refresh fails** — a stale episode is better than wiping a working
   screen. Only show an error when there was nothing stored to begin with.

Offline Mode is the exception: stop after the stored copy (and download chrome). A missing stored
row in Offline Mode is empty, not a retryable network error.

Do **not** write `stored ?? fetch` for a detail screen. That leaves the user on a snapshot that
never converges while they stay on the page.

`shouldReplaceCachedValue` in `apps/mobile/src/lib/cachedValue.ts` is the comparison helper.

## Nested lists are empty, not 404 errors

Clips, official clips, chapters, and transcripts are optional bodies on a parent the user already
opened. A missing parent row or a missing nested resource is an empty list (`No clips found`, and
the matching empty keys for the other panes) — never `errors.generic` plus an API-error toast.

- API list-by-parent endpoints for clips return **200 and `[]`** when the item or channel is
  missing (same as official clips / soundbites).
- Mobile treats HTTP 404 on those fetches as the empty page (`emptyIfNotFound` in
  `apps/mobile/src/lib/apiErrorStatus.ts`) so a cache-only episode whose catalog row is missing
  still shows the empty message.

### Playback reconciliation storage

- `playback_outbox` stores durable playback events for reconnect replay.
- `playback_local_state` stores per-item merged playback state used by reconciliation and handoff.
- Replay is bounded (500 events), collapses positions forward per item, and preserves completion.

## Related

- [`dto-changes-are-device-data-migrations`](/.cursor/rules/dto-changes-are-device-data-migrations.mdc)
  — `payload_json` columns hold whole DTOs, so changing one rewrites data already on phones
- **mobile-playback** — playback policy + native bridge
- **mobile-carplay-android-auto** rule — native cache fed from repository writes
- [DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md §4.1](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md)
  — add-by-RSS server parse + client mapping
