**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# Received boostagrams on mobile

Show the public list of received boostagrams on the mobile screens where web already shows it. The list is a section chip named Boost. Web is the parity source for which screens and when the chip appears. Mobile section order and list paging follow the mobile rules named below.

Depends on plan 60. Import the view helpers from `@podverse/v4v-metaboost`. Do not copy them back into the app.

## Rows

R24, R45

## Runs after

60

## Files

- apps/mobile/src/components/boost/ReceivedBoostsSection.tsx
- apps/mobile/src/components/boost/useMbrssPublicMessagesCapability.ts
- apps/mobile/src/lib/boost/insertBoostsChip.ts
- apps/mobile/src/lib/boost/insertBoostsChip.test.ts
- apps/mobile/src/lib/boost/findChannelItemByGuid.ts
- apps/mobile/src/lib/boost/findChannelItemByGuid.test.ts
- apps/mobile/src/data/repositories/channelItemsRepository.ts
- apps/mobile/src/lib/sectionChromeFlags.ts
- apps/mobile/src/lib/sectionChromeFlags.test.ts
- apps/mobile/src/lib/offlineModeViews.ts
- apps/mobile/src/lib/offlineModeViews.test.ts
- apps/mobile/src/prefs/detailListPrefs.ts
- apps/mobile/src/screens/podcast/podcastSections.ts
- apps/mobile/src/screens/podcast/podcastSections.test.ts
- apps/mobile/src/screens/podcast/PodcastDetailScreen.tsx
- apps/mobile/src/screens/podcast/sections/PodcastBoostsSection.tsx
- apps/mobile/src/screens/podcast/sections/index.ts
- apps/mobile/src/screens/album/AlbumDetailScreen.tsx
- apps/mobile/src/screens/artist/ArtistDetailScreen.tsx
- apps/mobile/src/screens/episode/episodeTabs.ts
- apps/mobile/src/screens/episode/episodeTabs.test.ts
- apps/mobile/src/screens/episode/episodeDetailTabs.ts
- apps/mobile/src/screens/episode/episodeDetailTabs.test.ts
- apps/mobile/src/screens/episode/EpisodeDetailScreen.tsx
- apps/mobile/src/screens/track/trackTabs.ts
- apps/mobile/src/screens/track/TrackDetailScreen.tsx
- apps/mobile/src/screens/home/addByRss/addByRssDetailSections.ts
- apps/mobile/src/screens/home/addByRss/addByRssDetailSections.test.ts
- apps/mobile/src/screens/home/AddByRssHomeDetailScreen.tsx
- apps/mobile/src/screens/home/AddByRssEpisodeDetailScreen.tsx
- apps/mobile/src/screens/home/AddByRssTrackDetailScreen.tsx
- apps/mobile/src/screens/home/AddByRssLivestreamDetailScreen.tsx
- apps/mobile/vitest.config.ts
- apps/mobile/e2e/boost-messages.yaml
- apps/mobile/e2e/HOW-TO-RUN.md
- scripts/mobile/e2e-test.sh
- docs/testing/FULL-REPO-VERIFICATION-COMMANDS.md
- release-notes/scratchpad.md

`PodcastDetailScreen.tsx` is on the large-file list. Edit it by symbol, not by paging the file. Anchors: `SECTION_COMPONENTS`, `sectionChromeFlagsRepository.mergeChannel`, `getCachedChannelSectionFlags`, `resolvePodcastSections`.

Do not edit `FullPlayerScreen.tsx`. The full player has no received-boosts pane. Web does not show this list on the player. `resolveEpisodeTabs` and `resolveAddByRssEpisodeTabs` stay without `boosts`, and the player keeps calling those.

Do not edit `apps/web`. Do not add a donate screen. Do not change `packages/v4v-metaboost/src/index.ts` (plan 60 owns the new export).

## Tests

