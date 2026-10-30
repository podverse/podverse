**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 32 — Web Browse shows each media type's empty message

When a web Browse list's first page comes back with no rows, the page shows that media type's
"No … Found" message in place of the blank list. Podcasts, episodes, clips, albums, tracks, and
playlists reuse their existing catalog strings. Artists and users get new keys in every consumer
locale original.

## Rows

R19, R20, R10, R8

## Runs after

20, 31

## Files

apps/web/src/utils/mediaListChips.ts
apps/web/src/utils/mediaListChips.test.ts
apps/web/src/app/_media-lists/podcasts/PodcastsPageList.tsx
apps/web/src/app/_media-lists/episodes/EpisodesPageList.tsx
apps/web/src/app/_media-lists/clips/ClipsPageList.tsx
apps/web/src/app/_media-lists/artists/ArtistsPageList.tsx
apps/web/src/app/_media-lists/albums/AlbumsPageList.tsx
apps/web/src/app/_media-lists/tracks/TracksPageList.tsx
apps/web/src/app/playlists/PlaylistsPageList.tsx
apps/web/src/app/profiles/ProfilesPageList.tsx
packages/i18n-catalog/consumer/originals/en-US.json
packages/i18n-catalog/consumer/originals/es.json
packages/i18n-catalog/consumer/originals/fr.json
packages/i18n-catalog/consumer/originals/el-GR.json
apps/web/e2e/browse-directory-top.spec.ts

## What the code does today

- The Browse page lists render `CorePodcasts`, `CoreEpisodes`, `ListClips`, `CoreArtists`,
  `CoreAlbums`, `CoreTracks`, `ListPlaylists`, and `ListProfiles`. None renders an empty message;
  an empty page is blank. `getTotalPages` stops on a short or empty page because directory Top
  leaves `meta.count` null, so no Next control shows.
- Livestreams is the precedent: `CoreLivestreams` shows
  `<InfoWrapper><p>{tMedia('livestream.no_livestreams_found')}</p></InfoWrapper>` when
  `page <= 1` and the list is empty. Browse Livestreams is not a popularity list and is not
  touched here.
- `NoResults` (`apps/web/src/components/NoResults/NoResults.tsx`) renders the same `InfoWrapper`
  block with a `message` prop. Add by RSS livestreams already pass it a catalog string.
- Existing consumer keys: `media.podcast.no_podcasts_found`, `media.podcast.no_episodes_found`,
  `media.music.no_tracks_found`, `media.music.no_albums_found`,
  `features.playlist.no_playlists_found`, `features.clip.no_clips_found`. No artists or
  users/profiles key exists. `features.profile` and `features.profiles` are leaf strings, so
  nothing can nest under them. `features.browse` holds the Browse chip label `users` ("Users").
- After plan 31, every Browse list opens on Top / Week. In E2E, albums, clips, playlists, and
  users have no popularity rows, so they open empty. The four seeded rows have day 0, so
  podcasts, episodes, artists, and tracks are empty on Top / Day.

## Decisions settled here

- The message shows on any empty first page of a Browse list, whatever the sort or category, not
  only on Top. An empty Recent page is rare but blank today too.
- Browse only. Home (subscribed) lists keep their sign-in and getting-started messages, and the
  `/playlists` and `/profiles` pages are unchanged.
- Reuse `NoResults` with each type's string. No new component and no new styles.
- New keys: `media.music.no_artists_found` beside the album and track keys, and
  `features.browse.no_users_found` beside the Users chip label, so the message names the chip the
  listener pressed.

## Approach

### 1. Helper (`apps/web/src/utils/mediaListChips.ts`)

Add after the `MediaListScope` type:

```typescript
/** A Browse list whose first page loaded with no rows shows its empty message. */
export function shouldShowBrowseEmptyMessage({
  isBrowse,
  isLoading,
  page,
  rowCount,
}: {
  isBrowse: boolean;
  isLoading: boolean;
  page: number;
  rowCount: number;
}): boolean {
  return isBrowse && !isLoading && page <= 1 && rowCount === 0;
}
```

### 2. Page lists

In each file below, compute `showEmpty` with the helper and render
`<NoResults message={...} />` in place of the list component when it is true. Keep every other
element (`HowToStartInfo`, filter field, `WebLoadingSpinnerOverlay`) where it is. The pattern:

```tsx
{showEmpty ? (
  <NoResults message={tMedia('podcast.no_podcasts_found')} />
) : (
  <CorePodcasts /* props unchanged */ />
)}
```

Import `NoResults` from `components/NoResults/NoResults` with the file's relative depth
(`../../../` under `_media-lists`, `../../` under `playlists` and `profiles`) and
`shouldShowBrowseEmptyMessage` from `utils/mediaListChips`. Add `useTranslations` from
`next-intl` where the file lacks it.

