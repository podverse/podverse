**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 24 — Web Search lists stored titles while the allowlist is set

With the web catalog allowlist set, `/search` calls plan 23's `GET /channel/search/title`
instead of the Podcast Index search. It lists stored shows in the API's order and pages
through them with the existing `Pagination` control. Rows open the show page, and nothing on
them offers to add a feed (R59). With the allowlist unset, Search is unchanged and still asks
the Podcast Index (R58).

Reuse: `reqChannelSearchByTitle` (plan 23), `useConfig().public.catalog` (plan 10),
`getTotalPages` from `@podverse/helpers`, `Pagination`
(`apps/web/src/components/Pagination/Pagination.tsx`), `CommonPodcastListNodes`
(`apps/web/src/components/Common/Podcast/CommonPodcastNodes.tsx`),
`podcastListItemFromChannel` (`apps/web/src/utils/subscribed/channelListItems.ts`),
`getChannelPath` (`apps/web/src/utils/redirect/redirectToChannelPageByMedium.ts`),
`scrollMainToTop` (`apps/web/src/utils/scroll.ts`), and `NoResults`. The paged list follows
`CorePodcasts` (`apps/web/src/components/Core/Podcast/CorePodcasts.tsx`), the source for
`Pagination` around `CommonPodcastListNodes` and its `paginationControlsClassName`.

## Rows

R56, R58, R59

## Runs after

10, 11, 23

## Files

- apps/web/src/app/search/SearchPageContext.tsx
- apps/web/src/app/search/SearchPageList.tsx
- apps/web/e2e/catalog-restricted-search.spec.ts
- release-notes/scratchpad.md

## Settled decisions

- **Which search.** `isCatalogSearch = useConfig().public.catalog.podcastIndexIdAllowlist !== null`.
  When it is true, the page never calls `reqPodcastIndexSearchPodcasts`, not even as a
  fallback. On a failed request it logs with `console.error`, as the existing path does, and
  shows no results. The web and API settings come from one source (plan 13), so the endpoint
  answers whenever the web has the allowlist.
- **Medium.** Pass `searchParams.medium` (`all` or `music`) as is. The API maps `all` to
  podcasts and videos and `music` to music. With Music off, plan 41 resolves the medium to
  `all` and hides the Music facet, so this plan needs no Music check (R17).
- **Paging.** Page 1 on every new term or facet. The `Pagination` control changes the page and
  scrolls the main area to the top, as `CorePodcasts` does. `totalPages` comes from
  `getTotalPages(meta.count, meta.limit, data.length, page)`; the endpoint returns a real count.
- **Rows.** `CommonPodcastListNodes` in `rows` view. Each item is
  `podcastListItemFromChannel(channel, null)` with `href` replaced by `getChannelPath(channel)`,
  so an album or artist (Music on) opens its own route. No row links to
  `/podcast-index/feed/…` (R59).
- **Stale responses.** A request id ref (`catalogRequestIdRef`) drops a catalog response that
  a newer term, facet, or page superseded (**input-rate-control**). Every run bumps it,
  including a run for an empty term. The Podcast Index branch keeps its current behavior.
- **Plan 41 shares the folder, not the files.** Plan 41 edits `search/page.tsx` and
  `SearchPageListHeader.tsx`; this plan edits `SearchPageContext.tsx` and `SearchPageList.tsx`.
  `setSearchParams` keeps its name and signature, so the header needs no change. The two plans
  can run in either order or together.

## `apps/web/src/app/search/SearchPageContext.tsx`

Tier B: extensionless relative imports, separate `import type` lines, no `as`.

- Imports: add `useCallback` and `useRef` to the React import. Add `DTOChannel` to the
  `@podverse/helpers` type import, and `getTotalPages` to its value import. Add
  `import { useConfig } from '../../contexts/Config';`.
- `SearchPageContextType` gains:

```typescript
  isCatalogSearch: boolean;
  catalogChannels: DTOChannel[];
  catalogPage: number;
  setCatalogPage: (page: number) => void;
  catalogTotalPages: number;
```

