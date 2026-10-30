## Tab rows scroll by dragging, without a scrollbar

- Surfaces: web, management-web
- Change: Settings, profile, and management tab rows hide the horizontal scrollbar and scroll with a
  click-and-drag, the same way chip rows do. Both use `HorizontalDragScroller`.
- Who notices: anyone whose window is too narrow for the full tab row

## Alpha test push

- Surfaces: workers, k8s ops, alpha workers env
- Change: `notificationsTestPush` lists an account's registered devices or sends a visible test
  push and prints each provider result. It refuses unless `NOTIFICATIONS_TEST_PUSH_ENABLED` is
  `true`. Alpha workers env sets that flag. Operators start a Job with
  `npm run notifications:test-push:k8s`.
- Who notices: operators debugging push delivery on alpha
- Operator steps: publish a workers image that contains the command, pin the alpha ops app to a
  ref that includes the `ops-notifications-test-push` CronJob, sync the workers ConfigMap, then
  run the script

## Remote stub tables

- Surfaces: api (database), k8s base env, ops migration job
- Change: new app migration `0002_remote_stubs.sql` adds `remote_channel_stub`,
  `remote_channel_stub_alias`, and `remote_item_stub`, which hold minimal placeholder rows for
  `podcast:remoteItem` feeds and items the index provider knows but Podverse has not fully
  parsed. Nothing writes or reads them yet in this change. `API_EXPECTED_MIGRATION_FILENAME` is
  now `0002_remote_stubs.sql`.
- Who notices: operators; no user-visible change on its own
- Operator steps: existing databases run the app linear migration job before the API rolls out;
  overlays that override `API_EXPECTED_MIGRATION_FILENAME` point it at `0002_remote_stubs.sql`

## Channel rows in podroll and remote item lists show the author

- Surfaces: web
- Change: a show row in Podroll or Remote Items shows the author under the title when it is
  non-blank. That applies to a fully parsed show and to a remote stub. A blank author stays
  hidden, so the row remains title and image. The line uses the same secondary subtitle style as
  an episode stub in those lists.
- Who notices: listeners looking at a podcast or album podroll, or a Remote Items section, when
  the listed show has an author
- Operator steps: none

## Podroll matches parsed feeds by URL and keeps feed order

- Surfaces: api
- Change: `GET /podroll/channel/:idOrIdText` now matches a podroll reference to a parsed Podverse
  channel by feed URL when its feed GUID does not match, counts a channel as added only once it
  is fully parsed (has About data), and returns entries in the order the source feed lists them.
  Item references whose podcast is parsed but whose episode is not are left out.
- Who notices: listeners viewing podrolls that reference feeds by URL, or feeds still being parsed
- Operator steps: none

## Parser writes remote stubs instead of ignoring remote items

- Surfaces: workers (parser), api (parser context)
- Change: after a feed parses (or is skipped because it has not changed), the parser resolves
  every `podcast:remoteItem` it references (channel remote item lists, podroll, publisher and
  artist album references, value time splits) through the index provider and stores remote stubs:
  minimal channel rows, plus item rows when the reference names an item the provider knows. Feeds
  the provider does not know get nothing and are asked about again on the next parse of the source
  feed. Stubs never queue a full parse or an image shrink. A stub is deleted when its feed is later
  fully parsed. Stubs are refreshed from the provider after seven days; each parse makes at most
  100 single-feed or item lookups and leaves the rest for the next parse.
  `PARSER_ADD_REMOTE_ITEMS_TO_MQ=true` keeps the old behavior (queue a full parse of every
  referenced feed the provider knows) and then writes no stubs.
- Who notices: operators (more Podcast Index lookups per parse of feeds with remote items); users
  once the API and clients read stubs
- Operator steps: none; leave `PARSER_ADD_REMOTE_ITEMS_TO_MQ` empty for the stub path

## Remote item lists show stored stubs instead of live Podcast Index lookups

