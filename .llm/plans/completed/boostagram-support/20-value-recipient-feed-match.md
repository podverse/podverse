**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# Value rows match the feed on the next parse

A node-only lightning feed already stores `type=lightning`, `method=keysend`, and recipient `type=node` on a fresh parse. A re-parse does not remove value rows or recipients the feed dropped, and one channel value block with no recipients deletes every value block on that channel. A lightning block is split into `lnaddress` and `keysend` only when it is the feed's only value block, so a feed that also has PayPal, Patreon, or Buy Me a Coffee keeps Lightning Address recipients on the `keysend` method.

## Rows

R5, R21, R37

## Runs after

none

## Files

- packages/parser-mapping/src/compat/partytime/value.ts
- packages/parser-mapping/src/compat/partytime/channel.ts
- packages/parser-mapping/src/compat/partytime/item.ts
- packages/parser-mapping/src/compat/partytime/value.expand.test.ts
- packages/parser/src/lib/rss/channel/channelValue.ts
- packages/parser/src/lib/rss/item/itemValue.ts
- packages/parser/src/lib/rss/channel/channelValue.test.ts
- packages/parser/src/lib/rss/item/itemValue.test.ts

## Tests

- Unit: `packages/parser-mapping/src/compat/partytime/value.expand.test.ts` for `compatChannelValueDtos` and `compatItemValueDtos`.
- Unit: `packages/parser/src/lib/rss/channel/channelValue.test.ts` and `packages/parser/src/lib/rss/item/itemValue.test.ts`, mocking `@podverse/orm` the way `packages/parser/src/lib/rss/channel/channelVerifiedPublisher.test.ts` does. No API integration test and no Playwright spec. The DTO fields do not change, and no route changes.

## Release scratchpad

```markdown
## Value blocks match the feed on re-parse

- Surfaces: parser, workers
- Change: a lightning value block is split into an lnaddress block and a keysend block even when the feed also has another value type. A re-parse removes value rows and recipients the feed no longer lists. One value block with no recipients no longer deletes the channel's other value blocks. PayPal, Patreon, and Buy Me a Coffee blocks stay stored as the feed sends them.
- Who notices: a listener boosting a feed whose recipients changed. A node-only feed no longer keeps a Lightning Address recipient the feed removed.
- Operator steps: the next feed parse picks this up. No migration.
```

## What is already true

Do not rebuild this path. The work is the two gaps below.

- `compatValueRecipients` in `value.ts` stores `type`, `address`, `split`, `name`, `custom_key`, `custom_value`, and `fee`.
- `ChannelValueService.update` and `ItemValueService.update` key rows by `type` + `method`. Recipient services key by `type`, `address`, `custom_key`, and `custom_value`.
- Channel detail loads `channel_values` and each row's recipients (`channelGetOneRelations` in `packages/orm/src/services/channel/channel.ts`, `getChannelWithRelations`). Item detail loads `item_values` (`itemGetOneRelations` in `packages/orm/src/services/item/item.ts`). List relations omit those arrays. That omission stays.
- `DTOChannelValue`, `DTOChannelValueRecipient`, `DTOItemValue`, and `DTOItemValueRecipient` already have the fields above. Do not add or rename a field. Mobile stores those DTOs and Add by RSS mapped JSON on disk. A re-parse refreshes them. No SQLite migration.
- Add by RSS uses the same mapper (`compatFull.ts` → `compatChannelValueDtos` / `compatItemValueDtos`). `packages/parser-mapping/src/addByRSS/boost.ts` `buildAddByRssBoostChannel` copies the mapped blocks onto `DTOChannel`. Do not edit that file. Its shape stays the same.
- Live items go through `handleParsedItemValue` from `packages/parser/src/lib/rss/item/item.ts`. `liveItem.ts` does not map value. Do not edit it.
- `channel_meta_boost` is already mapped by `compatChannelMetaBoost` and loaded on channel detail. Do not change it.
- Web payment routing uses the recipient's `type` (`node` or `lnaddress`), not the value `method`. See the handoff. This plan does not change web or mobile UI.
- v4 (`../podverse-rn/src/services/v4v/v4v.ts`, `convertValueTagIntoValueTransactions`) accepts only value `type=lightning` and `method=keysend`, and sends every recipient as keysend. It has no Lightning Address path. A node-only feed's stored `method` must stay `keysend` when the feed's method is `keysend`.

## Mapper

