**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

# 30 — Web public playlists offer Recent

Public playlists on Browse and on `/playlists` gain Recent beside Top, in that order, matching
the other directory sort menus. The opening sort stays Top with range Week, the same as every
other Browse list after plan 31. Choosing Recent calls the public Recent read from plan 21.

## Rows

R16, R8

## Runs after

21, 32

## Files

apps/web/src/app/playlists/PlaylistsPageDropdownConfig.ts
apps/web/e2e/media-list-chips.spec.ts

## What the code does today (R8 and R16 for web playlists)

- `getPlaylistsPageSortOptions` in `PlaylistsPageDropdownConfig.ts` returns only Top when
  `type === 'public'`. Owner and followed playlists already offer Top, A-Z, Recent, and Oldest.
- `SortChip` (`packages/ui/src/components/navigation/Chip/SortChip.tsx`) treats a one-option menu
  whose only value is the range sort as range-only: the first click opens the Range menu. That is
  why Browse Playlists shows `Sort: Week` and the first click opens Range. With two options the
  first click opens Sort, and Top then swaps that open menu to Range.
- Public playlists already open on Top / Week:
  - `resolveBrowseParams` in `apps/web/src/app/playlists/playlistsListSsr.ts` uses
    `cookieDefaults?.sort ?? 'top'` and `cookieDefaults?.range ?? 'week'`.
  - `parseSearchParams` in `apps/web/src/app/playlists/page.tsx` uses the same Top/Week pair for a
    signed-out visitor, and its `fallback` is also `sort: 'top', range: 'week'`.
  - `handleTypeChange` in `PlaylistsPageChipRow.tsx` sets `sort: 'top', range: 'week'` when the
    type becomes `public`.
- `reqPlaylistGetMany` calls `/playlist/public/recent` (plan 21) when `sort === 'recent'` and
  public Top otherwise.
- The seed's only playlist row is public (`sharable_status_id` 1) and titled
  `E2E Removed Playlist` (`E2E_REMOVED_PLAYLIST_TITLE` in `apps/web/e2e/helpers/seedConstants.ts`).
  Its `medium_id` is the podcast medium. Browse playlists default `medium` to `'all'`
  (`DEFAULT_PLAYLISTS_PAGE_MEDIUM`), and plan 21's public list read applies no medium filter when
  the queue medium is `'all'`, so Recent includes that playlist. The seed writes no playlist
  popularity row (plan 31), so public Top is an empty list (plan 20), and Browse shows
  `No Playlists Found` there (plan 32).

## Decisions settled here

- Add Recent to the public sort menu. Leave the opening sort as Top / Week, as the operator
  settled for every Browse list. Do not edit `playlistsListSsr.ts`, `page.tsx`, or
  `PlaylistsPageChipRow.tsx`.
- Menu order for `public` is Recent, then Top, the same order as
  `getPodcastsPageSortOptions` for a global list.
- Owner (`private`) and followed (`private_followed`) options stay as they are.

## Approach

In `getPlaylistsPageSortOptions`, replace the `type === 'public'` return with:

```typescript
  if (type === 'public') {
    return [
      { label: tFilters('sort.recent'), value: 'recent' },
      { label: tFilters('sort.top'), value: 'top' },
    ];
  }
```

No new catalog keys. `filters.sort.recent` and `filters.sort.top` already exist.

`PlaylistsPageChipRow` already passes `getPlaylistsPageSortOptions` into `MediaListTrailingChips`.
No other call site.

## Tests

Update `apps/web/e2e/media-list-chips.spec.ts` only. Import `E2E_REMOVED_PLAYLIST_TITLE` from
`./helpers/seedConstants`.

In the test `Browse Playlists and Users chips show public lists without type tabs`, keep the
first step's chip, Create Playlist, and My Playlists assertions. Replace the sort-menu part of
that step. The chip still reads `Sort: Week`, and `No Playlists Found` is visible. The first
click opens the menu named `Sort`, not `Range`. That menu shows `Recent` and `Top`
(`menuitemradio`, `exact: true`). The menu is still absent inside
`getByTestId('media-list-chips')` (it renders in a portal). Escape closes it. Keep the existing
`capturePageLoad` on the Playlists chip.

Add two steps after that one, before the Users step:

1. Choose Recent. The address stays `/browse?tab=playlists` (`expectAppPath`). The sort chip
   reads `Sort: Recent`. The text `E2E_REMOVED_PLAYLIST_TITLE` is visible. `No Playlists Found`
   has count 0. `capturePageLoad` scrolls to that title.
2. Open Sort, choose Top, then choose Week on the Range menu. The chip reads `Sort: Week`. The
   playlist title has count 0. `No Playlists Found` is visible. The button `Next Page` has
   count 0. `capturePageLoad` scrolls to the empty message.

Leave the Users step as plan 31 leaves it (`Sort: Week` on Browse Users).

Do not edit `apps/web/e2e/playlists-profiles-chips.spec.ts`. Its signed-out `/playlists` step
only checks `Sort: Week` on Global and then switches to My Playlists, and that stays true.

Follow **e2e-readability** (complete sentences for the new steps) and
**e2e-screenshot-verified-element** (pass the asserted element into `capturePageLoad`).

## Release scratchpad

```markdown
## Public playlists Recent sort on web

- Surfaces: web
- Change: Browse playlists and the Playlists page offer Recent beside Top for public playlists.
  Recent lists them by last update. The sort chip still opens on Top (Week) until the listener
  picks Recent, which this browser then remembers.
- Who notices: listeners browsing public playlists
- Operator steps: none
```
