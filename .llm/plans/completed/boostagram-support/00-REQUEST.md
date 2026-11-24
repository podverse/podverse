# Request: manual boostagrams on web and mobile

## Request

we need value for value boostagram support for iOS, Android, and web in Podverse v5 next generation. I am unsure how much of this work we already have completed.

My understanding is that compared to v4, v4 may not have supported the LN address. Version of the Bitcoin Lightning Network functionality. But I believe V5, at least on web, may already have some support for the Bitcoin Lightning LN address as well as legacy handling.

We basically want to ensure that V5 NextGen preserves the previous generation's functionality as a fallback. Which I believe we already have it set up to do so, but you should verify and double check as part of this planning.

But we also want to have a new implementation for v5 going forward compared to v4. So I want you to create plans for making sure that mobile and web have at least the same support of functionality.

Compared to v4 and v5, and you should ask if you are unsure about any user experience decisions during this planning process. And we should only use Grok 4.7 in these plan files.

And also, you should assume an integration with MetaBoost, which we have not updated for a while, but you should at least get some basic anticipation of MetaBoost interactions. Activity in there.

I believe the foundations for this have already been completed, perhaps in Podverse Web, but nothing related to it is in mobile. We want to reuse shared libraries as much as possible for consistency between web and the mobile apps.

Compared to V4, V4 I believe has a streaming SATs option. We don't want to have streaming SATs in V5. We only want the manual Boostagram functionality.

And the Boostagram button should, when present as having the information we need, be on the player screen for web and mobile and also should be on the Channel and item screens depending on if that information is available.

## Operator answers

- **How a phone finishes the payment.** "we want the Alby login, but make sure it is written in a way where we expect other value service providers to be supported with common functionality albeit handled by different means."
- **LN address and legacy keysend together.** Follow the feed. An lnaddress recipient gets a Lightning Address invoice. A node recipient gets keysend. One recipient is never switched to the other method. Keysend remains for feeds that only have legacy node recipients.
- **Where the button and the public list go.** Every surface web already treats as boostable: podcast, music, livestream, and Add by RSS, plus the full player on web and mobile. Include the public list of received boostagrams on mobile where web shows it.
- **MetaBoost in this set.** After the largest split succeeds, post one mbrss-v1 boost to the channel MetaBoost URL from shared code, on web and mobile. Show received boostagrams on mobile on the same screens where web shows them. Do not change the MetaBoost server.
- **Who can send.** Anyone, signed in or not. The listener can type a name. Signing in fills that name, and the MetaBoost sender id when the account has one.
- **iOS and Android.** The operator asked: "doesn't alby work within the app? or does it not? i thought we are just adding alby integration for now." Reading used: yes. The previous mobile app signs the listener into Alby and sends through Alby's API, so the payment stays inside Podverse on iOS and Android. This set adds that Alby integration only. Web keeps its existing WebLN send path (the browser wallet, usually the Alby extension). A later provider uses the same boost operation and its own send means. Do not build a phone Lightning node, a QR-only flow, or Nostr Wallet Connect in this set.
- **PayPal, Patreon, and Buy Me a Coffee.** This set is Lightning boostagrams only. Leave those other value blocks as they are.
- **Streaming sats.** Out of this set. Manual boostagrams only.
- **Models.** Every planning step and every implementation plan uses `Cursor Grok 4.7` on its model line. Do not assign Opus or Codex. Reasoning still follows copy-pasta-recommend-model.

## Glossary

- "value for value" means V4V.
- "LN address" and "Bitcoin Lightning LN address" mean a Lightning Address (LUD-16, RSS `type="lnaddress"`).
- "legacy handling" means the previous keysend path for RSS `type="node"` recipients.
- "boostagram" means a manual boost the listener sends, with an amount and an optional message. It does not mean streaming sats.
- "streaming SATs" means streaming sats. Out of this set.
- "MetaBoost" means the MetaBoost product and the channel `podcast:metaBoost` URL (`mbrss-v1` for channel and item boosts).
- "Channel and item screens" means channel pages and item pages.
- "v4" and "previous generation" mean the legacy app (`../podverse-rn` and the previous web client).
- "V5", "NextGen", and "next generation" mean this monorepo.

