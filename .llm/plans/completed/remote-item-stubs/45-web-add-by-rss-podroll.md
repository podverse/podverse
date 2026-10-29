**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 45 — Web Add by RSS podroll and remote item lists, and the remote item click flow

Add by RSS feeds already carry their `podcast:podroll` references
(`feed.mappedFeed.channel.podrollRemoteItems`) and their channel `podcast:remoteItem` list
(`feed.mappedFeed.channel.remoteItems`) in the stored bundle, but no Add by RSS page shows them.
Add the two lists a directory feed shows (R45):

- a **Podroll** tab on the Add by RSS podcast, album, and artist pages (the directory pages offer
  Podroll on all three);
- a **Remote Items** tab on the Add by RSS podcast and album pages (the directory shows Remote
  Items on podcast and album pages only, plan 52; an artist's remote items are its albums, which
  the Add by RSS artist page already lists).

Both lists hold channel references and item references (episodes and tracks). Value time split
references get no list and no screen (R34). Only the feed the user added is parsed and saved;
every entry is a lightweight row (R14), and clicking an entry it cannot open directly runs the
R35 resolve flow:

- an Add by RSS feed already in this browser → its Add by RSS page;
- a public directory channel → the channel page; a public directory item → the episode or track
  page;
- a stored remote stub, channel or item → the provider search detail for the channel
  (`buildIndexProviderFeedPath`);
- anything else → `POST /account/add-by-rss/remote-item/resolve` on click with the remote feed's
  keys only, then the channel, the provider search detail, or, when the provider does not know
  the feed, the Add by RSS search detail (`buildAddByRSSRemoteFeedPath`, plan 42).

The rows are Add by RSS-owned, so they do not depend on the directory podroll response shape
(plan 31) or on area E's row components. They reuse the directory podroll row styles, so both
look the same.

## Operator decisions this plan follows

First review, D24 (R45): "Add by RSS shows podroll, including episode rows, and the channel remote
item list, matching a directory feed. Value time splits stay without a new screen."

First review, D29 (R47), in the operator's words: "I think we want to go through the normal
podcast index process, but we want to be absolutely sure in our ad by RSS with password process
that we never, ever accidentally send that username and password to a different domain than the
one feed URL that we have it set for with the ad by RSS. So remote items should not inherit that
username and password."

So a click on a remote item in a password-protected Add by RSS feed still resolves through
Podcast Index. The username and password are sent only to the domain of the feed URL they were
saved for. Remote items do not inherit them. The Podcast Index call sends only the remote feed
GUID or feed URL. § Credentials lists what this plan enforces on web.

## Rows

R14, R22, R35, R36, R45, R47

## Runs after

31, 40, 41, 42, 52

Plan 52 adds the `info.remote_items` catalog key this plan's tab label reuses.

## Files

apps/web/src/utils/addByRSS/remoteItemRefs.ts
apps/web/src/utils/addByRSS/remoteItemRefs.test.ts
apps/web/src/hooks/useAddByRSSRemoteItemList.ts
apps/web/src/components/AddByRSS/RemoteItems/AddByRSSRemoteItemList.tsx
apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastPageListHeader.tsx
apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastPageDetailClient.tsx
apps/web/src/app/add-by-rss/album/AddByRSSAlbumPageListHeader.tsx
apps/web/src/app/add-by-rss/album/AddByRSSAlbumPageClient.tsx
apps/web/src/app/add-by-rss/artist/AddByRSSArtistPageListHeader.tsx
apps/web/src/app/add-by-rss/artist/AddByRSSArtistPageClient.tsx
apps/web/e2e/add-by-rss-remote-items.spec.ts
makefiles/local/e2e-spec-order-web.txt
release-notes/scratchpad.md

## References

