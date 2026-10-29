**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 31 — Web Browse lists open on Top for the past week, with seeded counts

Every web Browse list opens on Top with the Week range until the listener picks another sort for
that list. The `local-settings` cookie already stores the choice per list, so a list the listener
changed keeps that choice. Public playlists already open on Top / Week and do not change here.
Browse Livestreams is not a popularity list and does not change.

The E2E seed gains four popularity rows with week counts, so the web specs and the mobile Browse
flows that expect rows on first open still see them once plan 10 drops zero-count rows from
directory Top.

## Rows

R18, R10, R8

R18 is the web half. Step 08 plans the mobile half from the seed rows below.

## Runs after

10

## Files

apps/web/src/utils/dropdownMenuItems.ts
apps/web/src/utils/dropdownMenuItems.test.ts
apps/web/src/app/_media-lists/podcasts/PodcastsPageDropdownConfig.ts
apps/web/src/app/_media-lists/episodes/EpisodesPageDropdownConfig.tsx
apps/web/src/app/_media-lists/tracks/TracksPageDropdownConfig.tsx
apps/web/src/app/_media-lists/artists/ArtistsPageDropdownConfig.ts
apps/web/src/app/_media-lists/albums/AlbumsPageDropdownConfig.ts
apps/web/src/app/_media-lists/podcasts/podcastsListSsr.ts
apps/web/src/app/_media-lists/episodes/episodesListSsr.ts
apps/web/src/app/_media-lists/clips/clipsListSsr.ts
apps/web/src/app/_media-lists/tracks/tracksListSsr.ts
apps/web/src/app/_media-lists/artists/artistsListSsr.ts
apps/web/src/app/_media-lists/albums/albumsListSsr.ts
apps/web/src/app/profiles/ProfilesPageDropdownConfig.ts
apps/web/src/app/profiles/profilesListSsr.ts
apps/web/src/app/profiles/ProfilesPageContext.tsx
apps/web/src/app/profiles/page.tsx
tools/web/seed-e2e.mjs
apps/web/e2e/media-list-chips.spec.ts
apps/web/e2e/browse-directory-top.spec.ts
makefiles/local/e2e-spec-order-web.txt

## What the code does today

- `buildSubscribedListFilterParams` in `apps/web/src/utils/dropdownMenuItems.ts` resolves a list's
  type, sort, range, and page. For `scope: 'browse'` with type `'subscribed'` it switches to
  global, sets `currentSort = defaultGlobalSort`, and sets `currentRange = null`. The signed-out
  fallback at the end of the function also sets `currentRange = null`.
- The five `_media-lists` configs (`getPodcastsPageFilterParams`, `getEpisodesPageFilterParams`,
  `getTracksPageFilterParams`, `getArtistsPageFilterParams`, `getAlbumsPageFilterParams`) pass
  `defaultGlobalSort: 'recent'`. Clips use `getEpisodesPageFilterParams` (`clipsListSsr.ts` and
  `ClipsPageContext.tsx`). `getProfilesPageFilterParams` also passes `'recent'`, and it serves
  both the `/profiles` page and Browse Users.
- The Browse SSR loaders pass literal `'recent'` before the builder runs, so changing
  `defaultGlobalSort` alone does not change a signed-out Browse visit. In each of the six
  `*ListSsr.ts` files, the browse paths are the `if (!parsed.success)` branch of
  `parseSearchParams` and the `guarded*Params` helper at the bottom. Each has `'recent'` in three
  places: the `sort:` passed to `guardSubscribedSsrFilter`, the `fallback.sort`, and the
  `guarded.sort ?? 'recent'` passed on. Podcasts writes the first as
  `(isAuthenticated ? 'a_z' : 'recent')`. The `if (scope === 'subscribed')` branch is Home and
  stays as it is.
- Request helpers call the Top route only when `sort === 'top' && range` is set. A Top sort with
  a null range does not load Top, so the default has to set both.
- `useFilterDefaults` writes the resolved params to the `local-settings` cookie (`fd[page]`) on
  first load when nothing is stored. Page keys are `podcasts`, `episodes`, `clips`, `artists`,
  `albums`, `tracks`, `browse-users`, and `browse-playlists`.
- `profilesListSsr.ts` `resolveBrowseParams` already passes `sort` and `range` as `null` when
  neither the URL nor the cookie has one. `playlistsListSsr.ts` already uses `?? 'top'` and
  `?? 'week'`.
- The E2E seed writes no `stats_popularity_*` rows. After plan 10, every Browse Top list in E2E
  is empty.

