# Boostagram support on web and mobile — summary

Manual Lightning boostagrams on web, iOS, and Android in v5, with the v4 keysend path kept as the
fallback for legacy feeds. The send operation lives in shared code; web sends through WebLN,
mobile through an in-app Alby login. After the largest split succeeds, one mbrss-v1 boost goes to
the channel MetaBoost URL. Streaming sats are out of scope.

Request and operator answers: [00-REQUEST.md](00-REQUEST.md). Model and reasoning per prompt:
[COPY-PASTA.md](COPY-PASTA.md). Phase order: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).

## Planning constraints

These apply to every area step and every plan. They are instructions about planning, so they are
not ledger rows.

- Every planning step and every implementation plan uses `Cursor Grok 4.7` on its model line. No
  Opus or Codex. Reasoning still follows copy-pasta-recommend-model.
- A user experience decision the request and operator answers leave open goes in the step's
  `## Decisions` list (or stops the step as BLOCKED when no reasonable default exists), so the
  Review step puts it to the operator.
- Because every implementation prompt goes to Grok, each plan resolves every either/or and names
  exact paths and anchors.

## Requirement ledger

- **R1** (area G) "we need value for value boostagram support for iOS, Android, and web in Podverse v5 next generation" — Plan: 70, 71
- **R2** (area B) "I am unsure how much of this work we already have completed." — Plan: 21
- **R3** (area B) "v4 may not have supported the LN address. Version of the Bitcoin Lightning Network functionality." — Plan: 21
- **R4** (area A) "V5, at least on web, may already have some support for the Bitcoin Lightning LN address as well as legacy handling." — Plan: 10
- **R5** (area B) "We basically want to ensure that V5 NextGen preserves the previous generation's functionality as a fallback. Which I believe we already have it set up to do so, but you should verify and double check as part of this planning." — Plan: 20
- **R6** (area A) "we also want to have a new implementation for v5 going forward compared to v4" — Plan: 10
- **R7** (area G) "making sure that mobile and web have at least the same support of functionality" — Plan: 70, 71
- **R8** (area A) "you should assume an integration with MetaBoost, which we have not updated for a while, but you should at least get some basic anticipation of MetaBoost interactions" — Plan: 10
- **R9** (area B) "I believe the foundations for this have already been completed, perhaps in Podverse Web, but nothing related to it is in mobile." — Plan: 21
- **R10** (area A) "We want to reuse shared libraries as much as possible for consistency between web and the mobile apps." — Plan: 10
- **R11** (area C) "We don't want to have streaming SATs in V5. We only want the manual Boostagram functionality." (operator answer: "Streaming sats. Out of this set. Manual boostagrams only.") — Plan: 32
- **R12** (area D) "the Boostagram button should, when present as having the information we need, be on the player screen for web" (operator answer: "plus the full player on web") — Plan: 41
- **R13** (area E) "be on the player screen for web and mobile" — the mobile full player half (operator answer: "plus the full player on ... mobile") — Plan: 50
- **R14** (area D) "also should be on the Channel and item screens depending on if that information is available" — web channel and item pages — Plan: 40
- **R15** (area E) "also should be on the Channel and item screens depending on if that information is available" — mobile channel and item screens — Plan: 50
- **R16** (area C) "we want the Alby login" — Plan: 31, 32
- **R17** (area A) "make sure it is written in a way where we expect other value service providers to be supported with common functionality albeit handled by different means" — the shared boost operation and its provider contract — Plan: 10
- **R18** (area C) "make sure it is written in a way where we expect other value service providers to be supported with common functionality albeit handled by different means" — the mobile provider list and connection state, shaped for more than Alby — Plan: 31, 32
- **R19** (area A) "Follow the feed. An lnaddress recipient gets a Lightning Address invoice. A node recipient gets keysend." — Plan: 10
- **R20** (area A) "One recipient is never switched to the other method." — Plan: 10
- **R21** (area B) "Keysend remains for feeds that only have legacy node recipients." — Plan: 20
- **R22** (area D) "Every surface web already treats as boostable: podcast, music, livestream, and Add by RSS" — confirm the web set — Plan: 40, 41
- **R23** (area E) "Every surface web already treats as boostable: podcast, music, livestream, and Add by RSS" — the same set on mobile — Plan: 50
- **R24** (area F) "Include the public list of received boostagrams on mobile where web shows it." and "Show received boostagrams on mobile on the same screens where web shows them." — Plan: 60, 61
- **R25** (area A) "After the largest split succeeds, post one mbrss-v1 boost to the channel MetaBoost URL from shared code" — the shared code and web — Plan: 10
- **R26** (area G) "post one mbrss-v1 boost to the channel MetaBoost URL from shared code, on web and mobile" — the mobile half — Plan: 70, 71
- **R27** (area A) "Do not change the MetaBoost server." — Plan: 10
- **R28** (area G) "Anyone, signed in or not." — mobile — Plan: 71
- **R29** (area G) "The listener can type a name." — mobile — Plan: 71
- **R30** (area G) "Signing in fills that name, and the MetaBoost sender id when the account has one." — mobile — Plan: 71
- **R31** (area A) "Anyone, signed in or not. The listener can type a name. Signing in fills that name, and the MetaBoost sender id when the account has one." — confirm or fix on web — Plan: 11
- **R32** (area C) "The previous mobile app signs the listener into Alby and sends through Alby's API, so the payment stays inside Podverse on iOS and Android." — Plan: 30, 31
- **R33** (area C) "This set adds that Alby integration only." — Plan: 30, 32
- **R34** (area A) "Web keeps its existing WebLN send path (the browser wallet, usually the Alby extension)." — Plan: 10
- **R35** (area A) "A later provider uses the same boost operation and its own send means." — Plan: 10
- **R36** (area C) "Do not build a phone Lightning node, a QR-only flow, or Nostr Wallet Connect in this set." — Plan: 30, 32
- **R37** (area B) "This set is Lightning boostagrams only. Leave those other value blocks as they are." (PayPal, Patreon, and Buy Me a Coffee) — Plan: 20
- **R38** (area A, step 09) Show Boost for a lightning `node` or `lnaddress` recipient. A missing MetaBoost URL skips the post. The public list still needs `mbrss-v1`. — Plan: 12
- **R39** (area A, step 09) A signed-in keysend with no MetaBoost post includes the typed message and sender name on the bLIP record. — Plan: 10
- **R40** (area A, step 09) Web does not prefill the display name. A typed name is remembered in the boost-form defaults. An empty field shows Anonymous and sends no name. — Plan: 11
- **R41** (area A, step 09) A signed-out visitor can pay, including on `/donate`. The name and message stay locked until Podverse login. The capability request and the public post wait for that login. — Plan: 11
- **R42** (area B, step 11) Remove `has_podcast_index_value`, the Podcast Index value-id calls, and `podcastIndexValueUpdateAll`. Value recipients come from the RSS parse. — Plan: 22
- **R43** (area G, step 10) The phone uses the same name rule, message lock, and signed-out payment as web, and still does not post mb-v1. — Plan: 70, 71
- **R44** (area D, step 12) The web player loads our channel when `channel_values` is missing, and the button follows the updated eligibility function. — Plan: 40, 41
- **R45** (area F, step 13) A phone boost-list episode link looks the episode up the way web does. — Plan: 61
- **R46** (area E, step 14) The phone player loads our channel when the stored copy has no `channel_values`, and the button follows the updated eligibility function. — Plan: 50

