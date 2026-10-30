**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 41 — Mobile Browse Recent sort, Top for the week, a sort per media type

## Rows

R2, R8, R10, R15, R16, R18, R21

R18 is the mobile half; plan 31 covers web.

## Runs after

10, 20, 21, 31, 40

Plans 10 and 20 make directory Top drop zero-count rows, plan 21 adds public playlists Recent,
plan 31 seeds the popularity rows the Maestro flow expects, and plan 40 adds `ListSortChip`.

## Goal

Mobile Browse gets a Recent sort beside Top, matching web Browse, so an empty popularity range is
not the only view. Every Browse media type opens on Top with the Week range until the listener
changes that media type. Each media type remembers its own sort and its own Top window, the way
Home does. Top keeps the listen-count windows (day, week, month, all-time). With plans 10 and 20,
a Top window with no counts above zero comes back as an empty page, and Browse shows its existing
empty state ("Nothing to Show Yet") for it.

## What the code does today (answers R2 mobile half and R8 for mobile)

- `fetchBrowseFeedRows` in `apps/mobile/src/screens/browse/browseFeedData.ts` sends
  `sort: 'top'` plus the stored range for podcasts, episodes, clips, artists, albums, tracks,
  playlists, and users. Livestreams call `reqLiveItemGetManyUpcoming` and have no sort.
- `BrowseSortChip.tsx` is a range-only `MenuSelectChip` (`testID="browse-sort"`, rows
  `browse-sort-range-<range>`). There is no way to ask for Recent.
- `browseListPrefs.ts` stores `mediaType`, `range`, and `category` in one root entry,
  `BROWSE_ROOT_SCOPE` = `{ kind: 'list', name: 'browse' }` (AsyncStorage key `sort.browse`). The
  range is shared by every media type. Default range `week`. List or grid is per channel type,
  under `browseListViewModeScope(type)` from `@podverse/helpers` (keys `sort.browse-podcasts`,
  `sort.browse-artists`, `sort.browse-albums`), falling back to a `viewMode` in the root entry.
- Home keeps one entry per media type (`homeListPrefs.ts`, scope `{ kind: 'list', name:
  mediaType }`) holding that type's `sort`, `range`, and `viewMode`. `writeHomeRange` writes
  `{ range, sort: 'popularity' }`. HomeScreen uses its prefs only when
  `listPrefs.mediaType === selectedMediaType`, and shows defaults until the read for the new chip
  lands.
- Today the API pads Top with Recent rows (plan 10 removes that for channels and items), so the
  seeded Maestro flow sees rows on every Browse list. After plans 10 and 20, only rows with a
  count above zero list. Plan 31's seed gives a week count of 2 (day 0) to E2E Podcast Seed
  Channel, E2E Podcast With Chapters, E2E Directory Artist, and E2E Music Track One. On Top / Week
  Browse Podcasts, Episodes, Artists, and Tracks each list exactly that row; Albums, Clips,
  Playlists, and Users are empty; every type is empty on Top / Day.
- Paging already stops on a short or empty page: `browseFeedPage` uses `listResponseHasMore`,
  which reads a page shorter than `limit` as the last page. No paging change is needed.
- Empty state: `BrowseScreen` renders `ListEmpty` with `features.browse.empty`
  ("Nothing to Show Yet", `testID="browse-list-empty"`) when a settled load has no rows. An empty
  Top window uses this unchanged; no new copy.

## Parity source

Web Browse (`getPodcastsPageSortOptions` in
`apps/web/src/app/_media-lists/podcasts/PodcastsPageDropdownConfig.ts`, and the episodes, clips,
artists, albums, tracks, playlists, and profiles configs) offers Recent then Top for the global
list. After plan 31 every web Browse list opens on Top / Week and the `local-settings` cookie keeps
a sort per list. So every sortable mobile Browse type gets the pair `recent`, `top` (that menu
order), default `top`, default window `week`. Labels are the web ones: `filters.sort.recent`
("Recent") and `filters.sort.top` ("Top"). Livestreams keep no sort chip, as on web.

