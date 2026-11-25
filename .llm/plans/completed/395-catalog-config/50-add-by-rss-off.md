**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 50 — Add by RSS off on web

When `catalog.addByRSSEnabled` is false, the web app offers no way to add an Add by RSS feed,
and every URL under `/add-by-rss` is the existing not-found page. Saved Add by RSS rows still
show on Home, queue, history, and playlist pages, and keep the remove they already have. A
playing Add by RSS item keeps playing; its title in the full-size player is plain text, and
artist links into `/add-by-rss` are omitted. Background refresh and first parses stop, because
the API refuses parse requests while the switch is off (plan 51).

When the flag is true (the key blank or `false`), every screen in this plan stays as it is today.

The API refusals are plan 51. OPML import is plan 52. The Podcast Index Add Feed button is step
08's.

## Rows

R22, R23, R72, R74, R75, R76

## Runs after

11

## Files

- apps/web/src/app/add-by-rss/layout.tsx
- apps/web/src/components/SideBar/SideBar.tsx
- apps/web/src/providers/AddByRSSBackgroundRefresh.tsx
- apps/web/src/hooks/useReadyAddByRSSFeeds.ts
- apps/web/src/hooks/useAddByRSSMetadataUpgrade.ts
- apps/web/src/utils/addByRSS/publisherLinks.ts
- apps/web/src/utils/addByRSS/publisherLinks.test.ts
- apps/web/src/hooks/useDeviceArtistLinks.ts
- apps/web/src/components/MediaPlayer/Modal/MediaPlayerInfoModal.tsx
- apps/web/e2e/catalog-restricted-add-by-rss.spec.ts
- release-notes/scratchpad.md

## Settled decisions

Transcribe these. Do not reopen them.

- Read the flag the way plan 10 specifies. Server code calls `getCatalogConfig()` inside the
  function. Client code calls `useConfig().public.catalog.addByRSSEnabled`, with `useConfig`
  from `../contexts/Config` (relative depth per file). Do not add a wrapper on
  `catalogPolicy.ts`, and do not read the flag at module scope.
- The not-found result is `notFound()` from `next/navigation` in the Add by RSS layout, so one
  check covers the library, add, credentials, remote feed, and every nested route. Do not add a
  `not-found.tsx`, and do not call `notFound()` again in each page.
- Do not edit `apps/web/src/app/add-by-rss/page.tsx`. Area D filters chips on that page for when
  Add by RSS is on and Music is off. The layout returns not-found before that page renders.
- Do not edit `apps/web/ENV.md`. Plan 10 already describes this behavior.
- Saved rows show. Do not touch the subscribed list pages (`_media-lists/**/…PageList.tsx`), the
  artist page Add by RSS sections, or the queue, history, and playlist list and row components.
  Their Add by RSS rows render as today, and queue and playlist rows keep Remove in edit mode.
  Web Home rows have no remove today (unfollow lives on the `/add-by-rss` pages); that does not
  change.
- Row links stay as they are. A saved podcast, artist, album, episode, or track row whose link
  points into `/add-by-rss`, and the playlist row's Go to Track item, open the not-found page.
  Queue rows play on click and have no such link.
- Turning the flag on does not unfollow, does not clear IndexedDB, and does not delete queue or
  playlist rows. Turning it back off shows the same library.
- The follow-stub sync (`syncAddByRSSFollowStubs`) keeps running. It reads the followed list,
  which the API keeps open, so a feed followed on another device still shows as a saved row.
  Only the parse requests stop.
- Do not change `getMediaPlayerInfoResolution` or `resolveRemotePlayerInfo`. The full-size
  player is the only place `itemLinkUrl` renders as a link, and
  `channelLinkUrl` is already `''` for Add by RSS, so the plain title is decided in
  `MediaPlayerInfoModal.tsx`.
- Artist links: only links whose href is under `/add-by-rss/artist/` are dropped. A device
  artist link that resolved to a directory artist (`/artist/…`) stays.
- Leave the developer API-key `add_by_rss` scope, `routeSeoPolicy.ts`, `robots.ts`, and
  `ChannelVisitRouteSync.tsx` as they are. Default-lane Add by RSS specs stay on the default lane
  and are not rewritten.

## Not-found for every `/add-by-rss` URL — `layout.tsx`

`apps/web/src/app/add-by-rss/layout.tsx` is a server component. Keep the existing `metadata`
export (`robots: { index: false, follow: false }`). Make the default function async:

```typescript
import { notFound } from 'next/navigation';

import { getCatalogConfig } from '../../lib/catalog/catalogPolicy';

export default async function AddByRssLayout({ children }: { children: React.ReactNode }) {
  if (!getCatalogConfig().addByRSSEnabled) {
    notFound();
  }
  return children;
}
```

