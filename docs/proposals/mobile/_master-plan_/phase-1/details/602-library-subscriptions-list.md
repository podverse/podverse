# 602-library-subscriptions-list

**Master step:** 9.30
**Model (author + implement):** Codex 5.3
**Status:** done
**Depends on:** 9b.8 / [600 unified subscriptions repository](/docs/proposals/mobile/_master-plan_/phase-1/details/600-unified-subscriptions-repository.md)

## Decision context

Legacy podverse-rn had a dedicated **Podcasts / Subscriptions** screen showing the merged
subscribed list. The new My Library hub
(`apps/mobile/src/navigation/index.tsx`,
`apps/mobile/src/screens/rss/AddByRssRootScreen.tsx`) has playlists, queue, history, and clips,
plus a separate **RSS** tab — but no single "my podcasts / subscriptions" list. This step restores
that surface using the shared repository so it matches Home and car.

## Scope

1. Add a **Subscriptions** (a.k.a. "Podcasts") entry to the My Library hub and a screen that lists
   `subscriptionsRepository.list({ filter })` (600) — directory follows + add-by-RSS mixed by
   default, alphabetical.
2. Reuse the same **filter control** and i18n keys as Home (601): All / Add-by-RSS. Default All.
3. Row tap routing by `SubscribedChannel.source`: directory → Podcast detail; add-by-RSS →
   add-by-RSS detail. Reuse shared `ListRow` / media-row primitives.
4. Add the route to the Library stack (`navigation/index.tsx`) with a `testID` for E2E.
5. The existing **RSS** tab remains (add/manage flow); it is the "add-by-RSS only" management
   surface. This new screen is the merged **library** view.

## i18n

- Reuse `subscriptions.filter.*` from 601. Add `library.subscriptions.title` (or reuse an existing
  library heading key). No hardcoded copy.

## Acceptance criteria

- My Library shows a Subscriptions entry that opens a merged, alphabetical list.
- Filter toggles between mixed (All) and add-by-RSS only.
- Directory vs add-by-RSS rows route to the correct detail screens.
- Empty/loading/error states match other library lists.

## Non-goals

- Editing follows (unfollow lives on detail screens / media-row actions — Track 9c).
- Music channels (artists/albums) list — follow-on.

## Verification

```bash
npm run mobile:e2e:test -- library
```
