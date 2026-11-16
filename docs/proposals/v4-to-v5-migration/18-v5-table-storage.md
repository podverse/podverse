# 18 — Where the v5 Catalog Bytes Sit

Measured on the local sample rehearsal database on 15 Nov 2026, after migration
`0016` dropped the extra unique-column indexes. 2,006,878 episodes. The database
is **6.12 GiB** (6,574,094,015 bytes).

The notes in this database are still the HTML that rehearsal wrote, and episode
images that repeat the show image are still stored. Sizes below are mebibytes
(1,048,576 bytes). Column sizes are `pg_column_size` sums, which leave out the
row header and the unused space on each page. Those show up as their own row
when they are large enough to matter.

No titles, addresses, or account data are recorded here.

## The database

Six tables are 94% of the database. The rest of the catalog, the queues, and
the legacy id map are under 30 MiB each.

| Table                   | Total MiB | Share | Heap and TOAST | Indexes |
| ----------------------- | --------: | ----: | -------------: | ------: |
| `item_description`      |     2,925 |   47% |          2,839 |      85 |
| `item`                  |     1,681 |   27% |            631 |   1,050 |
| `item_enclosure_source` |       449 |    7% |            362 |      86 |
| `item_about`            |       330 |    5% |            223 |     107 |
| `item_image`            |       300 |    5% |            240 |      60 |
| `item_enclosure`        |       226 |    4% |            140 |      86 |
| `item_transcript`       |       120 |    2% |             99 |      21 |
| `item_season_episode`   |        63 |    1% |             31 |      32 |

`item` is second because of its indexes, not because the episode row is wide.
The enclosure address alone accounts for about 1,111 MiB across three places:
the column on `item` (283 MiB), the btree on that column (544 MiB), and the
same address again on `item_enclosure_source` (284 MiB).

## `item_description`

One row per episode that has show notes (1,991,542 rows). The heap is the note.
The two indexes are the primary key and the unique `item_id`, 43 MiB each.
Episode lists do not read `value`. They read `preview`.

| Piece                         |   MiB | What it is                                                                                                 |
| ----------------------------- | ----: | ---------------------------------------------------------------------------------------------------------- |
| `value`                       | 2,547 | The note, raw. Long notes are compressed in the heap, so the table is smaller than `value` plus `preview`. |
| `preview`                     |   673 | The first 400 characters of that note, stored again as plain text.                                         |
| Primary key and `item_id` key |    85 | Two indexes of integer ids.                                                                                |

## `item`

One row per episode. The columns add up to 533 MiB. The heap is 631 MiB after
row headers and page space. The indexes are 1,050 MiB, which is why the table
is 1,681 MiB.

A btree stores the indexed value plus a pointer to the row. On a long value
the index is larger than the column.

### Columns

| Column                |     MiB | Typical width | Why it is here                                             |
| --------------------- | ------: | ------------: | ---------------------------------------------------------- |
| `guid_enclosure_url`  |     283 |     146 bytes | The media file address. Also the match key for an episode. |
| `title`               |     104 |      53 bytes | The episode title.                                         |
| `guid`                |      78 |      40 bytes | The RSS guid, when the feed has one.                       |
| `id_text`             |      21 |      10 bytes | The public id.                                             |
| `pub_date`            |      15 |       8 bytes | The publish time.                                          |
| `id`                  |       8 |       4 bytes | The integer primary key.                                   |
| `channel_id`          |       8 |       4 bytes | The show this episode belongs to.                          |
| `item_flag_status_id` |       8 |       4 bytes | Active, archived, and the other status flags.              |
| Row headers and pages |      98 |               | 24-byte row header, alignment, and unused page space.      |
| **Heap**              | **631** |               |                                                            |

`slug` and `archived_slimmed_at` are empty on this catalog.

### Indexes

| Index                          |       MiB | What it stores                                                             |
| ------------------------------ | --------: | -------------------------------------------------------------------------- |
| `idx_item_guid_enclosure_url`  |       544 | The whole 146-byte address, once per episode.                              |
| `idx_item_guid`                |       171 | The guid.                                                                  |
| `idx_item_channel_id_pub_date` |       102 | `channel_id`, then `pub_date` descending. Episode lists use this.          |
| `item_id_text_key`             |        85 | Unique `id_text`.                                                          |
| `idx_item_pub_date`            |        47 | `pub_date` alone, for the global recent list.                              |
| `item_pkey`                    |        43 | The integer `id`.                                                          |
| `idx_item_item_flag_status_id` |        32 | The status integer, once per episode.                                      |
| `idx_item_channel_id`          |        26 | `channel_id` alone. The composite index above starts with the same column. |
| **Indexes**                    | **1,050** |                                                                            |

`0017_item_enclosure_url_digest.sql` replaces `idx_item_guid_enclosure_url`
with a btree on a 16-byte md5 of the address. The URL column stays. The sizes
above were measured before that migration.

## `item_enclosure_source`

2,011,631 rows, one media address per enclosure. The address is 284 MiB of the
362 MiB heap. It matches `item.guid_enclosure_url` (283 MiB) for these episodes.
The other columns are the integer ids and a content type that is almost always
empty.

| Piece                        | MiB | What it is                            |
| ---------------------------- | --: | ------------------------------------- |
| `uri`                        | 284 | The media file address.               |
| Other columns and page space |  78 | Ids, content type, row header, pages. |
| Primary key                  |  43 | Integer `id`.                         |
| `item_enclosure_id` index    |  43 | Finds the address for one enclosure.  |

## `item_about`

2,004,352 rows, one per episode. This is duration, explicit, the episode type,
and the episode's website link. The link is the only wide column.

| Piece                            | MiB | What it is                                    |
| -------------------------------- | --: | --------------------------------------------- |
| `website_link_url`               | 126 | The episode link.                             |
| Duration, flags, and ids         |  42 | `duration`, `explicit`, and the integer keys. |
| Row headers and pages            |  55 |                                               |
| Unique `item_id` and primary key |  86 | One index each.                               |
| Episode-type index               |  22 | `item_itunes_episode_type_id`.                |

## `item_image`

1,397,426 rows. An episode can have more than one image. Most of the heap is
the URL.

| Piece                           | MiB | What it is                                       |
| ------------------------------- | --: | ------------------------------------------------ |
| `url`                           | 185 | The image address, 136 bytes on average.         |
| Other columns and pages         |  55 | Width, the resized flag, ids, row header, pages. |
| Primary key and `item_id` index |  60 | 30 MiB each.                                     |

425,417 of these URLs are the same as a show image. Readers already fall back
to the show image. Those rows are about 88 MiB of this table.

## `item_enclosure`

2,011,445 rows, one per media file. The columns are small: the MIME type is
21 MiB, the file length is 12 MiB, and bitrate, height, language, title, and
codecs are under 1 MiB together. The heap is 140 MiB because each row still
has a header and sits on a page. The two indexes are another 86 MiB, 43 MiB
for the primary key and 43 MiB for `item_id`.

## `item_transcript`

553,215 rows. About a quarter of episodes have one. The transcript URL is
69 MiB of the 99 MiB heap. Type, language, and rel are under 10 MiB together.
The primary key is 12 MiB and the `item_id` index is 9 MiB.

## `item_season_episode`

740,684 rows. The columns are a short display string and an episode number.
The heap is 31 MiB and the indexes are 32 MiB: the primary key and the unique
`item_id`, 16 MiB each.
