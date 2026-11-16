# 17 — Storage: v4 Compared With v5

## Summary

- The v4 prod-copy snapshot is **281.6 GiB**. 263.5 GiB of that is the
  `episodes` table: 195.6 million episodes for 7.7 million podcasts.
- The local v5 database after pilot `20261115T001006Z` is **7.50 GiB**
  (104 accounts, 7,977 shows, 2,425,515 episodes).
- For the **same shows**, v5 uses about **1.6 times** the bytes of v4: about
  3,322 bytes per episode against about 2,040 in v4.
- The whole migrated v5 database should be about **48 GiB** (range 40–56),
  because the migration parses only the shows accounts use, about 62,700, and
  not the 7.7 million v4 podcasts.
- The extra bytes per episode come mostly from indexes (874 bytes per episode
  in v5, about 150 in v4), a stored plain-text preview (351 bytes), the
  enclosure address stored twice (155 bytes), and one row per episode in
  each of about eight side tables.
- Changes that keep every feature would save about **22%** (about 1.7 GiB on
  the pilot, about 10 GiB on the full database). Deriving the preview when it
  is read would bring that to about 31%.

All numbers are counts and byte sizes measured on 2026-11-15. No titles,
addresses, or account data are recorded here.

## Measured

### Whole databases

| Database                                | Size                 | Contents                                         |
| --------------------------------------- | -------------------- | ------------------------------------------------ |
| v4 snapshot                             | 302,394,219,543 B    | 7,709,610 podcasts, 195,634,496 episodes, 22,510 users |
| v4 `episodes` table                     | 282,965,532,672 B    | Heap 205.8 GB, TOAST 48.1 GB, indexes 29.0 GB    |
| v5 `podverse_app` after the pilot       | 8,057,624,255 B      | 7,977 feeds, 2,425,515 items, 104 accounts       |
| v5 `podverse_management`                | 8,787,647 B          |                                                  |
| Pilot run folder (eight phase dumps)    | 4.7 GiB              | Compressed copies of the database above          |

### The same shows in both databases

The pilot's 7,977 shows have 2,515,161 episodes in v4 and 2,425,515 items in
v5. v5 keeps about 96.4% of the v4 episode count. The largest pilot show
has 15,899 episodes in v4 and 8,242 items in v5.

v4 row bytes for those episodes are `sum(pg_column_size(row))`: 4,313,678,835
bytes, or 1,715 per episode. A 0.05% sample of all v4 episodes gives 1,216
row bytes against 1,446 bytes on disk per episode, a factor of 1.19 for pages
and indexes. Applied to the pilot shows, v4 stores about **5.1 GB (4.8 GiB),
about 2,040 bytes per episode**. That is an estimate; v4 has no per-show size.

v5 stores **8.06 GB (7.50 GiB), 3,322 bytes per item**.

#### v4 bytes per episode, same shows

| Column          | Bytes |
| --------------- | ----- |
| `description`   | 943   |
| `mediaUrl`      | 159   |
| `subtitle`      | 143   |
| `imageUrl`      | 108   |
| `linkUrl`       | 61    |
| `transcript`    | 59    |
| `title`         | 54    |
| `guid`          | 40    |
| Everything else | 148   |
| Row total       | 1,715 |
| Pages and indexes (estimated) | about 325 |

#### v5 bytes per item, same shows

| Table                   | Total bytes   | Per item | Heap and TOAST | Indexes |
| ----------------------- | ------------- | -------- | -------------- | ------- |
| `item_description`      | 3,677,421,568 | 1,516    | 3,514,269,696  | 162,422,784 |
| `item`                  | 2,181,070,848 | 899      | 820,494,336    | 1,360,330,752 |
| `item_enclosure_source` | 591,659,008   | 244      | 482,295,808    | 109,207,552 |
| `item_about`            | 456,581,120   | 188      | 265,879,552    | 190,611,456 |
| `item_image`            | 396,722,176   | 164      | 319,234,048    | 77,373,440 |
| `item_enclosure`        | 285,040,640   | 118      | 175,808,512    | 109,158,400 |
| `item_transcript`       | 194,191,360   | 80       | 162,004,992    | 32,120,832 |
| `item_season_episode`   | 99,016,704    | 41       | 39,280,640     | 59,695,104 |
| `item_season`           | 36,798,464    | 15       | 16,384,000     | 20,381,696 |
| Everything else         | 139,122,367   | 57       |                |         |
| **Total**               | 8,057,624,255 | 3,322    |                | about 2.12 GB (874 per item) |

