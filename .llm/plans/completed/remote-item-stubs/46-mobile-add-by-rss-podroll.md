**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 46 — Mobile Add by RSS podroll and remote item sections, and the remote item click flow

The mobile twin of plan 45 (R22). `AddByRssHomeDetailScreen` gains the two lists a directory feed
shows (R45), read from the stored bundle (`detail.mappedFeed`, already in SQLite as
`mapped_feed_json`):

- a **Podroll** section for every resource type, offered when the bundle lists podroll
  references;
- a **Remote Items** section for podcast and album feeds, offered when the bundle lists channel
  `podcast:remoteItem` entries. Artist feeds get none: their remote items are their albums, which
  the artist screen already lists, and the directory artist screen has no such section (plan 62).

Both lists hold channel references and item references (episodes and tracks). Value time split
references get no section and no screen (R34). Rows and taps follow the same rules as web:

- an Add by RSS feed already on the device → `AddByRssPodcastDetail`;
- a public directory channel → the podcast, album, or artist screen; a public directory item →
  `EpisodeDetail` or `TrackDetail`;
- a stored remote stub, channel or item → `SearchResultDetail` for the channel;
- anything else → `reqAccountAddByRSSRemoteItemResolve` on tap with the remote feed's keys only,
  then one of the above, or `AddByRssRemoteFeedDetail` (plan 44) when the provider does not know
  the feed.

No device data migration: the references are read from the bundle the device already stores.

## Operator decisions this plan follows

First review, D24 (R45): "Add by RSS shows podroll, including episode rows, and the channel remote
item list, matching a directory feed. Value time splits stay without a new screen."

First review, D29 (R47), in the operator's words: "I think we want to go through the normal
podcast index process, but we want to be absolutely sure in our ad by RSS with password process
that we never, ever accidentally send that username and password to a different domain than the
one feed URL that we have it set for with the ad by RSS. So remote items should not inherit that
username and password."

So a tap on a remote item in a password-protected Add by RSS feed still resolves through Podcast
Index. The username and password are sent only to the domain of the feed URL they were saved for.
Remote items do not inherit them. The Podcast Index call sends only the remote feed GUID or feed
URL. § Credentials lists what this plan enforces on mobile.

## Rows

R14, R22, R35, R36, R45, R47

## Runs after

31, 40, 43, 44, 62

Plan 52 adds the `info.remote_items` catalog key ("Remote Items") this plan's section label
reuses. Plan 62 adds `info.no_remote_items_found` and also edits
`apps/mobile/src/prefs/detailListPrefs.ts` (the directory tab lists); this plan's edit there is a
separate constant and lands after it.

## Files

apps/mobile/src/prefs/detailListPrefs.ts
apps/mobile/src/screens/home/addByRss/addByRssDetailSections.ts
apps/mobile/src/screens/home/addByRss/addByRssDetailSections.test.ts
apps/mobile/src/screens/home/addByRss/addByRssRemoteItems.ts
apps/mobile/src/screens/home/addByRss/addByRssRemoteItems.test.ts
apps/mobile/src/screens/home/addByRss/AddByRssRemoteItemListSection.tsx
apps/mobile/src/screens/home/AddByRssHomeDetailScreen.tsx
apps/mobile/e2e/add-by-rss-remote-items.yaml
release-notes/scratchpad.md

## Section wiring

- `apps/mobile/src/prefs/detailListPrefs.ts`: add `'podroll'` and `'remote_items'` to
  `ADD_BY_RSS_DETAIL_TABS` after `'about'`, in that order. The selected pane is visit-local and
  not stored, so no stored value changes.
