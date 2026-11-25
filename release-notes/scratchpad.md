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

## Custom API switch can carry subscriptions

- Surfaces: mobile
- Change: Clear Local Data opens while the person is still signed in. Export OPML on that screen saves subscriptions before this phone is erased. Signed in, the file is the current server's account subscriptions. Signed out, it is the subscriptions on this phone. Skipping the export, dismissing the share sheet, or a failed export leaves the address and local data as they are. Clear and Switch signs out of the current server, erases this phone, then saves the new address. Cancel leaves the session, the address, and local data.
- Who notices: listeners who point the app at a different API or reset to the built-in API
- Operator steps: none

## Instance catalog settings (web)

- Surfaces: web, web runtime-config sidecar
- Change: three optional runtime keys on the web sidecar.
  `NEXT_PUBLIC_CATALOG_MUSIC_DISABLED=true` turns Music off,
  `NEXT_PUBLIC_CATALOG_ADD_BY_RSS_DISABLED=true` turns Add by RSS off, and
  `NEXT_PUBLIC_CATALOG_PODCAST_INDEX_ID_ALLOWLIST` takes comma-separated Podcast Index feed ids
  (no size limit). They limit what gets added from now on; stored content keeps its pages. Blank
  keeps today's full site. The sidecar validates them and refuses to start on an invalid value.
  They reach the app through runtime config, so a change needs a restart, not a rebuild. The
  parsing lives in `@podverse/helpers-config` so the API and workers read the same values.
- Who notices: self-hosters building a branded or single-interest instance
- Operator steps: none for existing deployments (blank keys)

## Instance catalog settings (API and workers)

- Surfaces: api, workers
- Change: the API and workers read optional `CATALOG_MUSIC_DISABLED`,
  `CATALOG_ADD_BY_RSS_DISABLED`, and `CATALOG_PODCAST_INDEX_ID_ALLOWLIST`, the same settings the
  web sidecar reads as `NEXT_PUBLIC_CATALOG_*`. Blank keeps today's behavior. An invalid value
  fails API startup, and fails startup for every workers command that parses feeds or reads
  Podcast Index. No route or job changes behavior from this entry alone.
- Who notices: operators of narrowed self-hosted instances
- Operator steps: none for existing deployments (blank keys)

## Instance catalog settings: one ConfigMap and one local override

- Surfaces: k8s base env, ops, local env overrides
- Change: new shared ConfigMap `podverse-catalog-config` in `infra/k8s/base/common` with blank
  `CATALOG_MUSIC_DISABLED`, `CATALOG_ADD_BY_RSS_DISABLED`, and
  `CATALOG_PODCAST_INDEX_ID_ALLOWLIST`. The API and the workers that parse feeds or read Podcast
  Index mount it; the web runtime-config sidecar mounts it with `prefix: NEXT_PUBLIC_`, so all
  three read the same values. Local dev sets all of them from one `catalog.env` override.
- Who notices: operators of self-hosted and GitOps deployments
- Operator steps: GitOps repos that pin `base/common` pick up the new ConfigMap on the next sync,
  with nothing to set. To narrow an instance, merge `podverse-catalog-config` in the `common`
  overlay and restart the API, web, and workers pods.

## Title search for instances with a Podcast Index id allowlist (API)

- Surfaces: api
- Change: new public `GET /channel/search/title?q=&medium=all|music&page=`. It matches the term against the titles of every stored directory channel in Postgres, case-insensitive. Titles that start with the term come first, then titles that contain it, with the newest last publish date first in each group. Pages are cut in the query, and `meta.count` is the total. `all` searches podcasts and videos; `music` searches music. It makes no Podcast Index request and adds no index. It answers only while `CATALOG_PODCAST_INDEX_ID_ALLOWLIST` is set and returns 404 otherwise. The Podcast Index search route is unchanged.
- Who notices: operators of narrowed instances; web Search uses it on those instances
- Operator steps: none

## Search lists stored shows on instances with a Podcast Index id allowlist (web)

- Surfaces: web
- Change: with `NEXT_PUBLIC_CATALOG_PODCAST_INDEX_ID_ALLOWLIST` set, the Search page no longer queries the Podcast Index. It matches the typed term against the titles of every show already stored on the instance, including stored shows off the list. Titles that start with the term come first, then the newest. Results are paged, and each row opens the show page; no result offers to add a feed. With the allowlist blank, Search is unchanged.
- Who notices: visitors to an instance that sets the allowlist
- Operator steps: none (keep the web and API catalog settings equal, as the shared config already does)

