# 715-web-filter-sort-persistence

**Master step:** P2.5.3
**Model (author + implement):** Opus 5
**Status:** done — detail instances in a bounded LRU bucket, global lists on the shared key builder, home SSR merge fixed

Web half of [714-filter-sort-persistence](/docs/proposals/mobile/_master-plan_/phase-2/details/714-filter-sort-persistence.md).
Same product behavior, different storage, because web renders on the server.

## What web has today

Two unrelated mechanisms, neither of which meets the requirement:

| Mechanism                            | Where                                                                             | Scope                                            | Survives cold load                                        |
| ------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------- |
| `local-settings` cookie, `fd.<page>` | `apps/web/src/utils/localSettings/localSettings.ts`, `hooks/useFilterDefaults.ts` | Page **type** — one bucket for all podcast pages | Yes                                                       |
| `pv-page-state-` sessionStorage      | `apps/web/src/utils/pageStateCache.ts`                                            | Per instance (`podcast-${channel_id}`)           | **No** — 30-minute TTL, restores on browser **back** only |

So per-instance memory exists but evaporates, and durable memory is not per-instance. The work is to
merge those properties.

Also relevant: `@podverse/ui` exports `podverse_table_sort_prefs` for per-list keys, but it is unused
in `apps/web` and is designed for admin tables. Do not adopt it here without checking it against the
shared key builder from 714 — one key format, not two.

## Storage: bounded LRU in the cookie

Per-instance entries go in the existing `local-settings` cookie under a new namespace, keyed by the
shared builder from 714, capped at the **30 most recently used** entries with LRU eviction.

**A cookie, not `localStorage`, and the reason matters.** Web list and detail pages fetch with a sort
parameter during server rendering. `localStorage` is invisible to the server, so storing the pref
there means the server renders the default sort and the client re-sorts after hydration — a visible
reshuffle plus a duplicated request. Cookies are readable in SSR, so the first paint is already
correct.

The 30-entry cap exists because cookies max out at 4KB and are sent on every same-origin request.
Roughly 1KB of overhead is the budget. Beyond the window, fall back to the screen's normal default —
never to a stale entry.

Eviction is acceptable because a sort worth remembering belongs to a podcast the user keeps opening,
which keeps it at the top of the LRU.

## Resolution order

1. Explicit URL query parameter, when present — **and write it into the store** for that instance
2. Stored preference for this instance
3. The screen's documented default

An explicit parameter is a deliberate act (a shared link, a bookmark), so it wins; writing it back
means the next visit to the clean URL keeps what the user just saw.

Do **not** push defaults into the URL to make this work — that violates
[`routing-url-params`](/.cursor/rules/routing-url-params.mdc). The store holds the preference; the URL
stays clean.

## Known bug to fix along the way

On `/` the Zod schema applies non-null defaults (`sort: 'recent'`, `medium: 'all'`) **before** the
cookie merge, so `data.sort` is never undefined and `cookieDefaults?.sort` is unreachable. The home
page's stored filter defaults are written but never applied on SSR. Make the schema fields optional
without defaults so the merge chain can actually reach the stored value.

## Scope

**Global list routes** already use `fd.<page>` and mostly work; keep them, move them onto the shared
key builder, and fix the home page bug above. Routes: `/`, `/podcasts`, `/episodes`, `/clips`,
`/tracks`, `/albums`, `/artists`, `/playlists`, `/profiles`, and the two livestream routes.

**Detail routes** are the new work — per-instance sort, tab, and range on `/podcast/[channel_id]`,
`/episode/[item_id]`, `/album/[channel_id]`, `/artist/[channel_id]`, and `/playlist/[playlist_id]`.

The `sessionStorage` back-navigation cache stays as-is. It solves a different problem (restoring
scroll and loaded pages on back) and should not be conflated with durable preference storage.

## Deliberate exclusions

**Free-text filters do not persist**, including the `/podcasts` filter input from
[713](/docs/proposals/mobile/_master-plan_/phase-2/details/713-web-subscribed-filter-input.md). That
input keeps its URL round-trip so a link stays shareable, but it is not written to the preference
store. 713 does not change.

Page number, scroll position, and the search query on `/search` are likewise excluded.

**Nothing syncs to the server.** These are device-local preferences.

## Acceptance criteria

- Opening `/podcast/abc`, changing sort, then opening `/podcast/xyz` shows xyz's own remembered sort
  or the default — never abc's.
- A remembered sort applies on a **cold load** from a bookmark, in the server-rendered HTML, with no
  visible re-sort after hydration.
- A URL with an explicit `?sort=` wins and updates the stored preference for that instance.
- Clean URLs stay clean — no defaults are written into the query string.
- The 31st distinct instance evicts the least recently used entry, and the evicted page falls back to
  its default.
- The home page's stored sort and media type actually apply on SSR.
- No server schema or endpoint changes.

## Verification

```bash
make e2e_test_web_report_spec SPEC=e2e/detail-sort-persistence.spec.ts
open .artifacts/e2e-reports/latest/index.html
```

## Related

- Rule: [`filter-sort-persistence`](/.cursor/rules/filter-sort-persistence.mdc)
- Mobile half and shared key builder: [714-filter-sort-persistence](/docs/proposals/mobile/_master-plan_/phase-2/details/714-filter-sort-persistence.md)