Account data is small next to the catalog. After the pilot, `queue_resource`
is 23.9 MB (79,941 rows), `legacy_id_map` is 20.3 MB (87,515 rows), `clip`
is 0.6 MB, and every playlist table together is under 1 MB.

### Inside the largest tables

- **Descriptions are the same size in both.** The average stored v5
  description is 988 bytes (1,270 raw). v4 is 943 bytes stored for the same
  episodes (1,248 raw).
- **The preview is extra.** `item_description.preview` averages 353 bytes
  and totals 850,720,619 bytes. Only 3,947 previews equal their description.
  v4 has no preview column; it stores `subtitle` (143 bytes per episode),
  which v5 does not keep.
- **Most descriptions are never compressed.** 1,801,598 descriptions are
  between 200 and 2,000 bytes. They total 1,511,808,926 raw bytes and
  1,440,058,691 stored, because PostgreSQL only compresses a row that is
  larger than about 2 KB. A 1% sample of them compresses to 56% with fast
  deflate. Descriptions over 2,000 bytes already compress to 60% (pglz).
- **Show footers repeat.** Of 1,527,099 descriptions over 600 bytes, only
  726,449 have a final 300 characters that differ from every other episode
  of the same show.
- **The enclosure address is stored twice.** `item.guid_enclosure_url`
  (155 bytes on average) equals `item_enclosure_source.uri` for 2,425,472
  items, which is every item that has one.
- **The enclosure address index is the largest index.**
  `idx_item_guid_enclosure_url` is 689 MB, 284 bytes per item, because a
  B-tree holds the whole 155-byte address. Every query that uses it also
  filters by `channel_id`. `idx_item_guid` is another 203 MB.
- **Four indexes repeat another index.** `idx_item_about_item_id`,
  `idx_item_description_item_id`, and `idx_item_season_episode_item_id` each
  repeat that table's unique `item_id` key, and `idx_item_channel_id` is the
  first column of `idx_item_channel_id_pub_date`. Together 160 MB. Smaller
  copies of the same pattern exist on about 25 other tables.
- **One item row per episode is split across many tables.** An item has
  rows in `item`, `item_description`, `item_about`, `item_enclosure`, and
  `item_enclosure_source`, plus `item_image` (71%), `item_transcript`
  (34%), `item_season_episode` (36%), and `item_season` (15%). Each row
  pays a 24-byte header, its own id, an `item_id`, a primary key, and an
  `item_id` index.
- **Item images repeat the show image.** 585,419 of 1,721,917 item images
  (34%) are the show's own image.
- **`item` has dead rows.** 308,670 dead rows against 2,424,973 live
  (12.7%) after the pilot's catalog parses.
- **Old episodes are a third of the catalog.** 855,742 items (35%) are older
  than five years; 372,187 are from the last year. 481 shows have more than
  1,000 items and hold 948,135 items (39%).
- **v5 does not store official chapters as rows.** v4 `mediaRefs` is 3.0 GB
  for 7,292,641 official chapters, 1,128,457 official soundbites, and 12,381
  user clips. v5 keeps the chapters feed address (`item_chapters_feed`,
  23,663 rows) and soundbites (4,402 rows).

## Full migration estimate

The catalog the migration parses is about 62,700 shows:

- 57,173 public subscribed shows with a numeric Podcast Index id
- 5,275 more public shows that appear only on a history row, a queue row, a
  user clip, or a playlist