The refs come from
`getAddByRSSRemoteItemRefs(feed.mappedFeed, { feedGuid: getAddByRSSFeedGuid(feed), feedUrl: feed.feedUrl }, list)`
in `@podverse/parser-mapping` (plan 40), shared with mobile, with `list` `'podroll'` or
`'remote_items'`. `getAddByRSSFeedGuid` is in `apps/web/src/utils/addByRSS/publisherLinks.ts`.
A reference is an item reference when `ref.itemGuid !== null`.

`apps/web/src/utils/addByRSS/remoteItemRefs.ts` (new, pure) holds the browser-side helpers:

```ts
/** The stored Add by RSS feed a reference's feed names: comparable feed URL first, then podcast GUID. */
export const findAddByRSSFeedForRemoteRef = (
  ref: AddByRSSBundleRemoteRef,
  feeds: readonly AddByRSSFeedRecord[]
): AddByRSSFeedRecord | undefined;

/** Stable row key: `guid:<feedGuid>` or `url:<comparable url>`, plus `|item:<itemGuid>` for an item reference. */
export const remoteRefRowKey = (ref: AddByRSSBundleRemoteRef): string;

/**
 * Add by RSS search detail path for a reference the provider does not know. Carries the remote
 * feed URL, and the reference title only for a channel reference (an item reference's title names
 * the item, not the feed). Null when the reference has no feed URL.
 */
export const remoteFeedPathForRef = (ref: AddByRSSBundleRemoteRef): string | null;
```

`findAddByRSSFeedForRemoteRef` uses `toAddByRSSComparableFeedUrl` and `normalizeAddByRSSGuid` from
`./listedFeeds` and `getAddByRSSFeedGuid`, the helpers the artist albums use.
`remoteFeedPathForRef` returns
`buildAddByRSSRemoteFeedPath({ feedUrl: ref.feedUrl, title: ref.itemGuid === null ? ref.title : null })`.

## Hook — `apps/web/src/hooks/useAddByRSSRemoteItemList.ts` (new)

```ts
type AddByRSSRemoteItemRowBase = {
  key: string;
  title: string;
  /** Second line: the channel title on item rows, when known and not already the title. */
  subtitle: string | null;
  imageUrl: string | null;
  /** Picks the item row layout. */
  isItemRef: boolean;
};

export type AddByRSSRemoteItemRow =
  | (AddByRSSRemoteItemRowBase & { kind: 'add_by_rss'; href: string })
  | (AddByRSSRemoteItemRowBase & { kind: 'channel'; href: string })
  | (AddByRSSRemoteItemRowBase & { kind: 'item'; href: string })
  | (AddByRSSRemoteItemRowBase & { kind: 'provider_feed'; href: string })
  | (AddByRSSRemoteItemRowBase & { kind: 'item_stub'; href: string })
  | (AddByRSSRemoteItemRowBase & { kind: 'reference'; ref: AddByRSSBundleRemoteRef });

export function useAddByRSSRemoteItemList(
  feed: AddByRSSFeedRecord | null,
  list: AddByRSSRemoteItemList
): {
  /** Same length as the refs, in feed order; empty when the feed has none. */
  rows: AddByRSSRemoteItemRow[];
  /** True once the feed has at least one ref in this list (drives the tab). */
  hasRows: boolean;
  openReference: (row: Extract<AddByRSSRemoteItemRow, { kind: 'reference' }>) => Promise<void>;
  openingKey: string | null;
  errorMessage: string | null;
};
```

- `key`: `remoteRefRowKey(ref)`.
- First paint: every ref is a `reference` row, or `add_by_rss` when `findAddByRSSFeedForRemoteRef`
  matches a record from `getAllAddByRSSFeeds()` in `apps/web/src/utils/addByRSS/storage` (href
  `/add-by-rss/${getAddByRSSDetailRouteSegment(resourceType)}/${idText}`, image from the record).
  An item reference matched to a device feed opens that feed's page.
