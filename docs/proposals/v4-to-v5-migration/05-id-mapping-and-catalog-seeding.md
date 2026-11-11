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
  nullable uuid. The public id is `channel.id_text`, and for a migrated
  podcast that value is `podcasts.id`.
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
- v4 `stats_podcast`, `stats_episode`, and `stats_media_ref` are Matomo
  visitor counts. v5 popularity is rebuilt from listen events. Those tables
  are not imported. Listening history, queue, and playback position still move.

## Proposed approach

### Retained public ids

These v4 shortids are copied onto `id_text`. The integer primary key in v5 is
new. Playback UUIDs (`userHistoryItems`, `userQueueItems`,
`userNowPlayingItems`) are not public page ids.

| v4 id                    | v5 `id_text`             |
| ------------------------ | ------------------------ |
| `users.id`               | `account.id_text`        |
| `podcasts.id`            | `channel.id_text`        |
| `episodes.id`            | `item.id_text`           |
| `playlists.id`           | `playlist.id_text`       |
| user-clip `mediaRefs.id` | `clip.id_text`           |
| chapter `mediaRefs.id`   | `item_chapter.id_text`   |
| soundbite `mediaRefs.id` | `item_soundbite.id_text` |

`nano_id_v2` accepts 7–15 characters. On this snapshot every one of
these ids is 7–12 characters, and none are longer than 15. Ids shorter than 9:

| Entity      | Shorter than 9 |
| ----------- | -------------- |
| `users`     | 410            |
| `playlists` | 12             |
| `podcasts`  | 222            |
| `mediaRefs` | 295            |
| `episodes`  | 21,099         |

The shortest id in each of those tables is 7, except playlists, where it is
8. `nano_id_v2` accepts 7–15 characters, and `generateRandomIdText` stays at
10. The app migration is `0005_v4_rehearsal_schema.sql`. The management
migration is `0002_nano_id_v2_min_7.sql`. Do not mint a replacement id for a
short row.

`BeforeInsert` on `account`, `channel`, `item`, `clip`, `playlist`,
`item_chapter`, and `item_soundbite` assigns a new `id_text`. Import has to
write the v4 shortid and that hook has to leave a provided value in place. A
feed parsed before the v4 id is applied would publish a different
`/podcast/:id`.

### Crosswalk chain (podcast / channel)

```text
v4 podcasts.id (varchar 14)
  → channel.id_text = podcasts.id
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
  → item.id_text = episodes.id
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
  → if isOfficialChapter IS NOT TRUE and isOfficialSoundBite IS NOT TRUE:
       ownerId → v5 account
       episodeId → matched v5 item
       startTime / endTime / title → clip
       clip.id_text = mediaRefs.id
       /clip/:id stays the same URL
  → if isOfficialChapter is true:
       do not create a clip; re-derive item_chapter
       item_chapter.id_text = mediaRefs.id
       /clip/:id redirects to /chapter/:id
  → if isOfficialSoundBite is true:
       do not create a clip; re-derive item_soundbite
       item_soundbite.id_text = mediaRefs.id
       /clip/:id redirects to /official-clip/:id
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
  → playlist.id_text = playlists.id
  → members = join-table episode ids and mediaRef ids
  → sort members by their index in itemsOrder
  → members absent from itemsOrder go last
  → an itemsOrder id with no join row is dropped
  → playlist_resource.list_position = 1, then + 0.00000001 each row
```

The two join tables are the playlist. `itemsOrder` only sorts those members.
An order id with no join row is dropped and counted. A join member the array
does not mention stays, after the ordered members. That is what v4
`combineAndSortPlaylistItems` already shows. `itemCount` is derived in v4
`BeforeInsert` and is recomputed from the rows copied.

On this snapshot, 1,182 of 10,351 `itemsOrder` ids have no episode and no
mediaRef, across 267 playlists. 2,672 join members are absent from the array,
across 647 playlists. One order id names an episode or mediaRef outside that
playlist's joins, and that id is dropped with the rest.
`isDefault` becomes `playlist.is_default_likes` for that account and medium.
Do not create a second Likes playlist for the same pair. Other playlists keep
`is_default_likes` false. On this snapshot that is 34 playlists (32 music, 2
mixed).

v5 `playlist_resource` stores exactly one of `item_id`, `clip_id`,
`item_soundbite_id`, or `add_by_rss_hash_id`. An episode from
`playlists_episodes_episodes` fills `item_id` and leaves `clip_id` empty. A
mediaRef fills `clip_id`. Do not invent a clip for an episode.

