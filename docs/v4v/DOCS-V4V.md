# V4V (Value for Value)

V4V is a broad feature that supports multiple payment types. Documentation is grouped by payment
implementation.

## Payment types

- **Bitcoin / Lightning (LND):** [bitcoin/lnd/](bitcoin/lnd/) — local Nigiri setup, LNAddress,
  keysend, metaBoost flow, and full setup diagram.
- **Donate (`/donate`) vs channel/item MetaBoost:** The **Donate** app flow uses MetaBoost **mb-v1** only, not
  mbrss-v1; mbrss-v1 applies to channel/item boosts. See `apps/web/ENV.md` for `NEXT_PUBLIC_APP_VALUE_METABOOST_*` on `/donate`.
- **mbrss-v1 boost messages:** After split payments, Podverse posts one mbrss-v1 boost to the channel’s
  `metaBoost` URL once the largest split recipient’s payment succeeds.

## Boostagram support status

A boostagram is a manual Value-for-Value payment. The previous app sent Lightning keysend only.
This app stores lightning recipients from the feed, sends manual boosts on the web, and collects
a boost on mobile without sending a payment. Streaming sats are not part of this app.

### Previous app

`convertValueTagIntoValueTransactions` accepts a value tag only when `type` is `lightning` and
`method` is `keysend`. Anything else is rejected, and the error names that pair as the only one
accepted. `v4vGetActiveValueTag` selects that pair. `extractV4VValueTags` uses the episode value
list when it has entries, and the channel value list otherwise.

Payments go out through Alby’s multi-keysend API. The previous app supports Alby keysend payments
and has no Lightning Address (`lnaddress`) send path.

Streaming sats live in that app (`saveStreamingValueTransactionsToTransactionQueue`,
`v4vStreaming.ts`). This app does not add streaming sats. Manual boostagrams are the payment.
Time-split rows stay stored and are not a send path.

### Stored recipients

`compatChannelValueDtos` and `compatItemValueDtos` store value recipients from the RSS parse. A
node recipient stays keysend. A Lightning Address recipient is its own block. PayPal, Patreon,
and Buy Me a Coffee stay their own blocks. When one lightning value includes both a node
recipient and a Lightning Address recipient, both blocks are stored. A node-only value stays on
the feed’s method, so keysend stays keysend. A lightning value that sits beside another value
type is split the same way. Parsing again removes recipient rows the feed no longer includes.

Each recipient keeps `type`, `address`, `split`, `name`, `custom_key`, `custom_value`, and
`fee`.

Channel detail (`channelGetOneRelations`) returns `channel_values`, recipients, and
`channel_meta_boost`. Item detail (`itemGetOneRelations`) returns `item_values`. List payloads
omit those arrays. Playback refetches an item when `item_values` is missing
(`playbackContentRepository.ensureItemValues`).

Add by RSS maps the same blocks in `buildAddByRssBoostChannel` and does not use the database
value tables. The boost gate reads value rows.

### Web

`apps/web/src/components/Boost/` is the boost form. `useBoostPayments.ts` pays a recipient with
`recipient_type` `lnaddress` by Lightning Address invoice, and a recipient with `recipient_type`
`node` by WebLN keysend. It does not switch one recipient to the other method.

With no channel MetaBoost URL, keysend still sends and attaches bLIP-0010. Lightning Address
payments still send, without message metadata. See
[bitcoin/lnd/V4V-METABOOST-LNURL.md](bitcoin/lnd/V4V-METABOOST-LNURL.md).

After the largest split succeeds, one mbrss-v1 boost is posted when the channel has that
MetaBoost URL.

The public message list is on the web channel and item pages that render `BoostMessagesSection`.

The form keeps tabs for PayPal, Patreon, and Buy Me a Coffee. Those value types are not sent as
lightning.

### Mobile

`BoostSheet` (`apps/mobile/src/components/boost/BoostSheet.tsx`) collects amount, name, and
message. Submit does not send a payment.

Boost buttons call `useBoostSheet` from the full player, podcast detail, artist detail, album
detail, and Add by RSS home detail. Episode, track, and the other Add by RSS item screens do not
open the sheet.

`getBoostEligibilityForContent` is what shows the boost action on those screens.
`canShowBoostAction` is true only when the channel has a value row and the MetaBoost standard is
`mbrss-v1` or `mb-v1`. `canShowBoostMessagesTab` needs `mbrss-v1`.

The product rule matches the previous app and the keysend fallback: the boost action also shows
when the channel or the item has a lightning recipient of type `node` or `lnaddress`, even with
no MetaBoost URL. PayPal-only channels with no supported MetaBoost standard stay hidden. The
public message list still needs `mbrss-v1`. `getBoostEligibilityForContent` does not apply that
recipient rule. The button gate is updated with the shared boost send work.

`showV4v` on the full player is a separate control. It is on only when
`EXPO_PUBLIC_MOBILE_V4V_ENABLED` is `1` and the item has `item_values`.

Mobile depends on `@podverse/v4v-metaboost`. It does not depend on `@podverse/v4v-btc-ln` or
`@podverse/v4v-helpers`. There is no in-app Alby login. `V4vInfoScreen` has no wallet or payment
call.

### Left unchanged

- Streaming sats are not a feature of this app.
- PayPal, Patreon, and Buy Me a Coffee value blocks stay as they are.
- `/donate` stays MetaBoost mb-v1. It is separate from channel and item boosts.
