# Wake-up — v4-to-v5 migration inventory

Overnight pass finished. Counts ran. No emails, raw rows, or connection string
were written into git.

Resume from a new agent window with the guided prompt:
[.cursor/prompts/v4-to-v5-migration-guided.md](/.cursor/prompts/v4-to-v5-migration-guided.md).
The current work is
[15](15-near-term-rehearsal-checklist.md), section 5, in that order. One chunk,
then stop and ask. Do not commit or push.

Built on this branch: `v4SeedAccountIdentity` (rehearsal account `eFv5NFx` is
seeded on the local database) and `v4CopyAccountLibrary` (reapplied for that
account at `2026-11-12T03:51:50Z`). The catalog seed dry run counts are in
checklist 15. The catalog apply created 227 channels and queued 227 parses.
One show had no authority URL and was skipped. Web and mobile sign-in with
the v4 password both succeeded. All 925 clips and 19 playlist members are
written. Two user follows and 16 history rows on failed feeds are not, and
nothing replays them yet. The 21 unseeded subscriptions stay off the
public catalog. Retry and replay are planned in
`.llm/plans/active/v4-migration-resilience/` and specified in
[05 § Migration resilience](05-id-mapping-and-catalog-seeding.md#migration-resilience).
The membership expiry dry run at `2026-11-12T04:01:50Z` wrote nothing:
created 1, skipped past 1563, unmatched 1373, and the other counts are 0.
v4's unique email index is case-sensitive. 50 addresses are stored twice,
one lowercase row and one mixed-case row, 100 users. None share an identical
string. The seed keeps a used row over a never-used one, then the later dated
activity, then a verified row, then the later account `updatedAt`, and logs
the other id. Under that rule it keeps 30 lowercase rows and 20 mixed-case
rows. No never-used row wins over a used one, and no left-out row has a
future paid expiry. In 36 pairs the left-out row also had use. Its library
is dropped, not merged, and only its v4 id is logged. Six
mixed-case addresses have no twin and are stored lowercase. v5 stores only a
trimmed lowercase address (`0006_account_email_lowercase.sql`). Sign-in,
signup, email change, and the management user routes lowercase the typed
address and match it exactly. The migration stops if two stored addresses
differ only by letter case. Alpha has one account and that address is already
lowercase, so the pre-deploy twin count was skipped. `eFv5NFx` is not one of
them. The paid-expiry file was rebuilt for this sitting: 2937 rows, 297 capped
at `2031-11-12T05:08:14Z`. The apply ran at `2026-11-12T05:09:48Z`: created 1,
skipped past 1563, unmatched 1373, and the other counts are 0. `v4SeedAccountIdentity` was re-run for `eFv5NFx` at
`2026-11-12T04:15:15Z`. That account is Premium. The import wrote its paid
grant. See checklist 15. The account is Premium with a future expiry, so the
Add by RSS parse route now allows it. All 11 follows still have no title. The
retry is a signed-in app foreground with the parser workers running. The
server does not start that parse. An add-by-RSS follow drops a trailing path
slash (`0007_add_by_rss_feed_url_trailing_slash.sql`), so two follows that
differ only by that slash become one. The host root keeps its slash. A public
catalog feed URL stays as stored.

The library write is the same
`v4CopyAccountLibrary` command without `--dry-run`. It has been run again for
`eFv5NFx` on the local database after the settled-parse rule. Its spec is
[05](05-id-mapping-and-catalog-seeding.md#episodes-that-left-the-feed): a user
clip is never dropped. An episode that left its feed becomes an Archived item
when the show will exist in v5, and a snapshot otherwise. Queue, history, and
now playing copy only for Active items. The archiver also keeps an item a
channel merge map points at, so `archiveAll` does not fail on that foreign key. The review questions in
[04](04-v4-data-inventory-and-scope.md) are decided. The account model in
[07](07-account-and-data-migration-model.md) is hybrid. A future paid v4
expiry sets Premium. A carried v4 trial stays Trial. Once v5 is live in one
place, v4 Apple, Google Play, and PayPal subscription products are turned
off. After an account is copied, the v4 API rejects that account. v4
identities are seeded before public signup, and the library is copied later.
An email that already exists in v5 is left alone. During the grace period one
library is read from v4 at sign-in. The bulk copy waits for grace end. The
v4 app does not run either job. The questions in 07 are decided. The grace
period is 30 days from the day v5 is installable, and the end can move. The
announcement uses an earlier date, calls the app NextGen, asks people to back
up, and says we keep a backup. On-device files stay in
[08](08-mobile-first-launch-migration.md) and get a close review before
implementation. The announcement list is the 20,520 verified accounts. The 1,990 unverified
accounts are seeded and are not emailed. The announcement is from
`contact@podverse.fm`. The send method is later. The English draft is in
[10](10-user-communication.md). The email stays English because v4 stores no
user locale. The questions in 10 are decided. During the grace period the
operator reviews copied, remaining, and failed accounts once a day. The rest
of the store rollout opens after a calm day of sign-in copies.
When migration finishes, public requests to the v4 API are blocked. The
private process stops once the final database archive is checked. The
archive is kept after the grace window. The operations engineer chooses how
long. The minimum version number waits for the first live store build, and
that build's version is the value. The NextGen check is specified in
[13](13-forced-migration-and-v4-shutdown.md): a public semver compare after
first paint, blank minimum does not block, and this pass does not build it.
The questions in 13 are decided. The per-channel purchase floor stays on
checkout options and is blank at go-live. The after-charge 426 on the Apple
and Google purchase routes is removed later. NextGen sign-in uses the
copied password. A v4 session is not exchanged for a v5 session. The
announcement is the email. There is no public migration page. A longer
reply is sent when someone contacts us. The installed app has no free-text
one-time screen. There is no mass notification. The questions in 02 are
decided. Beta hosts follow the alpha shape on `podverse.fm`: `beta`,
`api-beta`, `management.beta`, and `management-api.beta`. Beta cookies stay
on each API host. They are not set on `.podverse.fm`. After launch, beta
and production share the production database. A beta build cannot start a
purchase. Buying is on `podverse.fm` or by writing to `contact@podverse.fm`.
Sandbox purchases stay on alpha. Alpha is internal testing. Beta is public
pre-release testing. Store submission does not wait for a tester count. The
questions in 09 are decided. During grace the v5 API is
`api-prod.podverse.fm`. After the public v4 block, `api.podverse.fm` points
at v5. The v5 website goes live at the operator's discretion, likely when
the first store approves the mobile app. The questions in 11 are decided.
The legacy id map lives in the application database. Workers write it. The
website reads it from that same database. An unmatched id stays unresolved
until a finished parse still cannot match it, and only then is it dropped.
A user clip or playlist member is the exception: it becomes an Archived item
or a snapshot, and it is never dropped
([05](05-id-mapping-and-catalog-seeding.md#episodes-that-left-the-feed)).
v4 stats tables are not imported. v5 popularity starts empty. Listening
history, queue, and playback position still move. The questions in 05 are
decided. The practice-run database is refreshed when a run starts, and once
more immediately before the identity seed. A library copy shows its groups
and row counts. Closing the app does not stop the worker. Opening the app
again shows the same progress and does not start a second copy. Only
operators run commands against the practice-run database copy. The
questions in 06 are decided. Old ids found on the phone are saved first
and matched when the network is available. The first screen does not wait
for that match. Signed-out phone carryover is good enough when
subscriptions and Add by RSS addresses from the phone are present. Queue,
history, and downloads may be missing. The first store build uses the app
version as its version name. The Android build number stays above `5280`
and only increases. v5 reuses Firebase project podverse-app. It adds apps
for the v5 ids and does not edit the v4 apps, their config, or the v4 admin
account firebase-adminsdk-aqund. Next alpha, beta, and prod send with
service account podverse-next-fcm in that project, not with podcastdj-alpha
or podverse-2. v4 tokens and notification settings are not copied. The account uses v5 defaults. A device
asks once to allow notifications when the signed-in account had a v4 podcast
notification and the phone has not already been asked. If permission is
already granted, the app registers a token and does not ask. The live v4
iOS app is App Store Connect `1390888454`, bundle `com.podverse.fm`, SKU
`podverse.fm`. The NextGen submit profile's `6823398032` is not that app.
Apple Team ID `DF9KG8H54B` signs both that app and Podverse Next. Both apps
are in the Podverse LLC account. Play App Signing is on for `com.podverse`.
Google signs the releases people install. The questions in 03 are decided.
Production v4 is believed to run `master`. The local `master` and `develop`
copies of the API have the same entity, migration, and route files. Confirm
the running process before the identity seed. Extra v4 worktrees wait until
someone starts the migration code. The questions in 01 are decided. An
episode in a v4 playlist becomes a playlist row that points at the episode.
The clip stays empty. Do not invent a clip for that episode. The
phone-storage spike is written in
[08](08-mobile-first-launch-migration.md#storage-spike) and has not been run.
It reads two keys on a private in-place install and leaves the app code
alone. Doc 12 does not freeze or promote a beta database. Beta and
production already share the production database.

## Done

- Column inventory for v4 app tables in
  [04](04-v4-data-inventory-and-scope.md), from `podverse-api@develop` entities
  and the snapshot `information_schema`.
- Id-mapping notes in [05](05-id-mapping-and-catalog-seeding.md), including the
  integer cast from `podcasts.podcastIndexId` to `feed.podcast_index_id`, the
  hop to an already-merged survivor, and the seed filter that skips spam,
  takedown, and non-public podcasts.
- Read-only count SQL and this snapshot's counts in
  [06](06-database-migration-rehearsal.md). Same files, gitignored, under
  `.artifacts/v4-rehearsal-counts/`.
- Membership export SQL in
  [BILLING-OPERATIONS.md](/docs/billing/BILLING-OPERATIONS.md#v4-membership-carryover)
  now reads `users.email` and `users.membershipExpiration`.
- `V4_DATABASE_URL` is documented as `~/.config/podverse/v4-database-url` only.
- v4-side crosswalk gaps are in
  [06](06-database-migration-rehearsal.md#crosswalk-gaps-on-this-snapshot).
  42 subscribed podcast ids have no podcast row. Every remaining subscribed
  podcast has a numeric Podcast Index id. 2,707 history rows have a blank
  episode guid.

## Counts

Newest `users.updatedAt` on the copy: `2026-10-30T03:09:51Z`.

| Check                            | Count       |
| -------------------------------- | ----------- |
| Users                            | 22,510      |
| Future membership expiry         | 1,390       |
| Membership expiry null           | 19,573      |
| Podcasts                         | 7,709,610   |
| Numeric `podcastIndexId`         | 7,709,609   |
| Episodes                         | 195,891,836 |
| Episodes with null or blank guid | 4,067,063   |
| Distinct subscribed podcast ids  | 63,786      |
| History rows                     | 2,757,743   |
| Queue rows                       | 50,605      |
| MediaRefs                        | 8,433,479   |
| Official chapters                | 7,292,641   |

`subscribedPodcastListIds` is empty for every user. `users.userNowPlayingItemId`
is null for every user. Legacy JSON history and queue are tiny next to the
relational tables.

## Deferred

- The library write for `eFv5NFx` has been run on the local database.
  Sign-in, the count comparison, and the membership expiry dry run are still
  open. The order is section 5 of
  [15](15-near-term-rehearsal-checklist.md).
- No membership CSV export (that file would contain email addresses).
- v4 purchase receipts are not imported. An operator-held archive of those
  tables, outside git, is part of the later import. Not written in this pass.
- The one-account library dry run is the crosswalk so far. A full-catalog
  crosswalk is not done. The v4-side gap counts are done.
- `freeTrialExpiration` is not in the expiry CSV. Decided. 406 future trials
  end within 90 days and become Trial grants. 4 later than that are not
  imported. Paid `membershipExpiration` keeps its date, with no 90-day cap.
  App Store window accounts whose membership is longer than 5 years are
  capped at 5 years. Other long memberships are not capped.

## Review

- `subscribedPodcastListIds` is a drop. It is not on the `User` entity, and no
  user has a value.
- Official chapters and soundbites stay out of `clip`. Decided. A user clip is
  `isOfficialChapter` IS NOT TRUE and `isOfficialSoundBite` IS NOT TRUE
  (12,381 rows). Chapter and soundbite `mediaRefs.id` values stay in the
  legacy map so `/clip/:id` can redirect.
- User-follow stays. Decided. `subscribedUserIds` copies into
  `account_following_account`. 13 users have a non-empty list. 3 of those
  users have an id shorter than 9 characters. `nano_id_v2` will accept 7–15.
  New ids stay 10 characters. The schema check is still 9 until that edit.
- `accountClaimToken` is a drop. Decided. 4 rows, 1 unclaimed.
  `/account-claim-token/:id` is not reserved.
- `playlists.isDefault` becomes the v5 Likes playlist. Decided. 34 playlists,
  32 owners. 32 are music and 2 are mixed. All private. 29 have items. Import
  sets `is_default_likes` and does not create a second Likes playlist for that
  account and medium. `/playlist/:id` stays the same id.
- Django `auth_*` / `django_*` tables stay out. Decided. They are the old
  admin schema, not Podverse accounts. `auth_user` has 6 rows.
  `django_session` has 485.