`notFound()` throws, so the layout renders nothing below it. This covers `/add-by-rss`,
`/add-by-rss?chip=episodes`, `/add-by-rss/add`, `/add-by-rss/credentials/[id]`,
`/add-by-rss/remote-feed`, `/add-by-rss/podcast/[id]`, `/add-by-rss/episode/[id]`,
`/add-by-rss/artist/[id]`, `/add-by-rss/album/[id]`, `/add-by-rss/track/[id]`,
`/add-by-rss/podcast/livestream/[id]`, `/add-by-rss/music/livestream/[id]`, and
`/add-by-rss/[resource]/[id_text]`. The add page, the remote-feed page, and the
`useAddByRSSAddFeedFlow` and `useAddByRSSRemoteItemList` hooks they use only mount under this
layout, so they never run while the flag is off.

## Sidebar — `SideBar.tsx`

`SideBar` is a client component under `ConfigProvider`. Call `useConfig()` next to the other
hooks. Render the existing Add by RSS `SideBarLink` (the one at `href={ROUTES.ADD_BY_RSS}` with
`tFeatures('add_by_rss.label')`) only when `addByRSSEnabled` is true. Leave Queues, History,
Playlists, and My Clips in place. This is the only link to `ROUTES.ADD_BY_RSS` outside the
`/add-by-rss` pages; the Add Feed link (`ROUTES.ADD_BY_RSS_ADD`) lives in `AddByRSSListHeader`,
which only renders on those pages.

## Background refresh — `AddByRSSBackgroundRefresh.tsx`

Read `useConfig().public.catalog.addByRSSEnabled` at the top of the component. The effect returns
`undefined` without calling `runAddByRSSBackgroundRefresh` when the flag is false or there is no
logged-in account. Add the flag to the effect dependency list. The component still returns
`null`.

## First parses from Home lists — `useReadyAddByRSSFeeds.ts`

The hook keeps reading local feeds and running the follow-stub sync, so saved rows show. Only
the trailing first-parse request stops.

- Read `const addByRSSEnabled = useConfig().public.catalog.addByRSSEnabled;` next to
  `useAccount()`.
- At the end of the async block in the effect, replace
  `void enqueueAddByRSSFirstParses({ accountId });` with a call guarded by `if (addByRSSEnabled)`.
- Add `addByRSSEnabled` to the effect dependency list (`[accountId, activeKey, addByRSSEnabled]`).
  The value does not change during a session, so this adds no re-runs.
- Do not change `isActive`, `activeKey`, or the doc comment's description of the inactive case.

## Player metadata upgrade — `useAddByRSSMetadataUpgrade.ts`

A loaded Add by RSS item still upgrades from an already stored parse; it does not request a new
one.

- Read the flag with `useConfig()` next to `useMediaPlayer()` and `useAccount()`, and keep it in
  a ref the same way `accountIdTextRef` is kept: `const addByRSSEnabledRef = useRef(flag)` plus
  an effect that assigns `addByRSSEnabledRef.current = flag` on change. The returned callback's
  dependency list stays `[disarm, isArmed, tryUpgrade]`.
- In the returned callback's async block, change the line before
  `await enqueueAddByRSSFirstParses(...)` to also return when `!addByRSSEnabledRef.current`:
  `if ((await tryUpgrade(target)) || accountIdText === null || !isArmed(target) || !addByRSSEnabledRef.current) { return; }`.
  The watch stays armed, so a feed that another tab stores still upgrades the display.
- Extend the hook's doc comment with one sentence: "With Add by RSS off on this server, no first
  parse is requested."

## Artist links — `publisherLinks.ts` and `useDeviceArtistLinks.ts`

In `apps/web/src/utils/addByRSS/publisherLinks.ts`, directly after
`export const addByRSSArtistPath = …` (line 13), add one named export. The file already imports
`ArtistLineLink` as a type.

```typescript
/** Artist links that stay when Add by RSS is off: the ones that do not open an Add by RSS page. */
export const withoutAddByRSSArtistLinks = (
  links: readonly ArtistLineLink[]
): readonly ArtistLineLink[] => {
  const addByRSSArtistPrefix = addByRSSArtistPath('');
  return links.filter((link) => !link.href.startsWith(addByRSSArtistPrefix));
};
```

In `useDeviceArtistLinks.ts`:

- Read `const addByRSSEnabled = useConfig().public.catalog.addByRSSEnabled;` next to
  `useMediaPlayer()` and `useAccount()` (no conditional hook).
- Keep the loading effect as it is. Replace the final return with:

```typescript
  const visible = addByRSSEnabled ? links : withoutAddByRSSArtistLinks(links);
  return visible.length === 0 ? EMPTY_DEVICE_ARTIST_LINKS : visible;
```

  Wrap `visible` in `useMemo` keyed by `[addByRSSEnabled, links]` so the array identity is stable
  across renders; callers pass it into `getMediaPlayerInfoResolution` on every render.
- Do not change `resolveDeviceArtistLinks`. With the filter applied, an Add by RSS album whose
  artists are only Add by RSS artist feeds shows no artist line, and one whose artist matched a
  directory artist keeps that `/artist/…` link. The bar, the mobile bar, and the full-size player
  all read this hook, so all three follow.

## Plain title in the full-size player — `MediaPlayerInfoModal.tsx`

Anchors: `const remoteInfo = useRemotePlayerInfo();`, `const infoResolution =`, and
`const titleSection =` with its first `ClickableTitle` (`testId="media-player-modal-title"`).

- Call `useConfig()` next to `useRemotePlayerInfo()`.
- After `const infoResolution = …`, add:

```typescript
  const showsAddByRSSItem =
    remoteInfo !== null
      ? remoteInfo.display.resource.ref.kind === 'add_by_rss'
      : mpAddByRSS !== null;
  const itemLinkUrl = !addByRSSEnabled && showsAddByRSSItem ? '' : infoResolution.itemLinkUrl;
```

- The title `ClickableTitle` takes `href={itemLinkUrl || undefined}`. Its existing no-href branch
  renders the title without a link target.
- The channel title already renders as text when `channelLinkUrl` is `''`, which it always is for
  Add by RSS. The artist row reads `infoResolution.artistLine`, which the device link filter above
  already trimmed. No other change in this file. Read `useConfig()` once.

## Tests

- `apps/web/src/utils/addByRSS/publisherLinks.test.ts` — add a `describe('withoutAddByRSSArtistLinks')`:
  - drops a link whose href is `addByRSSArtistPath('abc')` and keeps one whose href is
    `/artist/abc`, in the input order;
  - returns an empty array when every link is an Add by RSS artist link.