## Orientation

Checked in the request chat. Planning still verifies the v4 fallback and how much of v5 is already done.

- `../podverse-rn/src/services/v4v/v4v.ts` accepts only `type="lightning"` and `method="keysend"`, and sends with `v4vAlbySendKeysendPayments`. `../podverse-rn/src/services/v4v/providers/alby.ts` says Podverse only supports Alby keysend payments. Alby connect, token refresh, and account info live under that providers directory and `src/state/actions/v4v/providers/alby.ts`. Legacy screens named in the phase 3 note: `V4VProvidersScreen`, `V4VProvidersAlbyScreen`, `V4VProvidersAlbyLoginScreen`, `V4VBoostagramScreen`. `V4VInfoStreamingSatsScreen` is not a port target.
- `packages/v4v-btc-ln` resolves a Lightning Address (LUD-16) and requests an invoice. `packages/v4v-btc-ln/src/payments.ts` sends keysend through WebLN and throws when WebLN keysend is unavailable.
- `docs/v4v/bitcoin/lnd/V4V-METABOOST-LNURL.md` describes the web path: follow the RSS method per recipient, post one mbrss-v1 boost after the largest split succeeds, and do not cross from keysend to an invoice. `docs/v4v/DOCS-V4V.md` separates `/donate` (mb-v1, the app's own tip flow) from channel and item boosts (mbrss-v1). This request does not name `/donate`.
- `apps/web/src/components/Boost/` is the web boost form, payment hooks (`useBoostPayments.ts` uses WebLN), and the public boost-message section. `apps/web/src/utils/value/webln.ts` is the browser wallet check.
- `apps/mobile/src/components/boost/BoostSheet.tsx` collects amount, name, and message. Its submit does not send a payment. `apps/mobile/src/screens/v4v/V4vInfoScreen.tsx` is an info screen with no wallet or payment logic. Boost buttons already call `useBoostSheet` from the full player, podcast detail, and at least one Add by RSS detail screen.
- `getBoostEligibilityForContent` from `@podverse/v4v-metaboost` is already used on web and mobile to decide when a boost action can show.
- `packages/parser-mapping/src/compat/partytime/value.ts` and `item.ts` expand lightning value into lnaddress and keysend. `packages/v4v-helpers` exists beside `v4v-btc-ln` and `v4v-metaboost`.
- Channel MetaBoost is stored and returned through `ChannelMetaBoostService` (`packages/orm/src/services/channel/channelMetaBoost.ts`). Signup inserts `account_metaboost`. The API mints a MetaBoost app assertion at `POST /api/v2/metaboost/mbrss-v1/mint-app-assertion`.
- Architecture docs name `@podverse/external-services-alby`. That package directory is not in this tree.
- Mobile phase 3 (`docs/proposals/mobile/_master-plan_/phase-3/001-MASTER-PLAN-PHASE-3.md`) already says streaming sats is not a nextgen feature, and that phase 1 shipped only a placeholder.

## Review of the first planning pass

Settled in chat after the first planning pass. Where this section disagrees with an earlier operator answer, this section is the one to plan. "Anyone, signed in or not" still means the Lightning payment. It does not mean a signed-out visitor can type a name or a message.

### Kept as the plans wrote them

- **D1.** `BoostPaymentProvider` stays in `@podverse/v4v-btc-ln`.
- **D3.** The mbrss-v1 post body and the largest-split rule are shared. Each app injects the mint and the HTTP POST.
- **D7.** Alby sign-in on the phone is public PKCE. The token request uses the client id and an empty password. No API proxy and no client secret.
- **D8.** The Alby sign-in page opens in the system browser. The payment stays inside the app.
- **D9.** Alby tokens stay on the phone across Podverse sign-out.
- **D10.** The phone sends through Alby's OAuth wallet API on `api.getalby.com`, including keysend and BOLT11 invoices.
- **D11.** Scopes are `account:read`, `balance:read`, and `payments:send`.
- **D12.** The Alby screen shows sats and a Lightning Address. No fiat line.
- **D13.** The Alby screens have no sender-name field and no lightning-icon switch. The boost sheet owns the name.
- **D14.** Web Boost is on the fullscreen player only.
- **D15.** An Add by RSS episode, track, or livestream page boosts that item. Channel pages boost the channel.
- **D16.** While another device's item is still loading, the player button is absent.
- **D18.** The phone passes that Add by RSS item from the item screens and from playback.
- **D19.** The phone clip screen has no Boost button.
- **D20.** There is no mobile page for the website tip list.
- **D22.** The Boosts chip sits immediately before Funding, or before People when that screen has no Funding chip.
- **D23.** The phone appends pages of 20. Web keeps numbered pages.
- **D24.** Connect stays on the boost sheet and leaves the full player open.
- **D25.** `EXPO_PUBLIC_MOBILE_V4V_ENABLED` stays on the settings row only. The sheet connects whenever the Alby client id is set.
- **D27.** The phone pays an mb-v1 feed and can carry the message on the keysend. It does not POST mb-v1.

### Changed

- **When Boost shows.** A lightning `node` or `lnaddress` recipient is enough. A missing MetaBoost URL skips the post. The public received-boost list still needs `mbrss-v1`. A PayPal-only channel with no MetaBoost standard stays without a Boost button. `getBoostEligibilityForContent` changes to match. The first pass left that function requiring MetaBoost `mbrss-v1` or `mb-v1`.
- **D2.** A signed-in keysend with no MetaBoost post includes the typed message and the sender name on the bLIP record. Update `docs/v4v/bitcoin/lnd/V4V-METABOOST-LNURL.md` to say that. A Lightning Address invoice still carries no bLIP record. A signed-out send has no typed message, because the name and message fields are locked.
- **Sender name.** The operator said: "Instead of using the display name by default, the user should have to type a name they want included with the boost. after they type a name, then the device should remember it in local storage and load it by default going forward until the user edits it. if the field is empty, the placeholder should say anonymous." Web and the phone both follow this. Neither prefills `account_profile.display_name`. A typed name is remembered on that device and filled in next time until they edit it. An empty field shows the existing Anonymous placeholder and sends no name. The public list already displays a blank sender as Anonymous. On web, "local storage" means the existing boost-form defaults store, not the browser `localStorage` API. On the phone it means device prefs. This replaces the earlier reading that signing in fills the name from the display name.
- **Who can type, and `/donate`.** The operator said: "i think we want that previous behavior that a signed-out visitor can pay but they can't send messages unless they login so that podverse can sign the message." Then they chose to lock the name and message until Podverse login even when there is no MetaBoost post. A signed-out visitor can pay on a channel boost, an item boost, and `/donate`. The amount and submit stay available. The name and message stay locked until login. The public mbrss-v1 or mb-v1 post still waits for a signed-in account with a sender id, because Podverse signs that post. The phone still does not post mb-v1.
- **D6.** The MetaBoost capability request waits until they are logged in, then it includes their sender id. A signed-out visit does not send that request.
- **D17.** The operator said: "we actually do not want to use has_podcast_index_value at all anymore. value tags must come from us parsing them in the rss feed. all references to getting value tags in a special way from podcast index api should be removed." Remove the `has_podcast_index_value` column, the channel DTO field, the `podcastIndexValueUpdateAll` worker, and the Podcast Index value-id calls. Value recipients come from the RSS parse. The web player, and the phone player when its stored channel has no `channel_values` array, load our channel. They do not read that flag.
- **D21.** On the phone, a received-boost episode link looks the episode up the way web does, through the channel-item API, including when the phone has not stored that episode. Add by RSS still searches the feed already on the phone.