## Areas

Plan number blocks keep area steps from colliding on file names. Waves: A–F in wave 1, G in
wave 2.

### Area A — Shared boost send operation (web path onto shared code)

- **Rows:** R4, R6, R8, R10, R17, R19, R20, R25, R27, R31, R34, R35, R38, R39, R40, R41
- **Plan block:** 10–19
- **Starts from:** `apps/web/src/components/Boost/hooks/useBoostPayments.ts` (recipient loop,
  WebLN keysend, Lightning Address invoices, mbrss-v1 post after the largest split),
  `apps/web/src/components/Boost/payments/`, `apps/web/src/components/Boost/hooks/useBoostRecipients.ts`,
  `apps/web/src/components/Boost/BoostFormBase.tsx`, `apps/web/src/utils/value/webln.ts`,
  `packages/v4v-btc-ln/src/` (`payments.ts`, `lnaddress.ts`, `lnurlp.ts`, `blip10.ts`),
  `packages/v4v-helpers/src/` (`recipients.ts`, `providerResult.ts`),
  `packages/v4v-metaboost/src/` (`mbrssV1CreateBoost.ts`, `boostEligibility.ts`),
  `docs/v4v/bitcoin/lnd/V4V-METABOOST-LNURL.md`.
- **Scope:** confirm what web already does for Lightning Address and keysend, then move the
  provider-neutral send operation (split computation, per-recipient method by RSS type, never
  switching a recipient's method, one mbrss-v1 post after the largest split, sender name and
  MetaBoost sender id) into shared packages behind a provider contract with `keysend` and
  `payInvoice`-style capabilities. Web keeps WebLN as its provider. No MetaBoost server change.
  Leave the `/donate` mb-v1 flow working.