- `addByRssDetailSections.ts`:
  - `ADD_BY_RSS_SECTION_LABEL_KEYS.podroll = 'info.podroll'` and
    `ADD_BY_RSS_SECTION_LABEL_KEYS.remote_items = 'info.remote_items'`.
  - `resolveAddByRssSections` takes `hasPodroll: boolean` and `hasRemoteItems: boolean`. It
    pushes `'podroll'` right after `'about'` for every resource type, then `'remote_items'` when
    `hasRemoteItems` is true and the feed is not an artist feed, both before `funding` and
    `people`. Update its doc comment.
  - `isAddByRssFilterableSection` and `isAddByRssSortableSection` stay false for both.
- `AddByRssHomeDetailScreen.tsx`:
  - `SECTION_COMPONENTS.podroll = AddByRssPodrollSection` and
    `SECTION_COMPONENTS.remote_items = AddByRssRemoteItemsSection`.
  - `availableSections` passes
    `hasPodroll: getAddByRssRemoteRefsForDetail(detailForRoute, 'podroll').length > 0` and
    `hasRemoteItems: getAddByRssRemoteRefsForDetail(detailForRoute, 'remote_items').length > 0`
    (helper below).
  - Rewrite the screen doc comment's podroll sentence ("Podroll resolves remote items against
    server channels, so it is not offered.") to describe the new sections: "Podroll and Remote
    Items list the feeds and items this feed points to, from the parsed bundle; entries the device
    or the directory does not know are looked up when tapped."

## Pure rows — `addByRssRemoteItems.ts` (new)

```ts
import type { AddByRSSBundleRemoteRef, AddByRSSRemoteItemList } from '@podverse/parser-mapping';
import type {
  DTOAddByRSSRemoteItemLookupResult,
  DTOIndexProviderFeedTarget,
  DTORemoteItemStub,
} from '@podverse/helpers';

type AddByRssRemoteEntryBase = {
  key: string;
  title: string | null;
  /** Second line: the channel title on item rows, when known and not already the title. */
  subtitle: string | null;
  imageUrl: string | null;
};

export type AddByRssRemoteEntry =
  | (AddByRssRemoteEntryBase & { kind: 'add_by_rss'; feedIdText: string; feedUrl: string })
  | (AddByRssRemoteEntryBase & { kind: 'channel'; channelIdText: string; mediumId: number | null })
  | (AddByRssRemoteEntryBase & { kind: 'item'; itemIdText: string; mediumId: number | null })
  | (AddByRssRemoteEntryBase & { kind: 'provider_feed'; target: DTOIndexProviderFeedTarget })
  | (AddByRssRemoteEntryBase & { kind: 'item_stub'; stub: DTORemoteItemStub })
  | (AddByRssRemoteEntryBase & { kind: 'reference'; ref: AddByRSSBundleRemoteRef });

/** Refs in one list of the detail's bundle; [] when there is no bundle. */
export const getAddByRssRemoteRefsForDetail = (
  detail: AddByRssHomeDetailData | null,
  list: AddByRSSRemoteItemList
): AddByRSSBundleRemoteRef[];

/** Initial entries: a device feed match wins, the rest are references. */
export const toInitialRemoteEntries = (
  refs: readonly AddByRSSBundleRemoteRef[],
  deviceFeedByRefKey: ReadonlyMap<string, MobileAddByRSSFeedRecord>
): AddByRssRemoteEntry[];

/** Applies lookup results (aligned with `lookupRefs`) to the entries in place of their references. */
export const applyRemoteLookup = (
  entries: readonly AddByRssRemoteEntry[],
  lookupRefs: readonly AddByRSSBundleRemoteRef[],
  results: readonly DTOAddByRSSRemoteItemLookupResult[]
): AddByRssRemoteEntry[];

/** `guid:<guid>` or `url:<url>`, plus `|item:<itemGuid>` for an item reference. */
export const remoteRefKey = (ref: AddByRSSBundleRemoteRef): string;

/**
 * The feed URL whose stored credentials row artwork may use: the matched device feed's own URL
 * for an `add_by_rss` row, null for every other row. Never the source feed's URL.
 */
export const artworkAddByRssFeedUrlForEntry = (entry: AddByRssRemoteEntry): string | null;

/**
 * `AddByRssRemoteFeedDetail` params for a reference the provider does not know: the remote feed
 * URL, and the reference title only for a channel reference (an item reference's title names the
 * item, not the feed). Null when the reference has no feed URL.
 */
export const remoteFeedDetailParamsForRef = (
  ref: AddByRSSBundleRemoteRef
): { feedUrl: string; title?: string } | null;
```

