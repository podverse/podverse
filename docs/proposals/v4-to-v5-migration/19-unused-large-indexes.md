# 19 — Large Indexes the Application Queries Do Not Use

Checked on the local sample rehearsal database on 15 Nov 2026, against the
query shapes in `packages/orm`. Sizes are mebibytes. `idx_scan` is how many
times this database has used the index since stats were last reset. The
rehearsal parsed the catalog and copied libraries. It did not open the recent
lists.

One non-unique index over 8 MiB is unused by application queries. Keep
`idx_item_pub_date`. The other large `item` indexes are used: the enclosure
address, the guid, `id_text`, the primary key, `channel_id`,
`(channel_id, pub_date)`, and `item_flag_status_id` (for the archived status,
which is 2,526 rows).

| Index                                        | Table        |   Size | Scans | Action                        |
| -------------------------------------------- | ------------ | -----: | ----: | ----------------------------- |
| `idx_item_pub_date`                          | `item`       | 47 MiB |     0 | Keep                          |
| `idx_item_about_item_itunes_episode_type_id` | `item_about` | 22 MiB |     0 | Unused by application queries |

## `idx_item_pub_date` — keep

`CREATE INDEX idx_item_pub_date ON item USING btree (pub_date)`.

Global recent lists display episodes sorted by `pub_date` descending. That
is the query this index is for. Those queries also require `live_item` to be
absent and `item_flag_status_id` to be Active (`ItemService.getMany`,
`apps/api/src/controllers/item.ts`).

TypeORM writes the missing-live-item check as a left join and
`live_item.id IS NULL`. On this catalog the planner sequential-scans `item`
for that shape, then sorts. It estimates the join returns one row, so this
rehearsal never opened the index. That plan is a misestimate, not a reason
to drop the index. The same list written as `NOT EXISTS` on `live_item` uses
`idx_item_pub_date` (an index scan backward). Dropping it would leave the
global sort with no index once that estimate is corrected, or once the query
is written as `NOT EXISTS`.

Channel episode lists filter `channel_id` and use `idx_item_channel_id` or
`idx_item_channel_id_pub_date`. They are a different query.

## `idx_item_about_item_itunes_episode_type_id`

`CREATE INDEX idx_item_about_item_itunes_episode_type_id ON item_about USING btree (item_itunes_episode_type_id)`.

22 MiB. The column is a foreign key to three rows: full, trailer, and bonus.
On this catalog, 1,971,030 about rows are full, 27,821 are bonus, and 5,501
are trailer.

Nothing in the application filters on `item_itunes_episode_type_id`. Episode
lists join the other way, from `item_about` to `item_itunes_episode_type`,
which uses that table's primary key. A filter for the common value (full)
is a sequential scan. A filter for trailer or bonus would use this index,
and no route does that.

The index would also be used to find referencing rows if an episode-type row
were deleted. The application does not delete those rows.