- **Depends on:** none.
- **Shares files with:** area F (`packages/v4v-metaboost/src/index.ts` exports); area D
  (`apps/web/src/components/Modal/ModalBoost.tsx` and `apps/web/src/contexts/Modals.tsx`, only if
  the boost modal's props change); area B (`packages/v4v-helpers/src/recipients.ts` — area A
  owns `packages/v4v-*`; area B names any fix there in its plan for area A's files rather than
  editing them); `packages/i18n-catalog/consumer/originals/*.json`.

### Area B — Feed value data, v4 fallback, and existing-support audit

- **Rows:** R2, R3, R5, R9, R21, R37, R42
- **Plan block:** 20–29
- **Starts from:** `packages/parser-mapping/src/compat/partytime/value.ts`, `item.ts`,
  `liveItem.ts`, `metaBoost.ts`, `channel.ts`; how channel and item value recipients and the
  channel MetaBoost URL reach the API DTOs (`packages/orm/src/services/channel/channelMetaBoost.ts`
  and the value services beside it); how mobile reads them (API DTOs for database content,
  `@podverse/parser-mapping` for Add by RSS); the v4 path in `../podverse-rn/src/services/v4v/v4v.ts`
  (`type="lightning"`, `method="keysend"` only); `docs/v4v/DOCS-V4V.md`.
- **Scope:** verify that feeds v4 could boost (lightning keysend node recipients) still produce
  keysend recipients end to end in v5, including node-only feeds; confirm v4 had no Lightning
  Address support; record what web and mobile already have; keep PayPal, Patreon, and Buy Me a
  Coffee value blocks untouched. Plans fix any gap found in parsing, storage, or DTOs, and update
  `docs/v4v/DOCS-V4V.md` with the support status.
- **Depends on:** none.
- **Shares files with:** area A (`packages/v4v-helpers/src/recipients.ts`, owned by area A);
  `docs/v4v/` (area B owns `docs/v4v/DOCS-V4V.md`, area A owns
  `docs/v4v/bitcoin/lnd/V4V-METABOOST-LNURL.md`).

### Area C — Mobile Alby login and value provider settings

- **Rows:** R11, R16, R18, R32, R33, R36
- **Plan block:** 30–39
- **Starts from:** `apps/mobile/src/screens/v4v/V4vInfoScreen.tsx`, mobile navigation and More
  settings screens (`apps/mobile/src/screens/more/`), mobile secure storage; the legacy port
  sources `../podverse-rn/src/services/v4v/providers/alby.ts`,
  `../podverse-rn/src/state/actions/v4v/providers/alby.ts`, and the legacy screens
  `V4VProvidersScreen`, `V4VProvidersAlbyScreen`, `V4VProvidersAlbyLoginScreen`
  (`V4VInfoStreamingSatsScreen` is not ported); `docs/proposals/mobile/_master-plan_/phase-3/001-MASTER-PLAN-PHASE-3.md`.
- **Scope:** Alby OAuth login on iOS and Android, token storage and refresh, account info,
  disconnect, and an Alby API client that can send keysend and pay a BOLT11 invoice. A provider
  list and connected-provider state that is shaped for more providers but ships Alby only. No
  streaming-sats screens, no phone node, no QR-only flow, no Nostr Wallet Connect. The legacy app
  sent Alby's client secret from the app; the plan settles how v5 handles the OAuth client
  credentials without committing a secret (**public-repo-no-secrets**), which may need an API
  route or env keys.
