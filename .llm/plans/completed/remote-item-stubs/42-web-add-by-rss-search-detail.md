**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 42 — Web Add by RSS search-detail page

A new page for a remote feed the index provider does not know: minimal information (the
reference's title, else the feed URL, plus the feed URL itself) and an **Add by RSS** action
(R36). It renders the `SearchDetail` component from plan 41, so the provider path and the Add by
RSS path share one component (R16). The action reuses the Add by RSS add page's follow, parse,
and redirect logic, extracted into a hook so both pages run the same code.

Route: `/add-by-rss/remote-feed?feed_url=<encoded url>&title=<optional encoded title>`, built
with `buildAddByRSSRemoteFeedPath({ feedUrl, title })`. Plan 45 links to it.

## Rows

R14, R15, R16, R22, R36

## Runs after

40, 41

## Files

apps/web/src/constants/routes.ts
apps/web/src/utils/addByRSS/remoteFeedPath.ts
apps/web/src/utils/addByRSS/remoteFeedPath.test.ts
apps/web/src/hooks/useAddByRSSAddFeedFlow.ts
apps/web/src/app/add-by-rss/add/AddByRSSAddFeedPageClient.tsx
apps/web/src/app/add-by-rss/remote-feed/page.tsx
apps/web/src/app/add-by-rss/remote-feed/AddByRSSRemoteFeedPageClient.tsx
apps/web/e2e/add-by-rss-remote-feed.spec.ts
release-notes/scratchpad.md

## Route and builder

- `apps/web/src/constants/routes.ts`: `ADD_BY_RSS_REMOTE_FEED: '/add-by-rss/remote-feed',` after
  `ADD_BY_RSS_CREDENTIALS`.
- `apps/web/src/utils/addByRSS/remoteFeedPath.ts` (new):

  ```ts
  export const ADD_BY_RSS_REMOTE_FEED_TITLE_MAX_LENGTH = 256;

  export const buildAddByRSSRemoteFeedPath = (input: {
    feedUrl: string;
    title: string | null;
  }): string => {
    const params = new URLSearchParams({ feed_url: input.feedUrl });
    const title = input.title?.trim() ?? '';
    if (title !== '') {
      params.set('title', title.slice(0, ADD_BY_RSS_REMOTE_FEED_TITLE_MAX_LENGTH));
    }
    return `${ROUTES.ADD_BY_RSS_REMOTE_FEED}?${params.toString()}`;
  };
  ```

- `remoteFeedPath.test.ts`: URL only; URL and title; a blank title is left out; a long title is
  cut to 256 characters; the URL round-trips through `URLSearchParams` unchanged.

`/add-by-rss/**` is already `noindex` (`routeSeoPolicy.ts` and `app/add-by-rss/layout.tsx`); no
SEO change.

## Add flow hook — `apps/web/src/hooks/useAddByRSSAddFeedFlow.ts` (new)

Move out of `AddByRSSAddFeedPageClient.tsx`, unchanged in behavior: the `status`,
`statusMessage`, `inputError`, `statusError`, and `isAddingFeed` state; `statusLabel`;
`runParseAndRedirect`; and the body of `handleAddFeed` from `setIsAddingFeed(true)` through the
`finally` (credential resolution with `resolveAddByRSSFeedUrlCredentials`, invalid URL,
`followAddByRSSChannelAndQueue`, `setLoggedInAccount`, the `ConstraintError` existing-feed branch,
membership gate, rate-limit message). `isCredentialsFailure` moves with it.

```ts
export type AddByRSSAddFeedInput = {
  rawFeedUrl: string;
  /** Both set, or both null. */
  username: string | null;
  password: string | null;
  /** Shown in the library until the parse lands; the feed URL when null. */
  title: string | null;
};

export function useAddByRSSAddFeedFlow(): {
  /** Opens the login modal and returns when signed out. `onFollowed` runs once the follow is saved. */
  addFeed: (input: AddByRSSAddFeedInput, options?: { onFollowed?: () => void }) => Promise<void>;
  inputError: string | null;
  isAddingFeed: boolean;
  status: AddByRSSStatus;
  statusError: string | null;
  statusLabel: string | null;
  statusMessage: string | null;
};
```

- `addFeed` starts with the `isAddingFeed` guard and the signed-out
  `setModalAuthLogin({ isOpen: true })` branch from `handleAddFeed`.
- `followAddByRSSChannelAndQueue` gets `title: input.title?.trim() || feedUrl` (today it is
  always `feedUrl`; the add page passes `title: null`, so the add page is unchanged).
- `AddByRSSAddFeedPageClient.tsx` keeps its form state (URL input, paste-to-credentials split,
  Basic Auth toggle and fields, `canSubmit`, the "both required" check) and calls
  `addFeed({ rawFeedUrl: newFeedUrl.trim(), username, password, title: null }, { onFollowed: clearBasicAuthFields })`,
  where `clearBasicAuthFields` is today's password and toggle reset after the follow. It renders
  the hook's values where it renders the local state today.

## Page — `apps/web/src/app/add-by-rss/remote-feed/page.tsx` (new)

Server component, shaped like `app/add-by-rss/[resource]/[id_text]/page.tsx`:

```ts
type AddByRSSRemoteFeedPageProps = {
  searchParams: Promise<{ feed_url?: string | string[]; title?: string | string[] }>;
};
```

Take the first value of each param. `feedUrl` trimmed; `isValidHttpUrl(feedUrl)` from
`@podverse/helpers-validation` is not `true` → `notFound()`. `title` trimmed and cut to
`ADD_BY_RSS_REMOTE_FEED_TITLE_MAX_LENGTH`, or null. Render
`<AddByRSSRemoteFeedPageClient feedUrl={feedUrl} title={title} />`. No API call on the server.

## Client — `AddByRSSRemoteFeedPageClient.tsx` (new)

`'use client'`. Layout like the add page: `MainHeader title={tFeatures('add_by_rss.label')}`,
`MainWrapper`, `MainSidebarLayout`, `SideContent`, `MainColumnStack`, then `SearchDetail`:

| Prop | Value |
| --- | --- |
| `explanation` | `tFeatures('add_by_rss.remote_feed_explanation')` |
| `primaryAction` | label `tFeatures('add_by_rss.label')`, icon `<FaCirclePlus />`, `isLoading: isAddingFeed`, `onClick: () => void addFeed({ rawFeedUrl: feedUrl, username: null, password: null, title })` |
| `rssHref` | `feedUrl` |
| `statusMessage` | `statusMessage ?? statusLabel` |
| `errorMessage` | `statusError ?? inputError` |
| `imageUrls`, `imageLightboxUrls` | `[]` |
| `imageAlt` | `tMedia('podcast.podcast_image')` |
| `title` | `title ?? feedUrl` |
| `author`, `updatedLabel` | `null` |
| `description` | `feedUrl` when `title` is set (so the URL is always visible), else `null` |

On mount, `getAddByRSSFeedByUrl(feedUrl)` from `apps/web/src/utils/addByRSS/storage`; when it
returns a record with a parsed status (`isParsedStatus`, the same check the add page uses),
`router.replace` to `/add-by-rss/${getAddByRSSDetailRouteSegment(resourceType)}/${record.idText}`
with the resource type resolved the way the add page's existing-feed branch does. This mirrors the
provider page, which redirects to the channel once it is parsed.

A feed that needs a username and password fails its first parse on credentials, and the hook
sends the user to the credentials page, as on the add page. This page has no credential fields.

## Copy

All keys come from plan 40 (`features.add_by_rss.remote_feed_explanation`) or exist already
(`features.add_by_rss.label`, `features.add_feed.rss_link`, `media.podcast.podcast_image`).

## Tests

`apps/web/e2e/add-by-rss-remote-feed.spec.ts` (new), written per **e2e-readability**, using the
signed-in setup of `apps/web/e2e/add-by-rss-auto-parse.spec.ts` and the parse fixtures in
`apps/api/src/controllers/account/accountAddByRSSParse.ts` (an unknown URL parses as
`E2E_DEFAULT_PARSED_FEED`):

1. Signed in, open `buildAddByRSSRemoteFeedPath({ feedUrl: 'https://e2e-seed-addbyrss.example/remote-feed-page.xml', title: 'E2E Remote Feed' })`.
   The heading "E2E Remote Feed", the explanation, the feed URL, and an "RSS Link" link with that
   `href` are visible. Capture the verified heading.
2. Press **Add by RSS**. The page goes to `/add-by-rss/podcast/<idText>` and shows the fixture
   channel title `E2E Add-by-RSS Channel`.
3. Open the same remote-feed URL again: it redirects to the same Add by RSS detail page.
4. Signed out, open the page and press **Add by RSS**: the login modal opens.
5. `/add-by-rss/remote-feed` with no `feed_url`, and with `feed_url=not-a-url`, shows the
   not-found page.

Register the spec in the full-report order per **e2e-report-order**, beside the other
`add-by-rss-*` specs. The existing add page specs (`add-by-rss-auto-parse.spec.ts`,
`add-by-rss-credentials-add.spec.ts`, `add-by-rss-credentials-rejected.spec.ts`) cover the hook
extraction and must keep passing.

## Release scratchpad

```markdown
## Add by RSS search detail for feeds the index does not know

- Surfaces: web
- Change: new page `/add-by-rss/remote-feed?feed_url=…&title=…` shows a remote feed that the
  index provider does not know, with its title (or URL), an RSS Link button, and an Add by RSS
  button that follows and parses it the same way the Add by RSS add page does, then opens it.
  It uses the same layout component as the Podcast Index feed page. Opening it for a feed already
  in the browser's Add by RSS library goes straight to that feed.
- Who notices: web listeners who click a podroll entry in an Add by RSS feed that Podcast Index
  does not list
- Operator steps: none
```
