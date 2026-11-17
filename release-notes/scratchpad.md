## v4 library copy logs the unshipped directory-follow tier

- Surfaces: workers
- Change: `v4CopyAccountLibrary` logs the directory-follow tier it would store (1000, 2000, 3000, 4000, 5000, or 10000) and does not write a column. A count past 10000 copies no directory follows and reports needs_operator. A count of 500 or fewer is copied with no tier.
- Who notices: operators running the local v4 library copy
- Operator steps: none

## v4 library copy leaves an over-limit playlist for an operator

- Surfaces: workers
- Change: `v4CopyAccountLibrary` skips a playlist that would hold more than 10000 resources, reports that playlist as needs_operator, and copies the account's other playlists. It does not stop at 10000 members.
- Who notices: operators running the local v4 library copy
- Operator steps: none

## Local full migration rehearsal

- Surfaces: workers
- Change: `v4RunFullRehearsal` copies a stage of v4 accounts into the local database through identity, catalog, library, replay, membership, and a per-account check. It refuses a non-local database, dumps that database before each phase, restores the clean image for sample and full, and stops when more than 5% of the last 200 accounts fail in one phase.
- Who notices: operators running the local migration rehearsal
- Operator steps: start the parser again after `rehearsal restore=finished` so the catalog wait can finish. `--stage full` reads `WEB_DOMAIN` for the public path sample. Optional `V4_REHEARSAL_PASSWORD` checks sign-in for the rehearsal account only.

## Account phase status

- Surfaces: k8s, workers
- Change: App migration `0010_account_phase_status.sql` adds `account_phase_status`. One row per v4 user and phase (`identity`, `catalog`, `library`, `replay`, `membership`, `verify`) stores `pending`, `done`, `failed`, `deferred`, or `needs_operator`. `API_EXPECTED_MIGRATION_FILENAME` advances to that file. The management marker stays. The rehearsal runner resumes from these rows and the same rows are what a later copied / remaining / failed review counts.
- Who notices: a deploy waits until this migration is applied. No screen change.
- Operator steps: none beyond the usual migration apply

## v4 library copy keeps a failed group from rolling back the others

- Surfaces: workers
- Change: `v4CopyAccountLibrary` commits directory follows, Add by RSS, archived items, clips, playlists, and playback separately. A database refusal in one group is returned as an error class and the other groups stay written. `v4_library_copied_at` is set only when every group committed and none was left for an operator.
- Who notices: operators running the local v4 library copy
- Operator steps: none

## v4 library copy writes an Add by RSS tier

- Surfaces: workers
- Change: `v4CopyAccountLibrary` sets `max_add_by_rss_feeds` to the smallest tier that covers that account's Add by RSS count (200, 300, 400, 500, 1000, or 10000) when the count is over 100 and the stored number is missing or below the count, then copies the feeds. When the count is 100 or fewer and the stored number is below that count, the column is set to null and 100 is not written, and the feeds still copy. A stored number that already covers the count stays, including a number above 10000, and the feeds copy. A count past 10000 with no covering stored number copies no Add by RSS feeds and reports needs_operator. The copy never writes a number above 10000.
- Who notices: operators running the local v4 library copy
- Operator steps: none

## Launch queue keeps Matomo counts of 3 or more

- Surfaces: workers
- Change: The full catalog stage treats a v4 show as viewed when its highest `stats_podcast.play_count` across timeframes is at least 3. Shows whose highest count is 1 or 2 stay out unless an account subscribes to them. On the measured snapshot that viewed set is 214 shows.
- Who notices: operators running the local full catalog seed
- Operator steps: none

## Public Add by RSS directory match route

- Surfaces: api, k8s base env
- Change: new `POST /channel/add-by-rss-match` takes up to 100 feed URLs (and up to 500 episode
  references) and returns the parsed directory channel each URL belongs to, plus the directory
  episode for each reference. URLs match after ignoring http/https, host case, default port,
  fragment, and a trailing slash; a different `podcast:guid` is not a match.
- Who notices: no one directly; clients use it to turn Add by RSS feeds into subscriptions
- Operator steps: optional env `CHANNEL_ADD_BY_RSS_MATCH_MAX_PER_MINUTE` (default 60) and
  `CHANNEL_ADD_BY_RSS_MATCH_ANON_MAX_PER_MINUTE` (default 120)