Key names diverge on purpose: web's cookie keys its Browse lists by page (`podcasts`, `episodes`,
…, `browse-users`, `browse-playlists`), and on mobile `podcasts` is already Home's entry. Mobile
uses the shared builder below, whose names match the existing Browse view-mode keys. This plan
does not change web's cookie keys; that would reset every saved web Browse sort.

## Settled decisions

- Sort and window are both per media type, in the same entry as that type's list or grid.
  Choosing a window selects Top for that type. Choosing Recent keeps the type's stored window, so
  returning to Top opens on it.
- Category and the selected media type stay in the root `sort.browse` entry, shared as today.
- No migration. A `range` already in the root entry is not read; every type opens on Top / Week
  until the listener changes that type. The stale field is left in place, and nothing reads it.
- Livestreams write no sort or window.
- `perf-browse-chip-switch.yaml` is not edited. It still finds the seeded podcast row. The perf
  doc gets one sentence saying seeded Browse runs switch between lists of at most one row.

## Change

### New `packages/helpers/src/lib/browseListScope.ts`

```typescript
import type { SortPrefScope } from './sortPrefs.js';

/**
 * The remembered entry for one Browse media type: its sort, its Top window, and its list or grid.
 *
 * Browse and Home lists of the same media type are separate instances, so the name carries a
 * `browse-` prefix. Podcasts, artists, and albums resolve to the same key as
 * `browseListViewModeScope`, so one entry holds every choice for that list.
 */
export const browseListScope = (mediaType: string): SortPrefScope => {
  return { kind: 'list', name: `browse-${mediaType}` };
};
```

`packages/helpers/src/index.ts`: add `export * from './lib/browseListScope.js';` on the line after
`export * from './lib/boolean.js';`.

Do not change `channelListViewPrefs.ts`; web still uses its `BROWSE_LIST_VIEW_MODE_SCOPE_*`
constants.

### `apps/mobile/src/screens/browse/browseTypes.ts`

Add after the `DEFAULT_BROWSE_MEDIA_TYPE` declaration (it already sits after
`BrowseRangeOption` / `DEFAULT_BROWSE_RANGE`, which the helper below uses):

```typescript
/** Directory orders Browse offers, in menu order. The tokens are the API `sort` values. */
export const BROWSE_SORT_OPTIONS = ['recent', 'top'] as const;

export type BrowseSortOption = (typeof BROWSE_SORT_OPTIONS)[number];

/** Every Browse list opens on Top for the past week until the listener changes that list. */
export const DEFAULT_BROWSE_SORT: BrowseSortOption = 'top';

export const BROWSE_SORT_LABEL_KEYS: Record<BrowseSortOption, string> = {
  recent: 'filters.sort.recent',
  top: 'filters.sort.top',
};

/** Top is the only Browse order that sends a stats window. */
export const browseSortToApiRange = (
  sort: BrowseSortOption,
  range: BrowseRangeOption
): BrowseRangeOption | null => {
  return sort === 'top' ? range : null;
};
```

Rewrite two doc comments so they describe the code as it stands:

- `isBrowseSortableMediaType`: `/** Every Browse directory list except Livestreams sorts by Recent or Top, so the sort chip applies. */`
- `shouldShowBrowseSortChip`: `/** The category picker is not a directory list, so the sort chip stays off while it is open. */`

### `apps/mobile/src/screens/browse/browseListPrefs.ts`

Rewrite the module around one entry per media type. Imports:

```typescript
import type { SortPrefScope, SortPrefValue } from '@podverse/helpers';
import { browseListScope, isChannelListViewModeType, pickSortPrefToken } from '@podverse/helpers';

import type { HomeViewMode } from '../../prefs/homeListPrefs';
import { DEFAULT_HOME_VIEW_MODE, HOME_VIEW_MODES } from '../../prefs/homeListPrefs';
import { readSortPref, subscribeSortPref, writeSortPref } from '../../prefs/sortPrefs';
import type { BrowseMediaType, BrowseRangeOption, BrowseSortOption } from './browseTypes';
import {
  BROWSE_MEDIA_TYPE_ORDER,
  BROWSE_RANGE_OPTIONS,
  BROWSE_SORT_OPTIONS,
  DEFAULT_BROWSE_MEDIA_TYPE,
  DEFAULT_BROWSE_RANGE,
  DEFAULT_BROWSE_SORT,
  isBrowseMediaType,
  isBrowseSortableMediaType,
} from './browseTypes';
```