`list_position` on `playlist_resource` and `queue_resource` is a `numeric`
string. The app sorts ascending. The ORM step is `0.00000001`.

- An empty playlist or an empty upcoming queue starts at `1`. Each row added
  at the end is the previous position plus `0.00000001`.
- A row placed between two neighbors is their average.
- Now playing is `0`.
- The first history row is `-1`. Each newer history row is the previous
  history position plus `0.00000001`, so the newest sits closest to `0`.

The copy uses that same step. Playlist members, in the sort above, start at
`1` and add `0.00000001` per row. Upcoming queue rows do the same in
`queuePosition` order. The now-playing row is `0`. History starts at `-1` for
the oldest `orderChangedDate` and adds `0.00000001` for each newer row. The
pair `(playlist, list_position)` is unique.

### Crosswalk chain (account)

```text
v4 users.id
  → users.email (already lowercase) → account_credentials.email
  → account.id_text = users.id
  → password hash copied onto account_credentials.password
  → users.name → account_profile.display_name
  → users.emailVerified → account.verified
```

`subscribedPodcastIds` resolves through the podcast chain into
`account_following_channel`. `subscribedPlaylistIds` resolves through playlist
ids into `account_following_playlist`. `subscribedUserIds` resolves through
the same user ids into `account_following_account`. That follow list is
carried over. 13 users have a non-empty list, and 3 of those users have an
id shorter than 9. `addByRSSPodcastFeedUrls` copies
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
now-playing through `userNowPlayingItems.ownerId`. Order for these rows is the
`list_position` rule in the playlist section above.

`queue_resource.playback_position` is the playhead, separate from list order.
v4 playback positions are integers. Copy them as whole seconds. Rows with both
`episodeId` and `mediaRefId` null are **dropped**.

### Durable legacy map

Keep a permanent table (exact schema in a later plan):

| Column        | Contents                                                                            |
| ------------- | ----------------------------------------------------------------------------------- |
| `legacy_kind` | `podcast`, `episode`, `mediaRef`, `playlist`, `user`                                |
| `legacy_id`   | v4 `varchar(14)` or uuid                                                            |
| `v5_kind`     | `channel`, `item`, `clip`, `item_chapter`, `item_soundbite`, `playlist`, `account`  |
| `v5_id_text`  | Nullable until resolved                                                             |
| `resolve_key` | Numeric Podcast Index id, feed URL, `podcastGuid`, episode `guid`, or `mediaUrl`    |
| `status`      | `mapped`, `unresolved`, `dropped`                                                   |

Uses: login migration, web redirects ([11](11-web-api-and-url-cutover.md)),
mobile first-launch remap ([08](08-mobile-first-launch-migration.md)), and
support lookups. Store ids only. Do not store email in this table.

The table lives in the application database. Workers write the rows. The
website reads them from the same database it serves. There is no side
database and no map file.

### Catalog seeding order

1. Collect podcast ids from `subscribedPodcastIds`, `playlists` joins,
   `userQueueItems.episodeId`, `userHistoryItems.episodeId`,
   `userNowPlayingItems.episodeId`, `notifications.podcastId`, and
   `mediaRefs.episodeId`. Hop episode ids through `episodes.podcastId`.
2. Add `feedUrls.url` for those podcasts, plus every
   `addByRSSPodcastFeedUrls` entry (URL only, no catalog row required).
3. Ensure those feeds exist in v5 and queue parse jobs. Do not bulk-copy the
   catalog unless rehearsal shows that is cheaper.
4. Do not copy v4 popularity. v5 range totals start empty and fill from v5
   listen events.
5. Build the legacy map as feeds and items become available. Retry
   `unresolved` rows. A row stays `unresolved` until a finished parse still
   cannot match it. Only then is it marked `dropped`. There is no calendar
   cutoff. A dropped id keeps the friendly not-found page.

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
- A re-derived chapter or soundbite still needs its `mediaRefs.id` in the
  legacy map. Without that row, `/clip/:id` cannot redirect to `/chapter/`
  or `/official-clip/`. See [11](11-web-api-and-url-cutover.md).

## Future plan sets

- Schema and worker commands for the legacy map.
- Parse-queue sizing for the selective seed.
- Redirect handler design for [11](11-web-api-and-url-cutover.md).