- `apps/web/e2e/catalog-restricted-add-by-rss.spec.ts` (new, catalog-restricted lane, glob
  `catalog-restricted-*.spec.ts`). Full sentences (**e2e-readability**); top-level describe
  `Add by RSS off`. Screenshots via `capturePageLoad` from `./helpers/stepScreenshots`. Not-found
  assertions copied from `apps/web/e2e/detail-route-not-found.spec.ts`: `response?.status()` is
  404, the text `This page could not be found.` is visible, and `Something Went Wrong` has
  count 0.

  1. `When Add by RSS is off, the sidebar does not offer it.` Set the viewport to
     `{ width: 1280, height: 720 }` the way `navbar-chrome.spec.ts` does. `page.goto('/')`,
     expect the URL to be `/`. `#sidebar a[href="/add-by-rss"]` has count 0.
     `#sidebar a[href="/queues"]` and `#sidebar a[href="/playlists"]` are visible. Capture the
     `#sidebar` element with the sentence `The sidebar has Queues and Playlists and no Add by RSS link.`

  2. `When Add by RSS is off, every Add by RSS URL is the not-found page.` One test, one
     `test.step` per path, each step named `Opening <path> shows the not-found page.` Paths, in
     this order:

     - `/add-by-rss`
     - `/add-by-rss?chip=episodes`
     - `/add-by-rss/add`
     - `/add-by-rss/podcast/e2ePodChnl001`
     - `/add-by-rss/episode/e2eAnyEp01`
     - `/add-by-rss/artist/e2eMusicChnl01`
     - `/add-by-rss/album/e2eMusicAlbm01`
     - `/add-by-rss/track/e2eMusicTrk001`
     - `/add-by-rss/podcast/livestream/e2eLiveStrm01`
     - `/add-by-rss/music/livestream/e2eAnyLive1`
     - `/add-by-rss/credentials/e2eAnyFeed1`
     - `/add-by-rss/remote-feed?url=https%3A%2F%2Fexample.com%2Ffeed.xml`
     - `/add-by-rss/publishers/e2eAnyPub1`

     These ids are never loaded; the layout returns not-found first. For `/add-by-rss` only,
     also `toHaveURL` ending at `/add-by-rss` and take the one screenshot, centered on the
     not-found text, labeled `The Add by RSS library shows the not-found page.`

  3. A nested `test.describe('A saved Add by RSS episode in the queue')` with two tests that
     share one setup.

     Setup, copied from `apps/web/e2e/media-player-addbyrss-no-swap.spec.ts`:
     - `loginSeedUser` and `E2E_API_BASE_URL` from `./helpers/addByRSSCredentials`;
       `expectMediaPlayerTitleVisible` and `expectPersistentPlayerPlaying` from
       `./helpers/mediaPlayerAssertions`; `getAddByRSSHashId` from `@podverse/helpers`; the
       `E2E_ADD_BY_RSS_*`, `E2E_ADDBYRSS_FRESH_ENCLOSURE_URL`, and `E2E_PODCAST_QUEUE_ID_TEXT`
       constants from `./helpers/seedConstants`.
     - A spec-local `addByRSSResourceData` object with the same shape as that spec's object, with
       `id_text: 'e2eAbRsResC01'`, guid `https://e2e-seed-addbyrss.example/item-guid/catalog-off`,
       and title `E2E Add-by-RSS Catalog Off` in a module constant `TITLE` (the bundle's `item.title`, `item.guid`, and
       description use the same values). The id is 13 characters (**e2e-seed-nano-id-limits**).
     - A module constant
       `PODCAST_QUEUE_URL = \`${E2E_API_BASE_URL}/queue/${E2E_PODCAST_QUEUE_ID_TEXT}\``.
     - `beforeEach`: `loginSeedUser(page)`; `POST ${PODCAST_QUEUE_URL}/update-is-active` with
       `{ is_active_queue: true }`; `POST ${PODCAST_QUEUE_URL}/item-add-by-rss/last` with
       `{ add_by_rss_resource_data: addByRSSResourceData }`; expect both responses ok.
     - `afterEach`: `DELETE ${PODCAST_QUEUE_URL}/item-add-by-rss/${getAddByRSSHashId(addByRSSResourceData)}`
       with no assertion, so a row the test already removed is fine.
     Test A: `When Add by RSS is off, a saved Add by RSS episode still shows in the queue and plays with a plain title.`
     `test.setTimeout(20_000)` with the comment
     `// Loads the queue, starts audio, and opens the full-size player.` Steps:
     - `The queue lists the saved Add by RSS episode.` `page.goto('/queues?medium=av')`;
       `page.locator('main').getByRole('button', { name: TITLE }).first()` is visible. Capture it
       with `A saved Add by RSS episode still shows in the queue.`
     - `Playing the saved episode loads it into the player.` Click that button;
       `expectMediaPlayerTitleVisible(page, TITLE)`; `expectPersistentPlayerPlaying(page, true)`.
     - `The full-size player shows the title as plain text.` Click
       `page.locator('#media-player').getByRole('button').first()`; the dialog
       `page.getByRole('dialog', { name: 'Fullscreen Media Player' })` is visible; inside it,
       `getByTestId('media-player-modal-title')` contains `TITLE`, and
       `locator('a[href^="/add-by-rss"]')` has count 0. Capture the title with
       `The full-size player shows the Add by RSS title without a link.`

     Test B: `When Add by RSS is off, a saved Add by RSS episode can still be removed from the queue.`
     Nothing plays in this test, so the player holds no Add by RSS item that could keep a row on
     the queue page. Steps:
     - `The queue lists the saved Add by RSS episode.` As in test A, without the screenshot.
     - `Removing the saved episode leaves the queue without it.` `DELETE` the row through the
       queue route as in `afterEach` and expect the response ok; this is the route the queue
       row's Remove calls. Reload `/queues?medium=av`; the button named `TITLE` has count 0.

  Do not add this spec to `makefiles/local/e2e-spec-order-web.txt`. Do not edit
  `navbar-chrome.spec.ts`; the default lane still shows the link.

No Maestro flow. The API refusals and their tests are plan 51.

## Release scratchpad

```markdown
## Add by RSS can be turned off (web)

- Surfaces: web
- Change: with `NEXT_PUBLIC_CATALOG_ADD_BY_RSS_DISABLED=true`, the sidebar has no Add by RSS
  link and every `/add-by-rss` URL is a not-found page, so there is no way to add a feed. Saved
  Add by RSS rows still show on Home, queue, history, and playlist pages, and queue and playlist
  rows keep Remove. A saved row that links into `/add-by-rss` opens the not-found page. A playing
  Add by RSS item keeps playing; the full-size player shows its title without a link and omits
  artist links into `/add-by-rss`. The browser stops background refresh and first parses of
  saved feeds. Blank keeps Add by RSS.
- Who notices: self-hosters who turn Add by RSS off on a branded instance, and listeners on that
  instance who saved Add by RSS feeds earlier
- Operator steps: set the key in the web runtime-config env, set `CATALOG_ADD_BY_RSS_DISABLED`
  to the same value on the API, and restart both
```