- Surfaces: api, web, mobile (response consumers)
- Change: `GET /podroll/channel/:idOrIdText` and `GET /publisher-feed/channel/:idOrIdText` no longer call Podcast Index on each request. `channelsUnadded` and `itemsUnadded` now hold remote stub objects (`is_remote_stub`, `index_provider`, `provider_feed_id`, `feed_url`, `title`, `author`, `image_url`, `medium_id`; item stubs add `item_guid`, `pub_date`, `duration_seconds`, and `channel_stub`) instead of raw Podcast Index feeds and episodes. A reference with no parsed row and no stored stub is left out of the response. The `pi:feed:*` and `pi:episode:*` cache keys are no longer written.
- Who notices: listeners see podroll and Not Yet Added album rows only for feeds the parser has stubbed; API clients reading the old Podcast Index fields must switch to the stub fields
- Operator steps: none for the API itself; existing references show again once their source feed is parsed again and stubs are written

## Add by RSS remote item lookup and resolve endpoints

- Surfaces: api, k8s base env
- Change: `POST /account/add-by-rss/remote-item/lookup` (up to 100 references, database reads only) tells a client what each podroll or `podcast:remoteItem` reference in a device-stored Add by RSS feed is: a public directory channel or item, a stored remote stub (channel or item), or neither. Item references are supported. `POST /account/add-by-rss/remote-item/resolve` handles a click on one reference by its feed: a directory channel wins; otherwise it asks the index provider with only the remote feed's GUID or URL and creates or reuses a remote stub, or answers `not_found` (open the Add by RSS search detail) or `directory_unavailable`. Both need a session or an API key with `add_by_rss:read`. Neither accepts credentials or extra fields, and a feed URL carrying a username and password is rejected with 400. Resolve answers 503 when the provider is unreachable and never queues a parse. New env var `ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_MAX_PER_MINUTE` (default 30, per account).
- Who notices: Add by RSS listeners (through the podroll and remote item rows in later changes); API key users
- Operator steps: none; set the env var only to change the default limit

## Remote stubs follow Podcast Index merges

- Surfaces: workers (dead-feed job, parser), orm
- Change: when a remote stub's feed is merged in Podcast Index, the hourly dead-feed job re-points
  the stub (its lookup keys and item rows) to the surviving feed, and removes stubs whose feed is
  retired with no survivor or whose survivor Podverse already parses. When a source feed's
  re-parse resolves a reference to a different feed, the old stub is removed once nothing points
  to it. `PODCAST_INDEX_DUPLICATE_MERGE_MODE` controls the stub pass too (`off`, `dry_run` logs
  counts, `apply` writes). Log lines about deleting "stub feeds" now say "feeds without a channel".
- Who notices: operators reading dead-feed job logs; listeners see podroll and album rows for
  merged feeds open the surviving feed
- Operator steps: none; the pass runs only where `PODCAST_INDEX_DUPLICATE_MERGE_MODE` is
  `dry_run` or `apply`

## Channel remote item lists endpoint

- Surfaces: api
- Change: new public `GET /remote-item/channel/:idOrIdText` returns a channel's own
  `podcast:remoteItem` list in feed order, in the same shape as the podroll endpoint: parsed
  channels and items, plus remote stubs for feeds Podverse has not parsed. References with
  neither are left out.
- Who notices: API clients; web and mobile use it to show remote item lists
- Operator steps: none

## Mobile Podcast Index preview opens the podcast when it is already added

- Surfaces: mobile
- Change: the Podcast Index preview (Search Result screen) now replaces itself with the podcast,
  album, or artist screen when the feed is already fully parsed, and refreshes its description
  from Podcast Index when it was opened from a list row that had none. The screen layout moved
  into a shared component the Add by RSS remote feed screen also uses; it looks the same.
- Who notices: mobile listeners opening not-yet-added feeds from podroll or album lists
- Operator steps: none

## Workers run remote stub admin actions

- Surfaces: workers (`scheduledJobsRunDue`), orm
- Change: three scheduled job types, `remote-stub-recheck`, `remote-stub-repoint`, and `remote-stub-promote`. Re-check looks the stub up again now and refreshes, re-points, or removes it; re-point moves a stub's lookup keys and item rows to a provider feed id an admin chose; promote runs a forced full parse of the stub's feed, which then replaces the stub. An unreachable index retries with the usual backoff.
- Who notices: admins using the remote stub tools in management
- Operator steps: none; the existing `scheduledJobsRunDue` cron runs them

## Add by RSS search detail for feeds the index does not know

