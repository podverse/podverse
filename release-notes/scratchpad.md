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
