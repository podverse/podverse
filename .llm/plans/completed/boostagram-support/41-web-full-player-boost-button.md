**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# Web full-player boost button

The full player (`MediaPlayerModal`) has no boost control. `MediaPlayerButtonsModal` is the button row inside that modal, on every width. Add one button there for the now-playing item when `getBoostEligibilityForContent` allows it, including Add by RSS playback. The persistent bar and embed players stay without it.

Do not edit `ModalBoost` or `apps/web/src/contexts/Modals.tsx`. Call the existing `setModalBoost({ channel, item })`.

## Rows

R12, R22, R44

## Runs after

40

## Files

- apps/web/src/components/MediaPlayer/Buttons/playerBoostTarget.ts
- apps/web/src/components/MediaPlayer/Buttons/playerBoostTarget.test.ts
- apps/web/src/components/MediaPlayer/Buttons/usePlayerBoostTarget.ts
- apps/web/src/components/MediaPlayer/Buttons/BoostButton.tsx
- apps/web/src/styles/components/MediaPlayer/Buttons/BoostButton.module.scss
- apps/web/src/components/MediaPlayer/Modal/MediaPlayerButtonsModal.tsx
- apps/web/e2e/boost-full-player.spec.ts
- makefiles/local/e2e-spec-order-web.txt
- release-notes/scratchpad.md

## Tests

- Unit: `apps/web/src/components/MediaPlayer/Buttons/playerBoostTarget.test.ts`.
- Playwright: `apps/web/e2e/boost-full-player.spec.ts`, using the channel and episode seeded by plan 40 (`e2eBoostCh01`, `e2eBoostEp01`). Register it in `makefiles/local/e2e-spec-order-web.txt` on the line after `apps/web/e2e/boost-add-by-rss-episode.spec.ts`.

## Release scratchpad

```markdown
## Boost on the web full player

- Surfaces: web
- Change: The fullscreen player shows Boost for the item that is playing when `getBoostEligibilityForContent` allows it. A stored channel with no `channel_values` array is loaded from our channel. An array that is already present, including an empty array, is left as it is. The bar under the page does not show Boost. Add by RSS playback uses the same button.
- Who notices: listeners sending a boost while something is playing on the website
- Operator steps: none
```

## Reuse

Copy the button shell from `ClipButton` (`apps/web/src/components/MediaPlayer/Buttons/ClipButton.tsx`): a `<button type="button">`, `aria-label` from `useTranslations('value')('boost')`, icon `FaCommentDollar` with `aria-hidden`, `data-testid="media-player-boost-button"`. Style it with the `mediaPlayerButton` mixin from `apps/web/src/styles/mixins/buttons.scss`, the same mixin `ClipButton.module.scss` uses, and set `color: var(--button-highlight-bg)`. That is the token `IconButton` uses for `accent="gold"` (`packages/ui/src/components/button/IconButton/IconButton.module.scss`, class `accentGold`). Do not use the header `IconButton` inside the player row. The row is 24px tall (`MediaPlayerButtonsModal.module.scss`).

Eligibility is `getBoostEligibilityForContent` from `@podverse/v4v-metaboost`. Add by RSS channel and item records come from `buildAddByRssBoostChannel` and `buildAddByRssBoostItem` in `@podverse/parser-mapping` (plan 40 adds the item builder). Feed lookup uses `getAddByRSSResourceDataFeedUrl`, `getAddByRSSFeedByUrl`, and `getAddByRSSFeedByIdText`. Item lookup uses `resolveAddByRSSIndexItemFromResourceData` from `apps/web/src/utils/addByRSS/playFromQueueResource.ts`.

Remote playback already resolves records in `useRemotePlayerResource` (`apps/web/src/hooks/useRemotePlayerResource.ts`). A ready database resource has `channel` and `item` from `fetchPlaybackResourceDtos`, which loads the full channel (`channel_values`, `channel_meta_boost`) and the full item (`item_values`). A ready Add by RSS resource has `resourceData`.

## What the button boosts

| Now playing | Channel | Item passed to the modal |
| --- | --- | --- |
| Database episode, track, video item, or livestream | `mpChannel`, loaded with `reqChannelGetByIdOrIdText` when `channel_values` is not an array | `mpItem`, fetched when `item_values` was missing |
| Database clip, chapter, or official clip | the parent channel | the parent item, not the clip or chapter |
| Add by RSS, feed found in this browser | `buildAddByRssBoostChannel(feed)` | `buildAddByRssBoostItem(indexItem)` when `resolveAddByRSSIndexItemFromResourceData` returns an item, otherwise null |
| Nothing loaded, feed not stored, or `canShowBoostAction` is false | hidden | hidden |

When `mpAddByRSS` is set, the now-playing source is Add by RSS even if `mpChannel` is also set. `usePlayAddByRSS` clears the channel. Trust `mpAddByRSS` first.

A remote session replaces local state. While `useRemotePlayerResource` is `loading` or `missing`, render nothing. Do not leave the previous item's button up. Do not render a disabled button.

## `playerBoostTarget.ts`

Named exports. No React. No fetches.

`databaseChannelNeedsFetch(channel: DTOChannel): boolean`

- `Array.isArray(channel.channel_values)` → false. A full channel get always sets that array, including `[]`. An empty array means there is nothing to load. Do not fetch on open when the array is already present.
- Otherwise true. The stored channel has no `channel_values` array, so load our channel with `reqChannelGetByIdOrIdText`. Do not read `has_podcast_index_value`. Plan 22 removes that field from `DTOChannel`.

