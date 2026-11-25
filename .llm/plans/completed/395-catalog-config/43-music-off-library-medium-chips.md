**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 43 — Music tabs and the playlists filter follow what is stored

History and Queues are a Podcasts tab and a Music tab. Playlists has a medium menu of All,
Podcasts, and Music, on `/playlists` and on the Browse Playlists chip. With Music on, those
controls stay as they are today.

With Music off, the Music control shows only when that library already has music. Queues show
both tabs when the active queue is music or the music queue has rows, and otherwise show no tab
row and list the podcast queue. History shows both tabs when any music is in history, and
otherwise shows no tab row and lists podcast history. Playlists show the Music filter only when
that list has a music playlist. A saved Music filter with nothing to show opens All.

Playlist pages themselves stay. A row on one still opens. No request is switched to `av` or
`podcasts` for the Livestreams list (R67, plan 40).

## Rows

R15, R16, R19, R68, R69, R70

## Runs after

11

## Files

- apps/web/src/lib/catalog/catalogListMedium.ts
- apps/web/src/lib/catalog/catalogListMedium.test.ts
- apps/web/src/app/history/page.tsx
- apps/web/src/app/history/HistoryPageClient.tsx
- apps/web/src/app/history/HistoryPageContext.tsx
- apps/web/src/app/history/HistoryPageListHeader.tsx
- apps/web/src/app/queues/page.tsx
- apps/web/src/app/queues/QueuesPageClient.tsx
- apps/web/src/app/queues/QueuesPageContext.tsx
- apps/web/src/app/queues/QueuesPageListHeader.tsx
- apps/web/src/app/playlists/page.tsx
- apps/web/src/app/playlists/playlistsListSsr.ts
- apps/web/src/app/playlists/PlaylistsPageClient.tsx
- apps/web/src/app/playlists/PlaylistsPageContext.tsx
- apps/web/src/app/playlists/PlaylistsPageChipRow.tsx
- apps/web/src/components/MediaListChips/MediaListPendingTrailingChips.tsx
- apps/web/e2e/catalog-restricted-music-library.spec.ts

## Settled decisions

- Queue "has rows" means the music queue's now-playing resource is non-null or its upcoming list
  is non-empty. History rows do not count. An empty music queue record does not count. The active
  queue counts as music even when it has no now-playing row, which is what
  `getQueueListMediumFromActiveQueues` already does.
- When the queue Music tab is shown, show both tabs. When it is hidden, show no tab row and list
  the podcast queue (`av`), including when the URL says `music`.
- History uses the same tab row. Both tabs when page 1 of the music history queue has a row.
  No tab row, and podcast history, when it does not. The history sentence says "show the Music
  tab"; a Music tab with no Podcasts tab is not the row. The other option was a Music tab alone.
- A playlist list "has a music playlist" when page 1 of that same type, sort, and range with
  medium `music` returns at least one row. The current podcast page is not the check.
- A saved or linked Music playlist filter with no music playlist loads All at page 1. The URL
  stays. The cookie keeps `music`, so a later visit shows Music again once a music playlist
  exists. Do not call `redirect()`.
- With Music on, do not probe and do not change the medium. Both queue and history tabs stay,
  and the playlist menu stays All, Podcasts, and Music.
- No new endpoint. Probes use `reqQueueResourcesGetNowPlayingByQueueIdText`,
  `reqQueueResourcesGetAllUpcomingByQueueIdText`,
  `reqQueueResourcesGetHistoryByQueueIdTextPaginated`, and `reqPlaylistGetMany`.

## Helper — `apps/web/src/lib/catalog/catalogListMedium.ts` (new)

Pure. No config read. `QueueListMedium` is `'av' | 'music'`. `QueryParamsQueueMedium` is
`'all' | 'av' | 'music'`.