Put the split and the merge in `value.ts`. `compatChannelValueDtos` (`channel.ts`) and `compatItemValueDtos` (`item.ts`) both call them. Delete the duplicated `METHOD_PRIORITY_ORDER`, `sortChannelValueDtos` / `sortItemValueDtos`, and the `sourceValues.length > 1` branch that skips the split.

Pipeline for both functions, in this order:

1. Flatten `values` with the per-value split below. Each entry is still a `Phase4Value` (method and `recipients` replaced, `valueTimeSplits` still on the value).
2. Merge `Phase4Value`s that share `type` + `method`, before `compatChannelValue` / `compatItemValue`. The first keeps `type`, `method`, and `suggested`. Append later recipients. Drop a later recipient whose `type`, `address`, `customKey`, and `customValue` match an earlier one, and keep the earlier `split`. Append later `valueTimeSplits` onto the first.
3. Map each merged value through `compatChannelValue` or `compatItemValue`, and wrap it in the same `{ channel_value, channel_value_recipients }` or `{ item_value, item_value_recipients, item_value_time_splits }` shape those functions return today.
4. Sort. If either block's `type` is not `lightning`, leave the pair in place. Among lightning blocks, `lnaddress` comes before `keysend`. A lightning method that is neither sorts after those two.

The per-value split returns `Phase4Value` copies. It does not call `compatChannelValue` or `compatItemValue`. Those run once, in step 3.

- Let `lightning` mean `value.type` lowercased is `lightning`.
- Let an lnaddress recipient mean `recipient.type` lowercased is `lnaddress`. Every other recipient is a keysend-side recipient. Do not rewrite that recipient's stored `type`. A `node` recipient stays `node`.
- Not lightning (PayPal, Patreon, Buy Me a Coffee, and any other type): return the value unchanged. Do not move its recipients onto a lightning block.
- Lightning, and the recipients include both sides: two copies. Method `lnaddress` with only the lnaddress recipients. Method `keysend` with only the other recipients. Copy `valueTimeSplits` onto both. This is what the single-value branch does today. Do it for every lightning value, including when the feed has other value types.
- Lightning, lnaddress recipients only: one copy, method `lnaddress`, those recipients.
- Lightning, keysend-side recipients only: one copy with the feed's method and recipients. A feed whose method is `keysend` stays `keysend`. Do not rename that method.
- Lightning with no recipients: the value unchanged.

`ChannelValueService.updateMany` keeps one row per `type` + `method`. The merge in step 2 is what keeps the second block's recipients.

`buildItemValueTimeSplits` stays as it is. A split item block still gets the source value's full time-split list, which is what `compatItemValueWithMethodAndRecipients` does today. Do not filter time-split recipients. Manual boosts read `item_value_recipients`, not time splits. Streaming sats stay stored and unused.

Stored recipient `type` stays the sliced feed string. Do not lowercase it. Detection stays case-insensitive.

## Persistence

`handleParsedChannelValue` and `handleParsedItemValue` follow `handleParsedManyData` in `packages/parser/src/lib/rss/base/handleParsedManyData.ts`: `updateMany` replaces the set, and `deleteAll` runs only when the mapper returns no blocks.

Channel (`channelValue.ts`):

- Mapper returns no blocks: `channelValueService.deleteAll(channel)` once, then return. Database `ON DELETE CASCADE` removes recipients.
- Otherwise: `channelValueService.updateMany` with each block's `type`, `method`, and `suggested`. Do not call `channelValueService.update` in a loop.
- For each mapped block, find the saved row with the same `type` and `method`, then `channelValueRecipientService.updateMany(row, that block's recipients)`. An empty recipient list deletes that row's recipients only.
- Delete the branch that calls `channelValueService.deleteAll(channel)` when one block has no recipients. That call removes PayPal and lightning rows that were just saved.

Item (`itemValue.ts`):

- Mapper returns no blocks: `itemValueService.deleteAll(item)` once, then return.
- Otherwise: `itemValueService.updateMany` with `{ type, method, suggested }` from each block. Do not call `itemValueService.update` in a loop.
- For each block, find the saved row by `type` and `method`, then `itemValueRecipientService.updateMany` with that block's recipients. Do not call `itemValueService.deleteAll` from the empty-recipient branch.
- Keep the time-split body that already runs after the value row exists: update splits when the list is non-empty, and `itemValueTimeSplitService.deleteAll(item_value)` when it is empty. Do not convert time splits to `updateMany`. A value row removed by `updateMany` drops its time splits through the existing `ON DELETE CASCADE` on `item_value_time_split`.