- Then, when signed in (`useAccount().loggedInAccount`), one
  `reqAccountAddByRSSRemoteItemLookup` per chunk of `ADD_BY_RSS_REMOTE_ITEM_LOOKUP_MAX_REFS` refs
  that did not match a device feed, each built with `toAddByRSSRemoteItemLookupRef(ref)`. Results
  replace rows in place:
  - `channel` → `kind: 'channel'`, href
    `getChannelPathByMedium(channel.medium_id, channel.id_text)` from
    `apps/web/src/utils/redirect/redirectToChannelPageByMedium.ts`, image null.
  - `item` → `kind: 'item'`, href `getItemPathByMedium(item.channel.medium_id, item.id_text)`
    from the same file, image null.
  - `provider_feed` → href `buildIndexProviderFeedPath(target.index_provider, target.provider_feed_id)`,
    image `target.image_url`.
  - `item_stub` → href `buildIndexProviderFeedPath(stub.channel_stub.index_provider, stub.channel_stub.provider_feed_id)`,
    image `stub.image_url ?? stub.channel_stub.image_url`.
  - `none` → stays `reference`.
  A failed lookup leaves the rows as they are and logs once with `console.error` (the pattern
  `deviceArtistLinks.ts` uses).
- Titles and subtitles, each title falling back to `tMisc('untitled')`:

  | Row | Channel reference title | Item reference title | Item reference subtitle |
  | --- | --- | --- | --- |
  | `add_by_rss` | record title, else ref title | ref title, else record title | record title |
  | `channel` | `channel.title`, else ref title | ref title, else `channel.title` | `channel.title` |
  | `item` | — | `item.title`, else ref title | `item.channel.title` |
  | `provider_feed` | `target.title`, else ref title | ref title, else `target.title` | `target.title` |
  | `item_stub` | — | `item_stub.title`, else ref title | `item_stub.channel_stub.title` |
  | `reference` | ref title, else `ref.feedUrl` | ref title, else `ref.feedUrl` | none |

  Channel references have no subtitle. A subtitle equal to the title, or empty, is null.
- Re-run when `feed.idText`, `list`, or the stored bundle changes; ignore results from a
  superseded run.

`openReference(row)`:

1. Signed out → `setModalAuthLogin({ isOpen: true })`, return.
2. Set `openingKey`, clear `errorMessage`, call
   `reqAccountAddByRSSRemoteItemResolve(toAddByRSSRemoteItemResolveRef(row.ref))`. The body is the
   remote feed's GUID and URL only, for an item reference too.
3. `channel` → `router.push(getChannelPathByMedium(...))`. `provider_feed` →
   `router.push(buildIndexProviderFeedPath(...))`. `not_found` → when
   `remoteFeedPathForRef(row.ref)` is non-null, `router.push` it; otherwise
   `errorMessage = tFeatures('add_by_rss.remote_item_not_found')`. `directory_unavailable` →
   `tFeatures('add_by_rss.remote_item_directory_unavailable')`.
4. Errors: `handleRateLimitAlert(error, locale, tMisc, { suppressAlert: true, onMessage })` first
   (sets `errorMessage`); otherwise `tFeatures('add_by_rss.remote_item_lookup_failed')`.
5. Clear `openingKey` in `finally`. Ignore a second click while one is opening.

## Credentials (R47)

- The lookup and resolve bodies come only from `toAddByRSSRemoteItemLookupRef` and
  `toAddByRSSRemoteItemResolveRef`: the remote feed's GUID and URL (with userinfo already
  stripped by `getAddByRSSRemoteItemRefs`), plus the item GUID for lookup. The hook never reads
  `credentialStore`, never calls `getCredentials`, and never puts the source feed's URL, id, or
  credentials in a request or a URL.
