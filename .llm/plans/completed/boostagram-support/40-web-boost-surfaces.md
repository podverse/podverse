**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# Web channel and item boost surfaces

Database channel and item pages already show the boost button when `getBoostEligibilityForContent` allows it, and they already pass the item into `setModalBoost` on item pages. Add by RSS channel pages do the same for the channel. Add by RSS episode, track, and livestream pages show the button on the channel header and open the modal with `item: null`, so the boost ignores that item's value recipients. This plan passes the item there, and records the rest of the web page set so later work does not add a second button.

The button follows `getBoostEligibilityForContent` in `packages/v4v-metaboost/src/boostEligibility.ts` after plan 12. Do not change that function. When the screen has an item, pass `itemValues` from that item's `item_values`. When the screen has no item, omit `itemValues` so the function uses `channel_values`.

## Rows

R14, R22, R44

## Runs after

12, 22

## Files

- packages/parser-mapping/src/addByRSS/boost.ts
- packages/parser-mapping/src/addByRSS/boost.test.ts
- apps/web/src/components/Media/Header/HeaderButtons.tsx
- apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastHeader.tsx
- apps/web/src/components/AddByRSS/Artist/AddByRSSArtistHeader.tsx
- apps/web/src/components/AddByRSS/Artist/Album/AddByRSSAlbumHeader.tsx
- apps/web/src/app/add-by-rss/episode/AddByRSSEpisodePageClient.tsx
- apps/web/src/app/add-by-rss/track/AddByRSSTrackItemPageClient.tsx
- apps/web/src/app/add-by-rss/livestream/AddByRSSLivestreamItemPageClient.tsx
- tools/web/seed-e2e.mjs
- apps/web/e2e/helpers/seedConstants.ts
- apps/web/e2e/boost-channel-and-episode.spec.ts
- apps/web/e2e/boost-add-by-rss-episode.spec.ts
- makefiles/local/e2e-spec-order-web.txt
- release-notes/scratchpad.md

## Tests

- Unit: `packages/parser-mapping/src/addByRSS/boost.test.ts` for `buildAddByRssBoostItem`.
- Playwright: `apps/web/e2e/boost-channel-and-episode.spec.ts` and `apps/web/e2e/boost-add-by-rss-episode.spec.ts`. Register them in `makefiles/local/e2e-spec-order-web.txt` on the lines after `apps/web/e2e/boost-eligibility.spec.ts`, channel-and-episode first.

## Release scratchpad

```markdown
## Add by RSS item pages boost that item

- Surfaces: web
- Change: On an Add by RSS episode, track, or livestream page, Boost opens for that item. Channel pages still boost the channel. The button shows when `getBoostEligibilityForContent` allows it. A screen with an item passes that item's `item_values`.
- Who notices: listeners who boost from an Add by RSS item page
- Operator steps: none
```

## Reuse

Keep `HeaderButtons` (`apps/web/src/components/Media/Header/HeaderButtons.tsx`) as the database button. It already calls `setModalBoost({ channel, item })`. Change its eligibility call to:

```ts
getBoostEligibilityForContent({
  channel,
  item,
  ...(item !== null && item !== undefined ? { itemValues: item.item_values } : {}),
})
```

`item` is the existing `shareArgs.item`. A channel page leaves `item` null and omits `itemValues`. Do not edit the page clients that call `getBoostEligibilityForContent` only for `canShowBoostMessagesTab` (`PodcastPageClient`, `EpisodePageClient`, `ArtistPageClient`, `AlbumPageClient`, `TrackPageClient`, `LivestreamPageClient`).

Keep the three Add by RSS headers as the Add by RSS button. They already call `buildAddByRssBoostChannel` from `@podverse/parser-mapping`. Extend that module with `buildAddByRssBoostItem`. Plan 22 removes `has_podcast_index_value` from `buildAddByRssBoostChannel`. Do not put that property back, and do not set it on `buildAddByRssBoostItem`. Do not add a second boost control on `CoreEpisodeHeader`, `CoreTrackHeader`, `LivestreamHeader`, or the Add by RSS item detail headers. Do not edit `ModalBoost` or `apps/web/src/contexts/Modals.tsx`. The modal already accepts `{ channel, item }`.