## Decisions settled here

- Top with no range resolves to Week inside `buildSubscribedListFilterParams` for every global
  and category result, so every caller (SSR loaders and client contexts) gets the same rule. The
  subscribed results keep their range as passed.
- The Browse paths of the six loaders pass `null` where they passed `'recent'`, so the builder's
  default applies.
- A browser that already stored a sort for a Browse list keeps it, including a Recent that
  `useFilterDefaults` wrote automatically on an earlier visit. No cookie migration.
- The `/profiles` page keeps opening on Recent. Only Browse Users opens on Top / Week.
- Seed four rows with day 0 and week 2 (table below). Albums, clips, playlists, and profiles get
  no rows, so their Top lists stay empty in E2E. The `E2E HLS VOD Channel` and `E2E Music Artist`
  get no rows, so Recent still lists rows that Top does not.

## Approach

### 1. Shared builder (`apps/web/src/utils/dropdownMenuItems.ts`)

Below `getRangeDropdownItems`, add:

```typescript
/** Range a global or category list uses when it is sorted by Top and no range is set. */
export const DEFAULT_DIRECTORY_TOP_RANGE: QueryParamsStatsRange = 'week';

function directoryRange(
  sort: string | null,
  range: QueryParamsStatsRange | null
): QueryParamsStatsRange | null {
  return sort === 'top' && range === null ? DEFAULT_DIRECTORY_TOP_RANGE : range;
}
```

In `buildSubscribedListFilterParams`:

- Category branch (`if (category)`): after `currentSort = getValidQueryParam(...)`, add
  `currentRange = directoryRange(currentSort, currentRange);` before the return.
- `if (type === 'global')` branch: after `currentSort = getValidQueryParam(...)`, add the same
  line, so both returns in that branch use it.
- Signed-out fallback at the end: replace `currentRange = null;` with
  `currentRange = directoryRange(currentSort, null);`.
- Leave the `scope === 'subscribed'` return, the browse-to-global switch block (it still sets
  `currentRange = null` and then reaches the global branch), the `type === 'subscribed'` branch,
  and the `isValidAuthSession` subscribed fallback unchanged.

### 2. Configs

Change `defaultGlobalSort: 'recent'` to `defaultGlobalSort: 'top'` in:

- `PodcastsPageDropdownConfig.ts` (`getPodcastsPageFilterParams`)
- `EpisodesPageDropdownConfig.tsx` (`getEpisodesPageFilterParams`, also clips)
- `TracksPageDropdownConfig.tsx` (`getTracksPageFilterParams`)
- `ArtistsPageDropdownConfig.ts` (`getArtistsPageFilterParams`)
- `AlbumsPageDropdownConfig.ts` (`getAlbumsPageFilterParams`)

Their callers pass `scope` `'subscribed'` or `'browse'`. The subscribed scope returns before
`defaultGlobalSort` is read, so only Browse changes.

`ProfilesPageDropdownConfig.ts`: add a third parameter to `getProfilesPageFilterParams`:

```typescript
export function getProfilesPageFilterParams(
  params: ProfilesPageDropdownConfigParams,
  isValidAuthSession: boolean,
  listScope: 'page' | 'browse'
): ProfilesPageDropdownConfigCurrentParams {
  return buildSubscribedListFilterParams({
    ...params,
    defaultGlobalSort: listScope === 'browse' ? 'top' : 'recent',
    // other fields unchanged
  });
}
```

Callers: `profiles/page.tsx` passes `'page'`. `profiles/profilesListSsr.ts`
(`loadProfilesBrowseProps`) passes `'browse'`. `profiles/ProfilesPageContext.tsx` passes its
`listScope`. Do not change `resolveBrowseParams`; its `null` sort and range now resolve to Top /
Week.

### 3. Browse SSR loaders

In each of `podcastsListSsr.ts`, `episodesListSsr.ts`, `clipsListSsr.ts`, `tracksListSsr.ts`,
`artistsListSsr.ts`, and `albumsListSsr.ts`, edit only the `if (!parsed.success)` branch of
`parseSearchParams` and the `guarded*Params` function:

- `sort: cookieDefaults?.sort ?? 'recent'` becomes `sort: cookieDefaults?.sort ?? null`.
  `sort: data.sort ?? cookieDefaults?.sort ?? 'recent'` becomes
  `sort: data.sort ?? cookieDefaults?.sort ?? null`. In podcasts, replace
  `(isAuthenticated ? 'a_z' : 'recent')` with `null` in those two places. A signed-in visit with
  no cookie still passes type `'subscribed'`, and the builder's browse switch sets the global
  default.