## Add by RSS feeds that are in the directory become subscriptions

- Surfaces: api
- Change: `POST /account/follow/add-by-rss-channel` checks the URL against parsed directory
  channels first. A match follows the directory channel instead, returns 200 with
  `directory_channel`, and does not count toward the Add by RSS limit. New
  `POST /account/add-by-rss/convert-to-channel` converts an existing Add by RSS follow and moves the
  account's queue, history, now playing, and owned playlist rows onto the directory episodes
  (matched by guid, then enclosure URL). Unmatched episodes keep their Add by RSS data.
  Password-protected feeds never convert. No membership is needed to convert.
- Who notices: people who add a show by RSS that Podverse already has; they get the full podcast
  page
- Operator steps: none

## Mobile: Add by RSS feeds already in Podverse become regular subscriptions (signed out)

- Surfaces: mobile
- Change: signed out, adding an RSS URL that Podverse has already parsed subscribes to the
  Podverse podcast instead. On refresh (at most hourly, always on pull-to-refresh) existing
  signed-out Add by RSS feeds that now match are moved: downloads, playback positions, seen and
  live badges, and auto-download settings follow the matching episodes. Episodes with no match
  keep working as before. Password-protected feeds never move. Each move is written to the error
  log as "Moved to Podverse Directory".
- Who notices: signed-out users; those shows gain clips, chapters, and the full podcast page
- Operator steps: none

## Mobile: signed-in Add by RSS feeds already in Podverse become subscriptions

- Surfaces: mobile
- Change: signed in, adding an RSS URL Podverse already has opens the Podverse podcast and
  follows it on the account. Refresh (at most hourly, always on pull-to-refresh) converts
  existing Add by RSS follows that now match, on the server and on the phone; the queue, history,
  and owned playlists move on the server, and downloads and positions move on the phone. Works
  without a membership. Signing in with signed-out feeds that match moves them too.
- Who notices: signed-in users with Add by RSS shows that are in the directory
- Operator steps: none

## Web: Add by RSS feeds already in Podverse become subscriptions

- Surfaces: web
- Change: adding an RSS URL Podverse already has opens the Podverse podcast page and subscribes.
  Refreshing Add by RSS feeds (at most hourly in the background, always from the refresh button)
  converts existing Add by RSS follows that now match; the queue and owned playlists follow on the
  server.
- Who notices: website users with Add by RSS shows that are in the directory
- Operator steps: none

## v4 spam and takedown feeds stay blocked

- Surfaces: workers, api, parser
- Change: `v4ImportFlaggedFeeds` writes a v5 feed for every v4 podcast flagged spam or takedown, with parse, public listing, and add turned off. Subscribe, Add by RSS, OPML, and a later Podcast Index parse stop on that feed. `other`, `always-allow`, and non-public podcasts are unchanged.
- Who notices: operators who run the import; a person who tries to add one of those feeds
- Operator steps: from the repo root, with the local database up and `V4_DATABASE_URL` set, run `npm run v4_import_flagged_feeds -w apps/workers -- --dry-run`, then the same command without `--dry-run`

## Legacy podcast map stores the v4 feed URL

- Surfaces: workers, ops (migration)
- Change: migration adds `legacy_id_map.v4_feed_url`. New worker command
  `v4WriteLegacyPodcastMap` (`npm run v4_write_legacy_podcast_map -w apps/workers`) writes one
  podcast row per v4 podcast with an authority feed URL, and a `dropped` row for spam and takedown,
  reading v4 read-only in pages of 2,000. Rows already mapped by the library copy keep their
  mapping.
- Who notices: no one directly; the legacy podcast lookup reads these rows
- Operator steps: apply migrations; run the command once against v4 before go-live (`-dryRun`
  first)

## Public legacy podcast lookup

- Surfaces: api, k8s base env
- Change: new `POST /legacy/podcast/lookup` answers up to 2,000 v4 podcast ids with the v5 channel,
  the v4 feed URL when v5 has not parsed the show, `blocked` for spam and takedown, or `not_here`.
  Read-only; never queues a parse.
- Who notices: no one directly; signed-out phones upgrading from v4 use it
- Operator steps: optional env `LEGACY_PODCAST_LOOKUP_MAX_PER_MINUTE` (default 30) and
  `LEGACY_PODCAST_LOOKUP_INSTALL_MAX_PER_MINUTE` (default 10)