- `getAddByRssRemoteRefsForDetail` calls
  `getAddByRSSRemoteItemRefs(detail.mappedFeed, { feedGuid: detail.mappedFeed?.channel?.channel?.podcast_guid ?? null, feedUrl: detail.feed.feedUrl }, list)`
  from `@podverse/parser-mapping` (plan 40), shared with web.
- Lookup results map: `channel` → `channel`; `item` → `item` (`itemIdText = item.id_text`,
  `mediumId = item.channel.medium_id`); `provider_feed` → `provider_feed`, image
  `target.image_url`; `item_stub` → `item_stub`, image `stub.image_url ?? stub.channel_stub.image_url`;
  `none` → stays `reference`.
- Titles and subtitles follow plan 45's table (same rules on both clients): a channel reference
  shows the matched title before the ref title and has no subtitle; an item reference shows the
  item title (`item.title`, `stub.title`) or else the ref title, with the channel title
  (device record, `channel.title`, `item.channel.title`, `target.title`,
  `stub.channel_stub.title`) as subtitle. A reference keeps `ref.title`; the row shows
  `ref.feedUrl` or `t('misc.untitled')` when it is null. A subtitle equal to the title, or empty,
  is null.

## Credentials (R47)

- The lookup body is built only with `toAddByRSSRemoteItemLookupRef(ref)`, and the resolve body
  only with `toAddByRSSRemoteItemResolveRef(ref)` (plan 40): the remote feed's GUID and URL (with
  userinfo already stripped by `getAddByRSSRemoteItemRefs`), plus the item GUID for lookup. The
  section never calls the SecureStore credential helpers in `apps/mobile/src/lib/addByRss/` and
  never puts the source feed's URL, id, or credentials in a request or navigation params.
- Row artwork: `CoverImage` gets `addByRssFeedUrl={artworkAddByRssFeedUrlForEntry(entry) ?? undefined}`.
  Only a row for a feed already on the device passes that feed's own URL, so
  `useAddByRssArtworkHeaders` scopes any Basic Auth to that feed, the way
  `AddByRssArtistAlbumsSection` passes each album record's own URL. Every other row passes none,
  so remote artwork never carries the source feed's credentials.
- `AddByRssRemoteFeedDetail` opens with `remoteFeedDetailParamsForRef(ref)`. Its Add by RSS
  button (plan 44) reads stored credentials only for that remote feed's own URL, so a remote item
  never inherits the source feed's username and password. A remote feed that needs its own
  credentials goes to the credentials step, as plan 44 describes.

## Section — `AddByRssRemoteItemListSection.tsx` (new)

Exports `AddByRssRemoteItemListSection` (props `AddByRssSectionPaneProps & { list: AddByRSSRemoteItemList }`)
and two wrappers for `SECTION_COMPONENTS`:
`AddByRssPodrollSection = (props) => <AddByRssRemoteItemListSection {...props} list="podroll" />`
and `AddByRssRemoteItemsSection` with `list="remote_items"`.

Rows reuse what `PodcastPodrollSection.tsx` renders: `ListRow` with a square `CoverImage` at
`LIST_ROW_ARTWORK_SIZE` and the top hairline row style (`createContentListRowStyles`), inside the
same list container the other Add by RSS sections use, with `listHeader` and `onRefresh` passed
through as they do. Item rows pass `subtitle` to `ListRow`.

Loading:

1. Refs from `getAddByRssRemoteRefsForDetail(detail, list)`.
2. Device matches: for each ref with a `feedUrl`, `addByRssRepository.getFeedByUrl(feedUrl)`;
   build `deviceFeedByRefKey`. Render `toInitialRemoteEntries` at once. An item reference matched
   to a device feed opens that feed's screen.
3. When online (not Offline Mode) and signed in (`useAuth().accessToken !== null`), the refs with
   no device match go to
   `requestWithMobileAuthRefresh({ accessToken, clearSession, refreshToken, setTokens }, (api) => api.reqAccountAddByRSSRemoteItemLookup(chunk.map(toAddByRSSRemoteItemLookupRef)))`
   in chunks of `ADD_BY_RSS_REMOTE_ITEM_LOOKUP_MAX_REFS`; apply with `applyRemoteLookup`. A
   failed lookup keeps the references as they are and shows nothing; the rows still resolve on
   tap.
4. Re-run when `detail.feed.idText`, `list`, or `detail.mappedFeed` changes; drop results of a
   superseded run.

Taps (`navigation` from `useNavigation<NativeStackNavigationProp<ChannelBrowseStackParamList & AddByRssDetailStackParamList>>()`;
every stack this screen is on has both route sets):

- `add_by_rss` → `navigation.navigate('AddByRssPodcastDetail', { feedIdText })`.
- `channel` → by `getChannelRouteKind(mediumId)` from `@podverse/helpers/medium`: artist →
  `ArtistDetail { artistId }`; album → `AlbumDetail` with `buildAlbumDetailParams({ albumId, previewImageUrl: null, previewTitle: title })`;
  otherwise `PodcastDetail` with `buildPodcastDetailParams({ podcastId, previewImageUrl: null, previewTitle: title })`,
  all through `CHANNEL_BROWSE_STACK_ROUTES`.
- `item` → by `getItemTypeFromMedium(mediumId)` from `@podverse/helpers/medium`: track →
  `TrackDetail` with `buildTrackDetailParams({ trackId: itemIdText, previewImageUrl: null, previewTitle: title })`;
  episode → `EpisodeDetail { episodeId: itemIdText }`, through `CHANNEL_BROWSE_STACK_ROUTES`.
- `provider_feed` → `navigation.navigate(CHANNEL_BROWSE_STACK_ROUTES.SearchResultDetail, buildSearchResultDetailParams(target))`.
- `item_stub` → the same with `buildSearchResultDetailParams(stub.channel_stub)`.
- `reference`:
  1. Offline Mode (`useOfflineMode().enabled`) → notice `t(OFFLINE_UNAVAILABLE_MESSAGE_KEY)`
     from `apps/mobile/src/lib/offlineModeViews.ts`; no request.
  2. Signed out → `onRequestLogin()` from `useAuthPrompt()`.
  3. Otherwise mark the row as opening (`ListRow` busy or disabled state; one tap at a time) and
     call `reqAccountAddByRSSRemoteItemResolve(toAddByRSSRemoteItemResolveRef(ref))` through
     `requestWithMobileAuthRefresh`. `channel` and `provider_feed` → navigate as above.
     `not_found` with `remoteFeedDetailParamsForRef(ref)` non-null →
     `navigation.navigate('AddByRssRemoteFeedDetail', params)`; when it is null → notice
     `features.add_by_rss.remote_item_not_found`. `directory_unavailable` →
     `features.add_by_rss.remote_item_directory_unavailable`. Errors:
     `handleRateLimitMessage(error, t)` from `apps/mobile/src/lib/rateLimit/handleRateLimitMessage.ts`
     (already-translated sentence for a 429), else
     `t('features.add_by_rss.remote_item_lookup_failed')`, the way `useAddByRssFeedCheck.ts`
     sets its notice.

The notice renders as a `HelperNote` above the rows (`testID="add-by-rss-${listSlug}-notice"`).
Keep it as a translated string in state (not a key), since the rate-limit helper returns a
sentence.

