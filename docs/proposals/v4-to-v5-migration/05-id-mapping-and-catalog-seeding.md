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

The shortest id in each of those tables is 7, except playlists, where it is 8. `nano_id_v2` accepts 7–15 characters, and `generateRandomIdText` stays at 10. The app migration is `0005_v4_rehearsal_schema.sql`. The management
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

After that match, a follow uses the surviving channel when v5 already has an
applied absorb merge for the Podcast Index id
(`channel_merge.from_podcast_index_id`, `status = applied`, `mode = absorb`).
The old public id stays a redirect. A follow written onto the merged-away
channel would stay there, because follows move only while the merge is
applied. A re-point merge leaves the channel id in place, so there is no
second hop.

The selective seed is the subscribed podcasts that are still public and are
not flagged `spam` or `takedown`. `isPublic = false` is how v4 hides a feed
on the Podcast Index dead-feed list, and it is also used for other
non-public podcasts. Those rows stay in the crosswalk report and stay off
the parse queue. A personal subscription to one of them is counted, not
seeded as catalog.

v4 already has one podcast per Podcast Index id and one authority feed URL.
The migration does not run a second duplicate match. After the seed exists,
the normal channel merge moves follows onto a survivor it finds later.

### Launch queue

Before accounts are invited to migrate, queue one slow parse for every
podcast in either set below, when that podcast is still public, is not
flagged `spam` or `takedown`, and has a numeric Podcast Index id:

- Subscribed: at least one v4 account subscribes to it. About 64,000 on
  this snapshot.
- Viewed: it has a `stats_podcast` row with `play_count` above zero and no
  account subscribes to it. 25,041 on this snapshot.

The queue is `rss-slow` (slow priority on `rss-normal`). Operators run it.
A show that already has a local channel is not queued again. The rest of
the v4 catalog stays off this queue. A public show that appears only on a
clip, playlist, history row, queue, or now playing item is parsed later,
when the account that needs it is seeded.

The viewed set exists for signed-out phones, which have no server record in
v4. `stats_podcast` only chooses what to parse. It is not imported, so this
does not copy v4 popularity.

### Legacy podcast lookup

Signed-out phones ([08](08-mobile-first-launch-migration.md)) and old
`/podcast/:id` links ([11](11-web-api-and-url-cutover.md)) resolve v4
podcast ids through one lookup.

- The caller sends v4 podcast ids only, never a feed URL. No sign-in is
  required. The lookup never queues a parse, so no signed-out path adds a
  feed.
- Before go-live, a worker writes one `podcast` legacy map row for every v4
  podcast that is public, is not flagged `spam` or `takedown`, and has a
  numeric Podcast Index id. `resolve_key` is that Podcast Index id. That is
  4,784,967 rows on this snapshot, ids only. An id still resolves after v4
  is shut down, and through a channel added later under the same Podcast
  Index id.
- The answer is the channel, or "not here". An unknown id, an id that is
  not eligible, and a show not yet in v5 all get "not here". None of them
  is an error.
- At most 2,000 ids per request. The largest signed-in subscription list on
  this snapshot is 4,314 podcasts and the next is 1,910. The 99.9th
  percentile is 449.
- Rate limits apply per IP address and per install. The install id is a
  random value the phone keeps. It does not prove a v4 install.

### Feed source

v5 does not record how a feed entered the catalog. The on-demand add route
carries the account id in the queue message only. Add:

- `feed.added_via`, for example `launch_seed`, `account_add`,
  `podcast_index`, or `opml_import`.
- A `feed_add_event` table: `feed_id`, `source`, a nullable `account_id`
  with `ON DELETE SET NULL`, and `created_at`.

This finds every feed one account added that no other account follows, so
those feeds can be removed. When an account is deleted, its feeds stay,
because they are public catalog data, and the link to the account is
erased. Do not store IP addresses, hashed install ids, or other
pseudonymous ids. No signed-out path writes feeds.

