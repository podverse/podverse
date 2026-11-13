## Test push launcher accepts email

- Surfaces: ops
- Change: `npm run notifications:test-push:k8s` passes `--email` through to the Job, prints the CronJob image, and follows the Job logs.
- Who notices: operators sending a test push on alpha
- Operator steps: run it from a checkout that has this script; the workers image on the cluster still has to understand `--email`

## Mobile registers an FCM token

- Surfaces: mobile
- Change: iOS and Android store builds read the Firebase registration token instead of the Apple device token, so a test push can reach an iPhone. Builds without the Google services files, and UnifiedPush builds, leave React Native Firebase unlinked. `expo-notifications` still includes Firebase Messaging on Android, so an F-Droid binary is not ready until that dependency is removed.
- Who notices: iOS listeners who allow push, after they install a rebuilt app; F-Droid is unchanged until that later build
- Operator steps: set `GOOGLE_SERVICES_INFO_PLIST` and `GOOGLE_SERVICES_JSON` as EAS file variables, upload an APNs auth key in Firebase, then rebuild and reinstall the app

## v4 public ids of 7 characters fit the app database

- Surfaces: api database, management database, orm, k8s
- Change: `nano_id_v2` accepts 7–15 characters. New ids stay 10. Account, channel, item, clip, playlist, chapter, and soundbite keep an id that was already set. `account.v4_library_copied_at` and `legacy_id_map` exist and are empty.
- Who notices: a stored v4 id shorter than 9 characters can be saved. Listeners see no change until a library copy uses those columns.
- Operator steps: apply the app migration `0005_v4_rehearsal_schema.sql` and the management migration `0002_nano_id_v2_min_7.sql` before a process expects them.

## Local mobile builds read Firebase paths from .env

- Surfaces: mobile
- Change: pod install and Gradle load `apps/mobile/.env`, so a local iOS or Android build links Firebase when those paths are set. `make local_env_setup` copies the paths from `mobile-firebase.env` in the home overrides.
- Who notices: operators building the mobile app on a machine that has the Firebase client files
- Operator steps: put the two paths in `~/.config/podverse/local-env-overrides/mobile-firebase.env`, run `make local_env_link` and `make local_env_setup`, then prebuild as usual

## v4 identity seed command

- Surfaces: workers
- Change: `v4SeedAccountIdentity` copies one v4 account's email, bcrypt hash, name, verified flag, and id into v5. `--dry-run` writes nothing. An email that already exists is left unchanged. It does not copy a library or start a trial.
- Who notices: operators rehearsing the v4 account migration
- Operator steps: set `V4_DATABASE_URL`, build workers, then run `npm run v4_seed_account_identity -w apps/workers -- --v4-id <id> --dry-run`

## Notifications load web-push under Node ESM

- Surfaces: notifications, workers
- Change: the notifications package loads `web-push` with `createRequire`. A named ESM import of `sendNotification` threw at startup, so every worker command failed while loading notifications.
- Who notices: operators running any worker command on Node 24
- Operator steps: rebuild `@podverse/notifications` before starting workers

## v4 library dry run

- Surfaces: workers
- Change: `v4CopyAccountLibrary` counts one v4 library against the local v5 catalog. `--dry-run` is required. It does not write library rows or set `v4_library_copied_at`.
- Who notices: operators rehearsing the v4 account migration
- Operator steps: set `V4_DATABASE_URL`, build workers, then run `npm run v4_copy_account_library -w apps/workers -- --v4-id <id> --dry-run`

## Archiver keeps items a channel merge points at

- Surfaces: workers (`archiveAll`), orm
- Change: when an episode leaves its feed, the archiver now also keeps the item as Archived while an `item_merge_map` row points at it, alongside the existing clip and playlist retention. Before, such an item was deleted, and the merge map's foreign key (no ON DELETE) made the delete fail, which stopped the archive run. Old item URLs from a merged show keep redirecting.
- Who notices: operators running `archiveAll` after a show merge; listeners following an old merged episode link
- Operator steps: none

