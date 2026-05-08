# 06 — Single dropdown-config factory

## Goal

Replace the eight near-clone `*PageDropdownConfig.{ts,tsx}` files with one parameterized
factory in `apps/web/src/utils/dropdownMenuItems.ts` (or a sibling). Keep one tiny
re-export per route only if existing import paths must remain stable for unrelated
modules.

## Why

These files share an identical "type + sort + range" matrix. Differences are limited to
type union (with/without `'category'`), default subscribed sort (`'a_z'` vs `'recent'`),
sort union (`Full` vs `Partial`), and whether the result includes `currentCategory`:

- [`apps/web/src/app/podcasts/PodcastsPageDropdownConfig.ts`](../../../../apps/web/src/app/podcasts/PodcastsPageDropdownConfig.ts)
- [`apps/web/src/app/albums/AlbumsPageDropdownConfig.ts`](../../../../apps/web/src/app/albums/AlbumsPageDropdownConfig.ts)
- [`apps/web/src/app/artists/ArtistsPageDropdownConfig.ts`](../../../../apps/web/src/app/artists/ArtistsPageDropdownConfig.ts)
- [`apps/web/src/app/episodes/EpisodesPageDropdownConfig.tsx`](../../../../apps/web/src/app/episodes/EpisodesPageDropdownConfig.tsx)
- [`apps/web/src/app/podcasts/livestreams/LivestreamsPageDropdownConfig.tsx`](../../../../apps/web/src/app/podcasts/livestreams/LivestreamsPageDropdownConfig.tsx)
- [`apps/web/src/app/profiles/ProfilesPageDropdownConfig.ts`](../../../../apps/web/src/app/profiles/ProfilesPageDropdownConfig.ts)
- [`apps/web/src/app/tracks/TracksPageDropdownConfig.tsx`](../../../../apps/web/src/app/tracks/TracksPageDropdownConfig.tsx)
- (`ClipsPageHeader` already imports the episodes factory — verify it still works.)

## Design

### Factory: `buildSubscribedListDropdownConfig`

- Location: `apps/web/src/utils/dropdownMenuItems.ts` (extend the existing module that
  already exports `getRangeDropdownItems`).

- Signature:

  ```ts
  export function buildSubscribedListDropdownConfig<
    TType extends string,
    TSort extends string,
  >(args: {
    type: TType;
    sort: TSort;
    typeOptions: { label: string; value: TType }[];
    globalSorts: { label: string; value: TSort }[];
    subscribedSorts: { label: string; value: TSort }[];
    categorySorts?: { label: string; value: TSort }[];
    showRangeWhenSort: TSort; // typically 'top'
    tFilters: (key: string) => string;
  }): {
    typeMenuItems: DropdownOption[];
    sortMenuItems: DropdownOption[];
    rangeMenuItems: DropdownOption[];
    showRangeDropdown: boolean;
  };
  ```

- The factory builds `typeMenuItems` from `typeOptions`, picks `sortMenuItems` based on
  whether `type` is `'global'`, `'subscribed'`, or `'category'`
  (only when `categorySorts` is provided), and computes `showRangeDropdown` from
  `sort === showRangeWhenSort`.

### Filter-params helper

Extract `buildSubscribedListFilterParams` covering the shared "if category … else if
type=global … else if type=subscribed … else (auth?subscribed:global)" branch.
Parameterize:

- `globalSortValues`, `subscribedSortValues`, `defaultGlobalSort`, `defaultSubscribedSort`.
- `supportsCategory: boolean` (controls whether the category branch fires and whether
  `currentCategory` is part of the return).
- Generic over the type and sort unions.

### Per-page wiring

Each existing file becomes a 5–10 line module that:

1. Imports the factory + helpers.
1. Declares the page's `typeOptions`, sort sets, and any local types (e.g. music vs av
   medium-derived unions).
1. Re-exports the page's expected `getXPageDropdownConfig` and `getXPageFilterParams`
   for callers that want stable import paths.

Once the hook in `05-subscribed-list-header-hook.md` is in place, headers can call the
factory directly and the per-page files can be deleted entirely if no other module
depends on them.

## Tests

- Vitest unit test for `buildSubscribedListDropdownConfig` covering:

  - 2-type variant (no category).
  - 3-type variant (with category).
  - `showRangeDropdown` flips when `sort === showRangeWhenSort`.

- Vitest unit test for `buildSubscribedListFilterParams` covering:

  - `category` non-null → forces `currentType = 'category'`.
  - `type === 'subscribed'` happy path.
  - Default branch with `isValidAuthSession` true vs false.

## Done when

- One factory + helper handles all 8 page configs.
- Each per-page file is ≤30 lines (or removed entirely).
- `npm run lint -w apps/web` and `npm run build -w apps/web` pass.
- E2E for affected list pages passes (see `10-verification.md`).