(`browseListViewModeScope`, `CHANNEL_LIST_VIEW_MODE_TYPES`, and `isBrowseRangeOption` are no longer
imported here.)

Above `BROWSE_ROOT_SCOPE`, add a module doc comment:

```typescript
/**
 * Browse's remembered selections. The root entry holds the selected media type and category,
 * which every list shares. Each media type has its own entry (`browseListScope`) for its sort,
 * its Top window, and its list or grid, the same split Home uses.
 */
```

`BrowseListPrefs` (fields alphabetical):

```typescript
export type BrowseListPrefs = {
  category: string | null;
  /** The media type `range`, `sort`, and `viewMode` belong to. */
  mediaType: BrowseMediaType;
  range: BrowseRangeOption;
  sort: BrowseSortOption;
  viewMode: HomeViewMode;
};
```

`isBrowseViewModeMediaType` and `isHomeViewMode` stay. Replace `readBrowseViewMode` with a
synchronous version that reads the type entry already loaded:

```typescript
const resolveBrowseViewMode = (
  mediaType: BrowseMediaType,
  root: SortPrefValue | null,
  entry: SortPrefValue | null
): HomeViewMode => {
  if (isChannelListViewModeType(mediaType)) {
    if (entry?.viewMode !== undefined && isHomeViewMode(entry.viewMode)) {
      return entry.viewMode;
    }
  }

  if (root?.viewMode !== undefined && isHomeViewMode(root.viewMode)) {
    return root.viewMode;
  }

  return DEFAULT_HOME_VIEW_MODE;
};
```

`readBrowseListPrefs` (no arguments, as today):

```typescript
export const readBrowseListPrefs = async (): Promise<BrowseListPrefs> => {
  const root = await readSortPref(BROWSE_ROOT_SCOPE);
  const mediaType =
    root?.mediaType !== undefined && isBrowseMediaType(root.mediaType)
      ? root.mediaType
      : DEFAULT_BROWSE_MEDIA_TYPE;
  const entry = await readSortPref(browseListScope(mediaType));

  return {
    category: root?.category !== undefined ? root.category : null,
    mediaType,
    range: pickSortPrefToken(entry?.range, BROWSE_RANGE_OPTIONS, DEFAULT_BROWSE_RANGE),
    sort: pickSortPrefToken(entry?.sort, BROWSE_SORT_OPTIONS, DEFAULT_BROWSE_SORT),
    viewMode: resolveBrowseViewMode(mediaType, root, entry),
  };
};
```

Writers. `writeBrowseMediaType` and `writeBrowseCategory` are unchanged. Replace `writeBrowseRange`,
add `writeBrowseSort`, and point `writeBrowseViewMode` at the type entry:

```typescript
export const writeBrowseSort = async (
  mediaType: BrowseMediaType,
  sort: BrowseSortOption
): Promise<void> => {
  if (!isBrowseSortableMediaType(mediaType)) {
    return;
  }

  await writeSortPref(browseListScope(mediaType), { sort });
};

/**
 * A window is chosen only from Top's range sheet, so choosing one also selects Top for this
 * media type. The window stays while Recent is selected, so returning to Top opens on it.
 */
export const writeBrowseRange = async (
  mediaType: BrowseMediaType,
  range: BrowseRangeOption
): Promise<void> => {
  if (!isBrowseSortableMediaType(mediaType)) {
    return;
  }

  await writeSortPref(browseListScope(mediaType), { range, sort: 'top' });
};

export const writeBrowseViewMode = async (
  mediaType: BrowseMediaType,
  viewMode: HomeViewMode
): Promise<void> => {
  if (!isChannelListViewModeType(mediaType)) {
    return;
  }

  await writeSortPref(browseListScope(mediaType), { viewMode });
};
```

`subscribeBrowseListPrefs` subscribes to the root and to every media type's entry (each key once;
the channel types' view-mode keys are those same entries):