- 214 viewed shows from [05](05-id-mapping-and-catalog-seeding.md#launch-queue)

A random 4,000 of the subscribed shows average 240 v4 episodes (median 99).
The pilot's shows average 315 (median 122). At 240 episodes per show and
96.4% kept, the catalog is about 14.5 million items.

| Part                         | Estimate      | Basis |
| ---------------------------- | ------------- | ----- |
| Catalog                      | about 45 GiB  | 14.5 million items at the pilot's 3,322 bytes per item |
| Queue and history            | about 0.8 GiB | 2.81 million v4 history and queue rows at the pilot's 298 bytes per `queue_resource` row |
| Episode legacy map           | about 0.5 GiB | Pilot ratio of episode map rows to history rows |
| Podcast legacy map           | 1.5–2.5 GiB   | 7.7 million v4 podcasts, each with a feed address. Not measured yet |
| Clips, playlists, accounts   | under 0.1 GiB | 12,381 user clips, 11,840 playlist members, 22,510 accounts |
| **Total**                    | **about 48 GiB** | Range 40–56, mostly from how many episodes an average show has |

The pilot's per-item size may be high for the full set: pilot shows have
larger v4 rows (1,715 bytes) than the average v4 episode (1,216). The range
covers that.

### If v5 ever holds the whole v4 catalog

v4 keeps 195.6 million episodes in 263.5 GiB. At v5's current layout, about
2,570 bytes per average episode (874 of indexes plus a smaller heap for
smaller rows), the same catalog would be about **470 GiB**, against v4's
263.5. Nothing plans that today. It is the number to check before a plan
parses the whole Podcast Index catalog.

## What explains the difference

Per episode, v5 uses about 1,280 more bytes than v4 for the same shows:

| Cause                                         | Bytes per item |
| --------------------------------------------- | -------------- |
| More and wider indexes                        | about +725     |
| Stored preview, less v4 `subtitle`            | about +210     |
| Enclosure address on `item` and on the source | about +155     |
| Row header, id, and `item_id` on side tables  | about +200     |
| Dead `item` rows                              | about +40      |
| Columns v4 has that v5 does not keep          | about −50      |

The indexes are the largest part. v4 has six indexes on one wide table. v5
has primary keys and `item_id` indexes on every side table, the full-address
B-tree, and the duplicated indexes above.

The split into side tables is deliberate: an episode list does not read
description text, and an archived episode can be slimmed one table at a
time ([archived slimming](/packages/orm/src/services/archivedSlimming.ts)).
The cost is the per-row overhead, not the split itself.

## Opportunities that keep every feature

Savings are measured on the pilot database and scaled to the full estimate.

| Change | Pilot saving | Full saving | Notes |
| ------ | ------------ | ----------- | ----- |
| Hash index on `guid_enclosure_url` instead of the B-tree | about 630 MB | about 3.6 GiB | Every lookup is equality inside one channel. A hash index stores a 4-byte hash per row. |
| Hash index on `guid` | about 140 MB | about 0.8 GiB | Same reason. `guid` is not unique, so no unique constraint is lost. |
| Drop the four duplicate indexes | 160 MB | about 0.9 GiB | The unique keys already serve those lookups. |
| Compress descriptions between about 200 and 2,000 bytes | about 500 MB | about 2.9 GiB | Lower `toast_tuple_target` on `item_description` and set lz4. Measured 56% with deflate; lz4 is expected near 65%. |
| Leave `item_image` empty when it is the show image | about 135 MB | about 0.8 GiB | Readers already fall back to the show image. |
| Store no preview when the description is short | about 100 MB | about 0.6 GiB | `getDescriptionPreviewText` already derives one from the description when the preview is null. |
| Fillfactor and autovacuum on `item` | about 100 MB | about 0.6 GiB | Fewer dead rows from parse updates. |
| **Total** | **about 1.7 GiB (22%)** | **about 10 GiB** | Full database about 38 GiB |

Each change needs a linear migration and the regenerated baseline. The
index changes also need a check that each query plan still uses an index.

### Larger changes, still without losing a feature

- **Derive every preview when it is read.** Saves 850 MB on the pilot
  (about 5 GiB full). Episode lists would then read the description text,
  which is more I/O per list. Worth measuring list latency first.
- **Move one-row side tables onto `item`.** `item_about` and
  `item_season_episode` always have at most one row per item. Folding them
  in saves the header, id, primary key, and `item_id` index: about 300 MB on
  the pilot. It touches every reader, so it is not cheap.
- **Store one enclosure address.** Keep it on `item_enclosure_source` and
  match on that, or keep a 16-byte digest on `item`. Saves about 375 MB of
  heap on the pilot. The parser, the add-by-RSS match, and the channel merge
  read `item.guid_enclosure_url` today.

## Different ways to provide the same thing

These trade some behavior for space. None is decided.

- **Show footers once.** Store the repeated tail of a show's descriptions on
  the show and keep only the episode's own text. About half of long
  descriptions repeat a show footer. This changes how a Summary is rebuilt
  and how search sees it.
- **Slim old episodes.** Keep title, dates, enclosure, and preview for
  episodes older than a few years, and drop the full description, as
  archived slimming already does for archived episodes. 35% of items are
  older than five years. The full description of an old episode would no
  longer be shown.
- **Keep the podcast legacy map outside the main tables.** The lookup only
  needs a numeric Podcast Index id and a feed address for 7.7 million v4
  ids, most of which v5 never parses. A narrow table keyed by integer, or
  a static file served by the API, is smaller than general `legacy_id_map`
  rows with text ids. Measure the map after `v4WriteLegacyPodcastMap
  -dryRun` before deciding.