## Music chips hidden when Music is off

- Surfaces: web
- Change: with `NEXT_PUBLIC_CATALOG_MUSIC_DISABLED=true`, Home, Browse, Recommendations, and
  Add by RSS no longer show Artists, Albums, or Tracks. Clips, Livestreams, Playlists, and Users
  stay. Opening a URL for a hidden chip shows Podcasts.
- Who notices: visitors on an instance with Music turned off
- Operator steps: none beyond the catalog setting from the catalog-settings plan

## Search drops the Music facet when Music is off

- Surfaces: web
- Change: with Music turned off, Search no longer shows All and Music. The field searches
  podcasts, which is what All already did. A saved Music facet opens that podcast search.
- Who notices: visitors on an instance with Music turned off
- Operator steps: none

## Library medium controls follow stored music when Music is off

- Surfaces: web
- Change: with Music turned off, Queues show Podcasts and Music only when the active queue is
  music or the music queue has rows, and otherwise list the podcast queue with no tabs. History
  shows those tabs only when music is in history. The playlists filter shows Music only when
  that list has a music playlist, and a saved Music filter with nothing to show opens All.
  Playlist pages stay.
- Who notices: visitors on an instance with Music turned off
- Operator steps: none

## Embed demo page omits album and track when Music is off

- Surfaces: web
- Change: with Music turned off, the embed demo page no longer lists album or track players.
  Episode, clip, chapter, and podcast demos stay.
- Who notices: visitors who open the embed page on an instance with Music turned off
- Operator steps: none

## Add by RSS can be turned off (web)

- Surfaces: web
- Change: with `NEXT_PUBLIC_CATALOG_ADD_BY_RSS_DISABLED=true`, the sidebar has no Add by RSS
  link and every `/add-by-rss` URL is a not-found page, so there is no way to add a feed. Saved
  Add by RSS rows still show on Home, queue, history, and playlist pages, and queue and playlist
  rows keep Remove. A saved row that links into `/add-by-rss` opens the not-found page. A playing
  Add by RSS item keeps playing; the full-size player shows its title without a link and omits
  artist links into `/add-by-rss`. The browser stops background refresh and first parses of
  saved feeds. Blank keeps Add by RSS.
- Who notices: self-hosters who turn Add by RSS off on a branded instance, and listeners on that
  instance who saved Add by RSS feeds earlier
- Operator steps: set the key in the web runtime-config env, set `CATALOG_ADD_BY_RSS_DISABLED`
  to the same value on the API, and restart both

## API refuses Add by RSS parses and new follows when Add by RSS is off

- Surfaces: api
- Change: with `CATALOG_ADD_BY_RSS_DISABLED=true`, `POST /account/follow/add-by-rss-channel`,
  `POST /account/add-by-rss/parse`, and `POST /account/add-by-rss/parse/all` return 403 with
  code `add_by_rss_disabled`, before authentication. Unfollow, the followed list, parse status,
  convert-to-channel, remote-item lookup and resolve, chapters and transcripts, and the queue and
  playlist Add by RSS routes stay open, so saved rows keep playing and can be removed. Blank
  keeps today's behavior.
- Who notices: mobile users on an instance with Add by RSS off see the add-failed message when
  they add a feed while signed in; their saved feeds keep playing from the parse on the phone
- Operator steps: set the key on the API with the same value as the web sidecar's
  `NEXT_PUBLIC_CATALOG_ADD_BY_RSS_DISABLED`

## OPML import saves no Add by RSS feed when Add by RSS is off

- Surfaces: workers, api
- Change: with `CATALOG_ADD_BY_RSS_DISABLED=true`, OPML import reports a feed that is not stored
  and not in Podcast Index as failed, with "Add by RSS is turned off on this server.", and saves
  no Add by RSS follow. Stored and Podcast Index feeds import as before. Blank keeps today's
  behavior.
- Who notices: listeners importing OPML on an instance with Add by RSS off
- Operator steps: set the key on the workers that run `mqOpmlImportRun` with the same value as
  the API

## Workers add only allowlisted feeds, and no music while Music is off

- Surfaces: workers
- Change: before the parser creates a feed row it has never stored, it checks the instance
  catalog settings. With `CATALOG_PODCAST_INDEX_ID_ALLOWLIST` set, only listed Podcast Index ids
  (or the surviving show of a listed id that Podcast Index merged) are added. With
  `CATALOG_MUSIC_DISABLED=true`, feeds whose Podcast Index medium is music, or publisher feeds
  that list mostly music, are not added; when the medium cannot be read the feed is skipped and
  retried on a later run. Feeds already stored are never checked: they keep refreshing, and no
  stored row is removed or hidden. A skipped feed is logged at info level and its queue message is
  accepted. Applies to every worker add path: MQ add, trending, the parser commands, remote
  items, the on-demand add, OPML import, and the dev seeders. v4 migration commands are not
  affected.