- **Depends on:** none. Area G adapts this area's Alby client to area A's provider contract.
- **Shares files with:** area G (mobile navigation registry if the boost sheet links to provider
  settings; `apps/mobile/package.json` and `apps/mobile/package-lock.json` if both add
  dependencies); areas E, F, G (`packages/i18n-catalog/mobile/originals/*.json`); `apps/api` and
  env files only if the OAuth credential plan needs them.

### Area D — Web player boost button and web surface check

- **Rows:** R12, R14, R22, R44
- **Plan block:** 40–49
- **Starts from:** `apps/web/src/components/MediaPlayer/` (no boost reference today; the full
  player is `Modal/MediaPlayerModal.tsx` with `Desktop/` and `Mobile/` info views),
  `apps/web/src/components/Media/Header/HeaderButtons.tsx`, `apps/web/src/components/Modal/ModalBoost.tsx`,
  `apps/web/src/contexts/Modals.tsx`, and the channel and item page clients under
  `apps/web/src/app/{podcast,artist,album,episode,track,podcast/livestream,add-by-rss}/`.
- **Scope:** add the boost action to the web full player for the now-playing item when
  `getBoostEligibilityForContent` allows it, including Add by RSS playback; confirm every web
  channel and item surface (podcast, music, livestream, Add by RSS) shows the button when value
  data exists, and fix any that does not. Add or update Playwright coverage.
- **Depends on:** none.
- **Shares files with:** area A (`ModalBoost.tsx`, `contexts/Modals.tsx` if area A changes the
  modal's props); `packages/i18n-catalog/consumer/originals/*.json`.

### Area E — Mobile boost entry points on the player, channel, and item screens

- **Rows:** R13, R15, R23, R46
- **Plan block:** 50–59
- **Starts from:** `apps/mobile/src/components/boost/useBoostSheet.tsx`, `BoostSheet.tsx`,
  `boostFormModel.ts`; screens that already open it (`screens/player/FullPlayerScreen.tsx`,
  `screens/podcast/PodcastDetailScreen.tsx`, `screens/artist/ArtistDetailScreen.tsx`,
  `screens/album/AlbumDetailScreen.tsx`, `screens/home/AddByRssHomeDetailScreen.tsx`); item
  screens without it (`screens/episode/EpisodeDetailScreen.tsx`, `screens/track/TrackDetailScreen.tsx`,
  `screens/home/AddByRssEpisodeDetailScreen.tsx`, `AddByRssTrackDetailScreen.tsx`,
  `AddByRssLivestreamDetailScreen.tsx`); web's surface list from area D's starting files as the
  parity source.
- **Scope:** the boost button on the mobile full player and every channel and item screen web
  treats as boostable, gated by `getBoostEligibilityForContent`, opening the sheet with channel
  and item scope. Sending is area G's work; this area settles the `openBoost` arguments
  (channel, item, Add by RSS identity) area G will read. Includes Maestro coverage.
- **Depends on:** none.
- **Shares files with:** area F (the same mobile channel and item screen files); area G
  (`useBoostSheet.tsx`, `BoostSheet.tsx`, `boostFormModel.ts`);
  `packages/i18n-catalog/mobile/originals/*.json`.

### Area F — Received boostagrams list on mobile

- **Rows:** R24, R45
- **Plan block:** 60–69
- **Starts from:** `apps/web/src/components/Boost/messages/` (`BoostMessagesSection.tsx`,
  `useBoostMessagesSection.ts`, `useBoostMessagesView.ts`, `fetchPublicBoostMessages.ts`,
  `formatPublicBoostAmountLine.ts`, `createMbrssBoostBreadcrumbLinkResolver.ts`) and the 13 web
  page files that render it; `packages/v4v-metaboost/src/publicMessages.ts` and
  `publicConversionSnapshot.ts`; the mobile channel and item screens listed under area E.
- **Scope:** show the public list of received boostagrams on the same mobile screens where web
  shows it, promoting web's platform-neutral view logic into `@podverse/v4v-metaboost` (or another
  shared package) where that keeps web and mobile consistent, with a shared React Native list
  component under `apps/mobile/src/components/boost/`. Includes unit and Maestro coverage.
