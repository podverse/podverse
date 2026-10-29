**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 41 — Web generic search-detail component, Podcast Index as its first provider

Split `PodcastIndexFeedInfo` into a presentational `SearchDetail` component and a Podcast Index
provider adapter. The Podcast Index page looks and behaves exactly as it does today. Plan 42 adds
the Add by RSS path to the same component (R16).

The web provider search-detail route stays `/podcast-index/feed/<provider_feed_id>`
(`apps/web/src/app/podcast-index/feed/[podcast_index_id]/page.tsx`), built with
`buildIndexProviderFeedPath(index_provider, provider_feed_id)` from `@podverse/helpers`
(plan 40). Area E links stub rows there. Its server page (merge redirect, blocked-feed banner,
redirect to the channel once parsed) does not change.

## Rows

R15, R16, R18, R22

## Runs after

40

## Files

apps/web/src/components/SearchDetail/SearchDetail.tsx
apps/web/src/styles/components/SearchDetail/SearchDetail.module.scss
apps/web/src/components/PodcastIndex/PodcastIndexFeedInfo.tsx
apps/web/src/styles/components/PodcastIndex/PodcastIndexFeedInfo.module.scss

## `SearchDetail` — `apps/web/src/components/SearchDetail/SearchDetail.tsx` (new)

`'use client'`. Presentational only: no API calls, no routing, no provider types. Moves the JSX
of `PodcastIndexFeedInfo` (lines ~146–216 today) here unchanged in markup order: explanation, the
button row (primary action, then the RSS link button), the status line, the clickable image and
its `ImageLightboxModal`, the `h2` title, author, last-updated line, and description.

```ts
export type SearchDetailPrimaryAction = {
  label: string;
  icon: ReactNode;
  isLoading: boolean;
  onClick: () => void;
};

export type SearchDetailProps = {
  /** Sentence under the header explaining what the action does. */
  explanation: string;
  primaryAction: SearchDetailPrimaryAction;
  /** The feed URL for the RSS Link button; null hides the button. */
  rssHref: string | null;
  /** Shown with role="status" under the buttons (timed out, queued, and similar). */
  statusMessage: string | null;
  /** Shown with role="alert" under the buttons. */
  errorMessage: string | null;
  imageUrls: string[];
  imageLightboxUrls: string[];
  imageAlt: string;
  title: string;
  author: string | null;
  /** Already formatted for display, e.g. "Updated Mar 1, 2026". */
  updatedLabel: string | null;
  description: string | null;
};

export function SearchDetail(props: SearchDetailProps): JSX.Element;
```

- Keeps: `Button variant="primary"` with `isLoading` for the primary action; `Button
  variant="secondary"` with `href`, `target="_blank"`, `rel="noopener noreferrer"`, `FaRss` icon,
  and `tFeatures('add_feed.rss_link')` for the RSS link; the image button's
  `aria-label={tMisc('image_preview_dialog')}`, `SkeletonFlashImage` at
  `IMAGES.ADD_FEED.SQUARE.SIZE`, and `ImageLightboxModal` with the same props.
- No image block when `imageUrls` is empty (as today). No author, updated, or description
  line when the value is null or empty.
- `errorMessage` renders as `<p className={styles.errorMessage} role="alert">` right after the
  status line.
- Styles: move `apps/web/src/styles/components/PodcastIndex/PodcastIndexFeedInfo.module.scss` to
  `apps/web/src/styles/components/SearchDetail/SearchDetail.module.scss` (delete the old file).
  Rename the `addFeedButton` class to `primaryActionButton` and `pollTimedOut` to
  `statusMessage`; add `errorMessage` with the same spacing as `statusMessage` and the color of
  `.errorText` in `apps/web/src/styles/components/AddByRSS/AddByRSSAddFeed.module.scss` (same
  token, no `var()` fallback). Styles import last.

## Podcast Index adapter — `PodcastIndexFeedInfo.tsx`

Keep the file, the export name, and the `podcastIndexFeed: PodcastByIdFeed` prop, so
`PodcastIndexFeedClient` does not change. Everything that is not markup stays here: the add
click (login-required modal, `reqMQRSSAddOnDemand`, rate-limit and membership-gate handling with
`featureContext: 'directory_add_by_rss'`), polling `reqChannelGetByPodcastIndexId` until
`DIRECTORY_ADD_POLL_TIMEOUT_MS`, the redirect by medium, and cleanup on unmount.

It renders:

```tsx
<SearchDetail
  explanation={tFeatures('add_feed.add_feed_explanation')}
  primaryAction={{
    label: tFeatures('add_feed.add_feed'),
    icon: <FaCirclePlus />,
    isLoading,
    onClick: addFeedOnClick,
  }}
  rssHref={podcastIndexFeed.url || null}
  statusMessage={pollTimedOut ? tFeatures('add_feed.add_feed_timed_out') : null}
  errorMessage={null}
  imageUrls={feedImageCandidates}
  imageLightboxUrls={feedImageLightboxCandidates}
  imageAlt={podcastIndexFeed.title || tMedia('podcast.podcast_image')}
  title={podcastIndexFeed.title}
  author={podcastIndexFeed.author || null}
  updatedLabel={lastUpdateTime ? tMedia('updated_with_date', { date: formatDateAbbrev(lastUpdateTime, locale) }) : null}
  description={podcastIndexFeed.description || null}
/>
```

Icon styling: `SearchDetail` wraps `primaryAction.icon` in `<span className={styles.buttonIcon} aria-hidden="true">`,
and the RSS icon the same way, so callers pass a bare icon. The adapter no longer imports a
style module.

The existing `alert('Error performing action.')` stays as it is; this plan changes no behavior.

## What stays true

- `/podcast-index/feed/<id>`: same text, buttons, accessible names ("Add Feed", "RSS Link"),
  heading levels, lightbox, blocked banner, and redirect after add.
- `SearchDetail` knows nothing about Podcast Index, so a second provider is a new adapter beside
  `PodcastIndexFeedInfo` plus a case in `buildIndexProviderFeedPath` (R18).

## Tests

No new spec; behavior is unchanged. These existing specs cover the page and must keep passing
without edits: `apps/web/e2e/podcast-index-feed-add-trial-blocked.spec.ts`,
`apps/web/e2e/header-image-lightbox.spec.ts` (Podcast Index feed lightbox), and
`apps/web/e2e/artist-page-albums-and-tracks.spec.ts` (opens a Not Yet Added album's preview).
Plan 42 adds the spec for the shared component's second path.

## Release scratchpad

None: a refactor with no behavior change.