## v4 library dry run splits clip outcomes

- Surfaces: workers
- Change: `v4CopyAccountLibrary --dry-run` reads v4 episode and podcast visibility and reports `archivedItem` (episode left its feed; the copy will create an Archived item), `snapshot` (no v5 show or episode; the clip keeps its v4 titles in `removed_source`), and `notSeeded` (subscription to a podcast the seed skips), replacing `keptWithoutItem`. User clips are never counted as dropped. Queue, history, and now playing for episodes that left their feed count as dropped, because v5 keeps those only for Active items.
- Who notices: operators rehearsing the v4 account migration
- Operator steps: rerun the dry run for the rehearsal account and record the new counts

## v4 catalog seed dry run

- Surfaces: workers
- Change: `v4SeedAccountCatalog` counts the public shows one v4 account needs (subscriptions, clips, playlist members, history, queue, and now playing) and which already have a local feed. `--dry-run` is required. It does not create feeds or queue a parse.
- Who notices: operators rehearsing the v4 account migration
- Operator steps: set `V4_DATABASE_URL`, build workers, then run `npm run v4_seed_account_catalog -w apps/workers -- --v4-id <id> --dry-run`

## v4 catalog seed apply

- Surfaces: workers
- Change: `v4SeedAccountCatalog` without `--dry-run` creates each missing local feed and a channel whose `id_text` is the v4 podcast id, then queues a parse on `rss-slow`. `--dry-run` still writes nothing. The command refuses unless `DB_HOST` is localhost. Episodes that left the feed are not copied.
- Who notices: operators rehearsing the v4 account migration
- Operator steps: run it only against the local database, with the parser workers already up

## Membership expiry strip sits above the mini player

- Surfaces: mobile
- Change: the expiring-soon / expired membership notice is a one-line strip in the bottom chrome above the mini player (or above the tab bar when nothing is playing), instead of a top banner that sat under the notch and pushed Home down. Tapping the message opens Membership; dismiss still hides expiring-soon until that expiry changes, and hides expired until the next launch.
- Who notices: members whose membership is inside the warning window or already expired
- Operator steps: none

## v4 library copy writes on the local database

- Surfaces: workers
- Change: `v4CopyAccountLibrary` without `--dry-run` copies one v4 library into the local database: follows, playlists, clips, archived items for episodes that left the feed, and queue, history, and now playing for Active items. Waiting rows stay unwritten. It sets `v4_library_copied_at` when the pass finishes and refuses unless `DB_HOST` is localhost. `--dry-run` still writes nothing.
- Who notices: operators rehearsing the v4 account migration
- Operator steps: run it only against the local database, after that account's catalog parses have finished

## Account menu opens below the bar

- Surfaces: web, management-web
- Change: the account menu in the top bar is drawn on the page body, so it drops open below the name instead of being clipped by the bar.
- Who notices: anyone opening the account menu, including in Firefox
- Operator steps: none

## v4 library copy keeps clips after a settled parse

- Surfaces: workers
- Change: `v4CopyAccountLibrary` treats a public episode with no matching item as an Archived item or a snapshot once that feed's parse has finished or failed and is not running. A parse that has not settled still leaves the row unwritten. Queue, history, and now playing still copy only for Active items.
- Who notices: operators rehearsing the v4 account migration
- Operator steps: run it only against the local database. An account that already has `v4_library_copied_at` set is skipped until that copy is cleared

## v4 library copy snapshots clips with no local show

- Surfaces: workers
- Change: `v4CopyAccountLibrary` counts a v4 show with no authority URL as not seeded, because the catalog seed cannot parse it. A clip or playlist member whose show has no local channel is written as a snapshot (`removed_source`, `source_removed_at`) instead of being skipped.
- Who notices: operators rehearsing the v4 account migration; on the rehearsal account all 925 clips are now written
- Operator steps: none

## Simulator starts without a Firebase config file

