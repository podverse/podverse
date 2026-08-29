# 714-filter-sort-persistence

**Master step:** P2.4.6
**Model (author + implement):** Opus 5
**Status:** planned

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
| Mobile detail screens | Nothing — `sort: 'recent'` is hardcoded and there is no sort control at all                                                                       |
| Mobile Search         | Nothing — chips are `useState` only, and [709](/docs/proposals/mobile/_master-plan_/phase-2/details/709-search-tab-web-alignment.md) removes them |
| Web global lists      | Filter and sort in the `local-settings` cookie under `fd.<page>`, keyed by **page type**                                                          |
| Web detail pages      | 30-minute `sessionStorage` cache restored on browser **back** only, never on cold load                                                            |

The gap is per-instance scope. Web's `fd` bucket is one entry for all podcast pages, so `/podcast/abc`
and `/podcast/xyz` cannot hold different sorts. Mobile has no sort persistence outside Home.

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

Add a `sortPrefs` module under `apps/mobile/src/prefs/` backed by AsyncStorage, using the shared key
builder. Mobile stores entries **unbounded** — AsyncStorage has no meaningful size pressure here and
is read before first render, so there is no flash and no cap.

Then apply it:

1. **Home** — the sort selection from 706 and the view mode from 708 both read and write through this
   module rather than inventing keys. The existing subscription filter chip and media type migrate to
   the same module, preserving current values.
2. **Detail screens** — `PodcastDetailScreen`, `EpisodeDetailScreen`, and `AlbumDetailScreen`
   currently hardcode their sort. Give each a sort control and persist the selection per instance.
   This is new UI, so it ships screen reader accessible per
   [`screen-reader-accessibility`](/.cursor/rules/screen-reader-accessibility.mdc).
3. **Library** — the subscription filter already persists; move it onto the shared module.

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
npm run mobile:e2e:test -- home
npm run mobile:e2e:test -- podcast
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```

## Related

- Rule: [`filter-sort-persistence`](/.cursor/rules/filter-sort-persistence.mdc)
- Web counterpart: [715-web-filter-sort-persistence](/docs/proposals/mobile/_master-plan_/phase-2/details/715-web-filter-sort-persistence.md)