The accessible name stays the existing catalog string `value.boost` ("Boost"). Do not add catalog keys.

## Page set (R22)

These pages already mount `HeaderButtons`. Leave the page components as they are. The eligibility call inside `HeaderButtons` is the change above.

- Podcast channel `/podcast/[channel_id]`: `CorePodcastHeader` with no item.
- Episode `/episode/[item_id]`: the same header with `item={ssrItem}`.
- Artist `/artist/[channel_id]`: `CoreArtistHeader`, no item.
- Album `/album/[channel_id]`: `CoreAlbumHeader`, no item.
- Track `/track/[item_id]`: `CoreAlbumHeader` with `item={ssrItem}`.
- Podcast livestream `/podcast/livestream/[item_id]` and music livestream `/music/livestream/[item_id]`: both render `LivestreamPageClient`, which mounts `CorePodcastHeader` with `item={ssrItem}`. Music livestream has no separate header.
- Clip, chapter, and official-clip pages mount that podcast header with the parent item. The boost is for the item. There is no clip-specific boost. Leave that.
- Add by RSS podcast, artist, and album channel pages: `AddByRSSPodcastHeader`, `AddByRSSArtistHeader`, `AddByRSSAlbumHeader`, item null.

These are not boost surfaces. Do not add a button.

- The persistent player bar and embed players. The full player is plan 41.
- Playlists, profiles, and `/donate`.
- A video list. A video item uses the episode page.

The seeded show `e2ePodChnl001` has lightning `node` item value rows and no channel value rows. Its channel page passes no item, so the button stays hidden. That is the negative case in the Playwright spec. An episode page of that show passes `item.item_values`, and the button shows there. This spec does not open that episode.

## `buildAddByRssBoostItem`

Add this named export beside `buildAddByRssBoostChannel` in `packages/parser-mapping/src/addByRSS/boost.ts`.

```ts
export const buildAddByRssBoostItem = (
  indexItem: AddByRSSItemIndexItem | AddByRSSLivestreamIndexItem
): DTOItem
```

It always returns an item. Empty value rows are an empty `item_values` array, not a thrown error and not null. The modal then pays the channel recipients, which is what `useBoostRecipients` already does when the item has no recipients, and the boost is still for this item's guid and title.

Fields the boost form and `MediaHeaderMini` read: `guid`, `title`, `item_values`, `item_images`. Fill every other required `DTOItem` field with a shell so the return value is a real `DTOItem` (no assertion):

- `id: 0`, `channel_id: 0`, `item_flag_status_id: 0`
- `id_text`: `indexItem.idText`
- `guid`: `indexItem.itemGuid`
- `title`: `indexItem.bundle.item.title` when `'bundle' in indexItem`, otherwise `indexItem.item.title`, otherwise null
- `item_about: { id: 0, item_id: 0 }`
- `item_chat: { id: 0, item_id: 0, server: '' }`
- `item_license: { id: 0, item_id: 0, identifier: '', url: null }`
- `item_location: { id: 0, item_id: 0, name: null }`
- `item_season: { id: 0, channel_season_id: 0, item_id: 0, title: null }`
- empty arrays for `item_content_links`, `item_enclosures`, `item_fundings`, `item_persons`, `item_social_interacts`, `item_soundbites`, `item_transcripts`, `item_txts`

`item_images`: when the index item has `bundle.images`, map each `{ url, image_width_size }` to `DTOItemImage` with `id` starting at 1, `item_id: 0`, and `is_resized: false`. For a livestream, when `indexItem.item.image` is a non-empty string, one image with that url and `image_width_size: null`. Otherwise `[]`.

`item_values`: flatten the compat item-value objects the same way `mapChannelValues` flattens channel values.

- Episode or track (`'bundle' in indexItem`): `indexItem.bundle.value` is already the compat shape `{ item_value: { type, method, suggested }, item_value_recipients }`.
- Livestream: call `compatItemValueDtos(indexItem.item)` from `packages/parser-mapping/src/compat/partytime/item.ts` (it accepts `Phase4PodcastLiveItem`), then flatten that result.