- Surfaces: mobile
- Change: the app loads the Firebase package only when the native Firebase module is in the binary. A local simulator build without a Google services file opens instead of stopping on the missing module. A build that includes Firebase still reads the registration token.
- Who notices: anyone running the iOS simulator or Android emulator without Firebase config files
- Operator steps: reload the running app; a native rebuild is not required

## v4 identity seed sets the membership tier

- Surfaces: workers
- Change: `v4SeedAccountIdentity` writes the settings, membership status, and metaboost rows a signup creates. A future paid v4 expiry sets Premium. A v4 trial that is still running and ends within 90 days becomes a Trial grant, and the account stays Trial when there is no future paid expiry. It does not start the signup trial and does not write the paid grant. Running it again for the same v4 id fills missing rows and leaves an existing membership status unchanged. An email that already belongs to a different account is still skipped.
- Who notices: operators seeding v4 accounts; a membership import can recompute once the status row exists
- Operator steps: re-run the seed for an account that was created before this change, against the database being seeded

## v4 identity seed keeps one row when letter case differs

- Surfaces: workers
- Change: v4's unique email index is case-sensitive, and 50 addresses are stored twice, once lowercase and once in different letter case. `v4SeedAccountIdentity` keeps one lowercase address. A row that was used beats a row that never was; between used rows the later dated activity (history, queue, now playing, owned playlists, user clips) wins; otherwise a verified row, then the later account `updatedAt`. The other v4 id is logged, and its library is dropped rather than merged; `v4CopyAccountLibrary` skips it because it has no v5 account. A mixed-case address with no twin is stored lowercase. An account whose library is already copied, or that has a grant other than the carried trial, is left as it is.
- Who notices: operators seeding v4 accounts that share an address apart from letter case
- Operator steps: none until those accounts are seeded. The rehearsal account is not one of the 50

## Account email ignores letter case

- Surfaces: api, management-api, workers
- Change: account emails are stored trimmed and lowercase. Web and mobile sign-in, signup, the duplicate-signup check, email change, and the management user create and edit routes trim and lowercase the typed address, then match it exactly. Email change refuses an address another account already uses. App migration `0006_account_email_lowercase.sql` rewrites a stored address that is not already lowercase, then a check constraint refuses any later write that is not. The same constraint covers a pending email change. The migration stops when two stored addresses differ only by letter case.
- Who notices: anyone who types their email with capital letters; a deploy whose database already has two accounts sharing an address apart from letter case
- Operator steps: before deploying, count letter-case twins in `account_credentials` and `account_email_change_verification`. The migration applies only when that count is 0

## Add by RSS drops a trailing path slash

- Surfaces: api, web, mobile, workers
- Change: an Add by RSS feed URL is stored without a trailing slash on its path. `https://example.com/feed/show/` and `https://example.com/feed/show` are the same follow, the same credential key, and the same episode hash. The host root stays `https://example.com/`. A query or fragment after the slash is kept. App migration `0007_add_by_rss_feed_url_trailing_slash.sql` removes the extra follow when both forms exist, then rewrites the rest. A public catalog feed URL is unchanged. The v4 library copy stores the form without the slash.
- Who notices: someone who followed the same feed with and without a trailing slash, including a library copied from v4
- Operator steps: none. The migration runs with the app migrations

## Slow retry for v4-seeded feeds that fail to parse

- Surfaces: workers, orm
- Change: `v4SeedAccountCatalog` apply now writes a `v4-migration-feed-retry` scheduled job for each
  show it creates, due 1 hour after the seed. `scheduledJobsRunDue` completes it without parsing
  when an ordinary parse already finished; otherwise it force parses and, if no parse finished,
  retries 1 h, 6 h, 24 h, 3 d, and 7 d later (6 attempts). Other scheduled job types keep the
  5-minute exponential backoff. Feeds the migration did not create are unchanged.
- Who notices: migrated v4 users whose shows failed their first parse get episodes later, without
  waiting for a Podcast Index update.