```typescript
import type { QueryParamsQueueMedium, QueueListMedium } from '@podverse/helpers';

/** Both tabs, or none. Music on always shows both. */
export function libraryMediumTabsVisible(input: {
  musicEnabled: boolean;
  musicLibraryPresent: boolean;
}): boolean {
  return input.musicEnabled || input.musicLibraryPresent;
}

/** Hidden Music tab: the list is the podcast queue or podcast history. */
export function queueListMediumForCatalog(
  medium: QueueListMedium,
  tabsVisible: boolean
): QueueListMedium {
  if (!tabsVisible && medium === 'music') {
    return 'av';
  }
  return medium;
}

/** Hidden Music filter: a music-only playlist request opens All. */
export function playlistMediumForCatalog(
  medium: QueryParamsQueueMedium,
  musicFilterVisible: boolean
): QueryParamsQueueMedium {
  if (!musicFilterVisible && medium === 'music') {
    return 'all';
  }
  return medium;
}

export function musicQueueHasRows(
  nowPlaying: unknown,
  upcoming: readonly unknown[]
): boolean {
  return (nowPlaying !== null && nowPlaying !== undefined) || upcoming.length > 0;
}

export function musicHistoryHasRows(input: {
  rowCount: number;
  totalCount: number | null;
}): boolean {
  return input.rowCount > 0 || (input.totalCount !== null && input.totalCount > 0);
}
```

`musicLibraryPresent` for queues is `activeQueueIsMusic || musicQueueHasRows(...)`. For history
it is `musicHistoryHasRows(...)`.

## Queues and History

Server pages (`queues/page.tsx`, `history/page.tsx`): read
`getCatalogConfig().musicEnabled` inside the page function, from
`apps/web/src/lib/catalog/catalogPolicy`. Return type `CatalogConfig`.

Signed out, or Music on: no probe. Music on passes `mediumTabsVisible: true` and the medium
`resolveQueueListMedium` already returns. Music off and signed out passes
`mediumTabsVisible: false` and `queueListMediumForCatalog(resolved, false)`.

Signed in and Music off:

- Music queue: `ssrQueues.find` whose `medium_id` equals `getQueueMediumIdFromType('music')`
  (`MediumEnum.Music`). No such queue means no rows.
- Active is music: `getQueueListMediumFromActiveQueues(ssrQueues) === 'music'`.
- Queues probe, only when a music queue exists: `reqQueueResourcesGetNowPlayingByQueueIdText`
  and `reqQueueResourcesGetAllUpcomingByQueueIdText` for that `id_text`. A null now-playing body
  is empty. `musicQueueHasRows` on those two results. Do not read history here.
- History probe, only when a music queue exists: page 1 of
  `reqQueueResourcesGetHistoryByQueueIdTextPaginated`. `musicHistoryHasRows` from `data.length`
  and `meta.count`. Do not walk later pages.
- `mediumTabsVisible` is `libraryMediumTabsVisible`. The medium passed as
  `initialQueryParams.medium` is `queueListMediumForCatalog(resolveQueueListMedium(...), mediumTabsVisible)`.

Pass `mediumTabsVisible` through `QueuesPageClient` / `HistoryPageClient` into the context
provider. The existing client load of the selected queue stays. A second load when the selected
medium is music is acceptable. Do not add an endpoint to skip it.

Contexts, when `useConfig().public.catalog.musicEnabled` is false:

- Keep `mediumTabsVisible` in state, starting from the server value.
- On `QUEUE_DATA_CHANGED_EVENT` (`apps/web/src/lib/queue/queueDataChanged.ts`), and after the
  selected queue's own load when that queue is music, recompute. Re-read the account queues
  with `reqQueueGetAllForAccountPrivate` so a newly active music queue counts, and re-run the
  same probe the server used. Then set the flag and, when the flag is false and the medium is
  `music`, `setFilterParams` to `av` (history also resets `page` to 1). When the flag becomes
  true, leave the medium the visitor is already on.
- When Music is on, the flag stays true and this listener does not probe.

Headers (`HistoryPageListHeader`, `QueuesPageListHeader`): when the flag is false, render
`ListHeader` with no `belowButtons`. When it is true, keep both tabs and their handlers.

## Playlists

One loader, used by `playlists/page.tsx` and `loadPlaylistsBrowseProps` in
`playlistsListSsr.ts`. `getCatalogConfig()` inside the loader. `getPlaylistsPageFilterParams`
stays a pure function. Do not thread the catalog into it.

The visitor medium is the one those two call sites already resolve (URL, else cookie, else
`all`). Then:

- Music on: one `reqPlaylistGetMany` for that medium. `musicFilterVisible` is true.
- Music off and the visitor medium is `music`: request it. When `data.length > 0`, keep it and
  `musicFilterVisible` is true. When `data.length === 0`, request medium `all` at page 1 with the
  same type, sort, and range, and `musicFilterVisible` is false. Put that `all` medium into
  `initialQueryParams`. Do not write the cookie.