Each `DTOItemValue` is `{ id, item_id: 0, type, method, suggested, item_value_recipients }`. `id` starts at 1. Each recipient is `{ id, item_value_id, type, address, split, name, custom_key, custom_value, fee }` with `id` starting at 1 and `item_value_id` equal to the value's `id`. Copy recipient fields from the compat objects (`custom_key`, not the partytime `customKey`). Do not copy `item_value_time_splits`. The form does not read them, and streaming sats are out of this set.

`boost.test.ts` covers three cases with the smallest index items that type-check:

- An episode whose `bundle.value` has one lightning keysend value and one recipient. The result's `guid`, `id_text`, `title`, `item_values[0].type`, `item_values[0].method`, and recipient `address` match the input.
- A livestream whose `item.values` is one partytime lightning value. The result has that recipient address.
- An episode with `bundle.value: []`. `item_values` is `[]` and `guid` is still set.

## Header wiring

Add an optional prop `boostItem?: DTOItem | null` to all three Add by RSS headers, default `null`.

In each header, pass `boostItem ?? null` into `setModalBoost`. Pass the same item into eligibility, and pass `itemValues` only when `boostItem` is non-null:

```ts
getBoostEligibilityForContent({
  channel: boostChannel,
  item: boostItem ?? null,
  ...(boostItem !== null && boostItem !== undefined
    ? { itemValues: boostItem.item_values }
    : {}),
})
```

Today those calls hard-code `item: null` (`handleBoostClick` in each file). Channel pages do not pass the prop, so they stay channel boosts and omit `itemValues`.

- `AddByRSSEpisodePageClient`: the page already builds `boostChannel`. Also `const boostItem = buildAddByRssBoostItem(episode)` once `episode` is loaded, and pass `boostItem` to `AddByRSSPodcastHeader`.
- `AddByRSSTrackItemPageClient`: the same, pass `boostItem` to `AddByRSSAlbumHeader`.
- `AddByRSSLivestreamItemPageClient`: build `boostItem` from `livestream` and pass it to whichever header `headerNode` renders (`AddByRSSArtistHeader`, `AddByRSSAlbumHeader`, or `AddByRSSPodcastHeader`).

## Seed

`tools/web/seed-e2e.mjs` is a large file. Search `seedMediaPlayerAndEmbedFixtures(client, accountId)` (the call near the bottom, not the function) and add `await seedBoostEpisodeChannelFixture(client)` on the next line. Do not rewrite `insertPodcastItem`. Do not edit plan 11's `seedBoostChannelFixture` or its `E2E_BOOST_CHANNEL_ID_TEXT` (`e2eBstCh00001`).

New constants, also exported from `apps/web/e2e/helpers/seedConstants.ts`. These names are distinct from plan 11 and plan 12:

- `E2E_BOOST_EPISODE_CHANNEL_ID_TEXT = 'e2eBoostCh01'` (12 characters)
- `E2E_BOOST_EPISODE_CHANNEL_TITLE = 'E2E Boost Podcast'`
- `E2E_BOOST_EPISODE_ITEM_ID_TEXT = 'e2eBoostEp01'` (12 characters)
- `E2E_BOOST_EPISODE_ITEM_TITLE = 'E2E Boost Episode'`
- `E2E_BOOST_EPISODE_FEED_URL = 'https://e2e-seed-boost-episode.example/podcast.xml'`
- `E2E_BOOST_EPISODE_FEED_PI_ID = 876543244` (plan 11 uses 876543240; plan 12 uses 876543241 and 876543242; grep the file and keep 876543244 if it is free)
- `E2E_BOOST_EPISODE_PODCAST_GUID = '11111111-2222-4333-8444-555555555501'`
- `E2E_BOOST_EPISODE_METABOOST_NODE = 'https://example.com/v1/s/mbrss-v1/boost/e2e/'`