- Operator steps: `scheduledJobsRunDue` must be running wherever the catalog seed runs.

## v4 library copy records what it could not finish

- Surfaces: workers, k8s (app migration), api readiness marker
- Change: app migration `0008_legacy_pending_row.sql` adds `legacy_pending_row`. `v4CopyAccountLibrary`
  apply now records, in the same transaction, every row it could not finish: subscriptions with no
  local show, follows of accounts not copied yet, another user's clip in a playlist, clips and
  playlist members that are snapshots or still waiting on a parse, and queue, history, and now
  playing with no Active item. Queue, history, and now playing on a feed that is not settled
  (a parse finished, or the migration retries are used up) are held as `unresolved` instead of
  dropped. The copy also writes `mapped` `legacy_id_map` rows for podcast, episode, mediaRef,
  playlist, and user ids it resolved, attaches another user's clip that is already local, and keeps
  a list slot for every playlist member. The dry run adds a `pending` count per group.
- Who notices: operators running the v4 rehearsal; migrated users later get rows a replay can finish.
- Operator steps: apply the app migration; `API_EXPECTED_MIGRATION_FILENAME` is now
  `0008_legacy_pending_row.sql`. Commit the regenerated `0004_app_linear_baseline.sql.gz` and run
  `/test` on the PR.

## v4 legacy replay finishes what the library copy could not

- Surfaces: workers, worker-commands registry (management command list)
- Change: new worker command `v4ReplayLegacyRows` (`npm run v4_replay_legacy_rows -w apps/workers`)
  finishes follows, playlist clips, playback, and snapshot re-attach that the one-time copy could
  not. It reads `unresolved` and `resolved` / `snapshot` rows from `legacy_pending_row`, least
  recently tried first, one transaction per row. Follows are inserted once the followed account
  exists; another user's clip joins the playlist at its recorded slot once that user is copied;
  queue, history, and now playing are inserted once the item is Active (one row per item or clip
  per queue, history placed by play time) and dropped only once the feed is settled; waiting clips
  and playlist members are written once their feed parse finished or failed; snapshots reattach to
  an item (or a new Archived item) once their show is local, clearing `removed_source`. Clips and
  playlist members are never dropped; subscriptions are left alone. `--dry-run` rolls each row
  back; `--limit` (default 500) and `--v4-id` narrow the pass. It refuses a non-local `DB_HOST`,
  reads `V4_DATABASE_URL` read-only, and logs counts per kind and outcome only. The copy itself now
  keeps a playback row whose item exists but is not Active as `unresolved` until the feed is
  settled, instead of dropping it.
- Who notices: operators running the v4 rehearsal; migrated users get follows, playlist clips,
  history, and reattached clips that were missing right after their first sign-in.
- Operator steps: run `v4ReplayLegacyRows` on the same schedule as `scheduledJobsRunDue` during the
  migration window, and once after the forced migration. Set `V4_DATABASE_URL` for it.

## How feed hosts see Add by RSS requests from the mobile app

- Surfaces: mobile
- Change: For signed-out users, the mobile app now requests Add by RSS feeds directly from the
  feed host instead of through Podverse servers. Signed-in users, whatever their membership, keep
  the server parse. Requests carry the User-Agent
  `<app name without spaces>/<app version> (<ios|android>)`, send `If-None-Match` and
  `If-Modified-Since` when the phone has them, follow redirects one hop at a time, and send a
  feed's username and password only to HTTPS hosts within the feed's own domain (never again
  after a hop leaves it). Requests to wavlake.com are spaced at least 5 seconds apart per phone.
  Each request times out after 30 seconds. The first refresh after an app update downloads and
  re-parses every feed kept on the phone once, so parser fixes in the new version apply. Feeds on
  a home network address can be added on the phone, which the Podverse servers refuse.
- Who notices: podcast hosts (traffic from listeners' IP addresses with the app's User-Agent);
  signed-out mobile users
- Operator steps: none

## Mobile Add by RSS works signed out