- The Add by RSS search detail opens with `remoteFeedPathForRef(ref)`: the remote feed URL and,
  for a channel reference, its title. Its Add by RSS button (plan 42) reads stored credentials
  only for that remote feed's own URL (`readStoredCredentials(accountId, feedUrl)` in
  `followAddByRSSChannelAndQueue`), so a remote item never inherits the source feed's username
  and password. A remote feed that needs its own credentials fails its first parse on
  credentials and goes to the credentials page, as plan 42 describes.
- Row artwork is a plain browser image request (`SkeletonFlashImage`); web never attaches Add by
  RSS credentials to images (**add-by-rss-client-held-credentials**).

## Component — `apps/web/src/components/AddByRSS/RemoteItems/AddByRSSRemoteItemList.tsx` (new)

Props `{ rows, openReference, openingKey, errorMessage }` from the hook. Renders nothing when
`rows` is empty. Markup and classes from the directory podroll rows, with no new style module:

- Channel references use `ContentPodrollChannelUnaddedRow.tsx`'s markup and
  `apps/web/src/styles/components/Content/Podroll/ContentPodrollChannelRow.module.scss`.
- Item references (`isItemRef`) use `ContentPodrollItemUnaddedRow.tsx`'s markup and
  `ContentPodrollItemRow.module.scss`: the title line, then `styles.subtitle` with the subtitle
  when it is non-null.
- Every row: `SkeletonFlashImage` (`candidates` = the image when set, else `[]`; `alt` = the
  title; `IMAGES.PODROLL.SQUARE.SIZE`) and the text.
- `add_by_rss`, `channel`, `item`, `provider_feed`, `item_stub`:
  `<Link className={styles.link} href={row.href} color="secondary">` around that markup.
- `reference`: the same inner markup inside `<button type="button" className={styles.link} onClick={() => void openReference(row)} aria-busy={openingKey === row.key} disabled={openingKey !== null}>`.
  The visible title is its accessible name.
- `errorMessage` → `<p role="alert">` after the list.
- Wrap the list in `<div className={podrollStyles.listView}>` with
  `ContentPodroll.module.scss`, as `ContentPodroll` does for the tab view.

## Pages

Each page calls `useAddByRSSRemoteItemList(feed, 'podroll')` once, and the podcast and album pages
also call `useAddByRSSRemoteItemList(feed, 'remote_items')`. Each passes `hasPodroll` (and
`hasRemoteItems`) from the hooks' `hasRows` to its list header, and renders
`<AddByRSSRemoteItemList {...podroll} />` for `activeTab === 'podroll'` and
`<AddByRSSRemoteItemList {...remoteItems} />` for `activeTab === 'remote_items'`.

- `AddByRSSPodcastPageListHeader.tsx`: `AddByRSSPodcastPageTabKey` gains `'podroll'` and
  `'remote_items'`; new props `hasPodroll: boolean` and `hasRemoteItems: boolean`; the items
  `{ key: 'podroll', label: tInfo('podroll') }` then `{ key: 'remote_items', label: tInfo('remote_items') }`
  after `about` and before `settings`, each only when its flag is true. No `hideDesktop`: these
  pages' side column is empty, so the tab is the only place a list shows.
- `AddByRSSPodcastPageDetailClient.tsx`: the tab bodies sit beside `activeTab === 'about'`. When a
  flag turns false while its tab is selected, fall back to `episodes` (same effect shape as the
  `canShowBoostTab` fallback at line ~324). `initialType` (line ~93) accepts
  `typeParam === 'podroll'` and `typeParam === 'remote_items'` alongside `about`, `settings`, and
  `boosts`, so `?type=podroll` and `?type=remote_items` open those tabs the way `?type=about` does.
- Album (`AddByRSSAlbumPageListHeader.tsx`, `AddByRSSAlbumPageClient.tsx`): the same two tabs,
  props, bodies, fallback (to `tracks`), and `?type=` acceptance.
- Artist (`AddByRSSArtistPageListHeader.tsx`, `AddByRSSArtistPageClient.tsx`): the Podroll tab
  only, with its prop, body, fallback (to `albums`), and `?type=podroll` acceptance. No Remote
  Items tab.