```typescript
export const subscribeBrowseListPrefs = (listener: () => void): (() => void) => {
  const unsubscribeRoot = subscribeSortPref(BROWSE_ROOT_SCOPE, listener);
  const unsubscribeEntries = BROWSE_MEDIA_TYPE_ORDER.map((mediaType) =>
    subscribeSortPref(browseListScope(mediaType), listener)
  );

  return () => {
    unsubscribeRoot();
    for (const unsubscribe of unsubscribeEntries) {
      unsubscribe();
    }
  };
};
```

### `apps/mobile/src/screens/browse/browseFeedData.ts`

- Import `browseSortToApiRange` and the `BrowseSortOption` type from `./browseTypes`.
- `BrowseFeedOptions` gains `sort: BrowseSortOption;` after `range`.
- In `fetchBrowseFeedRows`, replace `const range = options.range;` with:

```typescript
const sort = options.sort;
const range = browseSortToApiRange(sort, options.range);
```

- Replace every `sort: 'top',` in the playlists, users, clips, episodes/tracks, and channel
  requests with `sort,`. `range` stays `range` (now `BrowseRangeOption | null`; every request
  param type already accepts `null`). The livestreams branch does not change.
- Playlists: `reqPlaylistGetMany({ medium: 'all', page, range, sort, type: 'public' })`. With
  plan 21, `sort: 'recent'` reaches `/playlist/public/recent`, and the playlist `meta` carries
  `limit`, so `listResponseHasMore` pages playlists.
- Rewrite the `fetchBrowseFeedRows` doc comment's second sentence to: "Each call reads one page
  in the chosen order: Recent, or Top within the range. Top lists only rows counted above zero
  in that range, so a range with no listens is an empty page and a short page ends the list."
  Keep the rest of the comment.

### `apps/mobile/src/screens/browse/BrowseSortChip.tsx`

Replace the body with a thin wrapper over plan 40's `ListSortChip`:

```typescript
type BrowseSortChipProps = {
  onRangeChange: (range: BrowseRangeOption) => void;
  onSortChange: (sort: BrowseSortOption) => void;
  range: BrowseRangeOption;
  sort: BrowseSortOption;
};
```

- `options` (`useMemo` over `t`): `BROWSE_SORT_OPTIONS.map((option) => ({ label:
  t(BROWSE_SORT_LABEL_KEYS[option]), value: option }))`.
- `rangeOptions` (`useMemo` over `t`): `BROWSE_RANGE_OPTIONS.map((option) => ({ label:
  t(BROWSE_RANGE_MENU_LABEL_KEYS[option]), shortLabel: t(BROWSE_RANGE_LABEL_KEYS[option]),
  value: option }))`.
- Render `<ListSortChip heading={t('filters.screen.sort_heading')} onRangeChange={onRangeChange}
  onSortChange={onSortChange} options={options} range={range}
  rangeHeading={t('filters.screen.range_heading')} rangeOptions={rangeOptions} rangeSort="top"
  sort={sort} testID="browse-sort" />`. Import `ListSortChip` from `../../components/form`.
- Doc comment: "Browse directory order. Recent applies at once; Top opens the listen-count
  window choices first, and the face shows that window while Top is selected."

Resulting testIDs: face `browse-sort-button`, sort sheet `browse-sort-menu`, rows
`browse-sort-recent` and `browse-sort-top`, range sheet `browse-sort-range-menu`, range rows
`browse-sort-range-day|week|month|all-time`, range cancel `browse-sort-range-menu-cancel`.
Accessible name on the face: `Sort: Recent`, or `Sort: <window>` (`Sort: Week`, `Sort: Day`)
while Top is selected. `features.browse.sort_popularity` stays in the catalog; Home's chip still
uses it.

### `apps/mobile/src/screens/browse/BrowseScreen.tsx`

1. Imports: add `writeBrowseSort` to the `./browseListPrefs` import. Add `DEFAULT_BROWSE_SORT` to
   the `./browseTypes` value import, and `BrowseSortOption` to the existing
   `import type { BrowseMediaType, BrowseRangeOption } from './browseTypes';` line.
2. Replace `const activePrefs = isHydrated ? listPrefs : null;` and the `selectedCategory` line
   with:

