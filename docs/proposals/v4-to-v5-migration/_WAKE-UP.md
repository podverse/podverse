# Wake-up — v4-to-v5 migration inventory

Overnight pass finished. Counts ran. No emails, raw rows, or connection string
were written into git.

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
- No crosswalk against a v5 database. The v4-side gap counts are done.
- Episode-only playlist rows still need a `playlist_resource` shape.
- `freeTrialExpiration` (set on 19,678 users) is not in the expiry CSV.

## Review

- Confirm `subscribedPodcastListIds` can be ignored. It is not on the `User`
  entity, and no user has a value.
- Confirm official chapters and soundbites stay out of `clip`.
- Confirm user-follow stays (`subscribedUserIds` is non-empty for 13 users).
- `accountClaimToken`: 4 rows, 1 unclaimed. v5 tokens are months and require a
  membership id.
- Django `auth_*` / `django_*` tables share this database. Left out of scope.
  `auth_user` has 6 rows.
