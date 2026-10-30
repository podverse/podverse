# Popularity and Taste Profile

The stats system records a Premium member's listens to build that member's Taste Profile and to
count toward public popularity sorts. The opt-in that allows it is called Taste Profile; the
account's decision is its Taste Profile consent, and the document it agrees to is the Taste
Profile agreement. This document fixes what the system stores, how long each store lives, and the
rules every writer and reader follows. Code comments point here.

## Design Questions, Answered

- **Why not one aggregate row per listener and entity?** A single row per pseudonymous id and
  entity cannot tell a relisten from a first listen, holds no listening time or completion, and
  keeps nothing per listener that lasts. Rolling counters refreshed for a top slice of entities
  leave everything else stale. Rotating the pseudonymous id adds no privacy when events also carry
  a stable mapping id, and it lets the same account count again after each rotation.
- **What is the better practice?** Three stores, each with its own lifetime: raw listen events
  linked to a pseudonymous listener id and kept for the retention setting; per-listener, per-show
  taste profiles with decaying recent and long-term scores; and anonymous daily totals kept
  forever. Range sorts read a small derived table rebuilt from recent events and the daily totals.
- **Can it support recommendations?** Yes. Taste profiles are the input for a show-to-show "also
  listened" job; the retained raw events allow re-deriving or tuning scores; daily totals keep
  popularity history without listener links.
- **Is the privacy layer good enough?** Yes, as a layer, not as anonymity. Every linked row stores
  only a random listener id. The account-to-listener mapping lives in one table, in its own
  schema, that only account-facing ORM code reads. The read-only database role has no access to
  that schema, and the management database browser does not list it. Anyone with the read-write credentials can still
  join it, which is why copy never calls the id anonymous.
- **How fast do rows grow?** Raw events are bounded by retention and dropped by whole month. Taste
  rows grow with listeners × shows, not with time. Daily totals grow with active entities × days;
  at about 35,000 active entities a day and roughly 80 bytes per row with its index, that is about
  1 GB a year. Folding old days into monthly rows is an option for later.
- **Ship before launch?** Yes. Nothing is imported from v4.
- **Not built yet:** "Listeners Also Like" on a show page. The similarity table that page would
  read is filled by the recommendations job below. Recommendations itself is the For You list.

## Stores and Lifetimes

| Store                  | Linked to a listener?              | Kept for                             | Grows with                         |
| ---------------------- | ---------------------------------- | ------------------------------------ | ---------------------------------- |
| Listen and open events | Yes, by a pseudonymous listener id | The retention setting                | Time; old data dropped by month    |
| Taste profile          | Yes                                | Until opt-out or account deletion    | Listeners × shows they played      |
| Recommendations        | Yes                                | Until opt-out or account deletion    | Listeners × discovered shows       |
| Show similarity        | No                                 | Rebuilt by the recommendations job   | Shows × their nearest neighbors    |
| Daily totals           | No                                 | Forever                              | Active entities × days             |
| Range totals           | No                                 | Rebuilt from events and daily totals | Entities with any counted activity |

## Tables

All time columns are `timestamp with time zone`. Every table is in `public` except the mapping.

- **`listener_identity.stats_listener`** maps an account to its listener id: `listener_id`
  (random v4 uuid, primary key), `account_id` (unique, cascades from `account`), `created_at`, and
  the opt-out-day carry: `opt_out_day` (the UTC date of the listener's last opt-out that deleted
  stored listens), `opt_out_day_stored_count` (how many listens stored that day the opt-out
  deleted; the stored daily cap adds them for the rest of the day), and
  `opt_out_day_first_stored_at` (when the first of them was stored). The id never rotates and
  disappears only when the account is deleted; an opt-out keeps it. Only
  `podverse_app_read_write` has `USAGE` on the `listener_identity` schema and privileges on the
  table; `podverse_app_read` has neither. Grants and default privileges on `public` never reach
  this schema, so bootstrap re-grants and baseline loads cannot widen access to it.