## v4 library copy turns Add by RSS URLs already in the directory into subscriptions

- Surfaces: workers
- Change: the v4 library copy writes a directory subscription instead of an Add by RSS follow
  when the URL matches a parsed, public directory channel. The Add by RSS limit tier is computed
  from the URLs left. The copy result, dry run, and verify report a new
  `addByRssMatchedToDirectory` count.
- Who notices: migrated v4 accounts get full podcast pages for those shows
- Operator steps: none

## Add by RSS limit uses shared tiers

- Surfaces: api, web, mobile, management-web, workers
- Change: Trial and Premium share a default of 100 Add by RSS feeds. Management can raise one
  account to 200, 300, 400, 500, 1000, 10000, or Unlimited. A new add at the account's tier
  returns 403 `add_by_rss_feed_limit_reached` with no renew path. A URL that matches a directory
  channel does not count. Migration writes the smallest tier that covers the addresses left and
  never writes Unlimited.
- Who notices: people adding a feed at the limit, and operators raising one account
- Operator steps: none

## Follow limit uses shared tiers

- Surfaces: api, web, mobile, management-web, workers
- Change: An account can follow 500 directory channels, playlists, and accounts, counted
  together. Management can raise the tier through 10000 or Unlimited. A new follow at the tier
  returns 403 with no renew path. Converting an Add by RSS follow at the tier keeps that Add by
  RSS follow and returns `follow_limit`. Migration writes the smallest tier that covers the
  count, including Add by RSS URLs that became directory follows, and never writes Unlimited.
- Who notices: people following a podcast, playlist, or account at the limit, and operators
  raising one account
- Operator steps: none

## v4 playlist follows survive copy order

- Surfaces: workers (v4 migration), database
- Change: a v4 playlist follow whose playlist is not copied yet is recorded and finished by
  replay instead of being skipped. Migration `0014` adds the `follow_playlist` pending row kind.
- Who notices: v4 users who follow another user's playlist
- Operator steps: apply linear migrations

## v4 queue and history rows that point at clips

- Surfaces: workers (v4 migration)
- Change: a v4 queue, history, or now-playing row that points at another user's clip is written
  as that clip when it is already copied, or as its episode until replay swaps the clip in.
  Official chapters and soundbites are written as their episode and recorded.
- Who notices: v4 users who queued or played other users' clips or chapters
- Operator steps: none

## Large v4 listening histories are kept

- Surfaces: database, workers (v4 migration)
- Change: migration `0015` adds a per-account queue size tier (20k to 100k rows; default stays 10k). The v4 copy gives accounts with larger histories the smallest tier that fits instead of evicting history, and inserts their rows without a per-row count.
- Who notices: about 25 v4 accounts with more than 10,000 history rows
- Operator steps: apply linear migrations

## v4 email-case twins keep both libraries

- Surfaces: workers (v4 migration)
- Change: when v4 stored one address twice with different letter case, the identity seed records the left-out v4 id in `legacy_id_map` (`resolve_key` `email_case_twin`) pointing at the account that kept the address. `v4CopyAccountLibrary` then merges that row's library (subscriptions, followed playlists and users, Add by RSS feeds, playlists, clips, queue, history, now playing) into the kept account, only after the kept account's own copy closed (`skip_merge_waiting` until then). Playlists and clips keep their v4 ids with the kept account as owner; a follow, feed, or queue item both rows had is kept once, and the follow, Add by RSS, and queue caps use the combined counts. Follows of either v4 id, including replayed ones, land on the kept account. The full rehearsal marks the left-out id's identity done against the kept account, defers its membership, runs its library after every other library, and verifies only its library coverage.
- Who notices: about 50 v4 users whose address was stored twice; 36 had use on both rows
- Operator steps: none

## v4 migration commands require UTC

- Surfaces: workers
- Change: v4 migration commands read v4 dates as UTC and refuse to start unless the process runs
  in UTC. The `v4_*` npm scripts set `TZ=UTC`.
- Who notices: operators running a v4 rehearsal or migration from a laptop; trial and paid end
  dates no longer shift by the host timezone
- Operator steps: none when using the npm scripts

## v4 "Only with link" playlists and clips stay shareable

- Surfaces: workers (v4 migration)
- Change: the v4 library copy writes v4 playlists and clips that were "Only with link" as unlisted
  instead of private. Every v4 playlist was "Only with link".