testIDs, with `listSlug` `podroll` or `remote-items`: rows `add-by-rss-${listSlug}-row-${index}`;
the section list `add-by-rss-${listSlug}-section`. The chips are `add-by-rss-home-section-podroll`
and `add-by-rss-home-section-remote_items` (the screen's existing
`add-by-rss-home-section-${section}` pattern). Each row's accessibility label is its visible
title.

## Tests

- `addByRssDetailSections.test.ts`: `hasPodroll` adds `podroll` after `about` for podcast,
  artist, and album feeds, before `funding` and `people`; `hasRemoteItems` adds `remote_items`
  after `podroll` for podcast and album feeds and never for artist feeds; false leaves the lists
  as they are.
- `addByRssRemoteItems.test.ts` (new): a device match becomes `add_by_rss` carrying the record's
  own feed URL; lookup `channel`, `item`, `provider_feed`, `item_stub`, and `none` map to their
  entries; results apply to the right entries when some refs had device matches; titles and
  subtitles follow the rules above; `remoteRefKey` is stable for GUID and URL-only refs and
  differs for a channel reference and an item reference on the same feed;
  `artworkAddByRssFeedUrlForEntry` returns the record URL for `add_by_rss` and null for every
  other kind; `remoteFeedDetailParamsForRef` keeps the title for a channel reference, drops it
  for an item reference, and returns null without a feed URL.
- `apps/mobile/e2e/add-by-rss-remote-items.yaml` (new), per **mobile-maestro-timeouts** (shared
  `TIMEOUT_*` ladder), modeled on `add-by-rss.yaml`: launch and log in with the shared flows; on
  My Library → Add by RSS, add `https://e2e-seed-addbyrss.example/podcast-podroll.xml` (plan
  40's fixture); tap "E2E Add-by-RSS Podroll Channel" on `rss-root-screen`; tap
  `add-by-rss-home-section-podroll`; assert "E2E Music Album", "E2E Not Yet Added Album",
  "E2E Remote Not Found Feed", and "E2E Music Track One" are visible.
  1. Tap "E2E Not Yet Added Album" → `pi-feed-preview-screen` with that title and
     `pi-feed-add-button`; back.
  2. Tap "E2E Music Track One" → the track detail screen with that title; back.
  3. Tap "E2E Remote Not Found Feed" → `add-by-rss-remote-feed-screen` with that title and
     `add-by-rss-remote-feed-add-button`; tap it → `add-by-rss-home-detail-screen` showing
     "E2E Add-by-RSS Channel" (the default fixture).
  4. Back to the podroll feed; tap "E2E Music Album" → the album detail screen with that title.
  5. Tap `add-by-rss-home-section-remote_items`; assert "E2E Music Track One",
     "E2E Not Yet Added Track", and "E2E Remote Not Found Episode" are visible. Tap
     "E2E Not Yet Added Track" → `pi-feed-preview-screen` showing "E2E Not Yet Added Album"; back.
  Screenshots after each landing. This flow needs Mobile E2E API.

## Release scratchpad

```markdown
## Podroll and Remote Items on Add by RSS feeds (mobile)

- Surfaces: mobile
- Change: Add by RSS feed screens offer a Podroll section when the feed lists a
  `podcast:podroll`, and podcast and album feeds offer a Remote Items section when the feed lists
  `podcast:remoteItem` entries, the same lists directory feeds show. Both include episode and
  track rows. Entries already on the device, in the directory, or stored as remote stubs open
  directly. Any other entry is looked up when tapped: it opens the directory screen or the Podcast
  Index preview when the index knows the feed, and otherwise the Add by RSS remote feed screen
  with an Add by RSS button. The lookup sends only the remote feed's GUID or URL; an Add by RSS
  feed's username and password are never sent for its remote items, and remote artwork never
  carries them. Nothing is parsed or saved until the listener adds a feed. Offline, entries the
  device does not have show the offline notice.
- Who notices: mobile listeners with Add by RSS feeds that recommend or reference other feeds
- Operator steps: none
```