- **`stats_listen_event`** has one row per stored listen: `id`, `created_at`, `listener_id`,
  `channel_id` (the item's channel), `item_id` (for a clip, the clip's item), `clip_id` (clip
  listens only), `client_listen_id` (device-generated, so a retry or a later completion report
  finds the same row), `seconds_heard`, `completed`, `popularity_counted` (false for a trial
  listen, a listen past the daily popularity cap, a flagged listener, or the opt-out cooldown;
  those still feed taste rows and add nothing to daily or range totals), and
  `item_all_time_counted`, `channel_all_time_counted`, and
  `clip_all_time_counted` (true when this listen started the listener's all-time period for that
  entity; see [Daily Totals Are Filled at Write Time](#daily-totals-are-filled-at-write-time)).
  The primary key is `(created_at, id)`.
  Add by RSS listens are never stored: they have no item row.
- **`stats_open_event`** has one row per profile or playlist open: `id`, `created_at`,
  `listener_id`, exactly one of `account_id` (the profile opened) or `playlist_id`,
  `popularity_counted` (false for an open stored while its opener was flagged, which adds nothing
  to daily or range totals), and `all_time_counted` (true when this open started the opener's
  all-time period for the profile or playlist). Opens count toward popularity and never feed
  taste profiles.
- **`stats_flagged_listener`** has one row per flagged listener: `id` (integer, for the
  management audit log), `listener_id` (unique), `reason` (`stored_cap_reached` or
  `too_soon_minutes`), `flagged_at`, `times_flagged`, `cleared_at`, and `cleared_by_admin_id` (a
  management-database admin id, so it has no foreign key; set exactly when `cleared_at` is). While
  `cleared_at` is null, the listener is left out of popularity; see
  [Flagged Listeners](#flagged-listeners).
- **`stats_flag_signal`** has one row per listener with a too-soon run: `listener_id` (primary
  key), `too_soon_minutes` (the length of the listener's latest run of minutes in which a new
  listen answered `too_soon`), and `last_too_soon_minute` (the run's last minute).
- **`stats_taste_profile`** has one row per listener and show: `listen_count`,
  `completion_count`, `first_listened_at`, `last_listened_at`, `recent_score`,
  `long_term_score`, `scores_updated_at` (the time both scores were last faded to),
  `weight_override` (a manual recommendation weight from 1 to 5, null until the listener applies
  one), and `weight_override_at` (set together with the override).
- **`stats_taste_profile_hidden`** is Hidden From Taste Profile: `listener_id`, `channel_id`,
  `hidden_at`.
- **`stats_show_similarity`** is global, not listener-linked: `channel_id`, `other_channel_id`,
  `score` (0 to 1), `computed_at`. One row per ordered neighbor pair, at most 50 neighbors per
  show.
- **`stats_show_similarity_state`** stamps `computed_at` per show, including a show with no
  neighbors, so the nightly job does not rebuild it until its taste weights change.
- **`stats_recommendation`** is one discovered show per listener: `listener_id`, `channel_id`,
  `score`, `strength` (1 to 5), `computed_at`. Shows already in that listener's Taste Profile or
  Hidden From Taste Profile are not stored. Subscriptions are left out when the list is read.
- **`stats_recommendation_state`** stamps `computed_at` per listener, including a listener with
  no discoveries, so the nightly job skips them until their taste rows change.
- **`stats_daily_{channel,item,clip,playlist,account}`** hold anonymous daily totals:
  `<type>_id`, `day` (UTC date of the counted events' `created_at`), `listener_count`,
  `all_time_listener_count` (listeners who added to the all-time total that day; never above
  `listener_count`), and, on the channel, item, and clip tables, `completion_count`. The primary
  key is `(<type>_id, day)`.
- **`stats_popularity_{channel,item,clip,playlist,account}`** hold range totals: `<type>_id`,
  `day_count`, `week_count`, `month_count`, and `all_time_count`, each with a descending index
  for sorts.

Every entity column cascades from its entity, and every listener-linked row cascades from
`listener_identity.stats_listener`. Event ids come from a sequence default rather than an identity column, so rows
can move between partitions with their ids intact.

### Taste Profile Rows Are Shows

Taste profile rows exist for shows only: a podcast or album is the item's channel, and an artist
is a `publisher-music` channel. Episodes and tracks never get rows. A music listen updates the
album's row and, when the album's `channel_publisher_remote_item.feed_guid` matches a channel's
`podcast_guid`, that artist channel's row too. The write path owns the decay formula and
half-lives; readers fade a stored score to "now" with the same formula before comparing.

## Listener Id and Its Separation

- One `listener_identity.stats_listener` row exists per account from its first counted listen or
  open until the account is deleted. The write path creates it then, not at opt-in.
- Only ORM services under `packages/orm/src/services/stats/listenerIdentity/` (the listener
  identity zone) read or write `listener_identity.stats_listener`. `StatsListenerService`, which maps an account to
  its listener id, stays inside the zone and is not exported from `@podverse/orm`. The zone
  services the ORM index does export take an `account_id` and never return a `listener_id`.
- Everything else — workers, the management API, popularity readers, the range-totals job, and
  recommendation jobs — works from `listener_id` values already stored in event and taste rows and
  never joins the mapping. A lint rule and a source guard test enforce this.
- An opt-out deletes the listener's listen events, open events, taste rows, and hidden rows by
  name, keeps the listener row, and writes the day's stored count onto it. Daily totals and
  all-time counts have no listener column and stay. Day, week, and month counts come from events,
  so a listener whose events are deleted leaves them at the next refresh.
- Flag and too-soon signal rows (`stats_flagged_listener`, `stats_flag_signal`) are kept by
  listener id. An opt-out keeps the listener row, so they survive it and a new Yes; deleting the
  account removes them by cascade.
- Tracking that stops without the listener choosing it (membership lapse, a new explanation
  version waiting) deletes nothing; the write path stops writing.

### Schema Ownership

`listener_identity` is created with the app schema. The app migrator role applies that schema
and needs `CREATE` on the app database. DB bootstrap grants it.

## Daily Totals Are Filled at Write Time

- The listen and open write paths update daily totals in the same transaction that inserts the
  event. No job builds daily totals from events.
- Creating the listener row takes
  `SELECT pg_advisory_xact_lock(hashtextextended('popularity_listen_account:' || $account_id::text, 0))`
  first. Concurrent first writes of one account insert the same unique key, and Postgres can
  deadlock those inserts. The lock is held until the transaction ends and is taken before the
  per-listener lock. `getOrCreateListenerId` runs it.
- Once the listener id is known, and before it reads any of the listener's events, the
  transaction takes
  `SELECT pg_advisory_xact_lock(hashtextextended('popularity_listen:' || $listener_id::text, 0))`,
  so one listener's writes are serialized and the first-of-day checks cannot race. Every writer of
  a listener's events or daily rows takes this same lock; `lockListener` in the listener identity
  zone runs it.
- The channel merge writes daily rows under row locks instead of the per-listener lock; see
  [Merge Locks](#merge-locks).
- Server receive time (`created_at`) is the only clock. The day is the UTC date of the event's
  `created_at`. Reports carry no device time, so a report sent late (for example after offline
  time) counts on the day it arrives.
- **Listeners:** only popularity-counted listens add to daily rows. Before inserting one, the
  write path checks whether the listener already has a popularity-counted listen event that UTC
  day for the same item; likewise for the channel and, for clip listens, the clip (one query on
  `stats_listen_event_listener_created_idx`). For each entity where it is the first, it upserts
  the daily row with `listener_count + 1`:
  `INSERT … VALUES (…, 1, 0) ON CONFLICT (<type>_id, day) DO UPDATE SET listener_count = <table>.listener_count + EXCLUDED.listener_count, completion_count = <table>.completion_count + EXCLUDED.completion_count`.
- **Completions:** when a popularity-counted listen is stored completed, or an existing
  popularity-counted row turns from not completed to completed, `completion_count` goes up by 1
  for each of its entities on the event's own day, unless the listener already has a completed
  popularity-counted listen of that entity that day.
- **All-time listeners:** a popularity-counted listen adds to an entity's all-time total when the
  listener has no listen of that entity marked as counted toward all-time in the last
  `STATS_ALL_TIME_RECOUNT_DAYS` days (default 90). Before inserting the listen, the write path
  reads those marks for the item, the channel, and (clip listens) the clip in one query on
  `stats_listen_event_listener_created_idx` over the last N days. For each entity without one, it
  sets that entity's mark on the new event and adds `all_time_listener_count + 1` to the day's
  row. A mark starts an N-day period in which the listener adds nothing more to that entity's
  all-time total; the first popularity-counted listen after it ends counts again. The read runs
  even when the entity was already listened to today, since an earlier listen today may have been
  inside the period that just ended. Trial listens, listens past the popularity cap, a flagged
  listener's listens, and listens stored during the
  [opt-out cooldown](#popularity-cooldown-after-an-opt-out) are not popularity-counted, so they
  are never marked. A completion never adds to an all-time total.
- **Opens:** same lock, a first-of-day check on `stats_open_event`, and `listener_count + 1` on
  `stats_daily_playlist` or `stats_daily_account`. A counted open from an unflagged opener also
  adds `all_time_listener_count + 1` and sets `all_time_counted` on the event when the opener has
  no open of that profile or playlist marked `all_time_counted` in the last N days.
- The API does not start when `STATS_ALL_TIME_RECOUNT_DAYS` is greater than
  `STATS_TRACK_EVENT_RETENTION_DAYS`: the period is read from marks on stored events, so the mark
  that started it must still be stored when the period ends.
- Totals only go up, with one exception. Opt-out, hiding a show, retention drops, and event
  updates never subtract. Deleting an item, clip, channel, playlist, or account removes its own
  daily rows by cascade.
- The exception is the channel merge; see [Channel Merge](#channel-merge).
- Listens to a hidden show still count; hiding affects only taste rows.

## Range Totals Are Rebuilt by a Job

- A job rebuilds `stats_popularity_*` from the event and daily tables. A window of `N` days covers
  events from UTC midnight of `(current UTC date - N)` up to the end of the current UTC date,
  which always spans at least the last `N × 24` hours. The lookbacks live in
  `STATS_POPULARITY_RANGE_LOOKBACK_DAYS` in `@podverse/helpers`: day 1, week 7, month 30.
- Each window count is the number of distinct listeners with a counted event in the window:
  `stats_listen_event` for channels, items, and clips, and distinct openers in
  `stats_open_event` for playlists and profiles. A listener who returns on three days counts once
  in the week.
- A window counts an event only when it is `popularity_counted` (which leaves out trial listens,
  listens past the popularity cap, everything stored while the listener was flagged, and listens
  stored during the [opt-out cooldown](#popularity-cooldown-after-an-opt-out)) and its listener
  has no
  `stats_flagged_listener` row with `cleared_at` null (which leaves out the listener's events from
  before the flag too, for as long as the flag stands).
- `all_time_count` is the sum of `all_time_listener_count` over every daily row, so each listener
  adds to it at most once per `STATS_ALL_TIME_RECOUNT_DAYS`. Setting or clearing a flag does not
  change it.
- The month window reads events, so retention has to cover it: the workers refuse a
  `STATS_TRACK_EVENT_RETENTION_DAYS` below 31.
- An hourly run refreshes every entity with a counted event inside the month window or a daily
  row on today or yesterday, and resets to zero the windows of any popularity row with no counted
  event in it; a nightly full run recomputes every entity. Details and schedules are in
  [Range Totals](#range-totals).

## Public range sorts

Top lists for channels, items and live items, clips, playlists, and profiles read the
`stats_popularity_*` table for their type through `StatsPopularity<Type>Service`.

- `range` maps to a column through `STATS_POPULARITY_COUNT_FIELDS`; ties order by the entity id.
- The refresh job resets a window to zero rather than deleting the row, so zero counts are common.
  Readers that exclude zeros filter them; the table does not.
- Directory Top lists include only entities whose count for the chosen range is above zero. They
  are global and category Top for channels, items, and clips, public playlists Top, and public
  profiles Top. A range with no count above zero returns an empty list, and a short page is not
  padded. Recent is a separate sort the listener picks; these lists never fall back to it.
- Global and category live-item Top, subscribed Top for channels, items, and live items, and the
  Top sort on a channel's episode list pad a short page with recent entities from the same scope
  (`fillTopPage` in `@podverse/helpers`). They fall back to recent entities when nothing in scope
  is above zero, so those pages include rows whose count for the range is zero.
- Subscribed clip and profile Top, the account's own and followed playlists Top, and a channel's or
  episode's clip Top list every row in scope, zero counts included, and do not pad.
- Requests never sum daily rows; freshness follows the refresh job's schedule.

## Channel Merge

When a duplicate channel is absorbed into a survivor (`verifyAndApplyDuplicateMerges`), its
popularity data moves to the survivor in the merge transaction. A repoint merge keeps one channel
and changes no ids, so it moves nothing.

| Data                                | What happens                                                                                                  | Journaled |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------- |
| `stats_daily_channel`               | Added into the survivor's rows per day                                                                        | Yes       |
| `stats_daily_item`                  | Same, per matched item pair                                                                                   | Yes       |
| `stats_popularity_channel`, `_item` | The old copy's rows are deleted                                                                               | Yes       |
| `stats_listen_event`                | Events of matched items move to the survivor item; every old-channel event counts toward the survivor channel | No        |
| `stats_taste_profile`               | Merged into the survivor's rows                                                                               | No        |
| `stats_taste_profile_hidden`        | Moved to the survivor                                                                                         | No        |

Events of unmatched old items keep their item and count toward the survivor channel, so the
survivor's day, week, and month counts include every listener of the old copy. A later completion
of such an event adds to the survivor channel's daily row and taste rows, the same rows the merge
moved the old channel's totals and taste into; the item's own daily rows stay on the old item.
Clip daily and range rows need nothing: clips keep their ids when they move to the survivor item.
Open events, playlist and profile totals are not channel data.

### Merged Daily Totals

- Each old daily row is added into the survivor's row for the same `day`, or moved when the
  survivor has none, and then deleted.
- For days on or after the current UTC date minus `STATS_TRACK_EVENT_RETENTION_DAYS`, listeners
  with popularity-counted listen events on both copies that UTC day are counted once, and so are
  listeners with a completed popularity-counted event on both. Events past the popularity cap
  never reached the daily rows, so they are not subtracted. Older days are summed without a
  check, since their events are gone.
- The merged count never goes below either copy, and completions never exceed listeners.
- `all_time_listener_count` is added and capped at the merged `listener_count`. There is no
  all-time overlap check, so a listener who added to both copies' all-time totals inside one
  recount period stays counted twice; the cap removes the same-day case. Events keep their marks
  when they move, so the survivor's next periods start from the merged history.
- Listeners who opted out after listening have no events left, so they may still count on both
  copies. The merge only subtracts listeners whose events on both copies are still stored, so
  it never undercounts.
- The channel's overlap is read before any item's events move. Matched item pairs follow in
  `item_merge_map` order, each read before its own events move, so several old items matched
  to one survivor item are each checked against everything merged before them. The old channel's
  remaining events move to the survivor channel after the last pair, when every overlap read has
  already run.

### Merged Range Totals

The old copy's `stats_popularity_channel` and `stats_popularity_item` rows are deleted, which
takes it out of every range sort at once. The merge never writes the survivor's range rows. The
[range-totals job](#range-totals) rebuilds them: the day, week, and month windows follow the moved
events within the hour, and the all-time total follows the merged daily rows within the hour or at
the nightly full run.

### Merge Journal and Revert

Daily rows and the deleted range rows are journaled in `channel_merge_journal`, so a revert
restores the exact pre-merge rows. A row recreated since the merge (a listen to an unmatched old
item, or a refresh writing the old copy's range row) is overwritten with the pre-merge image.

Listen events, taste rows, and hidden rows move without a journal and stay on the survivor after
a revert. The journal is kept indefinitely, so journaling them would keep listening history past
retention and past an opt-out. After a revert, the old channel's listeners rebuild its taste rows
as they listen. Its day, week, and month counts start again from new listens, since its events
stay on the survivor, while its all-time total comes back from the restored daily rows.

### Merged Taste and Hidden Rows

- **Hidden wins:** a listener who hid either copy has the survivor hidden, and both taste rows
  are deleted.
- Otherwise two taste rows for one listener become one on the survivor. Counts are added,
  `first_listened_at` is the earlier and `last_listened_at` the later. Each score fades to the
  later `scores_updated_at` with the [taste half-lives](#taste-rows) and the two are added.
- An old-copy row with no survivor row moves to the survivor unchanged.

### Merge Locks

The merge runs in one read-write transaction. It takes row locks instead of the per-listener lock,
because one merge can cover more listeners than one transaction should hold advisory locks for.
In order:

1. `SELECT pg_advisory_xact_lock(hashtextextended('popularity_refresh:channel', 0))`, then the
   same with `'popularity_refresh:item'`. The range-totals job takes these per-type locks, so a
   refresh never writes an old copy's range row between the merge's delete and its commit. The
   job holds one type's lock at a time and takes no daily-row locks, so the two never wait on
   each other in a cycle.
1. `FOR UPDATE` on the old channel's listen events and any matched old item's events, then on
   both copies' item daily rows, then on both channels' daily rows. This follows the
   [write order](#write-order), so a completion report on one of those events waits at its event
   row while holding nothing the merge needs.
1. Before the taste steps, `FOR UPDATE` on the old channel's taste rows and on the survivor rows
   of the same listeners and of listeners who hid the old channel, not on every survivor row.

Every overlap read runs after the daily-row locks, so the merge subtracts only listeners already
in both summed rows. A listen that races the merge can leave one duplicate count but never removes
a real listener. A first-of-day survivor row created after the locks makes the merge's insert
fail with a unique violation; the merge rolls back, stays `verified`, and is retried on the next
run.

## Partitions and Retention

- `stats_listen_event` and `stats_open_event` are partitioned by range on `created_at`. Events
  land in monthly partitions named `<parent>_pYYYYMM`, created ahead of time by a job (see
  [Partitions and Retention Job](#partitions-and-retention-job)). The
  default partitions (`stats_listen_event_default`, `stats_open_event_default`) are a safety net
  that stays empty while the job runs.
- Retention removes whole partitions. The app addresses partitions only through the parent table.

### Partition Functions

Both functions are `SECURITY DEFINER`, owned by the table owner, and executable only by
`podverse_app_read_write`, so workers create and drop partitions without owning the tables or
needing another role. Both accept only `stats_listen_event` and `stats_open_event` and raise for
any other table.

- **`stats_event_ensure_month_partition(parent_table, month_start)`** returns `true` when it
  creates `<parent>_pYYYYMM` and `false` when the partition already exists. `month_start` must be
  the first of a month. Bounds are UTC midnight of that month and the next. It locks the parent,
  which also locks every partition, so concurrent inserts wait. When the default partition already
  holds rows for that month, it detaches the default, creates the month partition, moves those
  rows into it with their ids, and reattaches the default; no row is lost.
- **`stats_event_drop_month_partitions_before(parent_table, cutoff)`** drops every
  `<parent>_pYYYYMM` partition whose upper bound is on or before `cutoff` (UTC midnight), deletes
  rows older than `cutoff` from the default partition, and returns how many partitions it
  dropped. A partition whose range reaches past `cutoff` is never touched, so a cutoff inside a
  month needs a separate row delete for that month.

## Cost and Growth

- Listen events cost about 140 bytes a row with indexes. At 10,000 listeners and 10 listens a day
  each, that is about 14 MB a day, or about 1.3 GB at 90 days of retention.
- Taste rows grow with listeners × shows played, not with time.
- Daily totals grow with active entities × days: about 1 GB a year at 35,000 active entities a
  day.
- Each popularity-counted listen reads the listener's events from the last
  `STATS_ALL_TIME_RECOUNT_DAYS` days for the all-time check. That is at most N ×
  `STATS_LISTEN_DAILY_STORED_CAP` rows, and far fewer for real listeners.
- Range totals hold one row per entity with any counted activity.
- Each hourly refresh reads one month of events once per type: three times for listens (channel,
  item, clip) and twice for opens (playlist, profile). At 10,000 listeners and 10 listens a day
  that is about 3 million rows per listen pass. The primary key `(created_at, id)` serves the
  time range.

## Write Path and Counted-Listen Rule

`StatsListenWriteService` and `StatsOpenWriteService` record reports. They live in the listener
identity zone, take an `account_id`, run each report in one read-write transaction, and return a
result such as `counted` or `below_threshold`, never a listener id.

### Consent Under a Row Lock

Each report first reads the account's decision from `account_settings` `FOR SHARE` and returns
`not_allowed` unless it accepted the current explanation version. Opting out updates that row and
deletes the listener's listening data (not the listener row) in the same transaction, so a report
that started before an opt-out cannot keep data afterwards.

### What Counts as a Listen

- A listen counts once 60 seconds or 25% of it has been heard, whichever comes first. Seconds are
  media seconds actually played, not wall-clock time or seek distance. An unknown duration uses
  the 60-second rule. Every surface uses the same rule: `popularityListen` in `@podverse/helpers`.
- A clip listen measures against the clip's span, or from its start to the end of the episode
  when it has no end time. A clip whose episode was removed is not counted.
- `seconds_heard` is stored in whole seconds, at most the duration rounded up.

### One Report per Listening Session

- The device generates a `client_listen_id` for each listening session and sends it with every
  report for that session. The first report that meets the rule stores the event. Later reports
  for the same session raise `seconds_heard` and mark it finished; they never lower either, never
  count the listen twice, and skip the rule, the minimum interval, and the daily caps.
- A session is matched among the listener's events stored in the last seven days, by receive
  time. A session first stored earlier than that is a new listen.
- A report that does not meet the rule and matches no stored session stores nothing. It does not
  create a listener id either: one is created only for a report that stores an event.

### One Clock

Server receive time is the only clock; reports carry no device time. The transaction's `now()`
becomes the event's `created_at`. Its UTC date is the daily-total day, it fills the taste rows'
`first_listened_at` and `last_listened_at`, and it is the time taste scores fade to. A report sent
after offline time counts, and decays, from when it arrives. A completion reported later counts on
the UTC day of the event it completes.

### Minimum Interval

- A new session is stored only when the listener has no stored listen event created in the last
  `STATS_LISTEN_MIN_INTERVAL_SECONDS` (a server setting, default 20) of server time. Otherwise it
  returns `too_soon` and stores nothing: no event, no daily row, no taste row, and no new listener
  id. The device's reported seconds cannot get around it.
- It counts every stored listen event of the listener, whatever that event fed. The account's
  last opt-out time (`listen_stats_opted_out_at`) counts as a stored listen too, so a new listen
  right after an opt-out returns `too_soon` without creating a listener id.
- It runs under the per-listener lock, so concurrent new sessions from one listener store one
  event inside the interval. The check has no upper bound on `created_at`, so an event stored by
  a transaction that held the lock still blocks one whose `now()` is a moment earlier.
- `0` turns it off (local development and tests).
- A `too_soon` session has no stored event, so a later report of the same `client_listen_id` (at
  60 seconds, on completion, or on pause or end) is a new listen and is stored once the interval
  has passed. That is how a real listen that arrived too soon still counts.
- `too_soon` is a 200, and clients treat it as done: they do not retry it.

### Daily Caps

Two server settings cap one listener's new listens per UTC day:

- `STATS_LISTEN_DAILY_STORED_CAP` (default 300) caps stored listens. A new session past it
  returns `daily_cap_reached` and stores nothing: no event, no daily row, no taste row.
- `STATS_LISTEN_DAILY_POPULARITY_CAP` (default 100) caps how many of those stored listens count
  toward popularity. A new session past it is still stored, with `popularity_counted = false`,
  and still updates taste rows, but adds nothing to any daily row, including when it completes.
  It returns `counted`, like any stored listen, so a client cannot tell when its listens stop
  counting toward popularity.
- The popularity cap never exceeds the stored cap; a higher setting is lowered to the stored cap.
- On the UTC day of an opt-out, the stored cap also counts the listens the opt-out deleted, from
  the opt-out-day carry on the listener row. A carry from an earlier day is cleared at the next
  report.
- Reports for an already-stored session are never capped. Whether a session counts toward
  popularity is settled when it is first stored.

### Popularity Cooldown After an Opt-Out

- `STATS_ALL_TIME_RECOUNT_DAYS` (a server setting, default 90) sets the length. It also sets the
  all-time recount period, and the API does not start when it is greater than
  `STATS_TRACK_EVENT_RETENTION_DAYS`.
- A No that follows a Yes records `account_settings.listen_stats_opted_out_at`. A No from an
  undecided or already-declined account does not, and a Yes never changes it. A later opt-out
  replaces the time and restarts the cooldown.
- For that many days after it, new listens are stored with `popularity_counted = false`, feed
  taste rows, and return `counted`. Opens store nothing (no event, no daily row, no listener id,
  no use of the open cap) and return `counted`. A client cannot tell that the cooldown applies.
- Cooldown listens are not popularity-counted, so they stay out of the day, week, and month
  counts as well as the daily totals; the listener left those counts at the opt-out and does not
  return to them until the cooldown ends.
- The write path reads the opt-out time in the same `FOR SHARE` read as the consent decision.
- Opting out and turning Taste Profile on again does not reset:
  - the listener id;
  - the daily caps (the cooldown outlasts the UTC day, and the carry keeps the stored cap);
  - the minimum interval (the opt-out time counts as a stored listen);
  - anything else kept by listener id until the account is deleted;
  - all-time totals, which have no listener column.
- An opt-out deletes the listener's all-time marks with the events. Every deleted mark is at or
  before the opt-out, so every period it started ends by the time the cooldown does, because
  both use `STATS_ALL_TIME_RECOUNT_DAYS`; the first popularity-counted listen after the cooldown
  is one the recount rule would have counted anyway.

### Flagged Listeners

The listen write path flags a listener whose listening looks scripted, in the same transaction
and under the same listener lock that sees the signal. Two signals flag a listener:

- **Stored cap reached fast** (`stored_cap_reached`): a new listen is stored and brings the
  listener's stored listens for the UTC day (including the opt-out-day carry) to
  `STATS_LISTEN_DAILY_STORED_CAP`, within `STATS_FLAG_STORED_CAP_WITHIN_HOURS` (default 3) of the
  day's first stored listen. Reaching the cap later in the day is not a signal, and the
  `daily_cap_reached` answers after it write nothing.
- **Too-soon run** (`too_soon_minutes`): a new listen answers `too_soon`, and the minutes in one
  unbroken run of such answers reach `STATS_FLAG_TOO_SOON_MINUTES` (default 30). A too-soon minute
  more than 2 minutes after the run's last one starts a new run at 1; UTC midnight does not reset
  it. A `too_soon` for an item or clip whose server-side duration is under 60 seconds does not
  count and writes nothing (an unknown duration counts). A `too_soon` answered before the account
  has a listener id writes nothing either.

`0` turns either signal off. The web and mobile E2E API profiles
(`packages/helpers-config/src/podverseTestEnv.ts`) set both to `0`, so seeded accounts that
listen in fast bursts are never flagged; the API integration tests cover the signals.

The too-soon signal counts a run of minutes rather than reports or minutes per day:

- The mobile outbox holds up to 500 sessions and drains 50 per pass, so one offline backlog can
  answer hundreds of `too_soon` in a few bursts of a minute or two each. Bursts further apart than
  2 minutes restart the run.
- Several devices on one account start new sessions close together only now and then, and those
  minutes never form a long run.
- Items and clips under 60 seconds count after 25% of their length, so honest listening to them
  meets the minimum interval; they are left out of the run.
- A script sending new sessions faster than the minimum interval for half an hour reaches 30.

Not signals: reaching the daily popularity cap (a day of music can pass it honestly, and the cap
already stops those listens from counting) and reaching the open cap (browsing a list of
profiles or playlists can reach it honestly).

What a flag changes, while `cleared_at` is null:

- New listens are stored with `popularity_counted = false`, add to no daily row, and still update
  taste rows. A completion of any stored listen adds to no daily row and still updates taste rows.
- New opens are stored with `popularity_counted = false`, use up the open cap as before, and add
  to no daily row.
- Every API answer is what an unflagged listener would get. The listener is never told.
- Flagging edits no stored row. Listens and opens stored before the flag keep
  `popularity_counted = true`. An uncleared flag removes all of the listener's events from the
  day, week, and month counts at the next refresh, and a clear brings the ones from before the
  flag back while they are inside the window. All-time keeps what the listener added before the
  flag, and adds nothing while it stands. Listens and opens stored while flagged keep
  `popularity_counted = false` after a clear.
- The signal stores no listen: `too_soon` writes only the signal and flag rows. The stored-cap
  signal flags after the listen that reaches the cap is stored, and that listen keeps the
  `popularity_counted` it was stored with.

An admin clear holds for the rest of its UTC day. A signal on a later day flags the listener
again, clears `cleared_at` and `cleared_by_admin_id`, and adds 1 to `times_flagged`; a signal
while the flag is uncleared changes nothing.

Admins with stats read permission see flagged listeners on the management Stats area: listener
id, reason, when the listener was flagged, times flagged, and listens and opens stored in the
last 7 days. Admins with stats update permission clear a flag. A clear is audited and holds for
the rest of its UTC day. After a clear, the listener's events from before the flag count again
in the day, week, and month counts while they are inside the window. Events stored while the flag
was in place keep
`popularity_counted = false` and stay out. A clear leaves `stats_flag_signal` as it is: the
too-soon run resets on its own after a gap of more than 2 minutes.

Flags and the too-soon run are kept by listener id, so they survive an opt-out and a new Yes and
are removed only when the account is deleted. The account data export includes no flag, no
signal, and no `popularity_counted`.

### Write Order

A new listen inserts the event, then upserts the item, channel, and (clip listens) clip daily
rows, then the taste rows. A completion updates the event, then the daily rows, then the taste
rows. The channel merge takes its locks in the same order.

### Taste Rows

- **Shows:** the item's channel (a podcast or an album). A music album listen also updates each
  artist channel its publisher remote items point to.
- **Weights:** 1 per counted listen and 1 more when it finishes (`POPULARITY_TASTE_LISTEN_WEIGHT`,
  `POPULARITY_TASTE_COMPLETION_WEIGHT`).
- **Half-lives:** 14 days for `recent_score` and 180 days for `long_term_score`
  (`POPULARITY_TASTE_HALF_LIFE_DAYS`).
- **Update at time `t`:** when `t` is on or after `scores_updated_at`,
  `score = score × 0.5^(days(t − scores_updated_at) / h) + weight`. When `t` is earlier (the
  completion of an event stored before the row's last update),
  `score = score + weight × 0.5^(days(scores_updated_at − t) / h)`. Either way
  `scores_updated_at` becomes the later of the two times.
- **Completions** use the event's `created_at` as `t`, change only rows that already exist, and
  leave listen counts and listen times as they are.
- **Hidden shows** are skipped: listening neither creates nor changes their rows. The listen still
  counts toward daily totals.
- **Past the popularity cap:** a stored listen past the listener's daily popularity cap still
  updates taste rows, and so does its completion.
- **Flagged listeners:** a flagged listener's listens and completions still update taste rows.
- **Pause and resume:** while tracking is stopped without the listener choosing it, no report is
  accepted, so taste rows stay as they are. The next counted listen fades each score across the
  whole gap before adding to it.

### Recommendation Weight

The 1–5 weight a show has in recommendations is separate from `recent_score` and
`long_term_score`. Those two decay. The recommendation weight does not.

- **From listens:** `LEAST(5, 1 + listen_count / 5)` using integer division. 0–4 listens is 1,
  5–9 is 2, 10–14 is 3, 15–19 is 4, and 20 or more is 5. A show added back with no listens since
  is 1. Distinct episodes are not counted; each counted listen, including a replay, increments
  `listen_count`.
- **Manual apply:** `POST /account/taste-profile/weight` writes `weight_override` (1–5) and
  `weight_override_at`. After that, later listens do not move the weight. Another apply replaces
  it. The job and Settings use the override when it is set, otherwise the listen-count level.
- **On the Recommendations page:** the mark is display-only. That listener's top score for the
  selected medium is 5, and the rest scale down in even steps with a floor of 1. The raw score
  is not in the public API.

### Recommendations Job

`refreshRecommendations` in `@podverse/orm` builds show similarity, then each listener's
discoveries. It never reads the account-to-listener mapping. It works from the listener ids
already on taste rows.

- **Similarity:** cosine of the 1–5 weights. A missing show for a listener counts as 0. The dot
  product uses listeners who have both shows. A pair needs at least 3 shared listeners. Each
  show keeps its top 50 neighbors. The score is clamped at 1.
- **Discoveries:** for each other show, sum the seed show's 1–5 weight times that neighbor's
  similarity. Drop shows already in the Taste Profile or Hidden From Taste Profile. Keep the top
  50 per medium: podcasts (podcast and podcast live), albums (music and music live), and artists
  (music publishers).
- **Incremental:** daily CronJob `worker-stats-recommendations-refresh` at 02:15 UTC. A show is
  dirty when `GREATEST(scores_updated_at, weight_override_at)` is newer than its similarity
  stamp. A listener is dirty when a taste row changed after their recommendation stamp.
  Incremental refreshes a dirty show's outgoing neighbors only. Reverse edges, and shows that
  only lost listeners, wait for the weekly run.
- **Full:** weekly CronJob `worker-stats-recommendations-refresh-full` on Sunday at 03:15 UTC
  (`-full`). It also deletes similarity, recommendations, and their stamps for shows or listeners
  that no longer have taste rows.
- **Lock:** session advisory lock `814220261`. A run that cannot take it logs a skip and exits 0.
  `concurrencyPolicy: Forbid`, `backoffLimit: 0`, `activeDeadlineSeconds: 10800`.
- **Manual run:** `npm run stats_recommendations_refresh -w apps/workers` (append `-- -full`)
  after `npm run build -w apps/workers`. Nothing is scheduled locally.
- **Reading the list:** `GET /account/recommendations?chip=podcasts|albums|artists` drops shows
  the account subscribes to. Signed-in, no membership gate.

### Opens

- A profile or playlist open counts once per opener, entity, and UTC day. The first stores an
  open event and adds 1 to `stats_daily_account` or `stats_daily_playlist`; repeats return
  `unchanged`. Opening your own profile or playlist returns `own_content` and stores nothing.
- Opens never touch taste rows. At most `STATS_OPEN_DAILY_CAP` (default 10) counted opens per
  listener per UTC day, profiles and playlists together. An open past it returns
  `daily_cap_reached` and stores nothing. Own-content and repeat opens do not use it up. Opens
  have no minimum interval.
- A flagged opener's opens are stored with `popularity_counted = false` and add to no daily
  total. The answers do not change, and the open cap applies as before.

## Client Listen Sending

Web and mobile measure media seconds actually heard with the shared tracker in
`packages/playback-core/src/listenSession.ts`. A position sample adds its forward change only
while playing and only when the change fits in the wall-clock time since the previous sample at
the playback rate, so seeks and source jumps add nothing.

Each load's `PlaybackLoadDecision.listenSession` starts a session, keeps it (the same media
moved to another file), or tracks nothing (Add by RSS, livestreams). A soundbite or chapter
counts toward its item; a clip counts toward the clip and closes when playback reaches its end.

A session sends its first report once `isCountedListen` holds for whole seconds heard, again on
first reaching 60 seconds when the first report was below 60, on completion, and on pause or end
after 60 more seconds. Every report repeats the session's `client_listen_id`.

Web sends reports directly from `apps/web/src/utils/statsTracking/statsTracking.ts` without
retry. The request body has no `listened_at`; the server stamps the time it receives the
report. Web sends no listen time. Profile and playlist opens go to `POST /stats/open`.

Mobile stores reports in the `stats_listen_outbox` SQLite table and sends them when online.
The request body has no `listened_at`. A replayed listen counts and fades from the time the
server receives it. `counted_at` stays on the row for the age rules and is not sent. 2xx
removes a row, including `too_soon`, so an offline backlog sent faster than the minimum interval
stores only its first new session; 400, 403, 404, and 410 drop it; 401, 429, 5xx, and no response keep it for the
next drain. A row holding only an update is dropped 6 days after it counted, so it still
arrives inside the server's 7-day session lookup. An unsent first report is dropped 30 days
after it counted; that is the outbox's storage bound, not a server clamp. A declined
Taste Profile consent decision deletes the device's pending rows. Mobile records no profile or
playlist opens.

Both clients send only for a signed-in account whose Taste Profile consent allows it; the
server re-checks on every report.

Listening that plays while the mobile app's JavaScript is not running (a car-started source
before the app wakes) is not counted.

## Jobs and Schedules

This section covers the partition, retention, and range-totals jobs and when each runs.

### Partitions and Retention Job

The worker command `statsEventPartitionsMaintain` keeps the event partitions in shape. It runs
for both `stats_listen_event` and `stats_open_event`, and it creates partitions before it drops
any, so a failed drop never leaves a coming month without a partition.

- **Months ahead:** each run ensures the current UTC month and the next two. Partitions exist
  about two months before any row needs them, so an outage of weeks still routes rows to dated
  partitions. Rows that reach the default partition move into their month when it is created.
- **Cutoff:** the first day of the UTC month that contains `now − STATS_TRACK_EVENT_RETENTION_DAYS`
  (absolute 24-hour days, 90 by default). The job drops every partition whose upper bound is on or
  before the cutoff and deletes older rows from the default partition.
- **Whole months only:** a dropped partition's rows are all older than its upper bound, which is
  on or before the cutoff, which is on or before `now − retention`. Every removed row is older
  than the window. The job never deletes rows from a dated partition that reaches past the
  cutoff, so a row stays at least the retention window and at most about a month longer, plus up
  to a day until the next run: 90 to about 122 days at the default.
- **Worked example:** a run at `2026-10-21T03:30Z` with 90 days computes `now − 90 days` as
  `2026-07-23`, so the cutoff is `2026-07-01`. June 2026 and earlier are dropped. July stays until
  the run on or after `2026-10-30`, when `now − 90 days` reaches August and the cutoff becomes
  `2026-08-01`.
- **Schedule:** the CronJob `worker-stats-event-partitions` in `infra/k8s/base/cron` runs it daily
  at 03:30. On a new deployment, start it once by hand before the first listens arrive so dated
  partitions exist. After that, the daily run keeps the current month and the next two.
- **Manual run:** `npm run stats_event_partitions_maintain -w apps/workers` after
  `npm run build -w apps/workers`.
- **Local development:** nothing runs on a schedule locally, so events stay in the default
  partitions until the command is run.

### Range Totals

The worker command `statsPopularityRefresh` rebuilds the five `stats_popularity_*` tables through
`refreshStatsPopularity` in `@podverse/orm`: day, week, and month counts from the counted events,
and all-time from the daily totals. It is the only writer of range values; a channel merge only
deletes the merged-away copy's row.

- **One transaction per type:** channel, item, clip, playlist, then account. Each starts with
  `SELECT pg_advisory_xact_lock(hashtextextended('popularity_refresh:' || $type, 0))`, so two runs
  never interleave on one type, and a slow item pass never holds the channel lock. The job reads
  events, flags, and daily rows without locking them and takes no lock the write path takes, so
  listens are never blocked.
- **Unchanged rows stay put:** each upsert writes a row only when one of its four counts differs
  from the stored tuple, so an hourly run over a quiet hour writes nothing.
- **Window counts:** one pass over the type's event table (`stats_listen_event` for channel,
  item, and clip; `stats_open_event` for playlist and account) reads the month window's counted
  events and groups them by entity and listener. Each listener's latest event decides which
  shorter windows it falls in, so it counts once per window. A flag or a clear reaches the
  windows at the next hourly run.
- **Recent mode** (default): for every entity with a counted event in the month window or a daily
  row on today or yesterday, it upserts the day, week, and month counts (zero for a window with no
  counted events). It recomputes `all_time_count` from every daily row only for entities with a
  daily row on today or yesterday, for rows it just inserted, and where the stored all-time total
  is below the new month count. Last, it zeroes the day, week, and month counts of popularity
  rows with no counted event in the month window, including entities whose only events there come
  from flagged listeners; their all-time totals stay.
- **Why recent all-time totals stay exact:** the write path adds `all_time_listener_count` only to
  the current UTC date's daily row. Between two runs less than a day apart, only an entity with a
  row on today or yesterday can have gained all-time listeners, so every other stored all-time
  total still equals its sum.
- **Full mode** (`-full`): recomputes all four counts for every entity with a counted event in the
  month window or any daily row, and sets all four to zero on popularity rows whose entity has no
  daily rows and no counted event in the month window. It catches what recent mode cannot see: a
  gap between runs longer than a day, and daily rows that a channel merge added to the survivor's
  past days.
- **Schedule:** two CronJobs in `infra/k8s/base/cron`. `worker-stats-popularity-refresh` runs
  recent mode hourly at :05, and `worker-stats-popularity-refresh-full` runs `-full` daily at
  00:45. `concurrencyPolicy: Forbid` keeps each from overlapping itself, and the per-type lock
  serializes the two when they meet between 00:05 and 00:45.
- **Manual run:** `npm run stats_popularity_refresh -w apps/workers` (append `-- -full` for every
  entity) after `npm run build -w apps/workers`.
- **Local development:** nothing runs on a schedule locally; run the command to refresh on demand.

## Consent Lifecycle

This section covers opting in, opting out and what it deletes, pausing without the listener
choosing it, and the Taste Profile routes a signed-in account uses to review and hide shows.

The account data export (`GET /account/download-data`) includes the Taste Profile, the Hidden From
Taste Profile list, and stored listen and open records under `listening_data`, plus the
top-level `listen_stats_opted_out_at`. It never includes the listener id or the opt-out-day
carry. After an opt-out the `listening_data` section is empty.

### Opting In

- Taste Profile is opt-in and optional. A new account starts undecided
  (`listen_stats_accepted = null`, `allow_listen_stats = false`).
- The Taste Profile agreement is served, localized, at `GET /legal/taste-profile-agreement` for a
  signed-in account. Its version comes from `TASTE_PROFILE_AGREEMENT_VERSION`.
- `getTasteProfileConsentChoice` in `@podverse/helpers` names the four states: undecided, allowed
  (Yes on the current explanation version), opted out (No), and stale acceptance (Yes on an older
  version).
- Writes need a Yes on the current version. A valid trial may store listens for the Taste
  Profile. Popularity counts and opens need paid premium with the `trackStats` capability. The
  listener id is created at the first stored listen or open, not at the Yes.

### Opting Out Deletes Listening Data

- `PATCH /account-settings/listen-stats` with `accepted: false` records the No. A No that follows
  a Yes also records `listen_stats_opted_out_at`, which starts the popularity cooldown.
- In the same transaction, `ListeningDataDeletionService` deletes that listener's listen events,
  open events, Taste Profile rows, Hidden From Taste Profile rows, recommendation rows, and the
  recommendation stamp right away, table by table, and keeps the `listener_identity.stats_listener`
  row. Show similarity is global and stays.
- Before deleting, it writes how many listens were stored that UTC day, and when the first was,
  onto the listener row (the opt-out-day carry), adding to a carry from an earlier opt-out that
  day.
- Daily totals and all-time counts have no listener column and stay. Day, week, and month counts
  come from events, so the listener leaves them at the next refresh.
- A No from an account with no listener id deletes nothing and still records the decision.
- Turning Taste Profile on again reuses the same listener id; the Taste Profile and
  recommendations start from scratch because their rows are gone.
- Deleting the account deletes the listener row, and every listener-linked row cascades from it.
- The server takes no confirmation flag. Clients confirm before sending a No whenever
  `isTasteProfileConsentOptOutDestructive` in `@podverse/helpers` is true, which is any recorded
  Yes, on any version.

### Pausing Without the Listener Choosing It

- A membership lapse, a removed `trackStats` override, or a new explanation version waiting for a
  Yes deletes nothing. Writes stop; the Taste Profile and hidden list stay; stored events still age
  out on retention.
- A later Yes resumes with the same listener id, and the next counted listen fades each taste
  score across the gap. A Yes never deletes.
- The Taste Profile endpoints keep working while tracking is paused, so a listener can still
  review and hide shows.

### Trial membership

- A valid trial with a current Yes stores listens. Each is stored with `popularity_counted`
  false, updates taste rows, and adds nothing to daily or range totals. The answer is `counted`.
- A session keeps the flag it was stored with. Paying for premium does not move that session into
  rankings. A later session can count.
- Opens stay unavailable until the membership is premium and `trackStats` is on, including when a
  trial's `trackStats` override is on.
- A premium account with `trackStats` off still stores nothing.
- Forcing `MEMBERSHIP_TRIAL_TRACK_STATS` or a per-account `track_stats` override does not put a
  trial listen or open into rankings.

### Consent and the Write Path Under Locks

- The opt-out loads the `account_settings` row `FOR UPDATE`, records the No, takes the listener
  lock (`lockListener`), and deletes the listener's listening data, all in one transaction.
- Inside its own transaction, before it looks up or creates a listener id, the listen and open
  write path re-reads `listen_stats_accepted`, `listen_stats_agreement_version`, and
  `listen_stats_opted_out_at` from `account_settings` `FOR SHARE` and writes nothing unless
  `isTasteProfileTrackingAllowed` holds for the current version.
- `FOR SHARE` waits for the opt-out's row lock, so a report that arrives during an opt-out reads
  the No after it commits and writes nothing. A report that locked first makes the opt-out wait,
  and the deletion then removes what it wrote.

### Taste Profile and Hidden From Taste Profile

Signed-in accounts read and edit their own Taste Profile here. A paused listener, including one
whose membership has lapsed or whose explanation version is still waiting, can list shows and hide
them. An opt-out deletes every taste and hidden row, so both lists are empty. Responses carry channel
data and counts only.

- `GET /account/taste-profile` returns the Taste Profile, newest `last_listened_at` first, then
  `channel_id` descending. `page` starts at 1. `limit` defaults to 20 and stops at 50.
- `GET /account/taste-profile/hidden` returns Hidden From Taste Profile, newest `hidden_at` first,
  then `channel_id` descending, with the same paging.
- `POST /account/taste-profile/hide` deletes the show's taste row and inserts a hidden row. Both
  writes run under the listener lock (`lockListener`). A show that is already hidden succeeds and
  stays as it is. Hide answers not found when the account has no listener row, when the show is in
  neither list, or when the channel is unknown. Daily and range totals stay as they are.
- Listening to a hidden show still counts in public totals. The listen write path skips that show,
  so the listen leaves its taste rows unchanged.
- `POST /account/taste-profile/unhide` takes the show off the hidden list. The body includes
  `add_to_taste_profile`. When that is true, unhide also inserts a fresh Taste Profile row with
  listen count 0, completion count 0, and both scores 0. When it is false, unhide only removes the
  hidden row, and a later listen can add the show again. Unhide of a show that is not hidden
  changes nothing, including when `add_to_taste_profile` is true. An unknown channel is not found.
- An added-back row stores the add-back time in `first_listened_at`, `last_listened_at`, and
  `scores_updated_at`. The list reports both listen times as null while `listen_count` is 0.