When an account adds a show that has a `podcast` legacy map row, the
channel takes the v4 shortid as `id_text`. Old links and phones then
resolve to it.

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
to copy official chapters into `clip`. A user clip is never dropped. Its title,
description, and times are copied even when the episode cannot be found; see
[Episodes that left the feed](#episodes-that-left-the-feed).

v4 `startTime` and `endTime` are integers. v5 `clip.start_time` and `end_time`
are decimals. Copy the integer as a whole number of seconds. v4
`mediaRefs.isPublic` sets the clip's sharable status.

### Episodes that left the feed

v4 does not delete an episode that leaves its feed. The parser sets
`episodes.isPublic = false` and keeps `guid`, `mediaUrl`, `title`, `pubDate`,
and `podcastId`. A feed that caps its item count drops old episodes this way,
so many clips point at hidden episodes. On the rehearsal account most of the
925 clips do.

v5 handles the same case for a live feed. The parser marks an item it no
longer sees `PendingArchive`. The archiver keeps an item as `Archived` while a
clip, a playlist row (on the item or one of its soundbites), or a channel
merge map points at it, and deletes it otherwise. Archiving removes detail
rows but keeps `item_enclosure`, so the clip still plays when the media url
still works. When the episode returns, the parse matches the archived item by
`guid` or `guid_enclosure_url` and makes it Active again. Clip and item detail
pages load Archived items.

The copy gives a v4 clip or playlist member the same result:

1. **Matched.** A local item matches through the episode chain. Attach to it.
2. **Waiting.** The podcast is local or will be seeded, and v4 still lists the
   episode. Attach after the seeded feed's first parse finishes or fails and
   is no longer running.
3. **Archived item.** The podcast is local or will be seeded, but the episode
   is hidden in v4, or that first parse finished or failed without producing
   it. Create an
   `Archived` item on that channel with `id_text` = `episodes.id`, `guid`,
   `guid_enclosure_url` = `formatGuidEnclosureUrl(mediaUrl)`, `title`,
   `pub_date`, and one `item_enclosure` from `mediaUrl`. A later parse that
   sees the episode again reactivates this item. Needs a `guid` or a
   `mediaUrl`, which the item CHECK requires.
4. **Snapshot.** No v5 show will exist (missing, non-public, spam, or
   takedown podcast, or one with no authority URL for the seed to parse), the
   episode row is missing, the episode has neither a `guid` nor a `mediaUrl`,
   its `id_text` is already used by another item, or no local channel exists
   when the copy writes the row.
   Write the clip or playlist row with no item and fill `removed_source`
   (`kind: 'item'`, the v4 episode and podcast titles, and `pubDate`) and
   `source_removed_at`. The owner keeps the clip page, title, times, and
   delete button. Others see that the episode was removed.

A snapshot clip whose podcast is later seeded can be re-attached: match the
legacy map row, set `item_id`, and clear `removed_source`. Do not create an
archived item on a spam or takedown channel.

A playlist member that is another user's clip waits until that account is
copied. At the forced migration every account is copied, and the retry pass
attaches it.

### Migration resilience

The library copy runs once per account and then sets `v4_library_copied_at`.
Anything it cannot finish in that pass is lost unless a later pass picks it
up. Two pieces cover that.

**Migration feed retry.** `v4SeedAccountCatalog` apply writes one
`v4-migration-feed-retry` job (`scheduled_job`, dedupe key
`v4-migration-feed-retry:<feedId>`, 6 attempts) for each show it creates, due
1 hour later, before it queues the first `rss-slow` parse. `scheduledJobsRunDue`
completes the job without parsing when `feed_log.last_finished_parse_time` is
later than the job's `created_at`. Otherwise it force parses, and when no parse
finished it requeues the job 1 hour, 6 hours, 24 hours, 3 days, then 7 days
later. Only feeds the migration created get this schedule. Ordinary feeds keep
their current parse cadence, and every other job type keeps the shared
5-minute exponential backoff.

A feed is settled when `last_finished_parse_time` is set, or its retry job is
`failed` (attempts used up) or `cancelled`. A feed with no retry job is settled
once a parse has finished or failed, so feeds seeded before the retry existed
still settle. `isV4MigrationFeedSettled` and `getV4MigrationFeedSettledByFeedId`
in `@podverse/orm` hold the rule.

Clips and playlist members do not wait for settled. Once the first parse has
finished or failed, they become Archived items, which a later successful
parse makes Active again by `guid` or enclosure. History, queue, and now
playing wait for settled, because those rows are dropped when no Active item
exists and a drop cannot be undone.

**Pending rows.** `legacy_id_map` keeps the id crosswalk; it is unique per v4
id, so it cannot hold one account's history row. The copy records what it
could not finish in `legacy_pending_row` (app migration
`0008_legacy_pending_row.sql`), in the same transaction as the rest of the
copy. A row is unique on `(account_id, row_kind, legacy_id)` and keeps ids and
positions only in `context`.

| `row_kind`                        | `legacy_id`                  | Recorded when                                                                  |
| --------------------------------- | ---------------------------- | ------------------------------------------------------------------------------ |
| `subscription`                    | v4 podcast id                | No local channel: `unresolved` / `waiting_seed`, else `dropped` / `not_seeded` |
| `follow_account`                  | v4 user id                   | The followed account is not copied yet                                         |
| `playlist_clip`                   | `<playlist id>:<mediaRef>`   | Another user's clip whose owner is not copied yet                              |
| `snapshot_clip`                   | v4 mediaRef id               | Written as a snapshot (`resolved` / `snapshot`) or still waiting               |
| `snapshot_playlist_member`        | `<playlist id>:<member>`     | Written as a snapshot (`resolved` / `snapshot`) or still waiting               |
| `history`, `queue`, `now_playing` | mediaRef id, else episode id | No Active item: `unresolved` until the feed is settled, then `dropped`         |

Each playlist member keeps its own `list_position`, including members the copy
could not write, so a replay inserts one at its v4 place. The copy also
upserts `mapped` `legacy_id_map` rows for the podcast, episode, mediaRef,
playlist, and user ids it resolved. The dry run reports a `pending` count per
group.

**Replay pass.** The worker command `v4ReplayLegacyRows` resolves pending rows
when the missing piece appears. An item appears after a parse, the followed
account is copied, or the show is seeded. It reads `unresolved` rows and
`resolved` / `snapshot` rows, least recently tried first, and runs each row in
its own transaction. It reads the v4 episodes and mediaRefs behind those rows
from `V4_DATABASE_URL` (read only) and matches items the same way the copy
does.

| `row_kind`                        | Replay                                                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `follow_account`                  | Inserts the follow once the followed account exists                                                                                  |
| `playlist_clip`                   | Inserts the clip at its recorded slot, or after the last member, once the clip exists                                                |
| `history`, `queue`, `now_playing` | Inserts once the item is Active; one row per item or clip per queue; `dropped` once the feed is settled and still has no Active item |
| `snapshot_clip`                   | Writes a waiting clip once its feed parse finished or failed; reattaches a snapshot once its show is local                           |
| `snapshot_playlist_member`        | Same as `snapshot_clip`, at the member's recorded slot                                                                               |
| `subscription`                    | Left as the copy recorded it                                                                                                         |

A reattached snapshot gets `item_id` (an Archived item when the episode left
the feed) and loses `removed_source` and `source_removed_at`. History is placed
by play time between its neighbors; a second now-playing row goes to the front
of the queue. A row turns `dropped` only when its feed is settled and still
cannot match it, and only for kinds that may drop (history, queue, now
playing). Clips and playlist members are never dropped. `--dry-run` runs each
row and rolls it back. The log is counts per kind and outcome.

The copy does not wait for retries. A user's first sign-in still copies right
away, and the replay pass finishes the rest. During the migration window the
replay runs on the same schedule as `scheduledJobsRunDue`, and once more after
the forced migration.

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

v5 keeps queue, history, and now playing only for Active items.
`pruneNonActiveItemBackedQueueResourceRows` deletes rows whose item, clip
item, or soundbite item is not Active. A playback row whose episode left the
feed (results 3 and 4 above) is therefore **dropped** and counted, not copied
onto an archived item. The clip itself survives through the rules above.

### Durable legacy map

`legacy_id_map` (app migration `0005_v4_rehearsal_schema.sql`). The library
copy writes `mapped` rows for the ids it resolved:

| Column        | Contents                                                                           |
| ------------- | ---------------------------------------------------------------------------------- |
| `legacy_kind` | `podcast`, `episode`, `mediaRef`, `playlist`, `user`                               |
| `legacy_id`   | v4 `varchar(14)` or uuid                                                           |
| `v5_kind`     | `channel`, `item`, `clip`, `item_chapter`, `item_soundbite`, `playlist`, `account` |
| `v5_id_text`  | Nullable until resolved                                                            |
| `resolve_key` | Numeric Podcast Index id, feed URL, `podcastGuid`, episode `guid`, or `mediaUrl`   |
| `status`      | `mapped`, `unresolved`, `dropped`                                                  |

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
3. Ensure the public, non-spam, non-takedown feeds exist in v5 and queue parse
   jobs for the ones that are still unresolved. Attach a follow to the
   surviving channel when an absorb merge is already applied. Do not
   bulk-copy the catalog unless rehearsal shows that is cheaper.
4. Do not copy v4 popularity. v5 range totals start empty and fill from v5
   listen events.
5. Build the legacy map as feeds and items become available. Retry
   `unresolved` rows. A row stays `unresolved` until a finished parse still
   cannot match it. An episode a user clip or playlist member needs then
   becomes an archived item or a snapshot, never `dropped`. Other rows are
   marked `dropped`. There is no calendar cutoff. A dropped id keeps the
   friendly not-found page.

## Honest limits and risks

- On this snapshot, `podcastIndexId` is numeric for every podcast except one
  null. Keep the numeric check anyway. A later copy could contain text.
- Episode `guid` is nullable. Some history and queue rows will drop.
- `liveItems.start` is `timestamptz` while most other v4 timestamps are
  `timestamp without time zone`. Do not mix them in one comparison without a
  cast.
- The launch queue is the subscribed and viewed public shows, about 89,000
  on this snapshot, not the 7.7 million podcasts in v4. Measure how long
  that queue takes in [06](06-database-migration-rehearsal.md).
- `stats_podcast` is Matomo page views from the website, and from the v4 app
  only when tracking was enabled. iOS needed tracking permission. Most
  signed-out app listeners are missing from it. A less common show they
  followed stays "not here" until a member adds it.
- Redirects for unmapped ids should land on a friendly not-found page.
- A re-derived chapter or soundbite still needs its `mediaRefs.id` in the
  legacy map. Without that row, `/clip/:id` cannot redirect to `/chapter/`
  or `/official-clip/`. See [11](11-web-api-and-url-cutover.md).

## Future plan sets

- Schema and worker commands for the legacy map.
- Worker command that queues the subscribed and viewed public shows on
  `rss-slow` at go-live, and a measurement of how long that queue takes.
- Worker command that writes the `podcast` legacy map rows.
- Read-only API route for the [legacy podcast lookup](#legacy-podcast-lookup),
  with its OpenAPI entry and integration tests.
- [Feed source](#feed-source) column and `feed_add_event` table: a linear
  migration, and writers in the parser and the add routes.
- Redirect handler design for [11](11-web-api-and-url-cutover.md).
