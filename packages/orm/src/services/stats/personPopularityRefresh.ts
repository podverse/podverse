import { AppDataSourceReadWrite } from '@orm/db/index.js';
import type { EntityManager } from 'typeorm';

import {
  POPULARITY_DEFAULT_ALL_TIME_RECOUNT_DAYS,
  STATS_POPULARITY_RANGE_LOOKBACK_DAYS,
} from '@podverse/helpers';

/**
 * Person range totals are distinct listeners whose counted listen is on an item or channel that
 * credits the person. The listen write path does not know about people. This refresh joins the
 * retained events, so a refresh that does not run before those events age out under-counts that
 * window. All-time uses a mark so a listener adds at most once per recount period, the same
 * default period as show all-time.
 */
const PERSON_REFRESH_SQL = `
WITH person_events AS (
  SELECT credit.person_id, event.listener_id, event.created_at
  FROM stats_listen_event event
  JOIN item_person credit ON credit.item_id = event.item_id AND credit.person_id IS NOT NULL
  WHERE event.created_at >= (($1::date - $4::int)::timestamp AT TIME ZONE 'UTC')
    AND event.created_at < (($1::date + 1)::timestamp AT TIME ZONE 'UTC')
    AND event.popularity_counted
    AND NOT EXISTS (
      SELECT 1 FROM stats_flagged_listener flag
      WHERE flag.listener_id = event.listener_id AND flag.cleared_at IS NULL
    )
  UNION ALL
  SELECT credit.person_id, event.listener_id, event.created_at
  FROM stats_listen_event event
  JOIN channel_person credit ON credit.channel_id = event.channel_id AND credit.person_id IS NOT NULL
  WHERE event.created_at >= (($1::date - $4::int)::timestamp AT TIME ZONE 'UTC')
    AND event.created_at < (($1::date + 1)::timestamp AT TIME ZONE 'UTC')
    AND event.popularity_counted
    AND NOT EXISTS (
      SELECT 1 FROM stats_flagged_listener flag
      WHERE flag.listener_id = event.listener_id AND flag.cleared_at IS NULL
    )
),
window_listeners AS (
  SELECT person_id, listener_id, max(created_at) AS last_at
  FROM person_events
  GROUP BY person_id, listener_id
),
window_totals AS (
  SELECT person_id,
         (count(*) FILTER (
           WHERE last_at >= (($1::date - $2::int)::timestamp AT TIME ZONE 'UTC')
         ))::int AS day_count,
         (count(*) FILTER (
           WHERE last_at >= (($1::date - $3::int)::timestamp AT TIME ZONE 'UTC')
         ))::int AS week_count,
         count(*)::int AS month_count
  FROM window_listeners
  GROUP BY person_id
),
upserted AS (
  INSERT INTO stats_popularity_person (person_id, day_count, week_count, month_count, all_time_count)
  SELECT person_id, day_count, week_count, month_count, 0
  FROM window_totals
  ON CONFLICT (person_id) DO UPDATE
    SET day_count = EXCLUDED.day_count,
        week_count = EXCLUDED.week_count,
        month_count = EXCLUDED.month_count
  RETURNING person_id
),
zeroed AS (
  UPDATE stats_popularity_person popularity
  SET day_count = 0, week_count = 0, month_count = 0
  WHERE NOT EXISTS (SELECT 1 FROM window_totals totals WHERE totals.person_id = popularity.person_id)
    AND (popularity.day_count <> 0 OR popularity.week_count <> 0 OR popularity.month_count <> 0)
  RETURNING person_id
),
new_marks AS (
  INSERT INTO stats_person_all_time_mark (listener_id, person_id, counted_at)
  SELECT listener_id, person_id, max(created_at)
  FROM person_events
  GROUP BY listener_id, person_id
  ON CONFLICT (listener_id, person_id) DO UPDATE
    SET counted_at = EXCLUDED.counted_at
    WHERE stats_person_all_time_mark.counted_at < EXCLUDED.counted_at - ($5::int * interval '1 day')
  RETURNING person_id
),
mark_counts AS (
  SELECT person_id, count(*)::int AS added
  FROM new_marks
  GROUP BY person_id
)
UPDATE stats_popularity_person popularity
SET all_time_count = popularity.all_time_count + mark_counts.added
FROM mark_counts
WHERE popularity.person_id = mark_counts.person_id
`;

const DAILY_SQL = `
INSERT INTO stats_daily_person (person_id, day, listener_count, all_time_listener_count)
SELECT totals.person_id,
       $1::date,
       totals.day_count,
       LEAST(totals.day_count, COALESCE(marks.added, 0))
FROM stats_popularity_person totals
LEFT JOIN (
  SELECT person_id, count(*)::int AS added
  FROM stats_person_all_time_mark
  WHERE counted_at >= ($1::date::timestamp AT TIME ZONE 'UTC')
    AND counted_at < (($1::date + 1)::timestamp AT TIME ZONE 'UTC')
  GROUP BY person_id
) marks ON marks.person_id = totals.person_id
WHERE totals.day_count > 0 OR COALESCE(marks.added, 0) > 0
ON CONFLICT (person_id, day) DO UPDATE
  SET listener_count = EXCLUDED.listener_count,
      all_time_listener_count = EXCLUDED.all_time_listener_count
`;

export async function refreshPersonPopularity(
  manager: EntityManager,
  today: string
): Promise<void> {
  const { day, week, month } = STATS_POPULARITY_RANGE_LOOKBACK_DAYS;
  await manager.query(
    `SELECT pg_advisory_xact_lock(hashtextextended('popularity_refresh:person', 0))`
  );
  await manager.query(PERSON_REFRESH_SQL, [
    today,
    day,
    week,
    month,
    POPULARITY_DEFAULT_ALL_TIME_RECOUNT_DAYS,
  ]);
  await manager.query(DAILY_SQL, [today]);
}

export async function refreshPersonPopularityInTransaction(today: string): Promise<void> {
  await AppDataSourceReadWrite.transaction((manager) => refreshPersonPopularity(manager, today));
}