- Music off and the visitor medium is `all` or `av`: request that page as today, and in parallel
  request page 1 with medium `music` and the same type, sort, and range.
  `musicFilterVisible` is that probe's `data.length > 0`. The list on screen is the visitor's
  page, not the probe.

`meta.count` may be null. Presence is `data.length > 0` on the music request.

Pass `musicFilterVisible` through `PlaylistsPageClient` into `PlaylistsPageContext`. The context
starts from that value. Its existing `reqPlaylistGetMany` effect applies the same rule, reading
`useConfig().public.catalog.musicEnabled`. When the rule changes `music` to `all`, call
`setFilterParams` with medium `all` and page 1 and return; the effect runs again for All. Do not
call `setFilterParams` when the medium is already the one just loaded.

`PlaylistsPageChipRow`: build `mediumOptions` without the Music entry when
`musicFilterVisible` is false. The displayed medium is `playlistMediumForCatalog` of
`filterParams.medium`, so a `music` value shows as All. All and Podcasts stay.

`MediaListPendingTrailingChips`: when `useConfig().public.catalog.musicEnabled` is false, the
`mediumOptions` array drops Music, and a stored `music` face label uses All. This row has no
list yet. The loaded `PlaylistsPageChipRow` adds Music once the probe says the list has one.
Other trailing controls stay.

## Tests

- `catalogListMedium.test.ts`:
  - Tabs: Music on is visible with `musicLibraryPresent` false. Music off is visible only when
    `musicLibraryPresent` is true.
  - Queue medium: `music` and `av` stay when tabs are visible. `music` becomes `av` when tabs
    are hidden. `av` stays `av`.
  - `musicQueueHasRows(null, [])` is false. A non-null now-playing is true. An empty now-playing
    with one upcoming row is true.
  - `musicHistoryHasRows({ rowCount: 0, totalCount: 0 })` is false. `rowCount: 0` with
    `totalCount: null` is false. `rowCount: 1` is true. `totalCount: 2` with `rowCount: 0` is true.
  - Playlist medium: `all`, `av`, and `music` stay when the filter is visible. `music` becomes
    `all` when it is hidden. `all` and `av` stay hidden.
- `apps/web/e2e/catalog-restricted-music-library.spec.ts` (catalog-restricted lane from plan 11;
  not in `makefiles/local/e2e-spec-order-web.txt`). The lane does not gate playlist, queue, or
  history pages. `test.describe` "Music off library medium chips". Signed out, so there is no
  music queue and no music history. The seeded public playlists are podcast medium (embed
  fixtures). After each `goto`, assert the URL and a heading.
  - "When Music is off and history has no music, History has no medium tabs." `goto('/history')`,
    URL is `/history`, the History heading is visible, and
    `getByRole('button', { name: 'Music', exact: true })` has count 0. Also count 0 for a button
    named `Podcasts`.
  - "When Music is off and the music queue has no rows, Queues has no medium tabs." Same for
    `/queues` and the Queues heading.
  - "When Music is off and the public playlist list has no music playlist, the filter has All
    and Podcasts." `goto('/playlists')`, URL is `/playlists`, the Playlists heading is visible.
    Click `getByTestId('playlists-medium')`.
    `getByRole('menuitemradio', { name: 'All', exact: true })` and the one named `Podcasts` are
    visible. The one named `Music` has count 0. `capturePageLoad` on the last step, scrolled to
    the open menu. If a public music playlist is on the list, Music must be visible instead, and
    say so in the final message.

The signed-in cases (active music queue, music queue rows, music history, a list that has a
music playlist, a saved Music filter that opens All) are the unit tests. Do not sign in. Do not
add a queue or playlist fixture.

## Release scratchpad

```markdown
## Library medium controls follow stored music when Music is off

- Surfaces: web
- Change: with Music turned off, Queues show Podcasts and Music only when the active queue is
  music or the music queue has rows, and otherwise list the podcast queue with no tabs. History
  shows those tabs only when music is in history. The playlists filter shows Music only when
  that list has a music playlist, and a saved Music filter with nothing to show opens All.
  Playlist pages stay.
- Who notices: visitors on an instance with Music turned off
- Operator steps: none
```