`seedBoostEpisodeChannelFixture` deletes any feed with that podcast index id or URL, then inserts, in this order, copying the column style of the livestream block at the start of `seedMediaPlayerAndEmbedFixtures` and the item block inside `insertPodcastItem`. Plan 22 drops `channel.has_podcast_index_value`. Omit that column.

- `feed`, `feed_log`, `feed_policy` (`parse_allowed`, `public_visible`, `add_allowed` all true)
- `channel` with `id_text`, `feed_id`, podcast `medium_id`, the title, and `podcast_guid`
- `channel_about`
- `channel_meta_boost` (`standard` `mbrss-v1`, `node` the URL above)
- `channel_value` (`type` `lightning`, `method` `keysend`, `suggested` null) and `channel_value_recipient` (`type` `node`, `split` 100, `fee` false, `name` `E2E Boost Host`, `address` `E2E_ITEM_VALUE_RECIPIENT_ADDRESS`)

The lightning `node` recipient is what shows the button on this channel.

- one `item` plus `item_about`, `item_description` via `insertSeedItemDescription`, `item_image`, `item_enclosure`, `item_enclosure_source` using `http://localhost:2111/audio/audio-001.mp3`
- `item_value` and `item_value_recipient` with the same lightning keysend shape `insertPodcastItem` already writes, and the same address constant

Reuse `E2E_ITEM_VALUE_SUGGESTED_BTC` and `E2E_ITEM_VALUE_RECIPIENT_ADDRESS`. Do not point the address at a real node.

## Playwright

Follow `e2e-readability` and `e2e-screenshot-verified-element`. Suite titles are short. Test titles are full sentences. After each `goto`, assert the URL and a heading. Pass the asserted element to `capturePageLoad` / `actionAndCapture`. No payment is sent. The specs only open the modal.

`boost-channel-and-episode.spec.ts`:

- Visit `/podcast/e2ePodChnl001`. The heading `E2E Podcast Seed Channel` is visible. `getByRole('button', { name: 'Boost', exact: true })` has count 0. That page has no item, and the channel has no value rows, so the button stays hidden.
- Visit `/podcast/e2eBoostCh01`. The heading `E2E Boost Podcast` is visible. The Boost button is visible. Click it. The dialog named `Boost` is visible and contains `E2E Boost Podcast`.
- Visit `/episode/e2eBoostEp01`. The URL matches. The Boost button is visible. Click it. The dialog named `Boost` contains `E2E Boost Episode`.

`boost-add-by-rss-episode.spec.ts`:

- Copy the add flow from `addFeed` in `apps/web/e2e/add-by-rss-remote-items.spec.ts`: `loginSeedUser`, `page.goto('/add-by-rss/add')`, fill the textbox named `RSS Feed URL`, click `Add Feed`. Stub the parse first with `stubAddByRSSParse` from `apps/web/e2e/helpers/addByRSSCredentials.ts`, and call `stubAddByRSSParseAll`.
- Feed URL `https://e2e-seed-boostagram.example/podcast.xml`. Do not reuse `E2E_ADD_BY_RSS_TEST_ASSETS_FEED_URL`.
- The stubbed partytime payload has `title` `E2E Boostagram Feed`, a `guid` uuid, one lightning keysend `values` entry (partytime shape: `type`, `method`, `suggested`, `recipients` with `type` `node`, `address`, `split`, `fee`), and one item titled `E2E Boostagram Episode` with its own `guid`, enclosure `http://localhost:2111/audio/audio-001.mp3`, and its own lightning `values` entry whose recipient `type` is `node`.
- `test.setTimeout(60_000)` with a one-line comment that login plus the stubbed parse outlast the default budget, matching `add-by-rss-remote-items.spec.ts`. `afterEach` calls `unfollowFeedOnServer` for that URL.
- The podcast page URL matches `/add-by-rss/podcast/`. The Boost button is visible. Click it. The dialog contains `E2E Boostagram Feed` and does not contain `E2E Boostagram Episode`.
- Open the episode from the page (the link whose text is `E2E Boostagram Episode`). The URL matches `/add-by-rss/episode/`. Click Boost. The dialog contains `E2E Boostagram Episode`.