- **Depends on:** none.
- **Shares files with:** area E (the same mobile screen files); area A
  (`packages/v4v-metaboost/src/index.ts` exports); `packages/i18n-catalog/mobile/originals/*.json`.

### Area G — Mobile boost send through Alby

- **Rows:** R1, R7, R26, R28, R29, R30, R43
- **Plan block:** 70–79
- **Starts from:** area A's plans (the shared boost operation and provider contract), area C's
  plans (Alby client, connected-provider state), area E's plans (`openBoost` arguments);
  `apps/mobile/src/components/boost/BoostSheet.tsx` (submit sends nothing today) and
  `boostFormModel.ts`; `apps/mobile/package.json` (depends on `@podverse/v4v-metaboost` only, not
  `@podverse/v4v-btc-ln` or `@podverse/v4v-helpers`); the app assertion route
  `POST /api/v2/metaboost/mbrss-v1/mint-app-assertion`; mobile auth state for the signed-in name
  and the account's MetaBoost sender id.
- **Scope:** wire the sheet's submit to the shared boost operation with an Alby provider adapter;
  per-recipient status and errors; prompt to connect Alby when no provider is connected; one
  mbrss-v1 post after the largest split; anyone can send, the typed name is used, and sign-in
  fills the name and MetaBoost sender id. Close the remaining web and mobile parity gaps. Unit,
  API integration (if a route changes), and Maestro coverage.
- **Depends on:** areas A, C, E (steps 02, 04, 06; plans 10–19, 30–39, 50–59).
- **Shares files with:** area C (`apps/mobile/package.json`, `apps/mobile/package-lock.json`,
  navigation registry); area E (`useBoostSheet.tsx`, `BoostSheet.tsx`, `boostFormModel.ts`);
  `packages/i18n-catalog/mobile/originals/*.json`.

## Order

- **Wave 1:** areas A, B, C, D, E, F (planning steps 02–07), run at once.
- **Wave 2:** area G (planning step 08), after wave 1.
- **Second pass, wave 1:** steps 09, 11, and 13, after the first review. They amend different plans.
- **Second pass, wave 2:** steps 10, 12, and 14, after second-pass wave 1.

## Decisions to review

The operator answered these in [00-REQUEST.md](00-REQUEST.md) under "Review of the first planning
pass". That section is the one to plan when it disagrees with the choice recorded here.

Product choices the request did not settle, collected from each area step's `## Decisions`
list. Each item gives the choice made, the main alternative, the step, and the plan. Step 03
(area B) recorded none.

### Step 02 — area A, shared boost send operation

- **D1** (step 02, plan 10) The provider contract is `BoostPaymentProvider` in `@podverse/v4v-btc-ln`. Alternative: a new package, or the missing `@podverse/external-services-alby` package. Area C still places the Alby client; area G adapts that client to this type.
- **D2** (step 02, plan 10) A keysend with no MetaBoost post still omits the listener message and sender name from the bLIP record, matching what web does today. The doc is updated to match the code. Alternative: put the typed message in that record, which one sentence in `V4V-METABOOST-LNURL.md` described.
- **D3** (step 02, plan 10) The mbrss-v1 post body and the "after the largest split" rule are shared. Minting the app assertion and the HTTP POST are an injected transport, because that mint route is the app's authenticated API. Alternative: copy the post into web and mobile.
- **D4** (step 02, plan 11) `/donate` stays signed-in. Channel and item boosts (`creator_only`) do not require an account. Alternative: remove the gate on `/donate` as well.
- **D5** (step 02, plan 11) A blank sender-name field takes `account_profile.display_name`. A non-blank typed or saved name stays, including after a later display-name change. Email is not used. Alternative: always overwrite with the display name, or fall back to email. Compare D26, which does not store a name on the phone.
- **D6** (step 02, plan 11) A signed-out creator boost still GETs capability with no `sender_guid`, so the message limit can apply, and it does not POST mbrss-v1. Alternative: skip that GET and use the 400-character bLIP limit.

### Step 03 — area B, feed value data, v4 fallback, and existing-support audit

none