Unit, in the files listed above. Register every new `apps/mobile` test file in the `include` array of `apps/mobile/vitest.config.ts`. Mobile Vitest does not pick up a new file by itself. Put `src/lib/boost/insertBoostsChip.test.ts` and `src/lib/boost/findChannelItemByGuid.test.ts` next to the other `src/lib/**` entries, and `src/screens/episode/episodeDetailTabs.test.ts` next to `src/screens/episode/episodeTabs.test.ts`.

Maestro: `apps/mobile/e2e/boost-messages.yaml`. One flow, both platforms (the list is shared React Native, not a native module; the default `npm run mobile:e2e:test -- boost-messages` is the two-platform run). The seeded podcast has no public boost list, and this set does not add a MetaBoost server. The flow proves the chip stays off that podcast. It does not fetch a live MetaBoost host.

Add `boost-messages` to `flow_needs_e2e_api` in `scripts/mobile/e2e-test.sh` (the `case` that already lists `v4v`). Do not add it to `flow_needs_test_assets`. Add it to the complete area list in `apps/mobile/e2e/HOW-TO-RUN.md` beside `v4v`, and to the focused-flow list in `docs/testing/FULL-REPO-VERIFICATION-COMMANDS.md` beside the `v4v` line.

No Playwright spec. No API integration test.

## Release scratchpad

Append this entry when this prompt is the only one in its phase. When the phase has several prompts, put the entry in the final message under "Release notes entry" and do not edit the scratchpad.

```markdown
## Received boostagrams on mobile

- Surfaces: mobile
- Change: Podcast, album, artist, episode, track, and Add by RSS screens that web already treats as having a public boost list gain a Boosts section chip and the same message rows (sender, time, amount, app, message). A directory live item opens the episode screen, which carries the chip. A directory item link in that list opens the episode or track by walking the channel item API, including an episode the phone has not stored. An Add by RSS link still searches the feed already on the phone. The website tip page is unchanged.
- Who notices: listeners opening a channel or item that already publishes boost messages
- Operator steps: none
```

## Screens

Web renders `BoostMessagesSection` on these pages, and only these. Mobile shows the list on the screen that already opens that entity.

| Web page | Mobile screen | Scope type | Chip gate |
| --- | --- | --- | --- |
| podcast channel | `PodcastDetailScreen` | `channel` | eligibility |
| album | `AlbumDetailScreen` | `album` | eligibility |
| artist | `ArtistDetailScreen` | `artist` | eligibility |
| episode | `EpisodeDetailScreen` | `item` | eligibility |
| track | `TrackDetailScreen` | `track` | eligibility |
| podcast livestream | `EpisodeDetailScreen` | `item` | eligibility |
| Add by RSS podcast | `AddByRssHomeDetailScreen` (podcast feed) | `channel` | fetcher |
| Add by RSS album | `AddByRssHomeDetailScreen` (album feed) | `album` | fetcher |
| Add by RSS artist | `AddByRssHomeDetailScreen` (artist feed) | `artist` | fetcher |
| Add by RSS episode | `AddByRssEpisodeDetailScreen` | `item` | fetcher |
| Add by RSS track | `AddByRssTrackDetailScreen` | `track` | fetcher |
| Add by RSS livestream | `AddByRssLivestreamDetailScreen` | `livestream` | fetcher |
| `/donate` | none | — | — |

Directory livestreams already open `EpisodeDetail` (`HomeScreen` `handleRowPress` when `selectedMediaType === 'livestreams'` and the row is not Add by RSS). Do not add a livestream detail screen. The episode screen's item guid is the same item scope web's livestream page passes.

`/donate` is the app's own mb-v1 tip list. This request does not add that page on mobile. Leave it on web.

Eligibility gate, directory only: `getBoostEligibilityForContent(...).canShowBoostMessagesTab`. Channel screens pass `{ channel }`. Item screens pass `{ channel, itemGuid: item.guid }`. That is web's `ssrCanShowBoosts` on the database pages (`PodcastPageClient` and the episode, track, album, artist, and livestream clients). The chip can show before the capability request returns. If the capability then fails or has no public URL, the chip stays and the pane shows `value.boost_messages.public_messages_unavailable`.

