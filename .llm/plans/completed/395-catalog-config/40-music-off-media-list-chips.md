**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 40 — Hide music chips on Home, Browse, Recommendations, and Add by RSS

When Music is off, the chip rows that choose a media kind no longer offer Artists, Albums, or
Tracks. Podcasts, Episodes, Clips, and Livestreams stay. Browse still offers Playlists and Users.
A URL or a stored chip that names a hidden kind opens Podcasts. This plan does not change list
requests. The Livestreams chip stays, and its request stays `medium: 'all'`, so music livestream
rows still show there and still open. There is no separate music-livestream chip to hide.

## Rows

R15, R16, R18, R20, R67

## Runs after

11

## Files

- apps/web/src/utils/mediaListChips.ts
- apps/web/src/utils/mediaListChips.test.ts
- apps/web/src/app/page.tsx
- apps/web/src/app/browse/page.tsx
- apps/web/src/app/recommendations/page.tsx
- apps/web/src/app/recommendations/RecommendationsPageClient.tsx
- apps/web/src/app/add-by-rss/page.tsx
- apps/web/e2e/catalog-restricted-music-chips.spec.ts

## Settled decisions

- The four constants stay the full lists. Mobile order and the existing unit test that compares
  them to that order stay as they are. Visibility is a separate function, so Music on is the same
  array the page uses today.
- Hidden chips are `artists`, `albums`, and `tracks`. `clips` and `livestreams` stay on every list
  that already has them (R20). Browse keeps `playlists` and `users`. Recommendations keeps
  `podcasts` only, because its other two chips are albums and artists.
- The Livestreams list request stays `medium: 'all'` (R67). Do not switch it to `av` or
  `podcasts`. Music livestream rows still show and still open. Do not edit
  `apps/web/src/app/_media-lists/livestreams/**` or `useUpcomingAddByRSSLivestreams`.
- A hidden chip in the URL or the stored chip is an unknown chip. `resolveMediaListChip` then
  falls through to Podcasts. Do not `redirect()` and do not rewrite the query. Do not clear the
  stored chip, so turning Music back on restores it.
- The helper returns `readonly T[]` and does not narrow `T`. Home, Browse, and Add by RSS keep
  every `switch` case, including artists, albums, and tracks, so Music on still renders those
  lists and the `never` default still typechecks.
- Add by RSS chips are filtered here even though the catalog-restricted lane also turns Add by
  RSS off. That lane cannot show this page. The unit test is what proves the filter. Do not call
  `notFound()` on `/add-by-rss`; area E owns that.

## Chip filter — `apps/web/src/utils/mediaListChips.ts`

Add this next to the four chip constants. No `as`.

```typescript
const isMusicMediaListChip = (chip: string): boolean =>
  chip === 'artists' || chip === 'albums' || chip === 'tracks';

/** Full chip list when Music is on. Artists, albums, and tracks left out when it is off. */
export function mediaListChipsForCatalog<T extends string>(
  chips: readonly T[],
  musicEnabled: boolean
): readonly T[] {
  if (musicEnabled) {
    return chips;
  }
  return chips.filter((chip) => !isMusicMediaListChip(chip));
}
```

## Server pages

Each page already calls `resolveMediaListChip` inside the component. Read the catalog there with
`getCatalogConfig()` from `apps/web/src/lib/catalog/catalogPolicy` (plan 10). The return type is
`CatalogConfig`. Never at module scope. Never read `WebCatalogConfig`.

Home (`apps/web/src/app/page.tsx`), Browse (`apps/web/src/app/browse/page.tsx`), and Add by RSS
(`apps/web/src/app/add-by-rss/page.tsx`) each do this once and pass that array to both
`resolveMediaListChip` and `chipsConfig.chips`:

```typescript
const chips = mediaListChipsForCatalog(SUBSCRIBED_CHIPS, getCatalogConfig().musicEnabled);
```