- Surfaces: mobile
- Change: Signed out, adding a feed by RSS, checking a feed for updates, saving a feed's username
  and password, and subscribing to an album an artist lists no longer ask the user to sign in or
  get a membership. The phone fetches and parses the feed itself, makes no Podverse server
  request for it, and applies no feed limit. Check for Updates no longer asks a signed-out user to
  sign in, and removing a feed signed out makes no account request. Signed in, nothing changes:
  every account uses the server parse and server follow, free and lapsed accounts see the
  membership prompt on add as before, and an action taken while the account is still loading
  sends the request and shows the server's answer instead of a sign-in prompt. Web is unchanged.
- Who notices: signed-out mobile users; the Add by RSS plus button no longer opens the membership
  modal for them
- Operator steps: none

## Mobile Add by RSS feeds across sign-up, sign-in, and sign-out

- Surfaces: mobile
- Change: Add by RSS feeds followed while signed out are hidden while an account is signed in,
  are not refreshed then, and are listed and refreshed on the phone again after sign-out.
  Signing in to an existing account adds nothing to it. After a sign-in, a feed that both the
  signed-out user and the account follow belongs to the account, and its username and password
  saved while signed out are copied to the account on this phone unless the account already has
  a pair for it there; the signed-out copy stays for after sign-out, and neither leaves the
  phone. Feeds an earlier account left on the phone are hidden under a different account.
  Creating an account in the app and
  logging in to it saves the signed-out user's feeds to the new account, oldest follow first, up
  to the account's Add by RSS limit, and moves their saved usernames and passwords to the account.
  When there were more feeds than the limit at sign-up, the rest are removed from the phone with
  their saved usernames and passwords, and are not added later. Feeds followed after sign-up and
  before that first login are never removed by it.
- Who notices: people who use Add by RSS signed out and then sign in or sign up on the same phone
- Operator steps: none

## Add by RSS artists list their albums when parsed on the phone

- Surfaces: mobile
- Change: signed out, an Add by RSS artist feed parsed on the device now lists its albums. The device builds the listings from the feed, matches directory albums through the public remote-item lookup (100 references per request), and fetches each listed Add by RSS album itself, using the album's own stored credentials, or the artist's when the album is on the same host. Albums the artist names only by feed guid are looked up one at a time through the public resolve route in background sync, at most two per second; on a rate-limit answer the phone waits for the reset and tries again, and each album appears as its answer arrives. An album Podverse does not know is not asked again until the artist feed changes. An album whose Podverse page is not ready yet is asked again on a later sync, waiting 1, 2, 4, 8, 16, then 30 minutes between tries, up to seven tries per app launch. A private artist feed's listed albums are never sent to Podverse; they are fetched from the feed host only. The background album job now runs signed out, and a large artist finishes over several runs. Signed in, artists are still listed by the server, and feeds kept by the signed-out user are skipped while hidden.
- Who notices: signed-out mobile users who add an artist feed
- Operator steps: none

## Add by RSS chapters and transcripts load on the phone when signed out

- Surfaces: mobile
- Change: signed out, Add by RSS episode chapters and transcripts are fetched by the phone from the feed's host instead of through the Podverse API. Private feed credentials go only to hosts in the feed's credential scope, checked on every redirect. Signed-in users still load them through the API, whatever their membership. While signed in, a feed kept by the signed-out user is hidden and its episodes load no chapters or transcript. The phone fetches these files through the same request path as the on-device feed parse: same redirect limit, request spacing per host, 30-second deadline, and Offline Mode refusal.
- Who notices: signed-out mobile users now see chapters and transcripts on Add by RSS episodes
- Operator steps: none

## Add by RSS podroll and remote items work signed out on mobile

- Surfaces: mobile
- Change: signed out, the podroll and remote-items sections of an Add by RSS feed now match their
  rows against the Podverse directory (up to 100 references per request) and resolve a tapped row
  instead of asking the user to sign in. A tap that hits the signed-out rate limit shows the
  existing rate-limit notice.