- Who notices: v4 users whose shared playlist or clip links would otherwise return 404 after
  migration; followers of those playlists
- Operator steps: none

## v4 Add by RSS copy skips values that are not feed URLs

- Surfaces: workers (v4 migration)
- Change: v4 Add by RSS entries that are not http(s) URLs (file references, hashtags, stray text)
  are skipped and counted instead of failing the account's whole Add by RSS copy.
- Who notices: about 31 v4 accounts that would otherwise have lost every Add by RSS feed
- Operator steps: none

## Feed parse failures record a reason

- Surfaces: parser, workers, database
- Change: migration `0013` adds `feed_log.last_parse_failure_reason` (HTTP class, body too large,
  DNS, TLS, timeout, connection, not a feed, database error, parse error). A finished parse clears
  it. Parser failure logs are one line with the reason and never include the response body.
- Who notices: operators reading parser logs or feed logs
- Operator steps: apply linear migrations

## v4 migration feed retries settle sooner

- Surfaces: workers (v4 migration)
- Change: a migration feed that fails for a permanent reason (404, 410, missing host, not a feed,
  no feed URL) stops after 2 attempts. Other failures retry over about 3 days instead of 11. The
  rehearsal's catalog wait ends after `--catalog-wait-hours` (default 24); remaining feeds keep
  retrying and replay finishes them. The summary counts failures by reason.
- Who notices: operators running a v4 rehearsal or migration
- Operator steps: keep the scheduled job loop running after the catalog phase; rerun replay until
  waiting rows are gone

## Large v4-subscribed feeds parse during migration

- Surfaces: workers (v4 migration)
- Change: a v4 migration feed blocked for a body over the parser limit gets the maximum body limit
  (50,000,000 bytes) and one more parse. If it is still too large it fails with reason
  `body_too_large`. Ordinary parsing is unchanged.
- Who notices: v4 subscribers of very large shows (about 250 at full scale) who would otherwise
  see them empty
- Operator steps: none

## Feeds with huge episode durations parse again

- Surfaces: parser
- Change: an episode duration, soundbite, chapter, or value time split of 100,000,000 seconds or
  more (or negative, or not a number) is dropped or stored empty instead of failing the whole feed
  parse.
- Who notices: listeners of feeds that publish durations in milliseconds or bytes; their episodes
  now appear
- Operator steps: none

## v4 public profiles stay public

- Surfaces: workers (v4 migration)
- Change: a v4 account whose profile was public is created public in v5; every other migrated
  account stays private.
- Who notices: about 1,381 v4 users with public profiles, and people who follow them or have their
  profile links
- Operator steps: none

## Local v4 rehearsal retries failing feeds within about an hour

- Surfaces: workers (v4 rehearsal, scheduled job loop)
- Change: retry jobs created by `v4RunFullRehearsal` carry `schedule: rehearsal` in their payload,
  and the job loop retries them at 15 minutes, then 2, 5, 10, 15, and 30 minutes instead of 1 hour,
  6 hours, and then daily. A feed that keeps failing settles about 75 minutes after seeding, so the
  catalog phase no longer waits a day or more. Go-live catalog seeding keeps the standard schedule;
  jobs without a schedule are standard.
- Who notices: operators running the local rehearsal
- Operator steps: run one job loop beside the parsers with a 15-second sleep; pass
  `--catalog-wait-hours 3` for a pilot

## Mobile reads v4 signed-out subscriptions once

- Surfaces: mobile
- Change: on the first launch after updating from v4, the app reads the v4 subscription ids, the
  cached podcast list, and Add by RSS addresses from the old storage once, after the first screen
  shows, and keeps them on the phone for the carryover. It never reads saved passwords or the old
  sign-in token.
- Who notices: no one yet; the next change uses these rows
- Operator steps: none

## Mobile carries signed-out v4 subscriptions over

- Surfaces: mobile
- Change: after updating from v4, a signed-out phone resolves its old subscriptions in the
  background ("Moving Your Podcasts"). Shows Podverse has become regular subscriptions. Shows it
  has not become Add by RSS feeds on the phone and move to the directory once Podverse has them.
  Shows v4 flagged as spam or takedown are left out. Results are counted in the error log.
- Who notices: signed-out v4 users after the update
- Operator steps: run `v4WriteLegacyPodcastMap` before this build ships