```typescript
// Sort, window, and list or grid belong to one media type. Nothing loads until the read for the
// selected chip lands, so a switch never fetches with the previous type's sort.
const activePrefs =
  isHydrated && listPrefs !== null && listPrefs.mediaType === selectedMediaType ? listPrefs : null;
const selectedCategory = isHydrated ? (listPrefs?.category ?? null) : null;
```

   Category is shared across types, so it reads `listPrefs` directly and the Categories chip
   label does not blink during a switch. `viewMode` keeps reading `activePrefs?.viewMode`.
3. `handleRangeChange` becomes per type, and `handleSortChange` sits beside it:

```typescript
const handleRangeChange = useCallback(
  (range: BrowseRangeOption) => {
    void writeBrowseRange(selectedMediaType, range);
  },
  [selectedMediaType]
);

const handleSortChange = useCallback(
  (sort: BrowseSortOption) => {
    void writeBrowseSort(selectedMediaType, sort);
  },
  [selectedMediaType]
);
```

4. `loadFeed` and `loadNextFeedPage`: the options object passed to `fetchBrowseFeedRows` becomes
   `{ category: activePrefs.category, page: <same>, range: activePrefs.range, sort: activePrefs.sort }`.
   Their existing `activePrefs === null` early return now also covers a chip whose prefs have
   not landed.
5. The effect that calls `loadFeedRef.current('initial')` (deps today `activePrefs?.category`,
   `activePrefs?.range`, `isCategoryView`, `offlineModeEnabled`, `selectedMediaType`) adds
   `activePrefs?.mediaType` and `activePrefs?.sort`. A chip switch runs the effect once with
   `activePrefs` null (no request) and again when that type's prefs arrive (one request). A sort
   or window change writes the type entry, the subscription re-reads it, and the effect reloads
   page 1.