- Who notices: signed-out mobile users browsing an Add by RSS feed's podroll or remote items
- Operator steps: none

## Signed-out Export OPML on mobile

- Surfaces: mobile, api (refactor only)
- Change: More › OPML › Export OPML now works signed out on mobile, and so does the Export OPML
  button on the sign-up warning. The phone builds the file from every feed the signed-out user
  follows: the Add by RSS feeds on the device, plus each directory subscription, whose feed URL
  it looks up from the public `GET /channel/:idOrIdText` route, four calls at a time, waiting out
  a 429. While it looks up feeds the screen shows "Looking up podcast feeds: N of M". When some
  lookups fail, the file holds what was found and the message says how many directory podcasts
  were left out. In Offline Mode it makes no lookups: it exports the Add by RSS feeds and says how
  many directory podcasts were left out, or asks to turn Offline Mode off when there are no Add by
  RSS feeds. Signed in, Export OPML still downloads the account's export from the server. The
  OPML generator moved from the API into `@podverse/helpers`; the API's export is unchanged.
- Who notices: signed-out mobile users who subscribe or use Add by RSS
- Operator steps: none

## Server feed parsing uses the portable partytime entry

- Surfaces: workers, api (through `@podverse/parser`)
- Change: `@podverse/parser` imports `podverse-partytime/core` from published
  `podverse-partytime` `^5.2.0`, the same parser code mobile runs on the device. On the server,
  partytime no longer loads `dotenv` or reads `PARTYTIME_LOG`; its warnings print as plain
  console lines instead of pino JSON lines. The feed size limit still comes from
  `PARSER_MAX_FEED_BODY_BYTES`. Parsed items and feeds now carry `descriptionRaw`, which
  `@podverse/parser-mapping` already reads.
- Who notices: operators reading worker and API logs
- Operator steps: none

## Mobile Add by RSS keeps feed passwords while signed out