## Mobile asks signed-out v4 users to save an OPML file before the carryover

- Surfaces: mobile
- Change: after updating from v4, a signed-out phone with readable v4 shows opens Save Your
  Podcast List first. Export OPML shares the list of shows on the phone; Continue Migration (after
  ticking the checkbox) starts the carryover. Sign In stays available.
- Who notices: signed-out v4 users after the update
- Operator steps: none

## Local rehearsal restore drops attached partitions first

- Surfaces: workers
- Change: a sample or full local rehearsal drops attached partitions in `public` and
  `listener_identity` before `pg_restore --clean`, and skips comments. A stats partition
  left by an earlier stage no longer blocks the restore, and the restore does not need the
  restoring role to own `public`.
- Who notices: operator running a sample or full local migration rehearsal
- Operator steps: none. Do not drop the app schemas by hand before the stage.

## Show and episode descriptions are stored as markdown

- Surfaces: api, workers, web, mobile
- Change: channel and item descriptions are saved as markdown. RSS HTML is converted on the
  way in, and a second save of that markdown writes the same text. About and Summary render
  that markdown. A description that is still HTML, such as a phone cache from before this
  version, still renders. Clip text and playlist text are unchanged. The database is wiped
  before this version, so existing rows are not converted in place.
- Who notices: show notes and About text keep their paragraphs, links, and lists, in a
  smaller column
- Operator steps: none

## Catalog indexes and duplicate episode artwork

- Surfaces: k8s, workers
- Change: app migration `0016_drop_duplicate_indexes.sql` drops btree indexes that repeat a
  unique constraint on the same column. `idx_item_channel_id` stays, because episode lists
  also use `idx_item_channel_id_pub_date` and the narrower index is the one a channel-only
  lookup can prefer. `guid` and `guid_enclosure_url` stay btree. A parse skips an episode
  image whose URL is the show image. A different episode image is still stored.
  `API_EXPECTED_MIGRATION_FILENAME` advances to this file. The management marker stays.
- Who notices: a deploy waits until this migration is applied. Episode rows that used the
  show artwork no longer store a second copy.
- Operator steps: none beyond the usual migration apply

## Episode enclosure lookups use a 16-byte digest

- Surfaces: api, workers, k8s
- Change: app migration `0017_item_enclosure_url_digest.sql` adds
  `item.guid_enclosure_url_digest`, a 16-byte md5 of `guid_enclosure_url`,
  fills it for rows already stored, and drops `idx_item_guid_enclosure_url`.
  A trigger keeps the digest in step when the URL is inserted or updated.
  Parser, Add by RSS, notification, and v4 library matching look up the
  digest. The URL column stays, and playback still reads it.
  `API_EXPECTED_MIGRATION_FILENAME` advances to this file. The management
  marker stays.
- Who notices: a deploy waits until this migration is applied. The first
  apply rewrites `item` rows that have an enclosure URL, so startup is slower
  on a database that already has episodes.
- Operator steps: none beyond the usual migration apply. Existing databases
  are updated in place. No wipe.

## Custom API switch erases this phone's copy of the previous server

- Surfaces: mobile
- Change: Saving a different custom API address opens a screen that lists the local library, login, and push registration that will be erased. Accepting removes them. Cancel leaves the address and the library. An account on the previous server is left as it is. Theme, language, download limits, and feed-host passwords stay.
- Who notices: people who point the app at another server
- Operator steps: none

## Phone records v4 downloads after the list read finishes

- Surfaces: mobile
- Change: on first launch after updating from v4, the phone reads v4's `DOWNLOADED_PODCASTS`,
  `DOWNLOADING_EPISODES`, and Android download folder setting, and records one row per media
  file in a new local table (SQLite migration 6, `v4_download_carryover_entry`). Media files in
  v4's own folders that neither list names are recorded too, and only after that read returns.
  When the read throws, nothing is recorded and a later launch tries again; those files stay on
  disk. The read does not move or delete anything; the v4 download carryover acts on these rows.
- Who notices: no listener-visible change from this entry alone
- Operator steps: none

## Phone carries v4 downloads into v5