| File | `isBrowse` | `rowCount` | `isLoading` | Message |
| --- | --- | --- | --- | --- |
| `PodcastsPageList.tsx` | `scope === 'browse'` | `channels.length` | `isLoading` | `tMedia('podcast.no_podcasts_found')` |
| `EpisodesPageList.tsx` | `scope === 'browse'` | `items.length` | `isLoading` | `tMedia('podcast.no_episodes_found')` |
| `ClipsPageList.tsx` | `scope === 'browse'` (add `scope` to the `useClipsPageContext()` destructure) | `clips.length` | `isLoading` | `tFeatures('clip.no_clips_found')` |
| `ArtistsPageList.tsx` | `scope === 'browse'` | `channels.length` | `isLoading` | `tMedia('music.no_artists_found')` |
| `AlbumsPageList.tsx` | `scope === 'browse'` | `channels.length` | `isLoading` | `tMedia('music.no_albums_found')` |
| `TracksPageList.tsx` | `scope === 'browse'` | `items.length` | `isLoading` | `tMedia('music.no_tracks_found')` |
| `PlaylistsPageList.tsx` | `listScope === 'browse'` (add `listScope` to the `usePlaylistsPageContext()` destructure) | `playlists.length` | `isLoading` | `tFeatures('playlist.no_playlists_found')` |
| `ProfilesPageList.tsx` | `listScope === 'browse'` (add `listScope` to the `useProfilesPageContext()` destructure) | `accounts.length` | `isLoading` | `tFeatures('browse.no_users_found')` |

`page` is `filterParams.page` in every file. `tMedia = useTranslations('media')`,
`tFeatures = useTranslations('features')`. Where a file returns `CategoriesList` early while
`isCategoryListOpen` is true, that return stays first.

### 3. Catalog keys

In `packages/i18n-catalog/consumer/originals/`, add the same two keys to all four files. Do not
edit `overrides/`.

`media.music`, on the line after `no_albums_found`:

| File | `no_artists_found` |
| --- | --- |
| `en-US.json` | `No Artists Found` |
| `es.json` | `No se encontraron artistas` |
| `fr.json` | `Aucun artiste trouvé` |
| `el-GR.json` | `Δεν βρέθηκαν καλλιτέχνες` |

`features.browse`, after `users` (add the comma to the `users` line):

| File | `no_users_found` |
| --- | --- |
| `en-US.json` | `No Users Found` |
| `es.json` | `No se encontraron usuarios` |
| `fr.json` | `Aucun utilisateur trouvé` |
| `el-GR.json` | `Δεν βρέθηκαν χρήστες` |

English is title case (**ui-copy-casing**). The other locales follow their existing
`no_*_found` strings.

## Tests

`apps/web/src/utils/mediaListChips.test.ts`: add `describe('shouldShowBrowseEmptyMessage')`
with `it('shows the message on an empty first Browse page that has finished loading')` (true),
and `it('hides the message while loading, on a later page, when rows exist, or outside Browse')`
covering `isLoading: true`, `page: 2`, `rowCount: 1`, and `isBrowse: false` (each false).

`apps/web/e2e/browse-directory-top.spec.ts` (plan 31 creates it): add a second test,
`An empty Browse page shows that media type's empty message`, signed out, reusing the file's
helpers and imports. For "choose Top, then Day": open Sort, choose `Top`, then `Day` on the menu
named `Range`; the chip reads `Sort: Day`. Every step asserts `Next Page` has count 0 and
captures on the message.

1. `/browse`: choose Top, then Day. `No Podcasts Found` is visible and the podcast title has
   count 0. Then choose Recent: `No Podcasts Found` has count 0 and the podcast title is visible
   (capture on the title for this half).
2. `/browse?tab=episodes`: choose Top, then Day. `No Episodes Found` is visible.
3. `/browse?tab=clips`: on open (`Sort: Week`), `No Clips Found` is visible.
4. `/browse?tab=artists`: choose Top, then Day. `No Artists Found` is visible.
5. `/browse?tab=albums`: on open (`Sort: Week`), `No Albums Found` is visible.
6. `/browse?tab=tracks`: choose Top, then Day. `No Tracks Found` is visible.
7. `/browse?tab=playlists`: on open (`Sort: Week`), `No Playlists Found` is visible.
8. `/browse?tab=users`: on open (`Sort: Week`), `No Users Found` is visible.

Match messages with `page.getByText('<message>', { exact: true })`. Follow **e2e-readability**
and **e2e-screenshot-verified-element**.

## Release scratchpad

```markdown
## Web Browse empty list messages

- Surfaces: web, i18n catalog (consumer)
- Change: an empty Browse list now says so ("No Podcasts Found", "No Episodes Found", "No Clips
  Found", "No Artists Found", "No Albums Found", "No Tracks Found", "No Playlists Found", "No
  Users Found") in place of a blank page, for example Top for a range with no listens. New
  consumer keys `media.music.no_artists_found` and `features.browse.no_users_found` in en-US, es,
  fr, and el-GR.
- Who notices: anyone browsing on web; translators reviewing the two new strings
- Operator steps: none
```
