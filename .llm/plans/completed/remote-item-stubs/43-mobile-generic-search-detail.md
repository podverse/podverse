**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 43 — Mobile generic search-detail view, Podcast Index as its first provider

Extract the loaded-state layout of `PodcastIndexFeedPreviewScreen` into a shared
`SearchDetailView`, so plan 44's Add by RSS remote feed screen renders the same component (R16).
Make the provider screen a dependable click target for stub rows (area F): an index provider
param, one params builder, a background refresh when opened from a list row, and a redirect to
the channel when the feed is already parsed (the web page does this on the server).

## Provider search-detail contract (areas E and F)

- **Screen:** `PodcastIndexFeedPreviewScreen`, route name `SearchResultDetail`
  (`CHANNEL_BROWSE_STACK_ROUTES.SearchResultDetail`). It is already registered on the Home,
  Search, Library, and Browse stacks; navigate on the current tab's stack
  (`navigation.navigate(CHANNEL_BROWSE_STACK_ROUTES.SearchResultDetail, params)`). Deep link
  `search/result/:resultId` is unchanged.
- **Params:** `SearchResultDetailParams` in `apps/mobile/src/navigation/index.tsx`:

  ```ts
  export type SearchResultDetailParams = {
    /** Provider feed id (Podcast Index feed id today; also the deep link's `resultId`). */
    resultId: string;
    /** Which index provider `resultId` belongs to. Omitted means 'podcast_index'. */
    indexProvider?: IndexProviderId;
    author?: string;
    /** Omitted when the caller has none (a stub); the screen then refreshes from the provider. */
    description?: string;
    feedUrl?: string;
    imageUrl?: string | null;
    title?: string;
  };
  ```

- **Builder:** `buildSearchResultDetailParams(target: DTOIndexProviderFeedTarget): SearchResultDetailParams`,
  exported from `apps/mobile/src/navigation/index.tsx` (defined in
  `apps/mobile/src/navigation/searchResultDetailParams.ts`). A `DTORemoteChannelStub` is a
  `DTOIndexProviderFeedTarget`, so a channel stub row passes the stub, and an item stub row passes
  `itemStub.channel_stub`.
- **Web equivalent:** `buildIndexProviderFeedPath(index_provider, provider_feed_id)` →
  `/podcast-index/feed/<provider_feed_id>` (plans 40, 41).

## Rows

R15, R16, R18, R22

## Runs after

40

## Files

apps/mobile/src/components/searchDetail/SearchDetailView.tsx
apps/mobile/src/screens/search/PodcastIndexFeedPreviewScreen.tsx
apps/mobile/src/screens/search/podcastIndexFeedPreview.ts
apps/mobile/src/screens/search/podcastIndexFeedPreview.test.ts
apps/mobile/src/navigation/searchResultDetailParams.ts
apps/mobile/src/navigation/searchResultDetailParams.test.ts
apps/mobile/src/navigation/index.tsx
release-notes/scratchpad.md

## `SearchDetailView` — `apps/mobile/src/components/searchDetail/SearchDetailView.tsx` (new)

Presentational. Moves the loaded-state JSX of `PodcastIndexFeedPreviewScreen` (the `ScrollView`
from line ~391 to its end) and the styles it uses (`author`, `content`, `description`, `image`,
`message`, `title`) here unchanged. No API, navigation, or provider types.

```ts
export type SearchDetailViewTestIDs = {
  scroll: string;
  image: string;
  helper: string;
  actionButton: string;
  progress: string;
  error: string;
  notice: string;
};

export type SearchDetailViewProps = {
  title: string;
  author: string | null;
  description: string | null;
  /** null renders the CoverImage placeholder, as today. */
  imageUrl: string | null;
  helperMessage: string;
  primaryAction: { label: string; loading: boolean; onPress: () => void };
  /** Shown under the button while the action runs. */
  progressMessage: string | null;
  errorMessage: string | null;
  noticeMessage: string | null;
  testIDs: SearchDetailViewTestIDs;
};
```

Order and primitives stay as today: `CoverImage` (`decodeEdge={PREVIEW_IDENTITY_ARTWORK_EDGE}`,
`accessibilityLabel={title}`), title (`typography.display`), author, description, `HelperNote
scale="reading"`, `Button fullWidth size="form"`, then the progress, error, and notice lines,
then `BottomChromeScrollSpacer`. It calls `useBottomChromeScrollIndicatorInsets()` itself.
No barrel file: callers import `../../components/searchDetail/SearchDetailView`, the way
`components/feedback/HelperNote` is imported.

## `PodcastIndexFeedPreviewScreen.tsx`

Keeps its root `View` (`testID="pi-feed-preview-screen"`), the offline, loading, and not-found
states, the add flow, and `replaceWithSearchChannelDetail`. The loaded state becomes:

```tsx
<View style={styles.container} testID="pi-feed-preview-screen">
  <SearchDetailView
    title={feed.title}
    author={feed.author.length > 0 ? feed.author : null}
    description={feed.description.length > 0 ? feed.description : null}
    imageUrl={feed.imageUrl}
    helperMessage={t('features.search.not_available_yet')}
    primaryAction={{ label: t('features.search.add_podcast'), loading: isAdding, onPress: () => { void handleAddPress(); } }}
    progressMessage={isAdding ? t('features.search.adding') : null}
    errorMessage={addErrorKey !== null ? t(addErrorKey) : null}
    noticeMessage={addNoticeKey !== null ? t(addNoticeKey) : null}
    testIDs={{
      scroll: 'search-result-detail-screen',
      image: 'pi-feed-preview-image',
      helper: 'pi-feed-preview-helper',
      actionButton: 'pi-feed-add-button',
      progress: 'pi-feed-adding',
      error: 'pi-feed-add-error',
      notice: 'pi-feed-add-notice',
    }}
  />
</View>
```