Fetcher gate, Add by RSS only: the chip shows when `createPublicBoostMessagesPageFetcher` returns non-null. That is web's `canShowBoostTab`. The local feed is `buildAddByRssBoostChannel` (already used on `AddByRssHomeDetailScreen`). Item screens pass that channel plus the item guid from the mapped bundle or live item. Do not show the chip from eligibility alone on Add by RSS.

The chip label is the existing catalog key `value.boost` (`Boost`). Do not add a second in-body heading. Web's in-section heading is `v4v.boost_messages.title`; mobile section chips are the heading (`mobile-screen-layout`).

## Chip order

`insertBoostsChip` in `apps/mobile/src/lib/boost/insertBoostsChip.ts`:

```ts
export const insertBoostsChip = <T extends string>(
  tabs: readonly T[],
  hasBoosts: boolean,
  before: T
): (T | 'boosts')[]
```

When `hasBoosts` is false, return a copy of `tabs`. When it is true, insert `'boosts'` immediately before the first `before` entry. If `before` is absent, append `'boosts'`.

Use it so Boosts sits immediately before Funding on screens that have Funding, and immediately before People on screens that do not. That is the mobile evidence-chip slot (`mobile-section-chrome-cache`: evidence chips resolve before Funding, and People is last). Do not copy web's add-by-rss episode index, which places Boosts directly after Summary.

Tests for `insertBoostsChip`:

- false leaves the list unchanged and does not include `boosts`
- true inserts immediately before `funding`
- true appends when `funding` is absent

### Directory channel tabs

Add `'boosts'` to these consts in `detailListPrefs.ts`, immediately before `'funding'`:

- `PODCAST_TABS` (after `'remote_items'`)
- `ALBUM_TABS` (after `'remote_items'`)
- `ARTIST_TABS` (after `'podroll'`)
- `ADD_BY_RSS_DETAIL_TABS` (after `'remote_items'`)

`resolvePodcastSections` (`podcastSections.ts`): new argument `previewHasBoosts?: boolean`. `hasBoosts` is `getBoostEligibilityForContent({ channel }).canShowBoostMessagesTab` when `channel` is non-null, otherwise `previewHasBoosts === true`. The filter returns that for `'boosts'`. The filter's last line is `return false`, so an unlisted tab never appears; the `'boosts'` branch is what shows the chip. Add `boosts: 'value.boost'` to `PODCAST_SECTION_LABEL_KEYS` in this file (`Record<PodcastTab, string>`). Do not add `boosts` to `ALWAYS_ON_PODCAST_SECTIONS`, `SORTABLE_SECTIONS`, or `FILTERABLE_SECTIONS`. Extend `podcastSections.test.ts` with one case: podroll plus funding plus boosts yields evidence, then `boosts`, then `funding`. A cache-only case: `channel: null` and `previewHasBoosts: true` includes `boosts` after the always-on chips.

`isPodcastSectionUnavailableOffline` returns true for `'boosts'` as well as the sections it already lists. Extend `offlineModeViews.test.ts` with that assertion. The podcast screen then shows its existing offline fill and does not mount the pane. About, Episodes, and Downloaded stay selectable. Do not auto-select Boosts.

`PodcastDetailScreen`: add `boosts: PodcastBoostsSection` to `SECTION_COMPONENTS`. The chip label already comes from `PODCAST_SECTION_LABEL_KEYS`, and the chip id is `podcast-detail-section-${available}`. Read `cachedChrome?.hasBoosts` the same way the screen reads `hasFunding` (`previewHasBoosts` state, seeded from `getCachedChannelSectionFlags`, refreshed when that cache updates). Pass it into `resolvePodcastSections`. Where the screen already calls `sectionChromeFlagsRepository.mergeChannel` after the channel arrives, set `hasBoosts` from `getBoostEligibilityForContent({ channel }).canShowBoostMessagesTab`.

