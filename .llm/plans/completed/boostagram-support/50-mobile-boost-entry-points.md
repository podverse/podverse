**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

Show the boost button on every mobile surface that web already treats as boostable, and open the existing sheet with one settled target. Sending stays the placeholder dialog. Area G replaces submit and reads this target; it does not invent a second shape.

Web parity for the button (not the received-messages list):

- Channel pages pass the channel and no item: podcast, artist, album, and Add by RSS podcast, artist, and album. Mobile already does this from `PodcastDetailScreen`, `ArtistDetailScreen`, `AlbumDetailScreen`, and `AddByRssHomeDetailScreen` (that one screen is the Add by RSS channel page for every medium).
- Item pages pass the channel and the item. Directory episode, track, and livestream pages do this by mounting the parent channel header with the item (`CorePodcastHeader` / `CoreAlbumHeader`). Mobile item screens do not. Add by RSS episode, track, and livestream screens pass that item, and playback of that item does too. Web does the same. Channel pages on both surfaces still pass no item.
- The full player passes the now-playing channel and item. Mobile already has `full-player-boost`, but `channelFromTarget` and `itemFromTarget` in `FullPlayerScreen` return null for `add-by-rss`. When the stored channel has no `channel_values` array, the full player loads our channel before it asks whether the button can show. Web's full player does the same. Do not read `has_podcast_index_value`. That field is not on `DTOChannel`.

The button follows `getBoostEligibilityForContent` in `packages/v4v-metaboost/src/boostEligibility.ts` (plan 12). Pass `itemValues: item.item_values` when the screen or the player has an item. Omit `itemValues` on a channel screen. The function does not read `item_values` off `item`. `item` is still the guid used for the public-message scope. Do not add a second check. Item value rows still change which recipients the sheet lists (`boostRecipientsForTab`: item recipients replace channel recipients when the item value has any). That list is not the show/hide rule.

The gold control is `HeaderBarAction` with `icon="cash-outline"`, `iconColor={tokens.text.warning}`, `accessibilityLabel={t('value.boost')}`, catalog key `value.boost`. It is not gated by `getMobileConfig().isV4vEnabled`. That flag only shows `full-player-v4v`, which opens `V4vInfoScreen`. Leave that button and flag alone.

A remote full-player session (`isRemoteDisplay`) keeps the boost button hidden, as `showBoost={!isRemoteDisplay && canShowBoost}` already does.

## Rows

R13, R15, R23, R46

## Runs after

12, 22, 40, 61

## Files

- apps/mobile/src/components/boost/BoostSheet.tsx
- apps/mobile/src/components/boost/boostFormModel.ts
- apps/mobile/src/components/boost/BoostHeaderAction.tsx
- apps/mobile/src/components/player/FullPlayerActionRow.tsx
- apps/mobile/src/components/boost/useDirectoryBoostTarget.ts
- apps/mobile/src/lib/addByRss/boostTarget.ts
- apps/mobile/src/lib/addByRss/boostTarget.test.ts
- packages/parser-mapping/src/addByRSS/boost.ts
- packages/parser-mapping/src/addByRSS/boost.test.ts
- apps/mobile/vitest.config.ts
- scripts/mobile/e2e-test.sh
- apps/mobile/src/screens/player/FullPlayerScreen.tsx
- apps/mobile/src/screens/podcast/PodcastDetailScreen.tsx
- apps/mobile/src/screens/artist/ArtistDetailScreen.tsx
- apps/mobile/src/screens/album/AlbumDetailScreen.tsx
- apps/mobile/src/screens/home/AddByRssHomeDetailScreen.tsx
- apps/mobile/src/screens/episode/EpisodeDetailScreen.tsx
- apps/mobile/src/screens/track/TrackDetailScreen.tsx
- apps/mobile/src/screens/home/AddByRssEpisodeDetailScreen.tsx
- apps/mobile/src/screens/home/AddByRssTrackDetailScreen.tsx
- apps/mobile/src/screens/home/AddByRssLivestreamDetailScreen.tsx
- tools/web/seed-e2e.mjs
- apps/mobile/e2e/boost-entry.yaml