Every existing testID keeps its value, so `apps/mobile/e2e/search-unparsed.yaml` and the
artist flow's Not Yet Added album step keep passing.

### Provider param

`const indexProvider = route.params.indexProvider ?? 'podcast_index';`. The provider-specific
calls (`reqPodcastIndexFeedById`, `reqMQRSSAddOnDemand`, `reqChannelGetByPodcastIndexId`) sit
behind an exhaustive `switch (indexProvider)` with one `'podcast_index'` case and a `never`
default, in one place: a module-level `providerApi(indexProvider)` returning
`{ fetchFeed, enqueueAdd, fetchParsedChannel }` closures over the `ApiRequestService`. A second
provider adds a case there (R18).

### Refresh when opened from a list row

A seeded open (params have `feedUrl` and `title`) still paints from params at once. When
`route.params.description === undefined` (stub rows pass none), the hydrate effect also runs once
in the background and replaces the seeded fields with the provider's. Rules, in
`podcastIndexFeedPreview.ts` as a pure helper so they are unit-tested:

```ts
/** True when the screen should fetch the provider feed: nothing seeded, or seeded without a description. */
export const shouldFetchProviderFeed = (params: {
  hasSeed: boolean;
  description: string | undefined;
}): boolean => !params.hasSeed || params.description === undefined;
```

- Only the unseeded case shows `ListLoading` and the `errors.generic` failure state. A failed
  background refresh keeps the seeded content and shows nothing.
- Guard with a `hasFetchedRef` so the effect runs once per mount (it depends on `feed`).
- Offline Mode skips the fetch, as today.

### Already parsed

On mount, when online, call `fetchParsedChannel(resultId)` once, in parallel with the hydrate.
`isParsedReadyChannel(channel)` → `replaceWithSearchChannelDetail(navigation, channel.medium_id, channel.id_text, { imageUrl, title })`
using the seeded or fetched feed's image and title (empty title when neither has arrived). A
failed check is ignored. The Search tab already does this check before navigating; stub rows do
not, and a stub's feed can be parsed after the row was cached on the device.

## Params builder — `apps/mobile/src/navigation/searchResultDetailParams.ts` (new)

```ts
import type { DTOIndexProviderFeedTarget } from '@podverse/helpers';

export const buildSearchResultDetailParams = (
  target: DTOIndexProviderFeedTarget
): SearchResultDetailParams => ({
  ...(target.author !== null && target.author.length > 0 ? { author: target.author } : {}),
  feedUrl: target.feed_url,
  imageUrl: target.image_url,
  indexProvider: target.index_provider,
  resultId: target.provider_feed_id,
  ...(target.title !== null && target.title.length > 0 ? { title: target.title } : {}),
});
```

Type-only imports from the `@podverse/helpers` barrel are fine on mobile (erased at build; other
screens do it).

Move `SearchResultDetailParams` out of `apps/mobile/src/navigation/index.tsx` (lines ~518–527)
into this file, with `indexProvider?: IndexProviderId` and the doc comments above, the same way
`PodcastDetailRouteParams` lives in `podcastDetailParams.ts`. In `index.tsx`, import both the type
and the builder from `./searchResultDetailParams`, keep `export type { SearchResultDetailParams }`
so every current import still works, and re-export `buildSearchResultDetailParams` beside
`export { buildPodcastDetailParams };` (line ~513). Update
the `SearchResultDetail` comment in `CHANNEL_BROWSE_STACK_ROUTES` to "Provider search detail for
an unparsed feed (Search results and remote stub rows)."

## Reuse

- `isParsedReadyChannel`, `pollUntilParsedReadyChannel`, `replaceWithSearchChannelDetail` as they
  are.
- `DTOIndexProviderFeedTarget` from plan 40, the same type the web builder takes.

## Tests

- `searchResultDetailParams.test.ts` (new): a full target maps every field; null `title` and
  `author` are omitted; `imageUrl: null` is kept; `description` is never set.
- `podcastIndexFeedPreview.test.ts` (existing; add cases): `shouldFetchProviderFeed` is true with
  no seed, true with a seed and no description, false with a seed and a description (including
  an empty string).
- Maestro: `apps/mobile/e2e/search-unparsed.yaml` covers the Podcast Index path unchanged; no new
  flow (plan 44 adds one for the shared view's second path).

## Release scratchpad

```markdown
## Mobile Podcast Index preview opens the podcast when it is already added

- Surfaces: mobile
- Change: the Podcast Index preview (Search Result screen) now replaces itself with the podcast,
  album, or artist screen when the feed is already fully parsed, and refreshes its description
  from Podcast Index when it was opened from a list row that had none. The screen layout moved
  into a shared component the Add by RSS remote feed screen also uses; it looks the same.
- Who notices: mobile listeners opening not-yet-added feeds from podroll or album lists
- Operator steps: none
```
