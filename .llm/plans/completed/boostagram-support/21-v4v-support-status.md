**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

# Record boostagram support status

`docs/v4v/DOCS-V4V.md` lists payment types and does not say what v4 did, what v5 already stores and sends, or what this set leaves alone. This plan adds that record. It does not change parser, API, web, or mobile code.

## Rows

R2, R3, R9

## Runs after

none

## Files

- docs/v4v/DOCS-V4V.md

## Tests

none

## Release scratchpad

none

## Edit

Keep the existing title, the "Payment types" bullets, and the links to `bitcoin/lnd/`. Do not edit `docs/v4v/bitcoin/lnd/V4V-METABOOST-LNURL.md` (area A owns that page). Add one section, `## Boostagram support status`, after the payment-type bullets. Write it as the current product, in the same voice as the page. Do not mention plan numbers, area letters, or this set's file names under `.llm/`.

Use these facts. They were checked against the code.

### Previous app

- `../podverse-rn/src/services/v4v/v4v.ts` `convertValueTagIntoValueTransactions` accepts a value tag only when `type` is `lightning` and `method` is `keysend`. Anything else throws. The error text names those two strings as the only accepted pair.
- The same file's `v4vGetActiveValueTag` selects that pair. `extractV4VValueTags` uses the episode value list when it has entries, and the channel value list otherwise.
- `../podverse-rn/src/services/v4v/providers/alby.ts` sends with Alby's multi-keysend API. A comment there says Podverse only supports Alby keysend payments. The legacy app has no Lightning Address (`lnaddress`) string under `src/`.
- Streaming sats live in that app (`saveStreamingValueTransactionsToTransactionQueue`, `v4vStreaming.ts`). v5 does not add streaming sats. Manual boostagrams are the v5 payment. Time-split rows stay stored and are not a send path.

### What v5 already stores

- `compatChannelValueDtos` and `compatItemValueDtos` turn one lightning value into an `lnaddress` block and a `keysend` block when both recipient kinds are present, and they keep a node-only block on the feed's method (so `keysend` stays `keysend`). Plan 20 extends that split to a lightning block that sits beside another value type, and makes a re-parse delete rows the feed removed. Describe the stored result, not the plan: a node recipient stays keysend, an lnaddress recipient is its own block, and PayPal, Patreon, and Buy Me a Coffee stay their own blocks.
- Recipients keep `type`, `address`, `split`, `name`, `custom_key`, `custom_value`, and `fee`.
- Channel detail (`channelGetOneRelations`) returns `channel_values`, recipients, and `channel_meta_boost`. Item detail (`itemGetOneRelations`) returns `item_values`. List payloads omit those arrays. Playback refetches an item when `item_values` is missing (`playbackContentRepository.ensureItemValues`).
- Add by RSS maps the same blocks in `buildAddByRssBoostChannel` and does not use the database value tables.
- Do not mention `has_podcast_index_value` or `podcastIndexValueUpdateAll` on the page. Plan 22 removes both. Value recipients come from the RSS parse. The boost gate reads value rows, not a Podcast Index flag.

### What v5 already does on web

- `apps/web/src/components/Boost/` is the boost form. `useBoostPayments.ts` pays a recipient with `recipient_type` `lnaddress` by Lightning Address invoice, and a recipient with `recipient_type` `node` by WebLN keysend. It does not switch one recipient to the other method.
- With no channel MetaBoost URL, keysend still sends and attaches bLIP-0010. Lightning Address payments still send, without message metadata. Point at `bitcoin/lnd/V4V-METABOOST-LNURL.md` for that fallback instead of copying it.
- After the largest split succeeds, one mbrss-v1 boost is posted when the channel has that MetaBoost URL.
- The public message list is on the web channel and item pages that already render `BoostMessagesSection`.
- The form has tabs for PayPal, Patreon, and Buy Me a Coffee (`value.types.paypal_send`, `patreon_send`, `buymeacoffee_send`). Those tabs stay. This work does not send them as lightning.

### What v5 already does on mobile

- `apps/mobile/src/components/boost/BoostSheet.tsx` collects amount, name, and message. Its file comment states that submit does not send a payment.
- Boost buttons call `useBoostSheet` from the full player, podcast detail, artist detail, album detail, and Add by RSS home detail. Episode, track, and the other Add by RSS item screens are the remaining entry points (later plans).
- `getBoostEligibilityForContent` is what shows the boost action on those screens. Today `canShowBoostAction` is true only when the channel has a value row and the MetaBoost standard is `mbrss-v1` or `mb-v1`. `canShowBoostMessagesTab` needs `mbrss-v1`.
- The product rule, matching v4 and the keysend fallback page: the boost action also shows when the channel or the item has a lightning recipient of type `node` or `lnaddress`, even with no MetaBoost URL. PayPal-only channels with no supported MetaBoost standard stay hidden. The public message list still needs `mbrss-v1`. Write that as the rule. The function change is not this file's job. Area A owns `packages/v4v-metaboost/src/boostEligibility.ts`. If that sentence would claim the function already implements the rule, say the rule and that the button gate is updated with the shared boost send work.
- A second full-player control, `showV4v`, is not the boost button. It is on only when `EXPO_PUBLIC_MOBILE_V4V_ENABLED` is `1` and the item has `item_values`. Leave that flag alone.
- Mobile depends on `@podverse/v4v-metaboost`. It does not depend on `@podverse/v4v-btc-ln` or `@podverse/v4v-helpers`. There is no in-app Alby login yet. `V4vInfoScreen` has no wallet or payment call.

### Leave in place

- Streaming sats are not a v5 feature.
- PayPal, Patreon, and Buy Me a Coffee value blocks are unchanged.
- The app's own `/donate` flow stays mb-v1. The page already says that. Do not fold `/donate` into channel boosts.