`updateMany` on an empty recipient list deletes the previous recipients of that parent. Use it. Do not special-case the empty list with `deleteAll` on the channel or the item.

## Tests to write

Mapper, one file, both channel and item:

- One lightning value, method `keysend`, one recipient `type=node`: one block, method `keysend`, recipient type `node`.
- One lightning value, only `type=lnaddress` recipients: one block, method `lnaddress`.
- One lightning value with both sides: two blocks, `lnaddress` then `keysend`, recipients partitioned, `node` not relabeled.
- Lightning mixed recipients plus a second value `type=paypal` `method=send`: three blocks. PayPal `type` and `method` unchanged, and its recipients are not on a lightning block. Same assertion for `patreon` / `send` and `buymeacoffee` / `send` as the only extra block, in two more cases or one table of those three types.
- Two lightning values that both have method `keysend` and different node recipients: one `keysend` block containing both recipients.
- Item: a split lightning value still copies time splits onto each lightning block (`buildItemValueTimeSplits` unchanged). Assert the time-split array is present on both blocks when the source has one recipient time split.

Parser channel test, mapper mocked so the test does not depend on Partytime's `FeedObject`:

- Two blocks, the second with an empty recipient list: `updateMany` is called once for the value headers, `deleteAll` on `ChannelValueService` is not called, and recipient `updateMany` is called for the empty list.
- Mapper returns no blocks: `deleteAll` is called once.
- `ChannelValueService.update` and `ChannelValueRecipientService.update` are not called.

Parser item test, same mock style:

- One block with recipients and a time-split list: value `updateMany`, recipient `updateMany`, and the existing time-split update path still runs.
- One block with an empty recipient list: `ItemValueService.deleteAll` is not called. Recipient `updateMany` is called with an empty list.
- Mapper returns no blocks: `ItemValueService.deleteAll` is called once.

## Do not

- Do not edit `packages/v4v-helpers`, `packages/v4v-btc-ln`, or `packages/v4v-metaboost`. Area A owns those packages. The boost-button gate is in the handoff below and in plan 21.
- Do not edit `apps/web` or `apps/mobile`. The web and mobile merges that set `method: 'keysend'` when several lightning rows are combined are display tabs. Payment uses recipient `type`.
- Do not change PayPal, Patreon, or Buy Me a Coffee `type` or `method`, their catalog keys (`value.types.paypal_send`, `patreon_send`, `buymeacoffee_send`), or their tabs.
- Do not add streaming-sats behavior, and do not stop storing time splits.
- Do not add a write of `has_podcast_index_value`. Plan 22 drops that column, the channel DTO field, and the worker `podcastIndexValueUpdateAll`. Value recipients come from this RSS parse. Boost eligibility reads `channel_values`.

## Handoff for the boost action

`getBoostEligibilityForContent` in `packages/v4v-metaboost/src/boostEligibility.ts` sets `canShowBoostAction` only when the channel has any value row and the MetaBoost standard is `mbrss-v1` or `mb-v1`. The second test in `boostEligibility.test.ts` locks the off state for a keysend row with no MetaBoost tag.

That gate hides the button on a node-only feed v4 could boost. The send form already pays keysend without MetaBoost and attaches bLIP-0010 (`docs/v4v/bitcoin/lnd/V4V-METABOOST-LNURL.md`, "Keysend (bLIP-0010) fallback"). Area A changes the function. This plan does not.

Required behavior, for area A:

- `canShowBoostAction` is true when the channel or the item has a recipient whose `type` lowercased is `node` or `lnaddress` on a value whose `type` lowercased is `lightning`.
- It is also true under today's rule (any `channel_values` row and standard `mbrss-v1` or `mb-v1`), so a PayPal block with MetaBoost still opens the form.
- A PayPal-only channel with no supported MetaBoost standard stays false.
- `canShowBoostMessagesTab` stays as it is: public messages still need `mbrss-v1`.
- Add an optional item value list on the input. Callers that omit it keep today's channel-only check. Areas D and E pass the item's `item_values` when the screen has an item. v4 uses the episode value list when it is non-empty, and the channel list otherwise (`extractV4VValueTags` in the legacy `v4v.ts`).
- Update `boostEligibility.test.ts`: a lightning keysend `node` recipient and no MetaBoost tag returns `canShowBoostAction` true. A paypal-only channel with no MetaBoost tag stays false. The messages tab stays false without `mbrss-v1`.