- Surfaces: mobile
- Change: A username and password entered for a protected Add by RSS feed while signed out are
  kept on the phone (in the device's secure storage, never sent to Podverse) and used when the
  phone fetches that feed or plays its media. Signing in to an existing account moves nothing:
  those feeds and their passwords stay on the phone, hidden while signed in, and are used again
  after sign-out. When the account also follows one of those feeds, the username and password
  saved while signed out are copied to the account on this phone, unless the account already has
  a pair for that feed there, so the feed does not ask for them again while signed in. The copy
  stays on the phone, and the signed-out copy is kept for after sign-out. Creating an account in
  the app moves the passwords of the feeds saved to the
  new account into it, and deletes the passwords of the feeds removed because of the account's
  Add by RSS limit. Signing out removes the passwords the account saved on the phone and keeps
  the ones saved while signed out. A feed the account followed stays on the phone after sign-out
  and asks for its password again there.
- Who notices: signed-out mobile users with password-protected feeds
- Operator steps: none

## Mobile database records device fetch state and signed-out ownership for Add by RSS feeds

- Surfaces: mobile
- Change: SQLite migration 3 adds six columns to `add_by_rss_feed`: the conditional cache from
  the phone's last fetch of the feed (`device_etag`, `device_last_modified`, `device_feed_hash`),
  when the phone last fetched it (`device_checked_at`), whether the signed-out user of the phone
  followed it and no signed-in account has claimed it (`signed_out_owned`, default 0), and when
  the phone started following it (`followed_at`). Existing rows get 0 and nulls; nothing is
  rewritten. While someone is signed in, Add by RSS lists leave out feeds the signed-out user
  followed; after sign-out they are listed again. Signed-in users always use the server parse.
- Who notices: nobody directly; on-device parsing for signed-out users, the sign-up carry, and
  the sign-in rules use these columns.
- Operator steps: none

## Mobile refreshes signed-out Add by RSS feeds on the phone

- Surfaces: mobile
- Change: Signed out, Add by RSS feeds now refresh in the background and on pull to refresh by
  fetching and parsing each feed on the phone. Background passes skip feeds the phone fetched in
  the last 15 minutes; pull to refresh checks all of them. Signed in, nothing changes: Trial and
  Premium members refresh through the server, and free or lapsed accounts keep their feeds
  playable without refreshing them. A signed-in session never parses on the phone, and feeds
  followed while signed out are not refreshed while someone is signed in.
- Who notices: signed-out mobile users; feed hosts see requests from phones for signed-out users
- Operator steps: none

## Add by RSS remote-item lookup and resolve work signed out

- Surfaces: api, k8s base env
- Change: `POST /account/add-by-rss/remote-item/lookup` and `POST /account/add-by-rss/remote-item/resolve` accept requests without a session. Lookup reads only the directory and remote stub tables and has no rate limit (at most 100 references per request). Resolve counts signed-out callers per IP address against a new `ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_ANON_MAX_PER_MINUTE` (default 120 per minute); signed-in callers keep `ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_MAX_PER_MINUTE` per account (default 30). The per-address count is kept in each API process's memory. API keys still need `add_by_rss:read`; an invalid token is still refused.
- Who notices: signed-out mobile users, whose Add by RSS feeds are parsed on the device; API consumers can call these routes without a session
- Operator steps: none required; set `ACCOUNT_ADD_BY_RSS_REMOTE_ITEM_RESOLVE_ANON_MAX_PER_MINUTE` on the API to change the signed-out resolve budget

## Add by RSS shows as free on the mobile app in the membership comparison

- Surfaces: api, web, mobile
- Change: The membership comparison row "Add Custom RSS Feeds" is checked under Free and under Premium, with the existing free-on-mobile mark. The legend already says the free tier is the mobile app and Premium includes the website. The row does not state a feed limit. Adding a feed to the public directory stays blocked on Trial. The website still requires a membership to add a feed.
- Who notices: anyone reading the membership comparison on the website or in the app
- Operator steps: none

## Trial and Premium share one Add by RSS limit

- Surfaces: api, management-api, web, mobile, k8s base env, database migration
- Change: Trial and Premium accounts now have the same Add by RSS limit, 100 feeds by default. The env keys `MEMBERSHIP_TRIAL_MAX_ADD_BY_RSS_FEEDS` and `MEMBERSHIP_PREMIUM_MAX_ADD_BY_RSS_FEEDS` are replaced by one key, `MEMBERSHIP_MAX_ADD_BY_RSS_FEEDS` (default 100). App migration `0009_product_membership_shared_add_by_rss_limit.sql` replaces the two `product_membership_settings` columns with `max_add_by_rss_feeds`, copied from the Premium value. Per-account overrides still apply. The `GET /product/membership` response carries `maxAddByRSSFeeds` in place of `trialMaxAddByRSSFeeds` and `premiumMaxAddByRSSFeeds`. The Trial limitations list on the web membership page, the mobile membership screen, and the `GET /product/membership/comparison` document no longer has an Add by RSS line, and the catalog key `membership.trial_limitations_add_by_rss_feed_limit` is removed.
- Who notices: Trial accounts can save up to 100 Add by RSS feeds instead of 10; readers of the Trial limitations list see one line fewer; API clients reading the old fields
- Operator steps: replace the two old env keys with `MEMBERSHIP_MAX_ADD_BY_RSS_FEEDS` in any GitOps overlay or home override that sets them; the migration runs with the deploy

## Management shows one Add by RSS limit for Trial and Premium

- Surfaces: management-api, management-web
- Change: Products → Memberships has one "Max Add by RSS Feeds" row in place of the separate Trial and Premium rows. `PATCH /products/membership` takes `maxAddByRSSFeeds` in place of `trialMaxAddByRSSFeeds` and `premiumMaxAddByRSSFeeds`, and the response returns the one field. The user create and edit forms describe the one default next to the per-account override.
- Who notices: management users editing membership settings or account overrides; scripts that call the management PATCH with the old fields
- Operator steps: none

## API returns the Add by RSS limit for the device and the signed-in account

- Surfaces: api, mobile
- Change: `GET /product/membership` (public) documents `maxAddByRSSFeeds`, the default Add by RSS limit shared by Trial and Premium. New authenticated `GET /account/add-by-rss/feed-limit` returns `{ data: { maxAddByRSSFeeds } }` for the signed-in account: its per-account override, or the default. An API key needs `add_by_rss` read. A lapsed membership gets the usual membership-expired 403. The mobile app reads both numbers from the server, so a limit change needs no app release.
- Who notices: API clients; mobile users indirectly, through the sign-up and limit flows that use these numbers
- Operator steps: none

## At the Add by RSS limit, the app says so and points to support

- Surfaces: api, web, mobile
- Change: Saving an Add by RSS feed past the account's limit returns a 403 `add_by_rss_feed_limit_reached` with the account's `limit` and no `renewPath`. Web and mobile show "Limit Reached" with "You have reached your limit of N Add by RSS feeds. To have it raised, email <support address>." and an Email Support button that opens an email. Web shows this from the add page and from the subscribe buttons on Add by RSS podcast, artist, and album pages, which used to show a generic error. The manual refresh hourly limit is unchanged.
- Who notices: signed-in users at their Add by RSS limit; support, who receive the requests
- Operator steps: set `CONTACT_EMAIL` on the API so its structural message names the address; the clients use their own configured support address either way

## Mobile Add by RSS screen states the account's feed limit

- Surfaces: mobile
- Change: While signed in, My Library › Add by RSS shows "Add by RSS holds up to N feeds." under the Add Feed button, where N is the account's own limit read from the server (its override, or the shared default). The line is hidden when signed out (signed-out adds have no limit), when the server cannot answer (offline, Offline Mode), and for accounts without a valid membership. It is re-read each time the screen opens. The website's Add by RSS pages do not show this line; web states the number only when an add is refused at the limit.
- Who notices: signed-in Trial and Premium mobile users of Add by RSS
- Operator steps: none

## Mobile sign-up warns when device Add by RSS feeds exceed the limit

- Surfaces: mobile
- Change: signed out on mobile, tapping Sign Up first counts the Add by RSS feeds followed on
  this device. When there are more than the server's default Add by RSS limit (read from the
  public limit endpoint), a screen states the limit and the count, warns that feeds over the
  limit may be lost, offers Export OPML right there, has a More Details section, names the
  support email, and keeps Continue disabled until a checkbox accepts the removal. Continue opens
  the sign-up form. When the limit cannot be loaded, the screen shows a retry and does not open
  sign-up. A device at or under the limit goes straight to the sign-up form.