6. The sort chip shows the prefs of the chip on screen, and defaults until they land (the same
   fallback Home's `resolvedPrefs` uses). After `displayedMediaType` is declared, add:

```typescript
const sortChipPrefs =
  listPrefs !== null && listPrefs.mediaType === displayedMediaType ? listPrefs : null;
```

   The `BrowseSortChip` element passes `onRangeChange={handleRangeChange}`,
   `onSortChange={handleSortChange}`, `range={sortChipPrefs?.range ?? DEFAULT_BROWSE_RANGE}`, and
   `sort={sortChipPrefs?.sort ?? DEFAULT_BROWSE_SORT}`.

Nothing else on the screen changes: the chip still mounts only when `shouldShowBrowseSortChip` is
true, the empty state is the existing `ListEmpty`, and the list clears and reloads through the
existing request-id guard.

### `apps/mobile/e2e/browse.yaml`

Expectations come from plan 31's seed (see "What the code does today"). Edit in flow order:

1. Header comment (lines 3–6). Replace the sentence about "the popularity range (filter chrome)"
   with: Categories and the sort chip (filter chrome) appear only when the current type can use
   them; the sort chip is last. Every type opens on Top for the past week and keeps its own sort.
2. First open (after the first `extendedWaitUntil` for `browse-sort-button`, ~line 29), add:

```yaml
# Podcasts opens on Top for the past week.
- assertVisible: "Sort: Week"
```

3. Playlists and Users (the block starting `# Playlists and users are text-only catalog rows`,
   ~line 70, through `takeScreenshot: browse-screen-users`). Replace the whole block with:

```yaml
# Playlists and users are text-only catalog rows (no HomeFeedRow artwork). Both open on Top for
# the past week, and the seed counts no playlist or profile listens, so each list is empty.
- tapOn:
    id: browse-media-type-playlists
- extendedWaitUntil:
    visible:
      id: browse-list-empty
    timeout: ${TIMEOUT_SLOWER}
- assertNotVisible:
    id: "browse-playlist-row-.*"
- takeScreenshot: browse-screen-playlists
# Recent lists the seeded public playlist. Only Playlists changes; Users keeps its own sort.
- runFlow:
    file: shared/reveal-chip-row-trailing.yaml
    env:
      CHIP_ROW_ID: browse-media-type-selector
      TRAILING_ID: browse-sort-button
- swipe:
    from:
      id: browse-media-type-selector
    direction: LEFT
- tapOn:
    id: browse-sort-button
- tapOn:
    id: browse-sort-recent
- extendedWaitUntil:
    visible:
      id: "browse-playlist-row-.*"
    timeout: ${TIMEOUT_SLOWER}
- assertVisible: "Sort: Recent"
- takeScreenshot: browse-screen-playlists-recent
- runFlow:
    file: shared/reveal-chip-row-leading.yaml
    env:
      CHIP_ROW_ID: browse-media-type-selector
      LEADING_ID: browse-media-type-users
- tapOn:
    id: browse-media-type-users
- extendedWaitUntil:
    visible:
      id: browse-list-empty
    timeout: ${TIMEOUT_SLOWER}
- assertNotVisible:
    id: "browse-user-row-.*"
- assertVisible: "Sort: Week"
- takeScreenshot: browse-screen-users
```

   The playlists Recent step is the mobile coverage plan 21 relies on for `reqPlaylistGetMany`
   public Recent. The seeded public playlist is `e2eEmbPlList01`; assert any row, because page
   one is ordered by `last_updated`. The swipe after the reveal repeats the existing reason at
   ~line 222 (the chip counts as visible while its center is past the trailing edge); at the end
   of the row it does not move.
4. Livestreams block: unchanged (it already asserts `browse-sort-button` is absent).
5. Podcasts after Livestreams (the `# Wait for the directory list so the Podcasts screenshot…`
   step, ~line 171). After its `extendedWaitUntil` for `browse-feed-list`, before
   `takeScreenshot: browse-screen-podcasts`, add:

```yaml
# Top for the week lists only shows with listens that week.
- extendedWaitUntil:
    visible:
      text: "E2E Podcast Seed Channel"
    timeout: ${TIMEOUT_SLOWER}
- assertNotVisible:
    text: "E2E HLS VOD Channel"
```

6. Episodes (~line 178): unchanged. E2E Podcast With Chapters carries the subtitle, date, and
   duration the step asserts.
7. Clips (~line 200). Replace the comment and the conditional `runFlow` (the
   `when: visible: id: "home-feed-row-.*"` block) with:

```yaml
# The seed counts no clip listens, so Clips opens on an empty Top week.
- extendedWaitUntil:
    visible:
      id: browse-list-empty
    timeout: ${TIMEOUT_SLOWER}
- assertNotVisible:
    id: "home-feed-row-.*"
```

   Keep `takeScreenshot: browse-screen-clips` after it.
8. Sort chip on Episodes (~lines 228–235). Keep the `reveal-chip-row-trailing` run and the swipe
   before it. Replace the four steps `tapOn browse-sort-button` / `assertVisible browse-sort-menu`
   / `assertVisible browse-sort-range-week` / `tapOn browse-sort-menu-cancel` with:

```yaml
- assertVisible: "Sort: Week"
- tapOn:
    id: browse-sort-button
- assertVisible:
    id: browse-sort-menu
- assertVisible:
    id: browse-sort-recent
- assertVisible:
    id: browse-sort-top
- takeScreenshot: browse-sort-menu
# Top is a two-step choice: the sort sheet, then the listen-count window.
- tapOn:
    id: browse-sort-top
- extendedWaitUntil:
    visible:
      id: browse-sort-range-menu
    timeout: ${TIMEOUT_FAST}
- assertVisible:
    id: browse-sort-range-week
- assertVisible:
    id: browse-sort-range-month
- assertVisible:
    id: browse-sort-range-all-time
- tapOn:
    id: browse-sort-range-day
# The seed counts no listens for the day. Top lists only rows counted above zero, so the day is
# an empty list rather than Recent rows under the Top label.
- extendedWaitUntil:
    visible:
      id: browse-list-empty
    timeout: ${TIMEOUT_SLOWER}
- assertNotVisible:
    id: "home-feed-row-.*"
- assertVisible: "Sort: Day"
- takeScreenshot: browse-episodes-top-day-empty
# Recent lists episodes whether or not anyone listened.
- runFlow:
    file: shared/reveal-chip-row-trailing.yaml
    env:
      CHIP_ROW_ID: browse-media-type-selector
      TRAILING_ID: browse-sort-button
- swipe:
    from:
      id: browse-media-type-selector
    direction: LEFT
- tapOn:
    id: browse-sort-button
- tapOn:
    id: browse-sort-recent
- extendedWaitUntil:
    visible:
      id: "home-feed-row-subtitle-.*"
    timeout: ${TIMEOUT_SLOWER}
- assertVisible: "Sort: Recent"
- takeScreenshot: browse-episodes-recent
```

   The flow continues into the existing `tapOn browse-category-button` step unchanged.
9. Artists (~line 279). After the `extendedWaitUntil` for `browse-sort-button` and before
   `assertNotVisible browse-category-button`, add:

```yaml
# Episodes is on Recent now; Artists keeps its own sort and still opens on Top for the week.
- assertVisible: "Sort: Week"
```

Do not change the remaining Artists grid, Podcasts, and Tracks steps. They assert the seeded
artist (date and grid cell), the seeded podcast row title, and Track One (title, subtitle, row
menu, and playback), which all list on Top / Week. Do not edit `perf-browse-chip-switch.yaml` (it
waits for a row on Podcasts, which the seeded channel provides), `recommendations.yaml`,
`offline-mode.yaml`, `home.yaml`, or `tab-switch-playback.yaml`. Do not edit
`tools/web/seed-e2e.mjs`.

### `docs/development/mobile/MOBILE-PERF-BASELINES.md`

After the paragraph that begins `Seeded runs use \`Pixel_6_Pro_API_33_e2e\`` (ends "a cold pass
against a warm one."), add a paragraph:

```markdown
Seeded Browse runs open every media type on Top for the past week, and the seed counts listens
for only a handful of rows. `perf-browse-chip-switch.yaml` therefore switches between lists of at
most one row and cannot show per-row cost on Browse. Answer a Browse row-cost question with a
manual capture.
```

## Files

packages/helpers/src/lib/browseListScope.ts
packages/helpers/src/lib/browseListScope.test.ts
packages/helpers/src/index.ts
apps/mobile/src/screens/browse/browseTypes.ts
apps/mobile/src/screens/browse/browseTypes.test.ts
apps/mobile/src/screens/browse/browseListPrefs.ts
apps/mobile/src/screens/browse/browseListPrefs.test.ts
apps/mobile/src/screens/browse/browseFeedData.ts
apps/mobile/src/screens/browse/BrowseSortChip.tsx
apps/mobile/src/screens/browse/BrowseScreen.tsx
apps/mobile/e2e/browse.yaml
docs/development/mobile/MOBILE-PERF-BASELINES.md
release-notes/scratchpad.md

## Tests

Unit (vitest, `packages/helpers`), new `packages/helpers/src/lib/browseListScope.test.ts`:

- `gives each Browse media type its own key, apart from Home`:
  `buildSortPrefScopeKey(browseListScope('episodes'))` is `'browse-episodes'`;
  `buildSortPrefScopeKey(browseListScope('podcasts'))` is not
  `buildSortPrefScopeKey({ kind: 'list', name: 'podcasts' })`.
- `shares the Browse view-mode key for channel types`: `browseListScope('podcasts')` equals
  `browseListViewModeScope('podcasts')`, and the same for `'artists'` and `'albums'`.

Unit (vitest, `apps/mobile`):

- `browseTypes.test.ts`
  - Rename `hides the range chip while the category picker is open` to
    `hides the sort chip while the category picker is open` (assertions unchanged).
  - Add `offers Recent and Top and opens on Top`: `BROWSE_SORT_OPTIONS` equals
    `['recent', 'top']`; `DEFAULT_BROWSE_SORT` is `'top'`; `DEFAULT_BROWSE_RANGE` is `'week'`.
  - Add `sends a stats window only for Top`: `browseSortToApiRange('top', 'month')` is
    `'month'`; `browseSortToApiRange('recent', 'month')` is `null`.
- `browseListPrefs.test.ts` (existing in-memory AsyncStorage mock; import `writeBrowseRange` and
  `writeBrowseSort` beside the existing imports). The existing view-mode tests stay as they are;
  they hold because the channel types' entries use the same keys.
  - `opens every media type on Top for the week when nothing has been chosen`:
    `readBrowseListPrefs()` matches `{ mediaType: 'podcasts', range: 'week', sort: 'top' }`; after
    `writeBrowseMediaType('playlists')` it matches `{ mediaType: 'playlists', range: 'week',
    sort: 'top' }`.
  - `keeps a sort per media type`: `writeBrowseSort('episodes', 'recent')`, then
    `writeBrowseMediaType('episodes')` reads `sort: 'recent'`; `writeBrowseMediaType('clips')`
    reads `{ range: 'week', sort: 'top' }`.
  - `choosing a window selects Top for that media type only`: `writeBrowseSort('podcasts',
    'recent')`, `writeBrowseRange('podcasts', 'day')`; podcasts reads `{ range: 'day', sort:
    'top' }`; after `writeBrowseMediaType('artists')` it reads `{ range: 'week', sort: 'top' }`.
  - `keeps the window while Recent is selected`: `writeBrowseRange('tracks', 'month')`,
    `writeBrowseSort('tracks', 'recent')`, `writeBrowseMediaType('tracks')`; reads
    `{ range: 'month', sort: 'recent' }`; after `writeBrowseSort('tracks', 'top')` it reads
    `{ range: 'month', sort: 'top' }`.
  - `opens on the week even when the Browse root entry holds a window`: set `sort.browse` to
    `{ range: 'month' }`; `readBrowseListPrefs()` matches `{ range: 'week', sort: 'top' }`.
  - `ignores a stored sort Browse does not offer`: set `sort.browse-podcasts` to
    `{ sort: 'a_z' }`; reads `sort: 'top'`.
  - `keeps sort and view mode in one entry per channel type`: `writeBrowseViewMode('artists',
    'grid')`, `writeBrowseSort('artists', 'recent')`; `JSON.parse(inMemoryStore.get(
    'sort.browse-artists') ?? '{}')` equals `{ sort: 'recent', viewMode: 'grid' }`.
  - `stores no sort for Livestreams`: `writeBrowseSort('livestreams', 'recent')` and
    `writeBrowseRange('livestreams', 'day')`; `inMemoryStore.has('sort.browse-livestreams')` is
    false.
  - Rename `notifies a watcher when the root or a view-mode scope changes` to
    `notifies a watcher when the root or a media type's entry changes`, and after the existing
    `writeBrowseViewMode('artists', 'grid')` call add `await writeBrowseSort('episodes',
    'recent')` expecting `toHaveBeenCalledTimes(3)`. The final unsubscribed write then expects
    3.

Maestro: `apps/mobile/e2e/browse.yaml` as above (every type opens on Top / Week, empty Top lists
for Playlists, Users, and Clips, Top / Day empty on Episodes, Recent lists rows, Playlists Recent
lists the seeded playlist, and a sort changed on one type leaves the others on Week).
`fetchBrowseFeedRows` and the BrowseScreen load gate get no unit test: faking
`ApiRequestService` needs a type assertion, and the screen has no renderer in the node vitest
suite. The flow exercises both (**mobile-test-economics**).

## Release scratchpad

```markdown
## Mobile Browse adds a Recent sort, opens on Top for the week, and keeps a sort per media type

- Surfaces: mobile
- Change: The Browse sort chip offers Recent and Top for podcasts, episodes, clips, artists,
  albums, tracks, playlists, and users. Livestreams still have no sort. Choosing Top opens a
  second sheet for the window (day, week, month, all-time), and the chip face then shows that
  window. Every Browse media type opens on Top for the past week until the listener changes it,
  the same as web Browse. Each media type remembers its own sort and window on the device, the
  way Home does, so choosing Recent on Episodes leaves Podcasts on Top. A window chosen before
  this build applied to every type and is not carried over, so every type opens on the week
  after updating. With the API change in this release, a Top window with no listens shows
  Browse's empty state ("Nothing to Show Yet") instead of Recent rows, and a short Top page ends
  the list. Playlists Recent uses the new public playlists Recent read. `@podverse/helpers` adds
  `browseListScope`, the shared key for one Browse media type's remembered choices.
- Who notices: mobile listeners on Browse; anyone who had picked a window other than the week
  sees the week after updating
- Operator steps: none
```