- `fallback: { ..., sort: 'recent', ... }` becomes `sort: null`.
- `sort: guarded.sort ?? 'recent'` becomes `sort: guarded.sort`. The configs' params already type
  `sort` as nullable.

Leave every `range` expression as it is (`?? null`); the builder fills Week. Leave the
`scope === 'subscribed'` branch unchanged.

### 4. E2E seed (`tools/web/seed-e2e.mjs`)

Below `insertSeedItemDescription` (module level, near line 387), add:

```javascript
/** Counts on every seeded popularity row. Day stays 0, so Top for the day is an empty list. */
const E2E_POPULARITY_COUNTS = { day: 0, week: 2, month: 3, allTime: 5 };

async function insertSeedChannelPopularity(client, channelId) {
  await client.query(
    `INSERT INTO stats_popularity_channel (channel_id, day_count, week_count, month_count, all_time_count)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      channelId,
      E2E_POPULARITY_COUNTS.day,
      E2E_POPULARITY_COUNTS.week,
      E2E_POPULARITY_COUNTS.month,
      E2E_POPULARITY_COUNTS.allTime,
    ]
  );
}

async function insertSeedItemPopularity(client, itemId) {
  // same shape, table stats_popularity_item, column item_id
}
```

Write `insertSeedItemPopularity` out in full with the same counts. Call them inside
`seedMediaPlayerAndEmbedFixtures`:

| Row | Anchor | Call |
| --- | --- | --- |
| `E2E Podcast Seed Channel` (`e2ePodChnl001`) | right after `INSERT INTO channel_about (channel_id) VALUES ($1)` for `podcastChannelId` | `await insertSeedChannelPopularity(client, podcastChannelId);` |
| `E2E Podcast With Chapters` (`e2ePodChap0001`) | right after `const chapteredItemId = await insertPodcastItem({ ... });` | `await insertSeedItemPopularity(client, chapteredItemId);` |
| `E2E Music Track One` (`e2eMusicTrk001`) | right after `const musicTrackTwoItemId = await insertMusicTrack({ ... });` | `await insertSeedItemPopularity(client, musicTrackOneItemId);` |
| `E2E Directory Artist` (`e2eArtPub01`) | right after the `INSERT INTO channel_about (channel_id, last_pub_date)` for `directoryArtistChannelId` | `await insertSeedChannelPopularity(client, directoryArtistChannelId);` |

No delete step. `stats_popularity_channel` and `stats_popularity_item` cascade from `channel` and
`item`, which cascade from `feed`, and each block already deletes its feed before inserting.

Why these four:

- Podcast channel: web Browse Podcasts and the mobile Browse Podcasts and perf chip-switch flows
  wait for a row.
- Chaptered episode: it has `item_about.duration`, a `pub_date`, and a channel title, which the
  mobile Browse Episodes step asserts (`home-feed-row-subtitle/updated/duration-.*`).
- Track One: it has an enclosure on the test-assets server, so the mobile Browse Tracks step can
  play the first row. Track Two stays without a row.
- Directory artist: web `media-list-chips.spec.ts` and `artists-list-date-and-view.spec.ts` open
  Browse Artists and expect it with its date. Mobile Browse Artists asserts
  `home-feed-row-updated-.*` and a grid cell.

No spec in the repo checks row order under Top on a podcast or album page, so the item rows do
not move any asserted order.

## Tests

`apps/web/src/utils/dropdownMenuItems.test.ts`:

- In `defaults to subscribed when auth and type is unset, else global when logged out`, the guest
  result keeps sort `'top'`, so change `expect(guest.currentRange).toBe(null)` to
  `toBe('week')`.
- Add, in the `scope` describe, using `defaultGlobalSort: 'top'`, `defaultSubscribedSort: 'a_z'`,
  `QUERY_PARAMS_GLOBAL_SORT_VALUES`, `QUERY_PARAMS_SUBSCRIBED_FULL_SORT`:
  - `opens a signed-out browse list on Top for the week when no sort or range is set`: type
    `'global'`, sort `null`, range `null`, `isValidAuthSession: false`, `supportsCategory: false`.
    Expect type `'global'`, sort `'top'`, range `'week'`.
  - `opens a signed-in browse list on Top for the week when the type is subscribed`: type
    `'subscribed'`, sort `'a_z'`, range `null`, `isValidAuthSession: true`. Expect type
    `'global'`, sort `'top'`, range `'week'`.
  - `opens a browse category list on Top for the week`: `supportsCategory: true`, category
    `'technology'`, type `'global'`, sort `null`, range `null`. Expect type `'category'`, sort
    `'top'`, range `'week'`.
  - `keeps a chosen range and a chosen Recent sort on a browse list`: sort `'top'` with range
    `'month'` gives `'month'`; sort `'recent'` with range `null` gives `'recent'` and `null`.
  - `leaves a subscribed Top list without a range`: scope `'subscribed'`, sort `'top'`, range
    `null`. Expect range `null`.

`apps/web/e2e/media-list-chips.spec.ts`:

- Test `Browse Playlists and Users chips show public lists without type tabs`, Users step: change
  `toHaveAccessibleName('Sort: Recent')` to `'Sort: Week'`.
- Test `Clip lists sort by Recent or Top, never A-Z, and a saved A-Z for clips opens on Recent`:
  rename it to
  `Clip lists sort by Recent or Top, never A-Z, and a saved A-Z for Browse Clips opens on Top for the week`.
  - First step: rename to
    `Browse Clips opens on Top for the week and its Sort menu offers Recent and Top but not A-Z`,
    and expect `Sort: Week`. The chip has two options, so the first click still opens the menu
    named `Sort`. The rest of the step is unchanged.
  - Subscribed Clips step: unchanged (`Sort: Recent`).
  - Last step: rename to `A saved A-Z for Browse Clips in this browser opens on Top for the week`,
    expect `Sort: Week`, and change the capture label to
    `Browse Clips reads Week even when this browser saved A-Z for clips.`
- The Browse Podcasts `Top then Month` step still works: with two options the first click opens
  Sort, and choosing Top again opens Range. Leave it.

Add `apps/web/e2e/browse-directory-top.spec.ts`. Suite `Browse directory Top`, signed out. Copy
the `chipRow`, `chipButton`, `sortChip`, `expectAppPath`, and `expectPressedChip` helpers from
`media-list-chips.spec.ts`. Import `E2E_PODCAST_CHANNEL_TITLE`, `E2E_HLS_CHANNEL_TITLE`, and
`E2E_DIRECTORY_ARTIST_TITLE` from `./helpers/seedConstants` and `capturePageLoad` from
`./helpers/stepScreenshots`. The episode and track titles are the literals
`E2E Podcast With Chapters` and `E2E Music Track One`. Match a title with
`page.getByText(title, { exact: true })` (`.first()` for visible checks). Sort changes stay off
the query string, so each path below holds after a sort change.

One test, `Each Browse list opens on Top for the past week, lists only rows counted that week, and keeps a sort the listener picks for that list`:

1. `/browse`: path `/browse`, Podcasts pressed, chip `Sort: Week`, the podcast title visible, the
   HLS title count 0. Capture on the podcast title.
2. Open Sort, choose Recent. Chip `Sort: Recent`, both channel titles visible. Capture on the HLS
   title.
3. `/browse?tab=episodes`: chip `Sort: Week` (Episodes keeps its own sort), the episode title
   visible. Capture on it.
4. `/browse?tab=artists`: chip `Sort: Week`, the directory artist title visible. Capture on it.
5. `/browse?tab=tracks`: chip `Sort: Week`, the track title visible. Capture on it.
6. Click the Podcasts chip. Path `/browse`, chip `Sort: Recent`, the HLS title visible. Capture on
   the sort chip.

Insert `apps/web/e2e/browse-directory-top.spec.ts` in `makefiles/local/e2e-spec-order-web.txt`
on the line after `apps/web/e2e/media-list-chips.spec.ts`.

Do not edit `artists-list-date-and-view.spec.ts`, `playlists-profiles-chips.spec.ts` (the
`/profiles` page still opens on Recent and `/playlists` on Week), or
`podcasts-subscribed-filter.spec.ts` (it opens `/browse?sort=recent`).

Follow **e2e-readability** and **e2e-screenshot-verified-element**.

## Release scratchpad

```markdown
## Web Browse opens on Top for the past week

- Surfaces: web
- Change: every Browse list (podcasts, episodes, clips, artists, albums, tracks, users) opens on
  Top with the Week range until the listener picks another sort for that list. The choice is
  remembered per list in this browser. Public playlists already opened on Top / Week. A browser
  that already saved a sort for a list keeps it, including Recent saved automatically on an
  earlier visit. The Profiles page still opens on Recent; Home lists are unchanged. A Top sort
  with no range now always means the past week.
- Who notices: anyone browsing on web
- Operator steps: none
```