- In the provider, rename the `useState` setter for `searchParams` to `setSearchParamsState`
  and add:

```typescript
  const isCatalogSearch = useConfig().public.catalog.podcastIndexIdAllowlist !== null;
  const [catalogChannels, setCatalogChannels] = useState<DTOChannel[]>([]);
  const [catalogPage, setCatalogPage] = useState<number>(1);
  const [catalogTotalPages, setCatalogTotalPages] = useState<number>(1);
  const catalogRequestIdRef = useRef(0);

  const setSearchParams = useCallback((params: SearchPageParams) => {
    setSearchParamsState(params);
    setCatalogPage(1);
  }, []);
```

- Replace the effect body with this. The Podcast Index `try`/`catch` is the current one,
  unchanged.

```typescript
  useSkipInitialEffect(() => {
    async function fetchSearchResults() {
      catalogRequestIdRef.current += 1;
      const requestId = catalogRequestIdRef.current;
      const trimmedQ = searchParams.q.trim();
      setIsLoading(true);
      if (!trimmedQ) {
        setSearchResultFeeds([]);
        setCatalogChannels([]);
        setCatalogTotalPages(1);
      } else if (isCatalogSearch) {
        try {
          const response = await apiRequestService.reqChannelSearchByTitle({
            q: trimmedQ,
            medium: searchParams.medium,
            page: catalogPage,
          });
          if (requestId !== catalogRequestIdRef.current) {
            return;
          }
          setCatalogChannels(response.data);
          setCatalogTotalPages(
            getTotalPages(response.meta.count, response.meta.limit, response.data.length, catalogPage)
          );
        } catch (error) {
          if (requestId !== catalogRequestIdRef.current) {
            return;
          }
          console.error('Error fetching catalog search results:', error);
          setCatalogChannels([]);
          setCatalogTotalPages(1);
        }
      } else {
        try {
          const response = await apiRequestService.reqPodcastIndexSearchPodcasts({
            medium: searchParams.medium,
            q: trimmedQ,
          });
          setSearchResultFeeds(response.feeds);
        } catch (error) {
          console.error('Error fetching search results:', error);
          setSearchResultFeeds([]);
        }
      }
      setIsLoading(false);
    }
    fetchSearchResults();
  }, [searchParams, catalogPage]);
```

- Add `isCatalogSearch`, `catalogChannels`, `catalogPage`, `setCatalogPage`, and
  `catalogTotalPages` to the provider `value`. `setSearchParams` in `value` is the new
  `useCallback` wrapper. Leave `useSortPref` as it is; it keeps remembering the facet only,
  never the term or page (**filter-sort-persistence**).

## `apps/web/src/app/search/SearchPageList.tsx`

```tsx
export const SearchPageList: React.FC = () => {
  const {
    catalogChannels,
    catalogPage,
    catalogTotalPages,
    isCatalogSearch,
    isLoading,
    searchParams,
    searchResultFeeds,
    setCatalogPage,
  } = useSearchPageContext();
  const resultCount = isCatalogSearch ? catalogChannels.length : searchResultFeeds.length;
  const showEmpty = !isLoading && searchParams.q.trim() !== '' && resultCount === 0;

  const handleCatalogPage = (page: number) => {
    setCatalogPage(page);
    scrollMainToTop();
  };

  let results: React.ReactNode = null;
  if (showEmpty) {
    results = <NoResults role="status" />;
  } else if (!isCatalogSearch) {
    results = <ListSearchResultsPodcastIndexFeeds searchResultPodcastIndexFeeds={searchResultFeeds} />;
  } else if (catalogChannels.length > 0) {
    results = (
      <Pagination
        currentPage={catalogPage}
        totalPages={catalogTotalPages}
        setPage={handleCatalogPage}
        paginationControlsClassName={styles.paginationControls}
      >
        <CommonPodcastListNodes
          items={catalogChannels.map((channel) => ({
            ...podcastListItemFromChannel(channel, null),
            href: getChannelPath(channel),
          }))}
          viewSelected="rows"
        />
      </Pagination>
    );
  }

  return (
    <>
      {results}
      <WebLoadingSpinnerOverlay isLoading={isLoading} />
    </>
  );
};
```