`AlbumDetailScreen` `availableSections` (`ALBUM_TABS.filter`): add `if (tab === 'boosts') return hasBoosts` before the final `return true`. Without that branch, Boosts would show on every album. `hasBoosts` follows the funding preview pattern (`channel` loaded uses eligibility; otherwise `previewHasBoosts`). Write it in the existing `mergeChannel` call. `SECTION_LABEL_KEYS` gains `boosts: 'value.boost'`. In `sectionListBody`, add a `section === 'boosts'` branch before the `peopleBody` fallback. The fallback is People today; a selected Boosts chip must not render People.

`ArtistDetailScreen` `availableSections`: push `'boosts'` immediately before the funding push. Same preview and `mergeChannel` rule. `SECTION_LABEL_KEYS` gains the same key. In the section body chain (the `section === 'funding'` ternary near the end of the screen), add a boosts branch so the people fallback is not used for this chip.

Add by RSS home (`resolveAddByRssSections`): add optional `hasBoosts = false`. When true, push `'boosts'` after the remote-items push and before the funding push. Existing tests omit the argument and stay valid. Add one test that a podcast feed with funding and `hasBoosts: true` places `boosts` immediately before `funding`. `ADD_BY_RSS_SECTION_LABEL_KEYS` and `SECTION_COMPONENTS` both gain `boosts`. `isAddByRssSortableSection` and `isAddByRssFilterableSection` stay false for it. The screen passes `hasBoosts: boostsPageFetcher !== null`. Rewrite the screen comment that says Boosts is a web-only tab. The comment should say the Boosts chip is offered when this feed's MetaBoost capability exposes a public message list.

`AddByRssHomeDetailScreen` section component receives the feed's boost channel, the scope type (`channel` for a podcast feed, `artist` for an artist feed, `album` otherwise), and `fetchAllowed` true once `detailForRoute` is loaded. `onOpenChannel` is a no-op on this screen (the reader is already on the channel). `onOpenItem` looks up the guid in the mapped feed.

### Directory item tabs

Do not add `'boosts'` to `EPISODE_TABS`. The full player and `resolveEpisodeTabs` share that list.

`episodeDetailTabs.ts`:

```ts
export const resolveEpisodeDetailTabs = (input: {
  episode: EpisodeTabItem | null;
  previewFlags: ItemSectionChromeFlags | null;
  hasBoosts: boolean;
}): (EpisodeTab | 'boosts')[]
```

Return `insertBoostsChip(resolveEpisodeTabs(input), input.hasBoosts, 'funding')`. One test: funding plus `hasBoosts: true` places `boosts` immediately before `funding`, and the always-on chips stay first. `resolveEpisodeTabs` tests stay as they are. Their preview objects must still type-check after `hasBoosts` is added to `ItemSectionChromeFlags` (set `hasBoosts: false` on those literals). Do not expect `boosts` from `resolveEpisodeTabs`.

`EpisodeDetailScreen` tab state uses the wider type. Chips come from `resolveEpisodeDetailTabs`. The chip memo is `SectionChipItem<EpisodeTab>` and indexes `EPISODE_TAB_LABEL_KEYS[tab]`. Widen the item type. For `'boosts'`, the label is `t('value.boost')` and the test id is `episode-detail-tab-boosts`. Other tabs keep `EPISODE_TAB_LABEL_KEYS`. Do not add `'boosts'` to that record; it is `Record<EpisodeTab, string>` and the player still uses it. `hasBoosts` is the cached item flag until the channel is known, then `getBoostEligibilityForContent({ channel, itemGuid: episode.guid }).canShowBoostMessagesTab`.

`itemSectionFlagsFromDto` does not know the channel, so it does not set `hasBoosts`. Change its return to `Omit<ItemSectionChromeFlags, 'hasBoosts'>`. In `applyEpisode`, when `nextChannel` is null, keep the cached `hasBoosts` and do not write `hasBoosts` in `mergeItem` (a false write would clear a chip the cache already learned). When `nextChannel` is non-null, set `hasBoosts` from eligibility and include it in that `mergeItem` patch.

`paneFooter`: if `activeTab === 'boosts'`, return `ReceivedBoostsSection` before the `isTabLoading` / offline / summary branches. The chapter loader must not block this pane.

