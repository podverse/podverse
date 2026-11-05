# 04 — v4 Data Inventory and Scope

## Goal

Decide, at table and column level, what moves from the v4 database into v5, what
is mapped only for redirects, and what is left behind.

## Status

Draft. Needs operator review. Labels: **migrate**, **map**, **drop**, **re-derive**.

Column names and types below are from `podverse-api@develop` `src/entities/`,
checked against `information_schema` on the prod-copy snapshot. Where the
snapshot disagrees with the entity, the snapshot column is listed under
[Drift](#drift-between-the-entity-and-the-snapshot). Row counts and null rates
are in [06](06-database-migration-rehearsal.md).

## What we know

- App tables use camelCase names and must be quoted in SQL (`"feedUrls"`).
- Catalog and user primary keys are `varchar(14)` shortids, except playback rows
  (`userHistoryItems`, `userQueueItems`, `userNowPlayingItems`, `liveItems`)
  and `accountClaimToken`, which are UUIDs.
- Purchase primary keys are processor ids (`transactionId`, `paymentID`), not
  shortids.
- Timestamps on these tables are `timestamp without time zone`, except
  `liveItems.start` and `liveItems.end`, which are `timestamptz`.
- v5 does not store a v4 shortid on `channel`. The stable crosswalk for Podcast
  Index feeds is `feed.podcast_index_id` (integer). v4 stores `podcastIndexId`
  as `varchar`. See [05](05-id-mapping-and-catalog-seeding.md).
- The same database holds a Django admin schema (`auth_*`, `django_*`). Those
  tables are not the Podverse app. Leave them behind.
- `recentEpisodesByPodcastTemp*` and `recentEpisodesByCategoryTemp*` (0–30) are
  swap tables for list rebuilds. Leave them behind.
- `episodes_most_recent` and `mediaRefs_videos` are materialized views. Leave
  them behind.

## Proposed scope

| v4 surface                                                                    | Action                       | v5 landing                                                                                                                                |
| ----------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `users` identity (`id`, `email`, `password`, `name`, `emailVerified`)         | **migrate**                  | `account` + `account_credentials` + `account_profile`. Keep the bcrypt hash.                                                              |
| `users.membershipExpiration`                                                  | **migrate**                  | `legacy_import` grant after the account exists. CSV in [BILLING-OPERATIONS](/docs/billing/BILLING-OPERATIONS.md#v4-membership-carryover). |
| `users.freeTrialExpiration`                                                   | **map**                      | Not the same column as membership expiry. Decide before import.                                                                           |
| `users.subscribedPodcastIds`                                                  | **migrate**                  | `account_following_channel` through the podcast crosswalk.                                                                                |
| `users.subscribedPlaylistIds`                                                 | **migrate**                  | `account_following_playlist`. Owned playlists come from `playlists.ownerId`.                                                              |
| `users.subscribedUserIds`                                                     | **migrate**                  | `account_following_account` exists in v5.                                                                                                 |
| `users.subscribedPodcastListIds`                                              | **map**                      | On the snapshot only. Absent from the `User` entity.                                                                                      |
| `users.addByRSSPodcastFeedUrls`                                               | **migrate**                  | `account_following_add_by_rss_channel.feed_url`. No item rows.                                                                            |
| `users.historyItems` / `users.queueItems`                                     | **drop**                     | Legacy JSON. Prefer `userHistoryItems` and `userQueueItems` when those tables have rows.                                                  |
| `users` tokens, `roles`, `isDevAdmin`, `isPodpingAdmin`                       | **drop**                     | Do not copy reset tokens or bulk-copy admin flags.                                                                                        |
| `playlists` + join tables + `itemsOrder`                                      | **migrate**                  | `playlist` + `playlist_resource.list_position`.                                                                                           |
| `mediaRefs` user clips                                                        | **migrate**                  | `clip`, when `isOfficialChapter` and `isOfficialSoundBite` are not true.                                                                  |
| `mediaRefs` official chapters / soundbites                                    | **re-derive**                | `item_chapter` / `item_soundbite` from the feed.                                                                                          |
| `userQueueItems`                                                              | **migrate**                  | Upcoming `queue_resource` (`list_position`).                                                                                              |
| `userHistoryItems`                                                            | **migrate**                  | History `queue_resource` (`playback_position`, `completed`, `media_file_duration`).                                                       |
| `userNowPlayingItems`                                                         | **migrate**                  | Now-playing `queue_resource`.                                                                                                             |
| `notifications`                                                               | **migrate**                  | Podcast-notify preference, remapped podcast → channel.                                                                                    |
| `fcmDevices` / `upDevices`                                                    | **map**                      | Re-register. v5 FCM also requires `installation_id`, `platform`, and `locale`. v5 `account_up_device` is one row per account.             |
| `paypalOrders` / `appStorePurchase` / `googlePlayPurchase` / `bitpayInvoices` | **map**                      | Expiry CSV first. Ledger import is a separate design.                                                                                     |
| `accountClaimToken`                                                           | **drop** unless product asks | v5 `membership_claim_token` is months, not years, and requires `account_membership_id`. v4 rows have no user id.                          |
| `podcasts` / `episodes` / `feedUrls` / `authors` / `categories`               | **re-derive**                | Parse into v5. Keep ids only for the legacy map.                                                                                          |
| `liveItems`                                                                   | **re-derive**                | From feeds.                                                                                                                               |
| `stats_podcast` / `stats_episode` / `stats_media_ref`                         | **map**                      | Popularity seed. Not user-owned.                                                                                                          |
| `episodes_most_recent`, `mediaRefs_videos`                                    | **drop**                     | Materialized views.                                                                                                                       |
| `recentEpisodesBy*Temp*`                                                      | **drop**                     | Rebuild scratch tables.                                                                                                                   |
| `auth_*`, `django_*`                                                          | **drop**                     | Separate admin app in the same database.                                                                                                  |

## Column inventory

Types are the snapshot types. "Null" is `information_schema.is_nullable`.

### `users`

| Column                             | Type               | Null | Notes                                                    |
| ---------------------------------- | ------------------ | ---- | -------------------------------------------------------- |
| `id`                               | varchar(14)        | no   | Legacy map key. v5 `account.id_text` is a new id.        |
| `int_id`                           | integer            | no   | Drop.                                                    |
| `email`                            | varchar, unique    | no   | `account_credentials.email`. Writes lowercase the value. |
| `password`                         | varchar            | no   | Copy the hash. Do not rehash.                            |
| `name`                             | varchar            | yes  | `account_profile.display_name`.                          |
| `emailVerified`                    | boolean            | no   | `account.verified`.                                      |
| `emailVerificationToken`           | varchar, unique    | yes  | Drop.                                                    |
| `emailVerificationTokenExpiration` | timestamp          | yes  | Drop.                                                    |
| `resetPasswordToken`               | varchar, unique    | yes  | Drop.                                                    |
| `resetPasswordTokenExpiration`     | timestamp          | yes  | Drop.                                                    |
| `membershipExpiration`             | timestamp          | yes  | CSV column `membership_expires_at`.                      |
| `freeTrialExpiration`              | timestamp          | yes  | Separate from membership expiry.                         |
| `isPublic`                         | boolean            | no   | Public profile flag.                                     |
| `isDevAdmin`                       | boolean            | no   | Do not bulk-copy.                                        |
| `isPodpingAdmin`                   | boolean            | no   | Do not bulk-copy.                                        |
| `roles`                            | varchar[]          | no   | Drop from member import.                                 |
| `subscribedPodcastIds`             | varchar[]          | no   | Shortids. Default empty array.                           |
| `subscribedPlaylistIds`            | varchar[]          | no   | Shortids.                                                |
| `subscribedUserIds`                | varchar[]          | no   | Shortids.                                                |
| `subscribedPodcastListIds`         | varchar[]          | no   | Snapshot column. Not on the entity.                      |
| `addByRSSPodcastFeedUrls`          | varchar[]          | no   | Feed URLs, not podcast ids.                              |
| `historyItems`                     | text (simple-json) | no   | Legacy now-playing JSON array.                           |
| `queueItems`                       | text (simple-json) | no   | Legacy now-playing JSON array.                           |
| `userNowPlayingItemId`             | uuid               | yes  | FK to `userNowPlayingItems.id`.                          |
| `createdAt`                        | timestamp          | no   | `account.created_at`.                                    |
| `updatedAt`                        | timestamp          | no   | Snapshot freshness only.                                 |

### Playback, playlists, clips, notify

| Table                             | Columns that move                                                                                                  | Columns to drop                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `playlists`                       | `id`, `title`, `description`, `isPublic`, `medium`, `itemsOrder`, `ownerId`                                        | `int_id`, `itemCount` (recompute), `isDefault` (not v5 likes)         |
| `playlists_episodes_episodes`     | `playlistsId`, `episodesId`                                                                                        |                                                                       |
| `playlists_media_refs_media_refs` | `playlistsId`, `mediaRefsId`                                                                                       |                                                                       |
| `mediaRefs`                       | `id`, `startTime`, `endTime`, `title`, `ownerId`, `episodeId`, `isPublic`                                          | `int_id`, `chapterHash`, `imageUrl`, `linkUrl`, author/category joins |
| `userQueueItems`                  | `ownerId`, `queuePosition`, `episodeId`, `mediaRefId`                                                              | `id` (new v5 id)                                                      |
| `userHistoryItems`                | `ownerId`, `userPlaybackPosition`, `mediaFileDuration`, `completed`, `orderChangedDate`, `episodeId`, `mediaRefId` | `id`                                                                  |
| `userNowPlayingItems`             | `ownerId`, `userPlaybackPosition`, `episodeId`, `mediaRefId`                                                       | `id`                                                                  |
| `notifications`                   | `userId`, `podcastId`                                                                                              | Composite primary key, no surrogate id                                |
| `fcmDevices`                      | `fcmToken`, `userId`                                                                                               | Not enough for `account_fcm_device`                                   |
| `upDevices`                       | `upEndpoint`, `upPublicKey`, `upAuthKey`, `userId`                                                                 | v5 has no public-key column and one row per account                   |

`mediaRefs.ownerId` is `varchar(14)` NOT NULL. `mediaRefs.episodeId` is nullable
on the snapshot. Official chapters and soundbites are flags on the same table,
not a separate table.

`userHistoryItems` is unique on (`episode`, `owner`) and on (`mediaRef`, `owner`).
A row may have either target null. Rows with both null cannot remap.

### Purchases and claim tokens

| Table                | Key             | Owner     | Other columns worth a later ledger                                         |
| -------------------- | --------------- | --------- | -------------------------------------------------------------------------- |
| `appStorePurchase`   | `transactionId` | `ownerId` | `original_transaction_id`, `product_id`, `expires_date`, `expires_date_ms` |
| `googlePlayPurchase` | `transactionId` | `ownerId` | `productId`, `purchaseToken` (unique), `purchaseTimeMillis`                |
| `paypalOrders`       | `paymentID`     | `ownerId` | `state`                                                                    |
| `bitpayInvoices`     | `id`            | `ownerId` | `orderId`, `price`, `currency`, `status`. `token` stays out of exports.    |
| `accountClaimToken`  | `id` uuid       | none      | `claimed`, `yearsToAdd`                                                    |

### Catalog columns used for matching

These rows are re-derived. The columns are match keys, not copy sources.

| Table             | Match columns                                                     | Other stored columns                                                                                      |
| ----------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `podcasts`        | `id`, `podcastIndexId` varchar, `podcastGuid` uuid, `authorityId` | `guid` varchar (separate from `podcastGuid`), `title`, `medium`, `isPublic`, `flag_status`, `hasLiveItem` |
| `feedUrls`        | `url` unique, `podcastId`, `isAuthority`                          | `id`, `int_id`                                                                                            |
| `episodes`        | `id`, `podcastId`, `guid`, `mediaUrl`, `pubDate`, `title`         | `int_id` bigint nullable, chapters and value JSON                                                         |
| `liveItems`       | `episodeId`, `status`, `start`, `end`                             | `id` uuid, `chatIRCURL`                                                                                   |
| `authors`         | `id`, `name`, `slug`                                              | Join `podcasts_authors_authors`                                                                           |
| `categories`      | `id`, `fullPath`, `title`, `categoryId`                           | Self-FK for parent category                                                                               |
| `stats_podcast`   | `podcast_id`, `timeframe`, `play_count`                           | `id` integer                                                                                              |
| `stats_episode`   | `episode_id`, `timeframe`, `play_count`                           |                                                                                                           |
| `stats_media_ref` | `media_ref_id`, `timeframe`, `play_count`                         |                                                                                                           |

Join tables confirmed on the snapshot: `podcasts_authors_authors`,
`podcasts_categories_categories`, `episodes_authors_authors`,
`episodes_categories_categories`, `media_refs_authors_authors`,
`media_refs_categories_categories`.

## Drift between the entity and the snapshot

| Item                                    | Entity on `develop`         | Snapshot                                                                                  |
| --------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------- |
| `users.subscribedPodcastListIds`        | Absent                      | `varchar[]` NOT NULL. QA seeds still set it. No migration file in this checkout names it. |
| `podcasts.parsingPriority`              | Boolean, default false      | Integer NOT NULL. Migration `0044` adds an integer.                                       |
| `episodes.int_id`                       | Commented out on the entity | `bigint`, nullable.                                                                       |
| `fcmDevices.userId`, `upDevices.userId` | NOT NULL                    | Nullable `varchar(14)`.                                                                   |
| `podcasts.flag_status`                  | NOT NULL, default `none`    | Nullable enum.                                                                            |
| `liveItems.end`                         | Annotated as `date`         | `timestamptz`. `start` is `timestamptz` as well.                                          |

Treat the snapshot as what production stored. Treat the entity as what the
current `develop` code reads. `subscribedPodcastListIds` needs an operator
decision before anyone writes import code. On this snapshot every one of those
arrays is empty (0 of 22,510 users).

## Measured on this snapshot

Full counts are in [06](06-database-migration-rehearsal.md). Corrections from
those counts:

- `podcastIndexId` is numeric on 7,709,609 of 7,709,610 podcasts. One row is
  null. No non-numeric values showed up.
- `users.userNowPlayingItemId` is null on every user. The 9,262 now-playing
  rows point at the user through `userNowPlayingItems.ownerId`.
- Legacy JSON is small next to the relational tables: 241 users have
  non-empty `historyItems`, 38 have non-empty `queueItems`, against 2,757,743
  `userHistoryItems` rows and 50,605 `userQueueItems` rows.
- 7,292,641 of 8,433,479 `mediaRefs` are official chapters, and 1,128,457 are
  official soundbites. Overlap of those two flags was not counted.
- `episodes_authors_authors`, `episodes_categories_categories`,
  `media_refs_authors_authors`, and `media_refs_categories_categories` are
  empty. Podcast author and category joins are not.

## Honest limits and risks

- Catalog copy would fight v5's feed parser and Podcast Index sync. Seed feeds
  that user data references, then parse.
- Clips and history whose episode cannot be matched will fail the remap. Count
  them in rehearsal. Do not promise full retention.
- `podcastIndexId` is text. v5 `feed.podcast_index_id` is an integer. Only
  all-digit values can crosswalk. See [05](05-id-mapping-and-catalog-seeding.md).
- Billing purchase rows are more sensitive than expiry dates. The membership
  plan covers expiry CSV import after accounts exist.
- `bitpayInvoices.token` and device keys are secrets. Counts only. No exports
  of those columns.
- v5 `playlist_resource` requires a `clip_id` column on every row in the entity
  definition. Episode-only playlist items need a mapping design before import,
  because v4 stores episodes and mediaRefs as two join tables.

## Open questions

- Is `subscribedPodcastListIds` still written in production, and does it differ
  from `subscribedPlaylistIds`?
- Import `freeTrialExpiration` as its own grant, or ignore it when
  `membershipExpiration` is set?
- Keep user-follow (`subscribedUserIds`) for launch?
- Import unclaimed `accountClaimToken` rows, given years versus months?
- How much purchase-ledger fidelity is required versus expiry-only for launch?
- Should `playlists.isDefault` become anything other than a normal playlist?

## Future plan sets

- Per-entity import commands once [06](06-database-migration-rehearsal.md)
  sizes are accepted.
- A decision on `subscribedPodcastListIds` and on episode-only playlist rows.