- Surfaces: web
- Change: new page `/add-by-rss/remote-feed?feed_url=…&title=…` shows a remote feed that the
  index provider does not know, with its title (or URL), an RSS Link button, and an Add by RSS
  button that follows and parses it the same way the Add by RSS add page does, then opens it.
  It uses the same layout component as the Podcast Index feed page. Opening it for a feed already
  in the browser's Add by RSS library goes straight to that feed.
- Who notices: web listeners who click a podroll entry in an Add by RSS feed that Podcast Index
  does not list
- Operator steps: none

## Mobile Add by RSS screen for feeds the index does not know

- Surfaces: mobile
- Change: new Add by RSS screen for a remote feed Podcast Index does not list. It shows the
  feed's title (or URL) and an Add by RSS button that follows and parses it like the Add by RSS
  add screen, then opens it. It uses the same layout as the Podcast Index preview screen. Opening
  it for a feed already on the device goes straight to that feed.
- Who notices: mobile listeners who tap a podroll entry in an Add by RSS feed that Podcast Index
  does not list
- Operator steps: none

## Podroll rows open the provider page for a stubbed show

- Surfaces: web
- Change: podroll on podcast, album, and artist pages lists a remote stub with its title and
  artwork. An episode stub shows the episode title, the show title, the publish date, and the
  duration, and is not playable. Clicking either row opens the Podcast Index page for the show.
  A podroll reference with no stub is left off the page, and an empty podroll hides the section.
- Who notices: listeners opening a show whose podroll points at feeds Podverse has not fully added
- Operator steps: none

## Mobile podroll and Not Yet Added albums show remote stubs

