# 714-filter-sort-persistence

**Master step:** P2.4.6
**Model (author + implement):** Opus 5
**Status:** done — shared contract, mobile module, Home, detail screens, and Library all on it

## What the operator asked for

Every screen that lets the user change filter or sort remembers the last selection and restores it on
the next load, without re-applying it. Keyed **per instance** — one sort for one podcast, a different
sort for another. Stored **locally on the device**, never in a server database. Same behavior on web
and mobile.

This document covers the **shared contract and the mobile implementation**. Web is
[715-web-filter-sort-persistence](/docs/proposals/mobile/_master-plan_/phase-2/details/715-web-filter-sort-persistence.md).

## Why this is a foundation, not a screen feature

Three Phase 2 details already promise some form of remembered selection —
[706](/docs/proposals/mobile/_master-plan_/phase-2/details/706-home-filter-sort-screen.md) (Home sort
across restarts), [708](/docs/proposals/mobile/_master-plan_/phase-2/details/708-home-view-toggle-and-overflow-menu.md)
(grid/list view across restarts), and the shipped Home subscription filter chip. Each was heading
toward its own ad-hoc preference key. Defining the contract once prevents three incompatible schemes
and a fourth when detail screens gain sort controls.

## Current state

| Surface               | What persists today                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile Home           | Subscription filter chip and preferred media type, via `src/prefs/prefsStore.ts` (AsyncStorage)                                                   |
| Mobile detail screens | Sort per channel or item, plus the episode's open tab, via `src/prefs/detailListPrefs.ts`                                                         |
| Mobile Search         | Nothing — chips are `useState` only, and [709](/docs/proposals/mobile/_master-plan_/phase-2/details/709-search-tab-web-alignment.md) removes them |
| Web global lists      | Filter and sort in the `local-settings` cookie under `fd.<page>`, keyed by **page type**                                                          |
| Web detail pages      | 30-minute `sessionStorage` cache restored on browser **back** only, never on cold load                                                            |

The gap is per-instance scope, which is what mobile's rows above now have and web's do not. Web's
`fd` bucket is one entry for all podcast pages, so `/podcast/abc` and `/podcast/xyz` cannot hold
different sorts; closing that is 715's job.

## The shared piece

Key derivation and the stored value shape go in **`@podverse/helpers`**, which both surfaces may
import. Storage stays per-surface: mobile may not import `@podverse/helpers-browser`, and web has no
AsyncStorage.

| Scope kind      | Key                  | Example           |
| --------------- | -------------------- | ----------------- |
| Global list     | the list name        | `podcasts`        |
| Channel detail  | `channel:<id_text>`  | `channel:abc123`  |
| Item detail     | `item:<id_text>`     | `item:xyz789`     |
| Playlist detail | `playlist:<id_text>` | `playlist:def456` |

The stored value holds only structured selections — sort, type, range, category, media type, tab, and
view mode. It never holds free text, page number, or scroll position.

## Mobile implementation

A `sortPrefs` module under `apps/mobile/src/prefs/` backed by AsyncStorage, using the shared key
builder. Mobile stores entries **unbounded** — AsyncStorage has no meaningful size pressure here and
is read before first render, so there is no flash and no cap. Writes notify subscribers, which is
what lets a control on one screen reorder a list on another without either holding a copy of the
value.

Then apply it:

1. **Home** — built. Sort and the subscription scope chip both read and write through this module,
   one scope per media type, and the previous `home.subscriptionFilter` value is carried over on
   first read so no device loses its chip choice. The view mode from 708 joins them when it lands.
2. **Detail screens** — built. `PodcastDetailScreen` (recent / A-Z), `AlbumDetailScreen` (authored
   order / reversed), and `EpisodeDetailScreen` (clip order, plus which tab the episode opens on)
   each carry a sort control scoped to that instance, via `apps/mobile/src/prefs/detailListPrefs.ts`.
   The control is a shared `SortSelectRow` — a pill showing the current order, disclosing the same
   checkmarked option rows Home uses, in place rather than as a pushed screen. It ships screen reader
   accessible per
   [`screen-reader-accessibility`](/.cursor/rules/screen-reader-accessibility.mdc).
3. **Library** — built. The subscription filter reads and writes through the shared module, carrying
   the previous `library.subscriptionFilter` value over on first read.

Restore happens before the first data read, so the screen fetches with the remembered sort rather
than fetching a default and re-sorting.

## Deliberate exclusions

**Free-text filters do not persist.** The Home `Filter…` input from
[705](/docs/proposals/mobile/_master-plan_/phase-2/details/705-home-subscribed-list-and-filter.md)
keeps its clear-on-restart behavior. A restored text filter hides most of the list and reads as
missing data rather than as a remembered preference. 705 does not change.

**Search sort is not in scope.** 709 removes mobile's search sort chips to match web, so there is
nothing to remember.

**Nothing syncs to the server.** No column, endpoint, or account field. A phone and a laptop may
legitimately disagree about sort.

## Acceptance criteria

- Setting a sort on one podcast, then opening a different podcast, shows the second podcast's own
  remembered sort or the default — never the first one's.
- A remembered sort survives a full app restart, not just a screen re-entry.
- The remembered sort is applied to the initial data read; the list does not visibly re-sort.
- Nothing about these preferences reaches the server; no schema or endpoint changes appear in the
  diff.
- Free-text filters still clear on restart.
- New detail-screen sort controls expose an accessible name, role, and selected state.

## Verification

```bash
npm --prefix apps/mobile run test
npm run mobile:e2e:test -- detail-sort-prefs
npm run mobile:e2e:test -- home
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```

## Related

- Rule: [`filter-sort-persistence`](/.cursor/rules/filter-sort-persistence.mdc)
- Web counterpart: [715-web-filter-sort-persistence](/docs/proposals/mobile/_master-plan_/phase-2/details/715-web-filter-sort-persistence.md)