- Who notices: signed-out mobile users with many Add by RSS feeds who create an account
- Operator steps: none

## Add by RSS password note when the phone parses the feed

- Surfaces: mobile
- Change: On the username-and-password screen, a signed-out phone says the app sends the username and password only to the feed's site. A signed-in user, including a free account or a lapsed membership, still uses the sentence that says the service receives them over HTTPS and does not keep them. The website keeps that sentence.
- Who notices: signed-out mobile users entering a feed username and password
- Operator steps: none

## Device OPML export reads directory feed URLs from the channel

- Surfaces: mobile
- Change: Exporting OPML for directory follows reads the feed URL from the public channel
  response itself. The previous read looked for a `data` wrapper the route does not send, so
  every directory follow was reported missing.
- Who notices: mobile users exporting OPML that includes subscribed podcasts
- Operator steps: none

## Mobile banners defer to push on the same device

- Surfaces: mobile
- Change: When Push is on for a category and this device can show system notifications, the
  in-app banner for that category is skipped so the same alert is not shown twice. Foreground
  FCM builds present the system banner, list, and sound. Banner and inbox taps use the same
  deep-link path as a push tap, including while the full player is open. The banner close
  control dismisses the card in that case. The notifications inbox is unchanged.
- Who notices: signed-in mobile listeners with Push and Banner both on
- Operator steps: none