- Who notices: operators of narrowed instances; blank settings keep today's behavior
- Operator steps: none beyond the catalog keys

## Command to add the allowlisted Podcast Index feeds

- Surfaces: workers, k8s
- Change: new workers command `mqRSSAddCatalogAllowlist` and suspended ops CronJob
  `mq-rss-add-catalog-allowlist`. It enqueues every id in `CATALOG_PODCAST_INDEX_ID_ALLOWLIST`
  that is not stored yet. When Podcast Index merged a listed id into another show (read from the
  dead-feed CSV), it enqueues the surviving show instead, and the parser admits it on behalf of
  the listed id. Ids it cannot resolve are logged. Blank allowlist: it does nothing.
- Who notices: operators of narrowed instances
- Operator steps: after setting or changing the allowlist, create a Job from the
  `mq-rss-add-catalog-allowlist` CronJob (or run `mqRSSAddCatalogAllowlist` locally)

## Podcast Index Add Feed is off while the allowlist is set

- Surfaces: api, web
- Change: while `CATALOG_PODCAST_INDEX_ID_ALLOWLIST` is set, `POST /mq/rss/add/on-demand` returns
  403 with code `catalog_add_disabled` and enqueues nothing, and the web Podcast Index feed page
  shows the feed with "This feed is not in our directory." and no Add Feed button. On-demand
  refresh is unchanged. With the allowlist blank the button and route behave as before, whether
  or not Add by RSS or Music is off.
- Who notices: visitors and API clients of narrowed instances
- Operator steps: none beyond the catalog keys

## OPML import follows the catalog allowlist

- Surfaces: workers, api
- Change: while `CATALOG_PODCAST_INDEX_ID_ALLOWLIST` is set, an OPML import treats an unstored
  feed whose Podcast Index id is not listed as unindexed: no directory add and no pending follow;
  it goes through the same Add by RSS path as any unindexed feed. Listed feeds and feeds already
  stored import as before.
- Who notices: listeners importing OPML on narrowed instances
- Operator steps: none beyond the catalog keys

## Custom API share links use that server's website

- Surfaces: api, mobile
- Change: `GET /health` includes `webOrigin`, built from `WEB_PROTOCOL` and `WEB_DOMAIN`. Null when
  that pair is not an http or https origin. The health check still returns 200. While the mobile
  app has a custom API saved, share links and in-app browser pages (checkout, terms) use that
  origin, including offline, and a later launch refreshes it. If the server omits it or sends
  null, those links stay off instead of using the website baked into the app. With no custom API,
  share links and universal links stay on `EXPO_PUBLIC_MOBILE_WEB_BASE_URL`.
- Who notices: listeners who point the app at their own server and use Share or open a page in the
  browser; operators whose `WEB_DOMAIN` is what those links should use
- Operator steps: set `WEB_PROTOCOL` and `WEB_DOMAIN` on that API to the public website. No new
  env var.

## Signed-out site opens on Browse

- Surfaces: web, mobile
- Change: a signed-out visit to `/` redirects to `/browse` (temporary). Browse opens on Podcasts,
  sorted by Recent, in a grid. Subscribed stays in the sidebar at `/subscribed`, and a signed-in
  visit to `/` still opens Subscribed. The logo goes to Browse while signed out and to Subscribed
  while signed in. A saved choice on the device, and an explicit URL on the website, still win.
  The app still launches on Home. Recommendations are unchanged.
- Who notices: signed-out website visitors; operators who set the opening chip, sort, or view
- Operator steps: the website reads six optional sidecar keys,
  `NEXT_PUBLIC_BROWSE_DEFAULT_CHIP`, `NEXT_PUBLIC_BROWSE_DEFAULT_SORT`,
  `NEXT_PUBLIC_BROWSE_DEFAULT_VIEW`, `NEXT_PUBLIC_HOME_DEFAULT_CHIP`,
  `NEXT_PUBLIC_HOME_DEFAULT_SORT`, and `NEXT_PUBLIC_HOME_DEFAULT_VIEW`. Blank keeps the Browse
  opening above and the Subscribed opening already in use. A set Home sort applies signed in and
  signed out. The app reads the same names with the `EXPO_PUBLIC_` prefix and needs a new build.
