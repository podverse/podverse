**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

# 41 — Hide the Search Music facet when Music is off

Search offers two facets today: All and Music (`SearchPageListHeader`). All already asks for
podcasts (`searchPodcasts`, and the local search uses medium `podcasts`). Music asks for music
(`searchMusicByTerm`), which is how artists, albums, tracks, and music livestreams are found.
When Music is off, the Music facet is not shown and a stored Music choice opens All. That is the
whole hide-from-search change. No new search parameter and no change to the API. `all` stays the
podcast search, including when the allowlist is set.

## Rows

R17

## Runs after

11

## Files

- apps/web/src/app/search/searchPageMedium.ts
- apps/web/src/app/search/searchPageMedium.test.ts
- apps/web/src/app/search/page.tsx
- apps/web/src/app/search/SearchPageListHeader.tsx
- apps/web/e2e/catalog-restricted-music-search.spec.ts

## Settled decisions

- Do not add a podcast-only value to `QueryParamsPodcastIndexSearchMedium`. All is already
  podcasts. Hiding Music is the whole search change (R17). No new API surface.
- When Music is off, do not render the facet row at all. A single All tab is not a choice.
  The field stays, and the request medium is `all`.
- A stored `type` of `music` resolves to `all` when Music is off. Music on keeps
  `resolvePodcastIndexSearchMedium` as it is, including a stored Music choice.
- Do not filter result rows in the client. `all` means podcasts, on Podcast Index search and on
  the allowlist search. Artists, albums, tracks, and music livestreams stay out of that request.
  Plan 11 allowlists the seeded music album and artist so a music hit on this lane is missing
  because this facet is hidden.
- Do not call `notFound()` or `redirect()`.

## Medium helper — `apps/web/src/app/search/searchPageMedium.ts` (new)

```typescript
import type { QueryParamsPodcastIndexSearchMedium, SortPrefValue } from '@podverse/helpers';
import { resolvePodcastIndexSearchMedium } from '@podverse/helpers';

export function searchMediumForCatalog(
  stored: SortPrefValue | null | undefined,
  musicEnabled: boolean
): QueryParamsPodcastIndexSearchMedium {
  const medium = resolvePodcastIndexSearchMedium(stored);
  if (!musicEnabled && medium === 'music') {
    return 'all';
  }
  return medium;
}
```

## Page and header

`apps/web/src/app/search/page.tsx` is a server component. Inside `SearchPage`, replace
`resolvePodcastIndexSearchMedium(stored)` with
`searchMediumForCatalog(stored, getCatalogConfig().musicEnabled)`. Import `getCatalogConfig`
from `../../lib/catalog/catalogPolicy`. Its return type is `CatalogConfig`. Keep the cookie read
as it is. Do not read the catalog at module scope.

`SearchPageListHeader` is a client component. Read `useConfig().public.catalog.musicEnabled`.
When it is false, render the `SearchInput` only and omit `ButtonTabs`. When it is true, keep
both tabs and their `onClick` handlers exactly as they are. `useSearchPageContext` is unchanged;
the server already passed `all` as `initialMedium`.

## Shared files

Step 09 edits the allowlist search request. This plan only changes how the opening medium is
chosen and whether the Music tab is rendered. Do not change `reqPodcastIndexSearchPodcasts`,
`SearchPageContext`, or `ListSearchResultPodcastIndexFeedRow`. The medium this plan passes for
a hidden Music choice is `all`, and `all` stays podcasts. Step 09 must not define `all` as every
stored channel, or the allowlisted album and artist appear in Search while Music is off.

## Tests

- `searchPageMedium.test.ts`: a null store is `all` either way. Stored `music` is `music` when
  Music is on and `all` when it is off. Stored `all` stays `all` when Music is off.
- `apps/web/e2e/catalog-restricted-music-search.spec.ts` (catalog-restricted lane from plan 11;
  do not add it to `makefiles/local/e2e-spec-order-web.txt`). The lane allowlists the music album
  (`E2E_MUSIC_ALBUM_TITLE`, `E2E Music Album`) and the music artist, and its stored-content spec
  already opens those pages. This spec does not assert a not-found page. `test.describe`
  "Music off search".
  - "When Music is off, Search has the title field and no Music facet." `goto('/search')`, URL
    matches `/search`, the field `getByLabel('Search by Title...')` is visible,
    `getByRole('button', { name: 'Music', exact: true })` has count 0, and
    `getByRole('button', { name: 'All', exact: true })` has count 0. `capturePageLoad` from
    `./helpers/stepScreenshots`, scrolled to the field.
  - "When Music is off, searching the seeded album title does not list that album." Fill the
    same field with `E2E_MUSIC_ALBUM_TITLE` from `./helpers/seedConstants`. The text
    `E2E Music Album` has count 0. One `capturePageLoad` scrolled to the field. The album is on
    the lane allowlist, so a hit would mean `all` searched music. Do not assert the search
    request URL. Step 09 owns a separate `catalog-restricted-search.spec.ts` and does not assert
    this chip.

## Release scratchpad

```markdown
## Search drops the Music facet when Music is off

- Surfaces: web
- Change: with Music turned off, Search no longer shows All and Music. The field searches
  podcasts, which is what All already did. A saved Music facet opens that podcast search.
- Who notices: visitors on an instance with Music turned off
- Operator steps: none
```