- Surfaces: mobile
- Change: after updating from v4, a background sync job ("Moving Your Downloads", kind
  `v4-download-carryover`) settles every media file v4 downloaded. A file whose episode the v5
  directory knows becomes a finished download of that episode. A show the directory has without
  that episode keeps the file on that show's episode list. A file from an Add by RSS feed becomes
  an episode on that feed, kept as a local episode when the feed no longer lists it. Signed out,
  the phone follows the feed when it did not already. Signed in, the account follows it when the
  membership can accept another feed within the account's cap. If the server refuses, the file
  stays in My Library → Downloads and the phone does not add a signed-out feed. Files that cannot
  migrate are deleted with no screen: unfinished
  v4 downloads, files no v4 list named, shows dropped as spam or takedown, and files with no show
  the phone can name. A file waiting on a lookup stays on disk, and being offline is never a
  failed match. One error-log entry ("Downloads Moved from the Previous App") counts each outcome.
  Runs signed in or out.
- Who notices: listeners updating from v4 with downloaded episodes; their downloads appear in My
  Library → Downloads, and space held by files that cannot migrate is freed
- Operator steps: deploy the API with `POST /legacy/episode/lookup` before shipping this mobile
  build

## Public legacy episode lookup

- Surfaces: api, k8s base env
- Change: new `POST /legacy/episode/lookup` answers up to 200 downloaded v4 directory episodes
  (v4 episode id, v4 podcast id, guid, media URL). Each answer is the v5 item and its channel,
  the channel alone when no item matches, the v4 feed URL when v5 has not parsed the show,
  `blocked` for spam and takedown, or `not_here`. A mapped v4 episode wins; otherwise the guid,
  then the media URL, is matched inside the show's channel. Read-only; never queues a parse.
  `POST /legacy/podcast/lookup` answers are unchanged.
- Who notices: no one directly; signed-out phones upgrading from v4 use it to keep downloaded
  episodes
- Operator steps: optional env `LEGACY_EPISODE_LOOKUP_MAX_PER_MINUTE` (default 30) and
  `LEGACY_EPISODE_LOOKUP_INSTALL_MAX_PER_MINUTE` (default 10)

## Native module for reading v4 download folders

- Surfaces: mobile
- Change: adds the Android-only local Expo module `podverse-legacy-storage`. It reports the app's
  external files folder and can remove the app's unfinished system download jobs. v4 kept
  downloads in that folder. Nothing calls it yet on its own; the v4 download carryover uses it.
- Who notices: no listener-visible change from this entry alone
- Operator steps: rebuild the dev client and store builds (`npm run mobile:prebuild`)

## Add by RSS local episodes on mobile

- Surfaces: mobile
- Change: an Add by RSS feed can hold episodes that exist only on this phone, backed by a downloaded file (used by the v4 download carryover). They list on the feed's Episodes and Downloaded sections and on Home, play from the file offline or when the host is down, and are deleted with the normal download controls. While the feed remains, an episode that leaves the feed stays playable until the listener deletes that file. Removing the feed deletes its downloaded files, including those episodes. A later refresh that lists the same episode turns it into a normal feed episode. New SQLite table `add_by_rss_local_episode` (forward migration).
- Who notices: listeners updating from v4 whose downloaded episodes are no longer in the feed, or whose feed host is down, and listeners who remove an Add by RSS feed that still has downloads
- Operator steps: none

## Add by RSS promotion keeps local episodes

- Surfaces: mobile
- Change: when an Add by RSS feed matches a directory channel, the show is promoted. Local episodes the directory knows move onto the directory episode. A download the directory does not know stays on that show's episode list and plays from the file until the listener deletes it. A promotion the account already made does the same. New behavior uses the existing `channel_item.kept_for_download` column; this change adds no migration.
- Who notices: listeners whose Add by RSS feeds match the directory, including people carrying v4 downloads the directory has no episode for
- Operator steps: none

## Downloaded episodes stay on their show

- Surfaces: mobile
- Change: when a refresh no longer lists an episode this phone has finished downloading, the episode stays on that show's episode list and in Downloads and plays from the local file. This applies to directory subscriptions and to Add by RSS feeds, including downloads made in v5. A directory show stays a directory subscription. Deleting the file removes that local episode. The list then shows what the server still returns. New SQLite column `channel_item.kept_for_download` (forward migration).
- Who notices: listeners whose shows drop episodes they have downloaded, including people updating from v4
- Operator steps: none

## Android chosen download folder