Track: add `'boosts'` to `TRACK_TABS` immediately before `'funding'`. Add `boosts: 'value.boost'` to `TRACK_TAB_LABEL_KEYS`. Do not add `'boosts'` to `isAddByRssTrackTab` or `resolveAddByRssTrackTabs`. In `TrackDetailScreen` `supportedTabs`, insert with `insertBoostsChip(tabs, hasBoosts, 'funding')` before returning. The same channel rule as the episode screen writes item `hasBoosts`. `paneFooter` (the `activeTab === 'summary'` block) returns `ReceivedBoostsSection` when the tab is `boosts`, before the summary branch.

### Add by RSS item tabs

`AddByRssEpisodeDetailScreen` keeps `resolveAddByRssEpisodeTabs` for the catalog chips, then `insertBoostsChip(tabs, fetcher !== null, 'people')`. Widen the local tab type with `'boosts'`. Its chip memo indexes `EPISODE_TAB_LABEL_KEYS`. Label `'boosts'` with `t('value.boost')` and test id `add-by-rss-episode-detail-tab-boosts`. Do not change `resolveAddByRssEpisodeTabs`.

`AddByRssTrackDetailScreen` does the same with `resolveAddByRssTrackTabs` and `'people'`. `TRACK_TAB_LABEL_KEYS` already covers `'boosts'` once that key is on `TrackTab`.

`AddByRssLivestreamDetailScreen` builds `['summary']` or `['summary', 'people']` in the `tabs` memo (`AddByRssLivestreamTab`). Insert `'boosts'` with `insertBoostsChip(tabs, fetcher !== null, 'people')`. The chip memo indexes `EPISODE_TAB_LABEL_KEYS`, which has no `boosts` key. Label `'boosts'` with `t('value.boost')` and test id `add-by-rss-livestream-detail-tab-boosts`. The live item guid is the scope's `itemGuid`. Scope type is `livestream`.

## Capability hook

`useMbrssPublicMessagesCapability` in `apps/mobile/src/components/boost/useMbrssPublicMessagesCapability.ts`.

Copy the status machine from `apps/web/src/components/Boost/hooks/useMbrssV1BoostCapability.ts`, narrowed to mbrss-v1. Call `fetchMbrssV1BoostCapability` from `@podverse/v4v-metaboost`. Do not import the web hook. Do not call `fetchMbV1BoostCapability` (that path is the donate page).

