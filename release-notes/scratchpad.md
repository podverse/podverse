## Alpha migrate wait pages name the init container

- Surfaces: k8s optional alerting examples, triage docs
- Change: `PodverseDeployWaitingOnMigration` warns when migrate or version-contract init
  containers run for 10 minutes and names which Job to run; Alertmanager inhibits the generic
  `ArgoAppDegraded` critical for that namespace while it fires. Triage bot treats that wait (and
  one web runtime-config sidecar restart) as nothing to do.
- Who notices: alpha operators during a deploy that needs a manual migrate Job
- Operator steps: push the matching Prometheus, Alertmanager, and Argo CD notifications
  changes in the GitOps repo; paste the standing rule into the Podverse alpha triage bot

## Keysend boosts without MetaBoost carry the typed message

- Surfaces: web
- Change: A signed-in keysend with no MetaBoost post includes the typed message and the sender name on the bLIP record when each is non-empty. A Lightning Address invoice still carries no bLIP record. A missing MetaBoost URL skips the public post, and the Lightning payment still runs.
- Who notices: listeners who boost a show that has a lightning node and no MetaBoost tag, and the node that receives that keysend
- Operator steps: none

## Signed-out listeners can pay a web boost

- Surfaces: web
- Change: A signed-out visitor can pay a channel boost, an item boost, and a /donate tip. The name and message stay locked until Podverse login, including when there is no MetaBoost post. The form does not fill the name from the account display name. A typed name is remembered in the boost form defaults, and an empty name is sent as no name. The MetaBoost capability request and the public post wait until login and use the sender id.
- Who notices: listeners sending a boost or a tip in the browser without an account
- Operator steps: none

## Boost shows for a lightning recipient without MetaBoost

- Surfaces: web, mobile
- Change: The boost action shows for a lightning node or Lightning Address recipient even when the channel has no MetaBoost URL. The public received-boost list still needs mbrss-v1. A PayPal-only channel with no MetaBoost standard stays without a Boost button.
- Who notices: listeners on a show that has lightning value recipients and no MetaBoost tag
- Operator steps: none

## Value blocks match the feed on re-parse

- Surfaces: parser, workers
- Change: a lightning value block is split into an lnaddress block and a keysend block even when the feed also has another value type. A re-parse removes value rows and recipients the feed no longer lists. One value block with no recipients no longer deletes the channel's other value blocks. PayPal, Patreon, and Buy Me a Coffee blocks stay stored as the feed sends them.
- Who notices: a listener boosting a feed whose recipients changed. A node-only feed no longer keeps a Lightning Address recipient the feed removed.
- Operator steps: the next feed parse picks this up. No migration.

## Drop the Podcast Index value flag

- Surfaces: api, workers, k8s, web, mobile
- Change: `channel.has_podcast_index_value` is gone from the database and from channel JSON. Value recipients come from the RSS parse into `channel_values` and `item_values`. The worker `podcastIndexValueUpdateAll` is gone. It logged Podcast Index feed ids from a by-tag call and did not save recipients.
- Who notices: operators who ran that worker, and deployments that wait on the app migration marker. Listeners still boost from parsed value rows.
- Operator steps: app migrations run through `0019_drop_channel_has_podcast_index_value.sql`. `API_EXPECTED_MIGRATION_FILENAME` is that file. The management marker stays `0002_nano_id_v2_min_7.sql`.

## Mobile Alby login uses a public OAuth client

- Surfaces: mobile
- Change: a build can set `EXPO_PUBLIC_ALBY_OAUTH_CLIENT_ID` and optional Alby URLs. The app sends no client secret. Alby tokens stay in SecureStore on the phone and are not sent to the Podverse API.
- Who notices: operators of a build that turns on Value for Value
- Operator steps: register an Alby OAuth client whose callback is this build’s redirect URI (default `{first deep-link scheme}://alby/callback`), put that client id in `EXPO_PUBLIC_ALBY_OAUTH_CLIENT_ID`, and do not put a client secret in the repo, the app, or EAS env

## Mobile Value for Value settings connect Alby

- Surfaces: mobile
- Change: when `EXPO_PUBLIC_MOBILE_V4V_ENABLED` is `1`, More shows Value for Value. The listener connects or disconnects Alby in the system browser. The screen shows a sats balance and a Lightning Address. There is no streaming-sats control, no in-app Lightning node, no QR payment, and no Nostr Wallet Connect.
- Who notices: listeners on a build with that flag on and an Alby client id set
- Operator steps: leave `EXPO_PUBLIC_MOBILE_V4V_ENABLED` unset on store builds that must hide this

## Add by RSS item pages boost that item

- Surfaces: web
- Change: On an Add by RSS episode, track, or livestream page, Boost opens for that item. Channel pages still boost the channel. The button shows when `getBoostEligibilityForContent` allows it. A screen with an item passes that item's `item_values`.
- Who notices: listeners who boost from an Add by RSS item page
- Operator steps: none

## Boost on the web full player

- Surfaces: web
- Change: The fullscreen player shows Boost for the item that is playing when `getBoostEligibilityForContent` allows it. A stored channel with no `channel_values` array is loaded from our channel. An array that is already present, including an empty array, is left as it is. The bar under the page does not show Boost. Add by RSS playback uses the same button.
- Who notices: listeners sending a boost while something is playing on the website
- Operator steps: none

## Boost button on mobile item screens and Add by RSS playback

- Surfaces: mobile
- Change: The boost button opens the existing boost sheet on episode, track, and Add by RSS episode, track, and livestream screens when the channel can be boosted, and on the full player during Add by RSS playback. Directory livestreams use the episode screen. Submit still says sending is not available yet.
- Who notices: listeners on iOS and Android, when the channel or the item can show Boost
- Operator steps: none

## Received boostagrams on mobile

- Surfaces: mobile
- Change: Podcast, album, artist, episode, track, and Add by RSS screens that web already treats as having a public boost list gain a Boosts section chip and the same message rows (sender, time, amount, app, message). A directory live item opens the episode screen, which carries the chip. A directory item link in that list opens the episode or track by walking the channel item API, including an episode the phone has not stored. An Add by RSS link still searches the feed already on the phone. The website tip page is unchanged.
- Who notices: listeners opening a channel or item that already publishes boost messages
- Operator steps: none

## Mobile boost sheet sends through Alby

- Surfaces: mobile
- Change: The boost sheet sends a manual Lightning boostagram through the listener's Alby account. A signed-out listener can pay. The name and message stay locked until Podverse login. The sheet does not fill the name from the account display name. A typed name is remembered on the device and filled in next time until they edit it, and an empty name is sent as no name. After the largest split succeeds, one mbrss-v1 boost is posted when the channel uses that standard and the signed-in account has a MetaBoost sender id. The phone does not post mb-v1. PayPal, Patreon, and Buy Me a Coffee tabs still say sending is not available yet.
- Who notices: listeners on iOS and Android who open Boost on a channel that has Lightning value tags
- Operator steps: the build needs `EXPO_PUBLIC_ALBY_OAUTH_CLIENT_ID` for Connect to appear. There is no client secret.