- Surfaces: mobile
- Change: On Android, More → Settings → Downloads shows Chosen Download Folder when the previous app saved a folder this app can still write. On sends new downloads there. Off sends new downloads to the app's private folder. Turning the switch does not move or delete files already in the chosen folder; those still play and delete. iOS has no control. There is no folder picker and no new storage permission.
- Who notices: Android listeners who chose a download folder in the previous app
- Operator steps: none

## Numeric chapter times

- Surfaces: parser-mapping, api, mobile
- Change: chapter files may send start and end times as numbers. Mapping those chapters stores the
  times and no longer fails when the value is not a string.
- Who notices: listeners opening chapters on an episode whose chapter file uses numeric times
- Operator steps: none

## OPML directory lookup stops after an unreachable answer

- Surfaces: mobile
- Change: while an OPML import looks up feed URLs in the directory, an unreachable answer finishes
  the lookups already started and does not start another batch.
- Who notices: listeners importing an OPML file when directory lookup cannot be reached
- Operator steps: none

## Rejected Add by RSS password stays explained

- Surfaces: web
- Change: a background refresh no longer replaces the result of a feed parse this page already
  started. Adding a protected feed with a username and password the feed rejects still opens the
  credentials page and says the feed rejected them.
- Who notices: members adding a password-protected feed while Add by RSS is refreshing
- Operator steps: none

## Podcast and album section chips update the address

- Surfaces: web
- Change: choosing Remote Items, Podroll, or another non-default section on a podcast or album
  page puts `type` in the address. Choosing the default section removes it.
- Who notices: listeners who open those sections, then share or use the back button
- Operator steps: none

## Add Feed joins a refresh already parsing that feed

- Surfaces: api, web
- Change: adding a public feed while a background refresh is already parsing it opens the parsed
  page. The add uses that parse instead of failing with a one-minute duplicate error.
- Who notices: members who add a feed while Add by RSS is refreshing
- Operator steps: none

## Subscribed episode grid titles are headings

- Surfaces: web
- Change: an Add by RSS episode in the grid layout uses a heading for the episode title, with the
  feed title above that heading. The title stays the same size as the other grid titles.
- Who notices: screen reader users on Subscribed Episodes
- Operator steps: none

## Progress bar seeks the file that is loaded

- Surfaces: web
- Change: after playback switches items, a click on the progress bar seeks the loaded file. The
  click uses that file's duration when the bar still shows the previous item's length.
- Who notices: listeners who scrub just after the player changes episodes or tracks
- Operator steps: none

## Unlimited Add by RSS feed cap

- Surfaces: api, k8s
- Change: `account_membership_status.max_add_by_rss_feeds` may be `-1`, which means unlimited.
  Null stays the shared default, and `0` stays a cap of zero. App migration
  `0018_account_max_add_by_rss_feeds_unlimited.sql`.
- Who notices: operators who set an account to unlimited Add by RSS; those listeners can add feeds
  past the numbered tiers
- Operator steps: apply the app migration before saving an unlimited cap

## Identity resolve skips local download keys

- Surfaces: mobile
- Change: a scheduled identity check sends only directory ids. An Add by RSS download key
  (`feed address::episode`) is left out, so one long local key no longer fails the whole check
  and covers the app with the request error.
- Who notices: listeners whose phone holds both directory downloads and Add by RSS downloads
- Operator steps: none

## Played check on list rows

- Surfaces: web, mobile
- Change: a finished episode, clip, soundbite, or Add by RSS item shows a Played check in the
  list row, to the left of the progress bar. On the Podverse theme the check is the same blue as
  the progress time numbers. Mark as Played updates the check without leaving the list. Mark as
  Unplayed on the phone hides it for the rest of the session.
- Who notices: listeners looking at a list that includes something they finished
- Operator steps: none

## Security pins for parser, redirects, and glob

- Surfaces: api, web, workers, management-api, management-web
- Change: `fast-xml-parser` is `5.12.1`, including the root override that forces every copy.
  `follow-redirects` is `1.16.3`, `glob` is `14.0.6`, and `minimatch` is `11.0.8`. Workspace
  `dotenv` ranges are `^18.0.10`; the installed copy was already `18.0.10`. `@dotenvx/dotenvx`
  still uses `dotenv` `17.4.2`.
- Who notices: operators of the publish audit gate. Feed parsing, redirects, and env loading
  keep the same behavior.
- Operator steps: none