`FullPlayerScreen.tsx` and `tools/web/seed-e2e.mjs` are large-file-reading files. Edit only the anchors named below. Do not page either file.

Plan 61 has already inserted the Boosts chip and the messages section on these screens. Keep them. This plan adds the header action and mounts `boostSheet`. Do not add a second chip or a second list.

Area G edits `BoostSheet.tsx` and `boostFormModel.ts` to send. This plan does not change submit: it still opens `ConfirmDialog` `boost-not-available`.

## Tests

- `packages/parser-mapping/src/addByRSS/boost.test.ts` — append cases for `buildAddByRssBoostSheetItem`. It copies recipient fields and drops time splits. Leave plan 40's `buildAddByRssBoostItem` cases in place. Vitest, beside the source.
- `apps/mobile/src/lib/addByRss/boostTarget.test.ts` — `boostTargetFromMappedFeed` returns the settled `BoostSheetTarget`. Vitest, beside the source. Append `src/lib/addByRss/boostTarget.test.ts` to the `include` array in `apps/mobile/vitest.config.ts`. Do not remove paths already listed, and do not rewrite the comment.
- `apps/mobile/e2e/boost-entry.yaml` needs the seeded podcast, so add `boost-entry` to `flow_needs_e2e_api` in `scripts/mobile/e2e-test.sh` beside `v4v`. Keep `boost-messages` if it is already on that line.
- `apps/mobile/e2e/boost-entry.yaml` — one flow, both platforms share it (the control is not platform-specific). It opens the seeded podcast episode and the sheet. No second flow for the player or Add by RSS: those paths are the same button plus the unit-tested builder. Those podcast items already have a lightning `node` recipient. The episode screen passes `itemValues`, so `episode-detail-boost` shows from that recipient. The channel insert in this plan is what makes the podcast channel screen eligible, because that screen omits `itemValues`.

## Release scratchpad

```markdown
## Boost button on mobile item screens and Add by RSS playback

- Surfaces: mobile
- Change: The boost button opens the existing boost sheet on episode, track, and Add by RSS episode, track, and livestream screens when the channel can be boosted, and on the full player during Add by RSS playback. Directory livestreams use the episode screen. Submit still says sending is not available yet.
- Who notices: listeners on iOS and Android, when the channel or the item can show Boost
- Operator steps: none
```

## openBoost arguments

Replace `BoostSheetTarget` in `BoostSheet.tsx` with this shape. `useBoostSheet` already takes that type; no other change there.

```typescript
export type BoostSheetItem = {
  guid?: string | null;
  id_text: string;
  item_images?: DTOItem['item_images'];
  item_values?: DTOItem['item_values'];
  title?: string | null;
};

export type BoostSheetAddByRss = {
  feedIdText: string;
  feedUrl: string;
  /** Null on a channel screen. Episode, track, or live item key on an item screen and during playback. */
  itemKey: string | null;
};

export type BoostSheetTarget = {
  /** Null for directory content. Non-null means the ids below are local Add by RSS ids. */
  addByRss: BoostSheetAddByRss | null;
  channel: DTOChannel;
  item: BoostSheetItem | null;
};
```

`openBoost(target: BoostSheetTarget): void` is unchanged aside from this type.

Directory call, channel screen:

```typescript
openBoost({ addByRss: null, channel, item: null });
```

Directory call, item screen and full player. `channel` is a channel GET body (`channelGetOneRelations` includes `channel_values` and `channel_meta_boost`). `item` is the item GET body, or null only when the player target has no item (`livestream` with `item: null`). A `DTOItem` satisfies `BoostSheetItem`.

```typescript
openBoost({ addByRss: null, channel, item });
```

Add by RSS call. `channel` is the return of `buildAddByRssBoostChannel`. `item` is the return of `buildAddByRssBoostSheetItem`, or null on a channel screen.

```typescript
openBoost({
  addByRss: { feedIdText: feed.idText, feedUrl: feed.feedUrl, itemKey },
  channel,
  item,
});
```

Rules area G must follow. Do not encode them only in a comment:

- `addByRss === null`: `channel.id_text` and `item.id_text` are directory ids. `item.guid` is the RSS guid when the row has one.
- `addByRss !== null`: do not call `reqChannelGetByIdOrIdText` or `reqItemGetByIdOrIdText` with these ids. `channel.id` and `channel.feed_id` are the local feed id. `channel.id_text` equals `addByRss.feedIdText`. `channel.podcast_guid` is the RSS podcast guid from the mapped feed. When `item` is non-null, `item.id_text` equals `addByRss.itemKey` and `item.guid` is the RSS item guid or null.
- Send from `channel.channel_values` and `item.item_values` on this object. Do not send from the sheet's merged Lightning tab. `buildBoostValueTabs` still runs `mergeLightningChannelValues` / `mergeLightningItemValues`, which collapse every lightning row into one value with `method: 'keysend'`. That merge is display. Leave it. A recipient's send method is `recipient.type` (`lnaddress` or `node`) on the unmerged value rows.

`buildBoostValueTabs` today takes `DTOItem | null` and only reads `item_values`. Change that parameter to `BoostSheetItem | null` so a built Add by RSS item type-checks. `BoostSheet` already reads `id_text`, `title`, `item_images`, and `item_values` for the heading, artwork, and reset key.

## Shared header action

Add `BoostHeaderAction` in `apps/mobile/src/components/boost/BoostHeaderAction.tsx`. Named export. Props: `onPress: () => void` and `testID: string`. It renders the `HeaderBarAction` described above. No new catalog key.

Use it in `FullPlayerActionRow` in place of the inline boost `HeaderBarAction` (`testID` stays `full-player-boost`). Use it for every screen header action below. Order in `HeaderBarActions` is boost, then the existing share action. Add by RSS item screens have no share; when the button is hidden, `headerRight` returns null, matching `AddByRssHomeDetailScreen`.

Render `{boostSheet}` as a sibling of the screen body, the way `PodcastDetailScreen` does (`<>` around `ChannelDetailShell` and `{boostSheet}`). `EpisodeDetailScreen` today returns one `View` that ends with `{addToPlaylistSheet}`; wrap that return the same way. Do this on every screen that calls `openBoost`.

| Screen | testID | item | addByRss.itemKey |
| --- | --- | --- | --- |
| PodcastDetailScreen | podcast-detail-boost | null | null (`addByRss` null) |
| ArtistDetailScreen | artist-detail-boost | null | null |
| AlbumDetailScreen | album-detail-boost | null | null |
| AddByRssHomeDetailScreen | add-by-rss-home-boost | null | null |
| EpisodeDetailScreen | episode-detail-boost | the loaded `episode` | null |
| TrackDetailScreen | track-detail-boost | the loaded track | null |
| AddByRssEpisodeDetailScreen | add-by-rss-episode-detail-boost | built item | `route.params.itemKey` |
| AddByRssTrackDetailScreen | add-by-rss-track-detail-boost | built item | `route.params.itemKey` |
| AddByRssLivestreamDetailScreen | add-by-rss-livestream-detail-boost | built item | `route.params.liveItemKey` |
| FullPlayerScreen | full-player-boost | now-playing item, or null | null, or the playing item key |

Show the action only when `channel` is non-null and `canShowBoostAction` is true. A channel screen calls `getBoostEligibilityForContent({ channel })` and omits `itemValues`. An item screen calls `getBoostEligibilityForContent({ channel, item, itemValues: item.item_values })`, where `item` is the loaded episode, track, or built Add by RSS item. Pass that same `item` into `openBoost`. The full player does not use the stored channel for this call. It uses the loaded channel and item in the sections below.

`EpisodeDetailScreen` and `TrackDetailScreen` already load the channel with `reqChannelGetByIdOrIdText` when the item payload has no `channel`, and the item with `reqItemGetByIdOrIdText` (`itemGetOneRelations` includes `item_values`). Use those state values. Do not add a second fetch on those screens.

## Directory livestreams