`databaseItemNeedsFetch(item: DTOItem | null): boolean`

- `item === null` → false.
- `Array.isArray(item.item_values)` → false.
- Otherwise true.

`boostTargetFromRecords` takes the resolved channel and item (item may be null) and returns `{ channel: DTOChannel; item: DTOItem | null } | null`. It returns null when `canShowBoostAction` is false. The call passes `itemValues` only when `item` is non-null:

```ts
getBoostEligibilityForContent({
  channel,
  item,
  ...(item !== null && item !== undefined ? { itemValues: item.item_values } : {}),
})
```

It does not drop the item when the item has no value rows. Channel recipients are the fallback inside the form. Do not change `getBoostEligibilityForContent`. Plan 12 owns it.

`boostTargetFromAddByRss(feed: AddByRSSFeedRecordWithMapped | null, indexItem: AddByRSSItemIndexItem | AddByRSSLivestreamIndexItem | null)` builds the channel with `buildAddByRssBoostChannel`. A null feed or a null channel returns null. It builds the item with `buildAddByRssBoostItem` when `indexItem` is non-null, otherwise the item is null. Then it calls `boostTargetFromRecords`.

`playerBoostTarget.test.ts`:

- A channel with `channel_values: []` does not need a fetch. A channel with no `channel_values` property does need a fetch.
- An item with `item_values: []` does not need a fetch. An item with no `item_values` does. Null does not.
- A channel with one lightning value and a recipient of type `node`, and no `channel_meta_boost`, returns a target. The same channel with an empty recipient list returns null. A channel with `channel_values: []` and an item whose `item_values` has a lightning recipient of type `node` returns a target. Use the value-block shape in `packages/v4v-metaboost/src/boostEligibility.test.ts` after plan 12. Put the recipient `type` on `channel_value_recipients` or `item_value_recipients`.
- An Add by RSS feed whose value block has one lightning recipient of type `node`, plus an index item, returns a target whose item `guid` is the index item's guid. A null feed returns null.

The smallest `DTOChannel` / `DTOItem` / feed fixtures that satisfy the types. No `as`.

## `usePlayerBoostTarget`

`'use client'`. Returns `{ channel: DTOChannel; item: DTOItem | null } | null`.

Local path (`useRemotePlayerDisplay()` is null):

- `mpAddByRSS` set: resolve the feed, then the index item, then `boostTargetFromAddByRss`. Feed order: `getAddByRSSResourceDataFeedUrl(resourceData)`, then `getAddByRSSFeedByUrl`. If that is null, `getAddByRSSFeedByIdText` of a non-empty `channel_id_text` on the resource data. If both miss, the target is null. No alert.
- Otherwise `mpChannel` set: start from `mpChannel` and `mpItem`. When `databaseChannelNeedsFetch` is true, `getApiRequestService().reqChannelGetByIdOrIdText(mpChannel.id_text)`. That loads our channel. Do not call Podcast Index. When `databaseItemNeedsFetch` is true, `reqItemGetByIdOrIdText(mpItem.id_text)`. A failed channel fetch yields null. A failed item fetch keeps the item already in state. Then `boostTargetFromRecords`.
- Otherwise null.

Remote path: only `status === 'ready'`. `kind === 'database'` uses `resource.channel` and `resource.item` with `boostTargetFromRecords` and no extra fetch. `kind === 'add_by_rss'` uses `resource.resourceData` the same way as `mpAddByRSS`.

Keep a generation counter in a ref. Bump it when the now-playing identity changes (`mpAddByRSS.idText`, `mpChannel.id_text`, `mpItem.id_text`, remote key and status). Ignore a fetch that finishes for an older generation. Do not fetch on every open when `channel_values` is already an array. An empty array means there is nothing to load.

## `BoostButton` and the modal row

`BoostButton` reads the hook. Null target returns null. Click calls `setModalBoost({ channel, item })`.

In `MediaPlayerButtonsModal`, render `<BoostButton />` immediately before `<PlaylistAddToButton />` in both the local branch and the remote branch. The button hides itself, so both branches always include it. Do not add it to `MediaPlayerButtonsDesktop` or `MediaPlayerButtonsMobile`.

## Playwright

`boost-full-player.spec.ts`. Signed out. The episode page loads the full channel into the player, so this spec does not depend on the fetch branch. The unit test covers that branch.

- `page.goto('/episode/e2eBoostEp01')`. Assert the URL and the heading `E2E Boost Episode`.
- Click the episode header play control (the large play button in the episode header, not a row). Wait until `getByTestId('media-player-bar-title-desktop')` has text `E2E Boost Episode`.
- The persistent bar does not contain `getByTestId('media-player-boost-button')`.
- Click the ancestor `button` of `media-player-bar-title-desktop`. That control opens the fullscreen player (`aria-description` "Show the Fullscreen Media Player" on `MediaPlayerInfoDesktop`).
- The dialog named `Fullscreen Media Player` is visible. Inside it, the button named `Boost` (`media-player-boost-button`) is visible. Click it. The dialog named `Boost` contains `E2E Boost Episode`.
- `capturePageLoad` / `actionAndCapture` with the boost button, then the boost dialog, as the scrolled element.

One spec. Do not send a payment. Do not raise the timeout unless playback setup exceeds 10 seconds, and then only with the one-line comment `test-timeout-budget` requires.