## Tests

- `remoteItemRefs.test.ts` (new): `findAddByRSSFeedForRemoteRef` matches by
  `toAddByRSSComparableFeedUrl` before GUID, matches by GUID when the ref has no URL, and returns
  undefined when neither matches; `remoteRefRowKey` differs for a channel reference and an item
  reference on the same feed; `remoteFeedPathForRef` keeps the title for a channel reference,
  drops it for an item reference, returns null without a feed URL, and its query holds only
  `feed_url` and `title`.
- `apps/web/e2e/add-by-rss-remote-items.spec.ts` (new), per **e2e-readability** and
  **e2e-screenshot-verified-element**, signed in, adding
  `https://e2e-seed-addbyrss.example/podcast-podroll.xml` through the Add by RSS add page as
  `add-by-rss-auto-parse.spec.ts` does (plan 40's fixture):
  1. On the new feed's page, the Podroll chip and the Remote Items chip are visible. Select
     Podroll. Rows "E2E Music Album", "E2E Not Yet Added Album", "E2E Remote Not Found Feed", and
     "E2E Music Track One" are visible in that order.
  2. "E2E Music Album" is a link to `/album/<E2E_MUSIC_ALBUM_ID_TEXT>`; follow it and verify the
     album heading. Go back.
  3. "E2E Not Yet Added Album" is a link to `/podcast-index/feed/2147483631`; follow it and verify
     the Podcast Index page heading and its Add Feed button. Go back.
  4. "E2E Music Track One" is a link to `/track/<E2E_MUSIC_TRACK_ONE_ID_TEXT>` with the subtitle
     "E2E Music Album"; follow it and verify the track heading. Go back.
  5. Click "E2E Remote Not Found Feed": the page goes to
     `/add-by-rss/remote-feed?feed_url=…remote-not-found.xml&title=E2E+Remote+Not+Found+Feed` and
     shows that title. Go back.
  6. Select Remote Items. Rows "E2E Music Track One", "E2E Not Yet Added Track", and
     "E2E Remote Not Found Episode" are visible in that order. "E2E Music Track One" links to the
     track page; "E2E Not Yet Added Track" links to `/podcast-index/feed/2147483631`.
  7. Click "E2E Remote Not Found Episode" while waiting for the
     `/account/add-by-rss/remote-item/resolve` request. Its JSON body's keys are exactly
     `feed_guid` and `feed_url`, with the not-found feed's GUID and URL (R47). The page goes to
     `/add-by-rss/remote-feed?feed_url=…remote-not-found.xml` with no `title` parameter.
  8. An Add by RSS feed with no remote references (the default fixture) shows neither chip.

  Seed ids come from `apps/web/e2e/helpers/seedConstants.ts`. Add the spec to
  `makefiles/local/e2e-spec-order-web.txt` beside `add-by-rss-artist-albums.spec.ts`
  (**e2e-report-order**).

## Release scratchpad

```markdown
## Podroll and Remote Items on Add by RSS pages (web)

- Surfaces: web
- Change: Add by RSS podcast, album, and artist pages show a Podroll tab when the feed lists a
  `podcast:podroll`, and podcast and album pages show a Remote Items tab when the feed lists
  `podcast:remoteItem` entries, the same lists directory feeds show. Both lists include episode
  and track rows. Entries already in the browser's Add by RSS library, in the directory, or stored
  as remote stubs open directly. Any other entry is looked up on click by its feed: it opens the
  directory page or the Podcast Index page when the index knows the feed, and otherwise the new
  Add by RSS search detail page with an Add by RSS button. The lookup sends only the remote
  feed's GUID or URL; an Add by RSS feed's username and password are never sent for its remote
  items. Nothing is parsed or saved until the listener adds a feed.
- Who notices: web listeners with Add by RSS feeds that recommend or reference other feeds
- Operator steps: none
```