Imports, at this file's depth:
`../../components/Common/Podcast/CommonPodcastNodes`, `../../components/Pagination/Pagination`,
`../../utils/subscribed/channelListItems`, `../../utils/redirect/redirectToChannelPageByMedium`,
and `../../utils/scroll`. Put the styles import last (**styles-import-last**):
`import styles from '../../styles/components/Common/List/Podcasts/ListPodcasts.module.scss';`.
No new user-facing strings; `Pagination` and `NoResults` already localize theirs.

## Tests

- New Playwright spec `apps/web/e2e/catalog-restricted-search.spec.ts`, on plan 11's
  catalog-restricted lane only. Do not add it to `makefiles/local/e2e-spec-order-web.txt`.
  Copy the field locator and `capturePageLoad` / `actionAndCapture` style of
  `apps/web/e2e/search-page.spec.ts`. Do not assert the facet chips; plan 41 owns them.
  Top-level `test.describe('Catalog-restricted search')`. Each test does `goto('/search')`,
  checks the URL, and uses `page.getByLabel('Search by Title...')`.
  - "When the allowlist is set, searching a stored show that is off the list finds it and opens
    its show page." Fill `EMBED_SAMPLE_PODCAST_CHANNEL_TITLE` ("Cosmos Classroom"). The link
    `page.getByRole('link').filter({ hasText: EMBED_SAMPLE_PODCAST_CHANNEL_TITLE })` is
    visible with `href` `/podcast/${E2E_CATALOG_OFF_LIST_PODCAST_CHANNEL_ID_TEXT}`, and
    `page.locator('a[href^="/podcast-index/feed/"]')` has count 0 (R56, R59). Capture with
    the link.
  - "When the allowlist is set, searching an allowlisted show's title opens its show page."
    Fill `E2E Podcast Seed`. The link with text `E2E_PODCAST_CHANNEL_TITLE` has `href`
    `/podcast/${E2E_PODCAST_CHANNEL_ID_TEXT}`.
  - "When the allowlist is set, Search does not ask the Podcast Index." Fill
    `unparsedfixture`. `page.getByText('No Results Found')` is visible and
    `page.getByText('E2E Unparsed Podcast Index Feed')` has count 0 (R56).
  - "When Music is off, searching a music album's title finds nothing." Fill
    `E2E_MUSIC_ALBUM_TITLE`. `No Results Found` is visible (R17 with plan 41; the All facet
    never searches music).

  Import the title and id constants from `./helpers/seedConstants` and
  `E2E_CATALOG_OFF_LIST_PODCAST_CHANNEL_ID_TEXT` from `./helpers/catalogRestricted`. Ordering
  and paging are proven by plan 23's API integration test, not here.
- The default lane's `apps/web/e2e/search-page.spec.ts` is unchanged and keeps proving the
  Podcast Index search with the allowlist unset (R58).
- No unit test: the new logic is request wiring and rendering; ordering and paging live in the
  API (**unit-test-design-no-overgranularity**).

## Release scratchpad

```markdown
## Search lists stored shows on instances with a Podcast Index id allowlist (web)

- Surfaces: web
- Change: with `NEXT_PUBLIC_CATALOG_PODCAST_INDEX_ID_ALLOWLIST` set, the Search page no longer queries the Podcast Index. It matches the typed term against the titles of every show already stored on the instance, including stored shows off the list. Titles that start with the term come first, then the newest. Results are paged, and each row opens the show page; no result offers to add a feed. With the allowlist blank, Search is unchanged.
- Who notices: visitors to an instance that sets the allowlist
- Operator steps: none (keep the web and API catalog settings equal, as the shared config already does)
```