- Surfaces: mobile
- Change: podroll on podcast, album, and artist screens now lists recommended feeds and episodes
  Podverse has not parsed yet, using the remote stubs the API returns. Tapping one opens the
  Podcast Index preview for its feed (an episode stub opens its show's preview). Podroll rows on
  album and artist screens gain artwork, and a recommended album, artist, or track now opens the
  album, artist, or track screen instead of the podcast or episode screen. The artist's Not Yet
  Added albums render from the same stubs, and every row is tappable.
- Who notices: mobile listeners browsing podrolls and artist pages
- Operator steps: none

## Management API remote stub routes

- Surfaces: management-api
- Change: `GET /feeds/remote-stubs` (search, sort, pages), `GET /feeds/remote-stubs/:id`, and
  `POST …/:id/recheck`, `…/:id/repoint` (`{ provider_feed_id }`), `…/:id/promote`, plus
  `DELETE /feeds/remote-stubs/:id`. The POST routes queue a workers job and answer 202; every
  write is audit-logged. Permissions: feeds read, update (re-check, re-point), create (promote),
  delete.
- Who notices: admins and anyone scripting the management API
- Operator steps: none

## Not Yet Added albums link to the provider page from the stored stub

- Surfaces: web
- Change: an artist's Not Yet Added album row shows the stub's title, author, and artwork, and
  opens the Podcast Index page for that feed. An album the artist's feed lists that has no stub
  stays off the page.
- Who notices: listeners on an artist page
- Operator steps: none

## Podcast and album pages list a channel's remote items

- Surfaces: web
- Change: a podcast or album page shows a Remote Items section when the feed has
  `podcast:remoteItem` entries that resolve to a parsed channel, a parsed episode, or a remote
  stub. Stub rows match podroll: the show or episode is listed, and a click opens the Podcast
  Index page for the show. References with no stub are left out, and an empty list hides the
  section. Artist pages are unchanged.
- Who notices: listeners on a podcast or album whose feed points at other feeds
- Operator steps: none

## Remote Stubs pages in management

- Surfaces: management-web
- Change: Feeds › Remote Stubs lists remote stubs (search, sort, item counts, last resolved, any queued action). A stub's page shows its lookup keys, items, and recent jobs, with Re-check Now, Re-point (to a provider feed id), Promote to Full Parse, and Delete. Actions are queued for workers and show as pending until they run.
- Who notices: admins with feeds permissions (delete and promote need delete and create)
- Operator steps: none

## Podroll and Remote Items on Add by RSS pages (web)

- Surfaces: web
- Change: Add by RSS podcast, album, and artist pages show a Podroll tab when the feed lists a `podcast:podroll`, and podcast and album pages show a Remote Items tab when the feed lists `podcast:remoteItem` entries, the same lists directory feeds show. Both lists include episode and track rows. Entries already in the browser's Add by RSS library, in the directory, or stored as remote stubs open directly. Any other entry is looked up on click by its feed: it opens the directory page or the Podcast Index page when the index knows the feed, and otherwise the new Add by RSS search detail page with an Add by RSS button. The lookup sends only the remote feed's GUID or URL; an Add by RSS feed's username and password are never sent for its remote items. Nothing is parsed or saved until the listener adds a feed.
- Who notices: web listeners with Add by RSS feeds that recommend or reference other feeds
- Operator steps: none

## Mobile shows a channel's remote item list

- Surfaces: mobile
- Change: podcast and album screens gain a Remote Items section when the feed lists
  `podcast:remoteItem` entries (common on music and podcast list feeds). Parsed entries open
  their episode, track, podcast, or album screen; entries Podverse has not parsed yet show as
  remote stubs that open the Podcast Index preview for their feed. The section is unavailable in
  Offline Mode. New string `info.no_remote_items_found` in all four consumer locales; the
  section reuses the web section's `info.remote_items` label.
- Who notices: mobile listeners opening music or podcast list feeds
- Operator steps: none

## Podroll and Remote Items on Add by RSS feeds (mobile)

- Surfaces: mobile
- Change: Add by RSS feed screens offer a Podroll section when the feed lists a
  `podcast:podroll`, and podcast and album feeds offer a Remote Items section when the feed lists
  `podcast:remoteItem` entries, the same lists directory feeds show. Both include episode and
  track rows. Entries already on the device, in the directory, or stored as remote stubs open
  directly. Any other entry is looked up when tapped: it opens the directory screen or the Podcast
  Index preview when the index knows the feed, and otherwise the Add by RSS remote feed screen
  with an Add by RSS button. The lookup sends only the remote feed's GUID or URL; an Add by RSS
  feed's username and password are never sent for its remote items, and remote artwork never
  carries them. Nothing is parsed or saved until the listener adds a feed. Offline, entries the
  device does not have show the offline notice.
- Who notices: mobile listeners with Add by RSS feeds that recommend or reference other feeds
- Operator steps: none

## Inbox rows keep their unseen dot for the whole visit

- Surfaces: web, mobile
- Change: Opening the notifications inbox still marks every notification seen, and the next open
  shows no dot on them. During the visit itself, rows that were unseen when it started, or that
  arrived while it was open, now keep their dot even when the list reloads (a stream resync, a
  token refresh, Retry, an Offline Mode switch on mobile, or paging back to page 1 on web). On
  mobile, a notification that arrives while the inbox is open is no longer cached as unseen, so
  the next open does not flash a dot on it before the list loads.
- Who notices: signed-in members who use the inbox
- Operator steps: none

## Mobile notification times read like web, with no raw "#"

- Surfaces: mobile, web, shared i18n catalog
- Change: the time under each mobile inbox notification and in the in-app banner read like
  "2 other {# hours ago}}". Mobile now formats it with the platform relative-time formatter, as
  web does, in the app's language: "2 hours ago", "yesterday", "now". Screen readers on inbox rows
  hear the same corrected text. Web's inbox uses the same shared formatter with no visible change.
  Mobile now bundles small `Intl.PluralRules` and `Intl.RelativeTimeFormat` polyfills for its four
  languages, because Hermes lacks both. That also gives the app's plural strings each language's
  own plural rules (French "0" takes the singular form). The unused
  `notifications_page.relative_time_*` catalog keys are removed.
- Who notices: signed-in mobile users with notifications; screen reader users on the inbox;
  translators (nine fewer keys, none of which had override text)
- Operator steps: none. The polyfills are JavaScript only, so no native rebuild is needed.

## Mobile reads the shared catalog's plural strings

- Surfaces: mobile, shared i18n catalog
- Change: mobile now expands the catalog's ICU plural strings (`{count, plural, …}`) into its own
  plural keys as it loads its strings, so a plural string written once for web also renders on
  mobile. Removed Content (the clip and playlist entry counts) and the OPML import rate-limit
  message now use the same shared strings as web, and the mobile-only copies of those strings are
  deleted from the mobile catalog in all four languages. The text people see does not change. A
  plural string added to the shared or consumer catalog later renders on mobile with no extra
  mobile copy.
- Who notices: translators and operators, who now edit these strings in one place; listeners see
  no change
- Operator steps: none
