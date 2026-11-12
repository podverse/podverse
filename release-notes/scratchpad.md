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