The step then stated a rule it treated as already settled by v4 and `V4V-METABOOST-LNURL.md`: a lightning `node` or `lnaddress` recipient is enough to show the boost action, a missing MetaBoost URL skips the mbrss-v1 post, the public message list still needs `mbrss-v1`, and PayPal-only channels with no MetaBoost standard stay hidden. Area A's notes say area A does not change `getBoostEligibilityForContent`, which today also requires a MetaBoost standard of `mbrss-v1` or `mb-v1`.

### Step 04 — area C, mobile Alby login and value provider settings

- **D7** (step 04, plans 30 and 31) Public PKCE, no client secret and no API proxy. The token request uses Basic auth with the client id and an empty password. Alternative: an API route that holds the secret.
- **D8** (step 04, plans 31 and 32) The sign-in page opens in the system browser (`expo-web-browser` `openAuthSessionAsync`). Alternative: the legacy in-app WebView.
- **D9** (step 04, plan 31) Alby tokens stay on the phone across Podverse sign-out, so a signed-out listener can still send. Alternative: clear them in `clearSession`.
- **D10** (step 04, plan 30) Payments use the OAuth wallet API: keysend-multi and BOLT11 on `api.getalby.com`, even though Alby marks that API deprecated. Alternative: Nostr Wallet Connect, which this set excludes.
- **D11** (step 04, plan 30) OAuth scope is `account:read`, `balance:read`, and `payments:send`. Alternative: also request `transactions:read`, as the legacy app did.
- **D12** (step 04, plan 32) The Alby screen shows sats and a Lightning Address. No fiat line. Alternative: the legacy Alby rates call.
- **D13** (step 04, plan 32) These screens have no sender-name field and no lightning-icon switch. The boost sheet owns the name. Alternative: the legacy settings header.

### Step 05 — area D, web player boost button and web surface check

- **D14** (step 05, plan 41) The button goes on the fullscreen player, not the bar under the page and not embed players. Alternative: the persistent bar as well.
- **D15** (step 05, plan 40) An Add by RSS episode, track, or livestream page boosts that item, matching the database item pages. Alternative: keep those pages as channel boosts.
- **D16** (step 05, plan 41) While another device's item is still loading, the player button is absent. Alternative: a disabled button.
- **D17** (step 05, plan 41) If the stored channel has no `channel_values` array, the player fetches the channel unless `has_podcast_index_value` is false. Alternative: fetch on every open.

### Step 06 — area E, mobile boost entry points

- **D18** (step 06, plan 50) Add by RSS item screens and Add by RSS playback pass the item (guid, title, images, values). Alternative: today's web Add by RSS headers, which pass `item: null`. Plan 40 (D15) changes those web pages to pass the item.
- **D19** (step 06, plan 50) `ClipDetailScreen` gets no boost button, and there is no mobile chapter screen. Alternative: copying the web clip page, which shows the button only because it mounts the parent channel header.

### Step 07 — area F, received boostagrams list on mobile

- **D20** (step 07, plan 61) No mobile page for the website tip list. Alternative: a new mobile donate screen.
- **D21** (step 07, plan 61) An item breadcrumb is a link only when that guid is already stored on the device. Alternative: walking the channel-item API the way web does.
- **D22** (step 07, plan 61) The Boosts chip sits immediately before Funding, or before People when that screen has no Funding chip. Alternative: copying each web page's chip index.
- **D23** (step 07, plan 61) Mobile appends pages of 20. Web keeps numbered page replacement.

### Step 08 — area G, mobile boost send through Alby

- **D24** (step 08, plan 71) Connect stays on the sheet. Submit calls `connectAlby()` and leaves the full player open. Alternative: `navigateToAlbyProvider()`, which needs the player closed first.
- **D25** (step 08, plan 71) The Value for Value settings flag does not gate this sheet. Connect and send depend on the Alby client id and session. Alternative: hide Connect when `EXPO_PUBLIC_MOBILE_V4V_ENABLED` is off.
- **D26** (step 08, plan 71) The name is not stored on the device. Each open starts from the account display name, and a typed name is what gets sent. Alternative: remember it the way the web form defaults do. Compare D5.
- **D27** (step 08, plans 70 and 71) Mobile does not post mb-v1. An mb-v1 channel still pays Lightning, with the message on the keysend, and skips the HTTP post. Alternative: post mb-v1 the way web does for that standard.
