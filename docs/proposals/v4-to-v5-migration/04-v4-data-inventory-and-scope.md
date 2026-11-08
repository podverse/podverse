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
  tables are not the Podverse app. Decided: do not import them. On this
  snapshot `auth_user` has 6 rows and `django_session` has 485.
- `recentEpisodesByPodcastTemp*` and `recentEpisodesByCategoryTemp*` (0–30) are
  swap tables for list rebuilds. Leave them behind.
- `episodes_most_recent` and `mediaRefs_videos` are materialized views. Leave
  them behind.

## Proposed scope

| v4 surface                                                                    | Action                       | v5 landing                                                                                                                                |
| ----------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `users` identity (`id`, `email`, `password`, `name`, `emailVerified`)         | **migrate**                  | `account` + `account_credentials` + `account_profile`. Keep the bcrypt hash.                                                              |
| `users.membershipExpiration`                                                  | **migrate**                  | `legacy_import` grant, account is Premium. [BILLING-OPERATIONS](/docs/billing/BILLING-OPERATIONS.md#v4-membership-carryover).             |
| `users.freeTrialExpiration`                                                   | **migrate**                  | Trial grant when the end is within 90 days. Later trial dates are not imported. No second signup trial.                                   |
| `users.subscribedPodcastIds`                                                  | **migrate**                  | `account_following_channel` through the podcast crosswalk.                                                                                |
| `users.subscribedPlaylistIds`                                                 | **migrate**                  | `account_following_playlist`. Owned playlists come from `playlists.ownerId`.                                                              |
| `users.subscribedUserIds`                                                     | **migrate**                  | `account_following_account` exists in v5.                                                                                                 |
| `users.subscribedPodcastListIds`                                              | **drop**                     | Absent from the `User` entity. Empty for every user on the snapshot.                                                                      |
| `users.addByRSSPodcastFeedUrls`                                               | **migrate**                  | `account_following_add_by_rss_channel.feed_url`. No item rows.                                                                            |
| `users.historyItems` / `users.queueItems`                                     | **drop**                     | Legacy JSON. Prefer `userHistoryItems` and `userQueueItems` when those tables have rows.                                                  |
| `users` tokens, `roles`, `isDevAdmin`, `isPodpingAdmin`                       | **drop**                     | Do not copy reset tokens or bulk-copy admin flags.                                                                                        |
| `playlists` + join tables + `itemsOrder`                                      | **migrate**                  | Episode rows set `item_id` only. Clip rows set `clip_id` only. Do not invent a clip.                                                      |
| `mediaRefs` user clips                                                        | **migrate**                  | `clip` when `isOfficialChapter` IS NOT TRUE and `isOfficialSoundBite` IS NOT TRUE.                                                        |
| `mediaRefs` official chapters / soundbites                                    | **re-derive**                | `item_chapter` / `item_soundbite` from the feed. Keep `mediaRefs.id` for the `/clip/:id` redirect.                                        |
| `userQueueItems`                                                              | **migrate**                  | Upcoming `queue_resource` (`list_position`).                                                                                              |
| `userHistoryItems`                                                            | **migrate**                  | History `queue_resource` (`playback_position`, `completed`, `media_file_duration`).                                                       |
| `userNowPlayingItems`                                                         | **migrate**                  | Now-playing `queue_resource`.                                                                                                             |
| `notifications`                                                               | **drop**                     | Not settings. One row means this account had a podcast notification. v5 uses its defaults.                                                |
| `fcmDevices` / `upDevices`                                                    | **drop**                     | Not imported. The new app registers with its own Firebase project.                                                                        |
| `paypalOrders` / `appStorePurchase` / `googlePlayPurchase` / `bitpayInvoices` | **drop**                     | Not imported. Archive outside git. App Store window rows stay marked simulated.                                                           |
| `accountClaimToken`                                                           | **drop**                     | Left behind. `/account-claim-token/:id` is not reserved.                                                                                  |
| `podcasts` / `episodes` / `feedUrls` / `authors` / `categories`               | **re-derive**                | Parse into v5. Keep ids only for the legacy map.                                                                                          |
| `liveItems`                                                                   | **re-derive**                | From feeds.                                                                                                                               |
| `stats_podcast` / `stats_episode` / `stats_media_ref`                         | **drop**                     | Not imported. v5 popularity starts empty. History and queue still move.                                                                   |
| `episodes_most_recent`, `mediaRefs_videos`                                    | **drop**                     | Materialized views.                                                                                                                       |
| `recentEpisodesBy*Temp*`                                                      | **drop**                     | Rebuild scratch tables.                                                                                                                   |
| `auth_*`, `django_*`                                                          | **drop**                     | Separate admin app in the same database.                                                                                                  |

## Column inventory

Types are the snapshot types. "Null" is `information_schema.is_nullable`.

### `users`

| Column                             | Type               | Null | Notes                                                    |
| ---------------------------------- | ------------------ | ---- | -------------------------------------------------------- |
| `id`                               | varchar(14)        | no   | Kept as `account.id_text`.                               |
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
| `freeTrialExpiration`              | timestamp          | yes  | Trial grant if the end is within 90 days.                |
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
| `playlists`                       | `id`, `title`, `description`, `isPublic`, `medium`, `itemsOrder`, `ownerId`, `isDefault`                           | `int_id`, `itemCount` (recompute)                                     |
| `playlists_episodes_episodes`     | `playlistsId`, `episodesId`                                                                                        |                                                                       |
| `playlists_media_refs_media_refs` | `playlistsId`, `mediaRefsId`                                                                                       |                                                                       |
| `mediaRefs`                       | `id`, `startTime`, `endTime`, `title`, `ownerId`, `episodeId`, `isPublic`                                          | `int_id`, `chapterHash`, `imageUrl`, `linkUrl`, author/category joins |
| `userQueueItems`                  | `ownerId`, `queuePosition`, `episodeId`, `mediaRefId`                                                              | `id` (new v5 id)                                                      |
| `userHistoryItems`                | `ownerId`, `userPlaybackPosition`, `mediaFileDuration`, `completed`, `orderChangedDate`, `episodeId`, `mediaRefId` | `id`                                                                  |
| `userNowPlayingItems`             | `ownerId`, `userPlaybackPosition`, `episodeId`, `mediaRefId`                                                       | `id`                                                                  |
| `notifications`                   | `userId`, `podcastId`                                                                                              | Composite primary key, no surrogate id                                |
| `fcmDevices`                      | `fcmToken`, `userId`                                                                                               | Not enough for `account_fcm_device`                                   |
| `upDevices`                       | `upEndpoint`, `upPublicKey`, `upAuthKey`, `userId`                                                                 | v5 has no public-key column and one row per account                   |

`playlists.isDefault` becomes `playlist.is_default_likes` for that account
and medium. v4 creates one private Favorites playlist per owner per medium.
On this snapshot that is 34 playlists and 32 owners: 32 medium `music`
(`Favorite Music`) and 2 medium `mixed` (`Favorites`, where v4 stores podcast
favorites). All 34 still use those titles, all are private, 29 have items, and
5 are empty. Import each as that account and medium's Likes playlist, with its
items. Do not also create an empty Likes playlist for the same account and
medium. Other playlists stay ordinary playlists. `playlists.id` stays
`playlist.id_text`, so `/playlist/:id` is unchanged.

`mediaRefs.ownerId` is `varchar(14)` NOT NULL. `mediaRefs.episodeId` is nullable
on the snapshot. Official chapters and soundbites are flags on the same table,
not a separate table.

User clips store `isOfficialChapter` as null and `isOfficialSoundBite` as
false. The import predicate is both flags IS NOT TRUE. On this snapshot that
is 12,381 rows, and the two official flags do not overlap. Those official rows
are not clips. Their public v4 URL is still `/clip/:mediaRefs.id`, so the
legacy map keeps that id and [11](11-web-api-and-url-cutover.md) redirects it
to `/chapter/` or `/official-clip/`.

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
  plan covers expiry CSV import after accounts exist. App Store rows whose
  purchase date is 2023-12-27 through 2024-01-31 are simulated and stay out of
  any ledger import or revenue count. An account with a purchase in that
  window whose `membershipExpiration` is more than five years ahead is
  imported as five years from the import time. Other paid expiries stay as
  stored. Replace that window with the normal
  monthly rate from the surrounding one-purchase-per-account months (about 44
  purchases at $18), not with the 8,671 stored rows.
- `bitpayInvoices.token` and device keys are secrets. Counts only. No exports
  of those columns.
- An episode in a v4 playlist becomes a `playlist_resource` row with `item_id`
  set and `clip_id` empty. A mediaRef becomes a row with `clip_id` set. The
  database already allows exactly one of those. Do not invent a clip for an
  episode.

## Future plan sets

- Per-entity import commands once [06](06-database-migration-rehearsal.md)
  sizes are accepted.
