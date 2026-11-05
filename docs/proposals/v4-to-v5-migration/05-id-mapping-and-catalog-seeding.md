# 05 — ID Mapping and Catalog Seeding

## Goal

Define how v4 shortids become v5 channels, items, clips, and playlists, and
which feeds must exist in v5 before user data can attach to them.

## Status

Draft. Needs operator review. Match keys are the snapshot columns in
[04](04-v4-data-inventory-and-scope.md).

## What we know

- v4 `podcasts.id` is `varchar(14)`. `podcasts.podcastIndexId` is nullable
  `varchar`, unique when present. `podcasts.podcastGuid` is a nullable uuid.
  `podcasts.guid` is a different nullable varchar. Do not treat `guid` as
  `podcastGuid`.
- v4 `feedUrls.url` is unique. `feedUrls.podcastId` points at `podcasts.id`.
  `feedUrls.isAuthority` is a nullable boolean. The entity unique constraint
  `feedUrl_index_podcastId_isAuthority` allows one authority row per podcast.
- v5 `feed.podcast_index_id` is a required integer. v5 `feed.url` is unique.
  v5 `channel.feed_id` points at that feed. v5 `channel.podcast_guid` is a
  nullable uuid. v5 `channel` has no v4 shortid column.
- v5 also tracks merges (`channel_merge.from_podcast_index_id`) and pending
  follows (`account_pending_following_channel.podcast_index_id`) by Podcast
  Index id.
- v4 `episodes.guid` is nullable varchar. `episodes.mediaUrl` is NOT NULL.
  `episodes.pubDate` is nullable timestamp. `episodes.podcastId` is NOT NULL
  and duplicates the `podcast` relation.
- v5 `item.guid` is nullable. v5 `item.guid_enclosure_url` is the other match
  key (at least one of the two is required). v5 `item.pub_date` is
  `timestamptz`.
- Add-by-RSS in v4 is `users.addByRSSPodcastFeedUrls` (varchar array of URLs).
  v5 stores the URL on `account_following_add_by_rss_channel` and does not
  store parsed items for those feeds.
- Matomo is not wired in the v5 monorepo. v4 already stores aggregated
  `stats_podcast`, `stats_episode`, and `stats_media_ref`.

## Proposed approach

### Crosswalk chain (podcast / channel)

```text
v4 podcasts.id (varchar 14)
  → podcasts.podcastIndexId when it matches ^[0-9]+$
    → v5 feed.podcast_index_id (integer)
  → else feedUrls.url where isAuthority is true
    → v5 feed.url
  → else podcasts.podcastGuid
    → v5 channel.podcast_guid
  → v5 channel via feed_id
```

Skip blank `podcastIndexId`. Do not cast non-numeric text into an integer.
`podcasts.guid` (varchar) is not this chain.

### Crosswalk chain (episode / item)

```text
v4 episodes.id
  → parent podcasts.id crosswalk
  → v5 item on that channel
    → match item.guid to episodes.guid
    → else item.guid_enclosure_url to episodes.mediaUrl
    → else title + pub_date (weak; pubDate is nullable)
```

`episodes.podcastId` is the parent key even when the relation row is the same
value. History and queue rows store `episodeId`, not `podcastId`, so they need
this hop.

### Crosswalk chain (clip / mediaRef)

```text
v4 mediaRefs.id
  → if isOfficialChapter is true: do not create a clip; re-derive item_chapter
  → if isOfficialSoundBite is true: do not create a clip; re-derive item_soundbite
  → else ownerId → v5 account
       episodeId → matched v5 item
       startTime / endTime / title → clip
```

`ownerId` is NOT NULL, including official chapters. That owner is not a reason
to copy official chapters into `clip`. `episodeId` is nullable on the snapshot.
A user clip with no episode cannot attach to an item. v5 `clip.item_id` is
nullable and can keep `removed_source` instead. Prefer that over dropping the
clip when the owner is known and the episode is gone.

v4 `startTime` and `endTime` are integers. v5 `clip.start_time` and `end_time`
are decimals. Copy the integer as a whole number of seconds.

### Crosswalk chain (playlist)

```text
v4 playlists.id
  → ownerId → v5 account
  → playlist row (new id_text)
  → itemsOrder shortids, in array order
      → playlists_episodes_episodes.episodesId → v5 item
      → playlists_media_refs_media_refs.mediaRefsId → v5 clip
      → playlist_resource.list_position
```

`itemsOrder` is the order. The two join tables are membership, not order.
`itemCount` is derived in v4 `BeforeInsert` and should be recomputed in v5.
`isDefault` is not `playlist.is_default_likes`.