Arguments: `metaBoost: MetaBoost | null`, `fetchEnabled: boolean`. Return `{ status, publicMessagesUrl }` with status `'idle' | 'loading' | 'success' | 'error'`. A null meta boost, or `fetchEnabled` false, sets `idle` and a null URL and does not fetch. A failed request sets `error` and a null URL. Cancel the in-flight request when `metaBoost` or `fetchEnabled` changes (the web hook's `cancelled` flag).

Ignore sender guid, message limits, and terms. This pane only needs the public URL.

## List component

`ReceivedBoostsSection` in `apps/mobile/src/components/boost/ReceivedBoostsSection.tsx`.

Props:

```ts
type ReceivedBoostsSectionProps = {
  channel: BoostEligibilityChannel | null;
  itemGuid?: string | null;
  scopeType: PublicBoostMessagesScopeType;
  fetchAllowed: boolean;
  listHeader?: ReactNode;
  directoryChannelIdText?: string | null;
  onOpenChannel?: () => void;
  onOpenDirectoryItem?: (item: DTOItem) => void;
  onOpenItem?: (itemGuid: string) => void;
  testIDPrefix: string;
};
```

`DTOItem` on `onOpenDirectoryItem` is `import type { DTOItem } from '@podverse/helpers/dto'`. Do not import the `@podverse/helpers` barrel.

`PodcastBoostsSection` is a thin pane: it passes `channel`, `scopeType: 'channel'`, `fetchAllowed: true` once the channel is loaded, `listHeader`, `directoryChannelIdText` from that channel's `id_text`, and the navigation callbacks below. It uses `PodcastSectionPaneProps` and ignores filter, sort, and range.

Behavior:

- While Offline Mode is on (`useOfflineMode().enabled`), render `ListEmpty` with `settings.offline_mode.unavailable` and do not fetch. The podcast screen usually unmounts this pane first via `isPodcastSectionUnavailableOffline`. Album, artist, episode, track, and Add by RSS rely on this check.
- Otherwise call `getBoostEligibilityForContent({ channel, itemGuid })`, then the capability hook with `fetchEnabled: fetchAllowed && resolved standard is mbrss-v1`.
- Build the fetcher with `createPublicBoostMessagesPageFetcher`. `messagesScope` is `mbrssMessagesScope`. `metaBoost` is `resolvedMetaBoost`.
- Fetcher null and capability `loading`: `LoadingSection` plus the loading string. Do not show the empty sentence while the request is in flight (`mobile-pending-content-spinner`).
- Fetcher null and capability `error` or `idle` after `fetchAllowed`: the unavailable sentence.
- Fetcher non-null: load page 1 with `PUBLIC_BOOST_MESSAGES_PAGE_LIMIT`. Append further pages. Web replaces a page with its pager; this list appends, which is how mobile section lists already page (`onEndReached` on `FillList` / `PodcastSectionList`). Stop when `page >= totalPages`. A thrown fetch on page 1 shows the unavailable sentence and no rows. A thrown fetch on a later page keeps the rows already shown and does not spin forever; the next end-reached may retry that page once the in-flight flag is clear.
- A generation ref drops a response whose channel, item guid, or scope no longer matches (`input-rate-control`).
- Pull-to-refresh, where the parent list already has it, reloads page 1. The component exposes no refresh trigger. Area G does not have to poke this pane after a send. The listener reloads by leaving and reopening the chip, or by pulling to refresh on screens that already refresh the section list.
- Empty success (`messages.length === 0` on page 1): `value.boost_messages.public_messages_empty`.
- Map each message with `toPublicBoostMessageRow`. Locale is `i18n.language`. Labels: `misc.anonymous`, `value.types.lightning.denomination`, `value.boost_messages.public_amount_btc_token`. `headingFallback` is `t('value.boost')`. `currentPodcastGuid` is `channel.podcast_guid` or null.
- One column, `gap` from `tokens.spacing.lg` between cards (`even-content-spacing`). Each card is a `Card`. Sender is primary and bold. Date is secondary, from the row's `dateLabel` (do not format the date again). Amount primary and app name share a row, app name secondary and trailing. Body is primary, `pre-wrap` equivalent (`whitespace` is not RN; the string already contains newlines, so render it as `Text`). No hardcoded colors. Styles go through `useThemedStyles` with a module-scope factory.
- testIDs: `${testIDPrefix}-loading`, `${testIDPrefix}-empty`, `${testIDPrefix}-error`, `${testIDPrefix}-list`, `${testIDPrefix}-row-${row.key}`.
- The card is not one `accessible` group that swallows the item link. The sender, date, amount, and body sit in one group whose `accessibilityLabel` joins the non-empty parts in that order. The item link is a separate `Pressable` with `accessibilityRole="link"` and `accessibilityLabel` equal to the item label.
- Breadcrumb row when `row.breadcrumb` is non-null. That is every sub-bucket, including `target.kind === 'none'`. Podcast label is text. When the target kind is `channel` and `onOpenChannel` is set, the podcast label is the link (item screens pass `onOpenChannel`; channel screens omit it). A label with no callback, and a `none` target, stays text. Separator between the labels is `/`, the same as web.
- Directory item label (`directoryChannelIdText` is a non-empty string): the label stays text until the channel-item walk below returns a match, and only then is a link that calls `onOpenDirectoryItem` with that item. Do not use `onOpenItem` for that label. A walk that returns null or throws leaves the label as text. No spinner on the label.
- Add by RSS item label (`directoryChannelIdText` omitted): when `itemLabel` is non-null, the target kind is `item`, and `onOpenItem` is set, the item label is the link and calls `onOpenItem(itemGuid)`.

Catalog: reuse the consumer keys above. Do not add keys. Do not edit `packages/i18n-catalog`. The unavailable string is already lowercase at the start; use it as stored.

## Opening a breadcrumb

Directory item links use the same channel-item walk as web's `findItemIdTextByGuid` in `apps/web/src/components/Boost/messages/createMbrssBoostBreadcrumbLinkResolver.ts`. That walk calls `reqItemGetManyByChannel` with `sort: 'recent'` and `range: null`, page by page, and returns the item whose `guid` equals the breadcrumb guid and whose `id_text` is non-empty. It still returns that item when the phone has no stored row for it. This is every directory item label: podcast, album, artist, episode, and track. The screen then opens an episode or a track from the match. Add by RSS does not use this walk.

Put the loop in `findChannelItemByGuid` (`apps/mobile/src/lib/boost/findChannelItemByGuid.ts`). It takes the guid and a `fetchPage` function and returns the matching `DTOItem` or null. Copy web's page bound: start at page 1 with `totalPages` 1; after each page set `totalPages` to `Math.max(1, Math.ceil((meta.count ?? 0) / Math.max(1, meta.limit ?? 20)))`; stop when `page` passes `totalPages` or a match is found. Do not fetch the next page after a match. A blank guid returns null and does not fetch. An item whose guid matches and whose `id_text` trims to empty is not a match. The recent route's real `meta.limit` is the API default (60) and `meta.count` is the channel episode count; use those fields from the response. The `?? 20` and `?? 0` branches are only for a response that omits them, matching web.

`channelItemsRepository.findByGuid` (next to `listByChannel` in `apps/mobile/src/data/repositories/channelItemsRepository.ts`) calls that function. `fetchPage` uses `requestWithMobileAuthRefresh` and `api.reqItemGetManyByChannel({ idOrIdText: channelIdText, page, sort: 'recent', range: null })`, the same request `fetchChannelItemWindow` already makes. Do not call `fetchChannelItemWindow`, `listByChannel`, or `toChannelItemRecord`. Do not write the pages into SQLite. A blank `channelIdText` or guid returns null without a request. `EpisodeDetailScreen` already loads by `id_text` through `reqItemGetByIdOrIdText` when no row is stored.

`ReceivedBoostsSection` reads `useAuth()` and, when `directoryChannelIdText` trims to a non-empty string, resolves each distinct item guid once through `findByGuid` with `{ accessToken, clearSession, refreshToken, setTokens }`. Keep a result cache and an in-flight map keyed by guid, and drop both when `directoryChannelIdText` changes (same idea as web's `itemHrefCache` and `itemPendingMap`). Ignore a response whose channel id no longer matches (`input-rate-control`). Null and a thrown error, including `OfflineModeEnabledError`, cache as no match until the channel id changes or pull-to-refresh reloads page 1, which clears this cache. The label is not a link in that case. Do not show an error dialog for a miss. Screens do not call `reqItemGetManyByChannel`.

`onOpenDirectoryItem` receives the matched `DTOItem`. The screen branches on the channel it already loaded (a `DTOChannel`). The recent list does not embed `channel` (`itemGetManyRelations`), so the medium is `channel.medium_id` on the screen, not a field on the list item. `getManyByChannel` keeps only rows whose live item id is null, so a match from this walk has `live_item` null. Keep the live branch: if `live_item` is non-null, open `EpisodeDetail`. Do not add a live-item list request. Web's walk uses this same route and does not add one.

- `live_item` non-null: `EpisodeDetail` with `{ episodeId: item.id_text }`. Directory livestreams already open that screen.
- No `live_item`, and `isMusicMediumId(channel.medium_id)` from `@podverse/helpers/medium`: `TrackDetail` through `buildTrackDetailParams` in `apps/mobile/src/navigation/trackDetailParams.ts`. Pass `trackId: item.id_text`. When `item.title` trims to a non-empty string, pass `previewTitle`. When `getItemPrimaryImageUrl(item)` from `apps/mobile/src/data/repositories/channelItemWindow.ts` is non-null, pass `previewImageUrl`.
- Any other match: `EpisodeDetail` with `{ episodeId: item.id_text }`.

There is no episode-params helper. Stay on the current tab stack (`mobile-tab-stack-isolation`).

Directory screens pass `directoryChannelIdText` from the loaded channel's `id_text` and `onOpenDirectoryItem`. They do not pass `onOpenItem`. `PodcastBoostsSection` forwards both. Album, artist, episode, and track boost panes do the same, where each screen already mounts `ReceivedBoostsSection` (`sectionListBody` on album, the section body chain on artist, `paneFooter` on episode and track). The channel is the one those screens already hold when the pane can fetch.

`onOpenChannel` on an item screen reuses that screen's existing channel press. `EpisodeDetailScreen` `handleOpenPodcast` opens `PodcastDetail` through `buildPodcastDetailParams`. `TrackDetailScreen` already opens `AlbumDetail` through `buildAlbumDetailParams` and `ArtistDetail` through `buildArtistDetailParams`; the breadcrumb uses the press that matches this track's channel. Do not call `resolveFullPlayerChannelLink`. It needs a playback target, and these screens already have the channel. Stay on the current tab stack.

Add by RSS: search the mapped feed's items and live items for that guid. Do not call `findByGuid` or `reqItemGetManyByChannel`. The feed already on the phone is the whole search. The item key is `addByRssEpisodeItemKey` in `apps/mobile/src/lib/addByRss/localResourceData.ts` (guid, or the index when the item has none). `toAddByRssItemPlaybackResourceData` lives in `apps/mobile/src/lib/addByRss/domain.ts`. Open `AddByRssEpisodeDetail`, `AddByRssTrackDetail`, or `AddByRssLivestreamDetail` with `{ feedIdText, itemKey }` from `addByRssStackParams.ts`, on the current stack. No match: the label is not a link. `onOpenChannel` opens `AddByRssPodcastDetail` with this feed's `feedIdText`.

`findChannelItemByGuid.test.ts` uses a fake `fetchPage`. Cases: a match on page 1 does not fetch page 2; a match on page 2 fetches page 2 and stops; no match after the last page returns null; a blank guid does not fetch; a guid match with a blank `id_text` is not a match; `count` 61 and `limit` 60 with a miss on page 1 fetches page 2. No Maestro flow for this walk. `boost-messages.yaml` still only asserts the chip stays off the seeded podcast.

## Item chrome flag

Add `hasBoosts: boolean` to `ItemSectionChromeFlags` and `EMPTY_ITEM_SECTION_CHROME_FLAGS` (`false`). `parseItemSectionChromeFlags` reads it with `readBooleanFlag` (missing key is false). No SQLite migration: the column is `flags_json`, and a missing key already reads as false.

Update `sectionChromeFlags.test.ts` literals so the new field is present. Channel flags already have `hasBoosts` and already parse it. This plan is what first writes that channel flag.

`episodeTabs.test.ts` preview objects need `hasBoosts: false` so they still match `ItemSectionChromeFlags`. Expected chip lists in that file do not gain `boosts`.

## Maestro

`apps/mobile/e2e/boost-messages.yaml`. Follow `v4v.yaml` through launch, seeded login, search for `podcast`, open `search-result-row-0`, and assert `podcast-detail-screen` and `podcast-detail-sections`. Then:

```yaml
- assertNotVisible:
    id: podcast-detail-section-boosts
```

That id is `podcast-detail-section-${available}` from `PodcastDetailScreen`'s chip memo. Timeouts use `${TIMEOUT_FAST}` except the login and search waits, which copy the tiers `v4v.yaml` already uses. No playback. No tap on a missing chip.

## Comments

`AddByRssHomeDetailScreen` says Boosts is web-only. Replace that sentence with the chip rule above. Do not mention a plan or a removed limitation beyond what the code does now.

`detailListPrefs.ts` comments that list pane order should mention Boosts before Funding where the const now has it.