Use `BROWSE_CHIPS` or `ADD_BY_RSS_CHIPS` on the other two pages. Leave every `load*` call and
every `switch` case unchanged.

Recommendations (`apps/web/src/app/recommendations/page.tsx`) does the same with
`RECOMMENDATION_CHIPS`, then passes the filtered array to the client:

```typescript
return <RecommendationsPageClient chip={chip} urlChip={urlChip} chips={chips} />;
```

`RecommendationsPageClient` takes that `chips` prop and passes it to `MediaListChips`. Remove the
`RECOMMENDATION_CHIPS` import from the client. Do not change `reqAccountRecommendations`,
`showPath`, or the login and Taste Profile branches. The server never passes `albums` or
`artists` when Music is off, so those fetches do not run.

`MediaListChips` already renders `chipsConfig.chips`. No edit there.

## Shared files

Area E makes `/add-by-rss` not-found from `apps/web/src/app/add-by-rss/layout.tsx` (plan 50).
This plan edits `apps/web/src/app/add-by-rss/page.tsx` for the chip array only. Touch only that
array and, on Recommendations, the new `chips` prop. Leave every `load*` call unchanged. Do not
filter rows, do not add an allowlist argument, and do not call `notFound()` or `redirect()`.

## Tests

- `apps/web/src/utils/mediaListChips.test.ts`: Music on returns the same array for each of the
  four constants. Music off drops artists, albums, and tracks and keeps order:
  Subscribed is podcasts, episodes, clips, livestreams; Browse adds playlists and users; Add by
  RSS is podcasts, episodes, livestreams; Recommendations is podcasts. The existing test that
  the constants match mobile order stays.
- `apps/web/e2e/catalog-restricted-music-chips.spec.ts` (catalog-restricted lane from plan 11;
  do not add it to `makefiles/local/e2e-spec-order-web.txt`). The lane has Music off, Add by RSS
  off, and the allowlist on, and its stored-content spec already opens album, artist, and track
  pages. This spec does not open those pages and does not assert a not-found result. One
  `test.describe` "Music off media list chips". Signed out. Full sentences
  (**e2e-readability**). After each `goto`, assert the URL and one visible element. Chip row is
  `getByTestId('media-list-chips-items')`. A chip button is that row's
  `getByRole('button', { name, exact: true })`. Pressed means `aria-pressed="true"`.
  Screenshots use `capturePageLoad` from `./helpers/stepScreenshots`, and the locator passed in
  is the element the step checks.
  - "When Music is off, Home offers Podcasts, Episodes, Clips, and Livestreams." `goto('/')`,
    URL is `/`, the four buttons are visible in that order (`toHaveText` on the row's buttons),
    and Artists, Albums, and Tracks each have count 0.
  - "When Music is off, a Home URL that names Artists opens Podcasts." `goto('/?tab=artists')`,
    the path and query stay `/?tab=artists`, Podcasts is pressed, and Artists has count 0.
  - "When Music is off, Browse keeps Playlists and Users and drops the music chips."
    `goto('/browse')`, URL is `/browse`, the buttons are Podcasts, Episodes, Clips, Livestreams,
    Playlists, Users, and Artists has count 0.
  - "When Music is off, Recommendations offers Podcasts only." `goto('/recommendations')`, URL
    is `/recommendations`, the only chip button is Podcasts, and Albums and Artists have count 0.
    The signed-out login message stays; do not sign in.

Do not open `/add-by-rss` in this spec. On this lane that route is not-found for a different
setting.

## Release scratchpad

```markdown
## Music chips hidden when Music is off

- Surfaces: web
- Change: with `NEXT_PUBLIC_CATALOG_MUSIC_DISABLED=true`, Home, Browse, Recommendations, and
  Add by RSS no longer show Artists, Albums, or Tracks. Clips, Livestreams, Playlists, and Users
  stay. Opening a URL for a hidden chip shows Podcasts.
- Who notices: visitors on an instance with Music turned off
- Operator steps: none beyond the catalog setting from the catalog-settings plan
```