v5 `playlist_resource` columns include `clip_id`, `item_id`,
`item_soundbite_id`, and `add_by_rss_hash_id` as required fields on the entity.
Episode-only v4 rows have no mediaRef. The import design has to say which of
those columns an episode row fills. Do not invent a clip per episode in this
inventory.

### Crosswalk chain (account)

```text
v4 users.id
  → users.email (already lowercase) → account_credentials.email
  → new account.id_text
  → password hash copied onto account_credentials.password
  → users.name → account_profile.display_name
  → users.emailVerified → account.verified
```

`subscribedPodcastIds` resolves through the podcast chain into
`account_following_channel`. `subscribedPlaylistIds` resolves through playlist
ids into `account_following_playlist`. `subscribedUserIds` resolves through
user ids into `account_following_account`. `addByRSSPodcastFeedUrls` copies
each URL onto `account_following_add_by_rss_channel.feed_url`.

`subscribedPodcastListIds` is on the snapshot and not on the `User` entity.
Leave it out of the chain until an operator says what it means.

### Playback rows

| v4                                         | Target columns                                |
| ------------------------------------------ | --------------------------------------------- |
| `userQueueItems.queuePosition`             | Upcoming `queue_resource.list_position`       |
| `userQueueItems.episodeId` or `mediaRefId` | `item_id` or `clip_id` after the chains above |
| `userHistoryItems.userPlaybackPosition`    | `queue_resource.playback_position`            |
| `userHistoryItems.mediaFileDuration`       | `queue_resource.media_file_duration`          |
| `userHistoryItems.completed`               | `queue_resource.completed`                    |
| `userHistoryItems.orderChangedDate`        | `queue_resource.last_played_at`               |
| `userNowPlayingItems.userPlaybackPosition` | Now-playing `queue_resource`                  |

`users.userNowPlayingItemId` is null for every user on this snapshot. Link
now-playing through `userNowPlayingItems.ownerId`.

Positions are integers in v4 and numeric in v5. Copy them as whole seconds.
Rows with both `episodeId` and `mediaRefId` null are **dropped**.

### Durable legacy map

Keep a permanent table (exact schema in a later plan):

| Column        | Contents                                                                         |
| ------------- | -------------------------------------------------------------------------------- |
| `legacy_kind` | `podcast`, `episode`, `mediaRef`, `playlist`, `user`                             |
| `legacy_id`   | v4 `varchar(14)` or uuid                                                         |
| `v5_id_text`  | Nullable until resolved                                                          |
| `resolve_key` | Numeric Podcast Index id, feed URL, `podcastGuid`, episode `guid`, or `mediaUrl` |
| `status`      | `mapped`, `unresolved`, `dropped`                                                |

Uses: login migration, web redirects ([11](11-web-api-and-url-cutover.md)),
mobile first-launch remap ([08](08-mobile-first-launch-migration.md)), and
support lookups. Store ids only. Do not store email in this table.

### Catalog seeding order

1. Collect podcast ids from `subscribedPodcastIds`, `playlists` joins,
   `userQueueItems.episodeId`, `userHistoryItems.episodeId`,
   `userNowPlayingItems.episodeId`, `notifications.podcastId`, and
   `mediaRefs.episodeId`. Hop episode ids through `episodes.podcastId`.
2. Add `feedUrls.url` for those podcasts, plus every
   `addByRSSPodcastFeedUrls` entry (URL only, no catalog row required).
3. Ensure those feeds exist in v5 and queue parse jobs. Do not bulk-copy the
   catalog unless rehearsal shows that is cheaper.
4. Optionally seed popularity from `stats_podcast.play_count` for one
   `timeframe`, keyed by `podcast_id` through the same crosswalk. No live
   Matomo query.
5. Build the legacy map as feeds and items become available. Retry
   `unresolved` rows.

## Honest limits and risks

- On this snapshot, `podcastIndexId` is numeric for every podcast except one
  null. Keep the numeric check anyway. A later copy could contain text.
- Episode `guid` is nullable. Some history and queue rows will drop.
- `liveItems.start` is `timestamptz` while most other v4 timestamps are
  `timestamp without time zone`. Do not mix them in one comparison without a
  cast.
- Seeding every feed that user data touches is still a large parse. Measure it
  in [06](06-database-migration-rehearsal.md).
- Redirects for unmapped ids should land on a friendly not-found page.

## Open questions

- Persist the legacy map in the app database, a side database, or a file the
  workers read?
- How long to keep `unresolved` rows before marking `dropped`?
- Seed global trending from `stats_podcast`, or only feeds needed for user data?
- Which `stats_*.timeframe` value is the one to seed?

## Future plan sets

- Schema and worker commands for the legacy map.
- Parse-queue sizing for the selective seed.
- Redirect handler design for [11](11-web-api-and-url-cutover.md).
- Episode-only `playlist_resource` shape.
