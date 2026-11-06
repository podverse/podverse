# Wake-up — v4-to-v5 migration inventory

Overnight pass finished. Counts ran. No emails, raw rows, or connection string
were written into git.

Resume from a new agent window with the guided prompt:
[.cursor/prompts/v4-to-v5-migration-guided.md](/.cursor/prompts/v4-to-v5-migration-guided.md).
One chunk, then stop and ask. Do not commit or push. The review questions in
[04](04-v4-data-inventory-and-scope.md) are decided. Next is the account model
in [07](07-account-and-data-migration-model.md), or mobile local storage in
[08](08-mobile-first-launch-migration.md).

## Done

- Column inventory for v4 app tables in
  [04](04-v4-data-inventory-and-scope.md), from `podverse-api@develop` entities
  and the snapshot `information_schema`.
- Id-mapping notes in [05](05-id-mapping-and-catalog-seeding.md), including the
  integer cast from `podcasts.podcastIndexId` to `feed.podcast_index_id`.
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

- No migration workers and no account import.
- No membership CSV export (that file would contain email addresses).
- v4 purchase receipts are not imported. An operator-held archive of those
  tables, outside git, is part of the later import. Not written in this pass.
- No crosswalk against a v5 database. The v4-side gap counts are done.
- Episode-only playlist rows still need a `playlist_resource` shape.
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