There is no database livestream screen. `PodcastEpisodesSection` and `AlbumDetailScreen` `handleOpenLivestream` both navigate to `EpisodeDetail` with the live item's id. `resolveFullPlayerTitleLink` does the same for a player title. The episode screen's button covers podcast and album livestreams. A playing livestream uses `PlaybackTarget` kind `livestream` and `openBoost` with that `item` (it may be null; then the target item is null and the channel is the show).

`ClipDetailScreen` does not get a button. Web shows one there only because the clip page mounts the parent channel header with the parent item. Chapter has no mobile screen. Both stay out of this plan.

## Full player directory load

`channelGetManyRelations` omits `channel_values` and `channel_meta_boost`. A playback target built from a list or from the stored channel therefore has no `channel_values` array. `itemGetManyRelations` omits `item_values`. `shouldShowV4vAction` already documents that omission. When the stored channel has no `channel_values` array, the full player loads our channel. Do not read `has_podcast_index_value`. That field is not on `DTOChannel`. Web's full player loads our channel the same way. This plan does not edit web.

Add `useDirectoryBoostTarget` in `apps/mobile/src/components/boost/useDirectoryBoostTarget.ts`.

- Inputs: the playback `channel` (`channelFromTarget`), the playback `item` (`itemFromTarget`), and `enabled`. `FullPlayerScreen` passes `enabled` false when `isRemoteDisplay` is true or `activeTarget.kind === 'add-by-rss'`.
- When `enabled` is false or `channel` is null, return `{ channel: null, item: null, ready: false }` and do not fetch.
- When `Array.isArray(channel.channel_values)`, that channel is already a detail body. Use it. Do not refetch.
- Otherwise fetch our channel with `requestWithMobileAuthRefresh` and `api.reqChannelGetByIdOrIdText(channel.id_text)`. `EpisodeDetailScreen` uses that same pair when it has an id text. That GET is the Podverse channel. Do not call Podcast Index. Do not block the player. The button stays hidden until this fetch settles. On failure the button stays hidden. No dialog and no notice.
- When `item` is null, the result item is null.
- When `item` is non-null and `Array.isArray(item.item_values)`, use it.
- Otherwise fetch `api.reqItemGetByIdOrIdText(item.id_text)`. On success, use that body. On failure, use the playback item with `item_values: []` so the sheet still shows the item title and guid and lists channel recipients. The button does not wait on this fetch once the channel has settled.
- Ignore a response that returns after the channel id or item id changed.

`showBoost` for a directory target is `!isRemoteDisplay && ready && getBoostEligibilityForContent({ channel: loadedChannel, item: loadedItem, itemValues: loadedItem?.item_values }).canShowBoostAction`. `onOpenBoost` calls `openBoost({ addByRss: null, channel: loadedChannel, item: loadedItem })` and returns immediately when `loadedChannel` is null.

## Add by RSS target

Plan 40 already exports `buildAddByRssBoostItem(indexItem): DTOItem` from `packages/parser-mapping/src/addByRSS/boost.ts`, with its cases in `boost.test.ts`. Do not change that function, its parameter, its return type, or those cases.

Add `buildAddByRssBoostSheetItem` next to it. The package barrel already re-exports this file. Do not edit the barrel. Tier A import: the new test imports `./boost.js`.

`compatItemValueDtos` and `compatItemImageDtos` already take `Episode`, which includes `Phase4PodcastLiveItem`. Do not edit `packages/parser-mapping/src/compat/partytime/item.ts`. Call those two functions as they stand after plan 20.

```typescript
export type AddByRssBoostItem = {
  guid: string | null;
  id_text: string;
  item_images: DTOItemImage[];
  item_values: DTOItemValue[];
  title: string | null;
};

export type AddByRssBoostItemInput = {
  guid: string | null;
  idText: string;
  images: ReadonlyArray<{ url: string; image_width_size: number | null }>;
  title: string | null;
  values: AddByRSSMappedFeed['items'][number]['value'];
};

export const buildAddByRssBoostSheetItem = (input: AddByRssBoostItemInput): AddByRssBoostItem
```

`AddByRssBoostItem` is the parser-mapping type. Mobile `BoostSheetItem` is the same fields (`guid` and `title` optional on the sheet type). Do not import the mobile type into this package. Map the input like `mapChannelValues` in the same file:

- `id_text`: `input.idText`
- `guid`: `input.guid` when it is a non-empty string, otherwise null
- `title`: `input.title`
- `item_images`: each image becomes `{ id: index + 1, image_width_size, is_resized: false, item_id: 0, url }`
- `item_values`: one row per input value. `id` is `index + 1`, `item_id` is `0`. Copy `type`, `method`, and `suggested` from `item_value`. Each recipient gets `id: recipientIndex + 1`, `item_value_id` equal to that value's `id`, and `type`, `address`, `split`, `name`, `custom_key`, `custom_value`, `fee` copied from the input (`name`, `custom_key`, and `custom_value` null when absent, `fee` false when absent). Do not copy `item_value_time_splits`.

Do not merge lightning rows and do not change a recipient's type.

Add `boostTargetFromMappedFeed` in `apps/mobile/src/lib/addByRss/boostTarget.ts`:

```typescript
export function boostTargetFromMappedFeed(input: {
  feed: { id: number; idText: string; feedUrl: string; title: string | null; imageUrl: string | null };
  item: AddByRSSMappedFeed['items'][number] | null;
  itemKey: string | null;
  liveItem: AddByRSSMappedFeed['liveItems'][number] | null;
  mappedFeed: AddByRSSMappedFeed;
}): BoostSheetTarget | null
```

- Build the channel with `buildAddByRssBoostChannel({ ...input.feed, mappedFeed: input.mappedFeed })`. Return null when that returns null.
- When `liveItem` is non-null, it wins over `item`. `itemKey` must be a non-empty string; otherwise return null. Build the item with `buildAddByRssBoostSheetItem` from `compatItemValueDtos(liveItem.item)` and `compatItemImageDtos(liveItem.item)`. `guid` is `liveItem.item.guid` trimmed, or null. `title` is `liveItem.item.title` or null. Both helpers are already exported from `@podverse/parser-mapping`. `liveItem.item` is a `Phase4PodcastLiveItem`, and `Episode` already includes that type. Do not add a type assertion.
- When `liveItem` is null and `item` is non-null, `itemKey` must be a non-empty string; otherwise return null. Pass `item.value`, `item.images`, `item.item.guid`, and `item.item.title`.
- When both items are null, the target item is null and `addByRss.itemKey` is null. Ignore `itemKey` in that case.
- `addByRss` is `{ feedIdText: feed.idText, feedUrl: feed.feedUrl, itemKey }` with `itemKey` null in the channel-only case and the passed key otherwise.

`AddByRssHomeDetailScreen` already builds `boostChannel`. Keep that. Pass `addByRss: { feedIdText, feedUrl, itemKey: null }` from `detailForRoute.feed`. `openBoost` only when `boostChannel` is non-null.

Item screens (`useAddByRssItemDetail` / `useAddByRssLiveItemDetail` already return `feed`, `mappedFeed`, and the episode, track, or `liveItem`):

- Episode and track: `boostTargetFromMappedFeed` with `item: episode.itemBundle` or `track.itemBundle`, `liveItem: null`, `itemKey: route.params.itemKey`.
- Livestream: `item: null`, `liveItem: liveItem.liveBundle`, `itemKey: route.params.liveItemKey`.
- The button uses the returned target. Hidden when the function returns null or eligibility is false.

## Full player Add by RSS

`FullPlayerScreen` already resolves the feed in the effect that calls `resolveLocalAddByRssFeedIdText`, `addByRssRepository.getFeedByIdText`, `addByRssRepository.getMappedFeedByUrl`, then `resolveAddByRssLiveItemKey` or `addByRssEpisodeItemKey`. That effect drops `mappedFeed` after computing the key. Keep the built target in state from that same effect. Do not add a second read.

After `mappedFeed` loads, the effect already computes `itemKey` with `resolveAddByRssLiveItemKey` or `addByRssEpisodeItemKey`. Then:

- When `itemKey` is null, call `boostTargetFromMappedFeed` with `item: null`, `liveItem: null`, and `itemKey: null`.
- When `itemKey` is non-null and `isAddByRssLivestreamResourceData(resourceData)` is true: `findAddByRssLiveItemDetail(mappedFeed, itemKey)` from `apps/mobile/src/lib/addByRss/liveItemDetail.ts`. Pass its `liveBundle` and that `itemKey`. When the lookup returns null, pass `item: null`, `liveItem: null`, and `itemKey: null`.
- Otherwise: `buildAddByRssHomeDetailData(record, mappedFeed).episodeRows.find((row) => row.itemKey === itemKey)` and pass that row's `itemBundle` with that `itemKey`. `record` is the `MobileAddByRSSFeedRecord` the effect already loaded. When the row is missing, pass `item: null`, `liveItem: null`, and `itemKey: null`.
- Store the `boostTargetFromMappedFeed` result. Clear it when `addByRssResourceData` is null, the feed id is null, the mapped feed is null, the effect's `isCurrent` flipped, or the `.catch` runs, the same way it clears `addByRssFeedIdText`.

`showBoost` for Add by RSS is `!isRemoteDisplay && target !== null && getBoostEligibilityForContent({ channel: target.channel, item: target.item, itemValues: target.item?.item_values }).canShowBoostAction`. `onOpenBoost` passes that target through. Add by RSS episode, track, and livestream playback pass that item. Web does the same.

`channelFromTarget` stays null for `add-by-rss`. Do not invent a directory channel for it.

## Seed

Plan 40 has already added `seedBoostEpisodeChannelFixture` and its constants. Leave that call and those constants.

In `seedMediaPlayerAndEmbedFixtures` in `tools/web/seed-e2e.mjs`, after `podcastChannelId` is known and beside `INSERT INTO channel_about` for `E2E Podcast Seed Channel` (the channel search "podcast" opens):

- `INSERT INTO channel_meta_boost (channel_id, standard, node) VALUES ($1, 'mbrss-v1', 'https://example.com/v1/s/mbrss-v1/boost/e2e/')`
- `INSERT INTO channel_value (channel_id, type, method, suggested) VALUES ($1, 'lightning', 'keysend', NULL) RETURNING id`
- `INSERT INTO channel_value_recipient (channel_value_id, type, address, split, name, fee) VALUES ($1, 'node', $2, 100, 'E2E Podcast Host', false)` using the existing `E2E_ITEM_VALUE_RECIPIENT_ADDRESS`

The node URL is an example host. Do not use a live MetaBoost host. The feed delete above this insert (`DELETE FROM feed WHERE podcast_index_id = $1 OR url = $2` for `E2E_PODCAST_FEED_PI_ID`) already cascades through `channel` to `channel_meta_boost`, `channel_value`, and `channel_value_recipient`. Do not add another delete.

Do not add these rows to other fixtures. Do not set `podcast_guid`.

## Maestro

`apps/mobile/e2e/boost-entry.yaml`, modeled on the search path in `apps/mobile/e2e/v4v.yaml` and stopping on the episode screen. Do not start playback.

- `runFlow: shared/launch-and-connect.yaml` then `shared/login-seeded-user.yaml`
- Search `podcast`, tap `search-result-row-0`, wait for `podcast-detail-screen` with `${TIMEOUT_SLOW}`
- Tap `podcast-episode-row-0`, wait for `episode-detail-screen` with `${TIMEOUT_SLOW}`
- `assertVisible` `episode-detail-boost` (no `when`; the seed makes it present)
- Tap it, `extendedWaitUntil` `boost-sheet` with `${TIMEOUT_FAST}`
- Tap `boost-sheet-close`, then `assertNotVisible` `boost-sheet`
- Do not tap `boost-sheet-submit`

Timeouts come from `apps/mobile/e2e/shared/timeouts.env`. No numeric literals.

## Leave unchanged

- `V4vInfoScreen`, `shouldShowV4vAction`, and `EXPO_PUBLIC_MOBILE_V4V_ENABLED`
- Sheet submit and the not-available dialog
- `mergeLightningChannelValues` and `mergeLightningItemValues`
- PayPal, Patreon, and Buy Me a Coffee tabs
- Clip and chapter screens
- Received boostagram lists
