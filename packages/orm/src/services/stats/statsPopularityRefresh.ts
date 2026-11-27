import { AppDataSourceReadWrite } from '@orm/db/index.js';
import type { EntityManager } from 'typeorm';

import { STATS_POPULARITY_RANGE_LOOKBACK_DAYS } from '@podverse/helpers';

import { refreshPersonPopularityInTransaction } from './personPopularityRefresh.js';
import type { StatsEntityType } from './statsEntityTables.js';
import { STATS_ENTITY_TABLES, STATS_ENTITY_TYPES } from './statsEntityTables.js';

/*
 * Range totals (`stats_popularity_*`) are written only here. Day, week, and month counts are
 * distinct listeners (openers for profiles and playlists) from the event tables, skipping events
 * that are not popularity-counted and listeners with an uncleared flag. All-time is the sum of the
 * daily rows' `all_time_listener_count`. Recent mode refreshes every entity with a counted event in
 * the month window or a daily row on today or yesterday, and recomputes all-time only where it can
 * have changed. Full mode recomputes all four counts for every entity.
 * Contracts and schedules: docs/features/POPULARITY-AND-TASTE-PROFILE.md.
 */

export type StatsPopularityRefreshMode = 'recent' | 'full';

export type StatsPopularityRefreshTypeResult = {
  entityType: StatsEntityType;
  rowsWritten: number;
  rowsZeroed: number;
};

const UTC_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Days before `today` whose daily rows can still grow. The write path only adds to the current
 * UTC date, and one extra day covers a run that starts just after midnight.
 */
const ALL_TIME_RECHECK_DAYS = 1;

type EntityTables = (typeof STATS_ENTITY_TABLES)[StatsEntityType];

const FLAGGED_LISTENER_TABLE = 'stats_flagged_listener';

/** UTC midnight `lookbackParam` days before `$1` (today). */
function windowStartSql(lookbackParam: string): string {
  return `(($1::date - ${lookbackParam}::int)::timestamp AT TIME ZONE 'UTC')`;
}

const WINDOW_END_SQL = `(($1::date + 1)::timestamp AT TIME ZONE 'UTC')`;

/**
 * Events of alias `e` that count toward a window starting `lookbackParam` days before `$1`:
 * popularity-counted, inside the window, and from a listener without an uncleared flag.
 */
function countedEventsWhere(tables: EntityTables, lookbackParam: string): string {
  const { key } = tables;
  return `e.${key} IS NOT NULL
     AND e.created_at >= ${windowStartSql(lookbackParam)}
     AND e.created_at < ${WINDOW_END_SQL}
     AND e.popularity_counted
     AND NOT EXISTS (
           SELECT 1 FROM ${FLAGGED_LISTENER_TABLE} f
            WHERE f.listener_id = e.listener_id AND f.cleared_at IS NULL
         )`;
}

/**
 * CTEs ending in `window_totals (entity_id, day_count, week_count, month_count)`: distinct
 * listeners per entity in each window. `$1` today, `$2`–`$4` day, week, and month lookbacks. A
 * listener's latest counted event in the month window decides which shorter windows it falls in,
 * so each listener counts once per window.
 */
function windowTotalsSql(tables: EntityTables): string {
  const { key, events } = tables;
  return `window_listeners AS (
  SELECT e.${key} AS entity_id, e.listener_id, max(e.created_at) AS last_at
    FROM ${events} e
   WHERE ${countedEventsWhere(tables, '$4')}
   GROUP BY e.${key}, e.listener_id
),
window_totals AS (
  SELECT entity_id,
         (count(*) FILTER (WHERE last_at >= ${windowStartSql('$2')}))::int AS day_count,
         (count(*) FILTER (WHERE last_at >= ${windowStartSql('$3')}))::int AS week_count,
         count(*)::int AS month_count
    FROM window_listeners
   GROUP BY entity_id
)`;
}

function statementRowCount(result: unknown): number {
  if (Array.isArray(result)) {
    const count = result[1];
    if (typeof count === 'number' && Number.isFinite(count)) {
      return count;
    }
  }
  if (typeof result === 'object' && result !== null) {
    const rowCount = Reflect.get(result, 'rowCount');
    if (typeof rowCount === 'number' && Number.isFinite(rowCount)) {
      return rowCount;
    }
  }
  return 0;
}

/** TypeORM answers INSERT with its row list only, so each upsert selects its own count. */
function rowsWrittenFrom(result: unknown): number {
  if (!Array.isArray(result) || result.length !== 1) {
    throw new Error('stats popularity refresh: unexpected upsert result');
  }
  const row: unknown = result[0];
  const count = typeof row === 'object' && row !== null ? Reflect.get(row, 'rows_written') : null;
  if (typeof count !== 'number' || !Number.isInteger(count)) {
    throw new Error('stats popularity refresh: unexpected upsert result');
  }
  return count;
}

/**
 * `sourceSql` defines CTEs ending in `refreshed (entity_id, day_count, week_count, month_count,
 * all_time_count)`. A row is written only when one of its four counts changes.
 */
function upsertChangedRowsSql(tables: EntityTables, sourceSql: string): string {
  const { key, popularity } = tables;
  return `WITH ${sourceSql},
written AS (
  INSERT INTO ${popularity} AS p (${key}, day_count, week_count, month_count, all_time_count)
  SELECT entity_id, day_count, week_count, month_count, all_time_count FROM refreshed
  ON CONFLICT (${key}) DO UPDATE
     SET day_count = EXCLUDED.day_count,
         week_count = EXCLUDED.week_count,
         month_count = EXCLUDED.month_count,
         all_time_count = EXCLUDED.all_time_count
   WHERE (p.day_count, p.week_count, p.month_count, p.all_time_count)
         IS DISTINCT FROM
         (EXCLUDED.day_count, EXCLUDED.week_count, EXCLUDED.month_count, EXCLUDED.all_time_count)
  RETURNING 1
)
SELECT count(*)::int AS rows_written FROM written`;
}

/**
 * `$1` today, `$2`–`$4` day, week, and month lookbacks, `$5` all-time recheck days. All-time is
 * recomputed for entities with a daily row on today or yesterday (the only rows whose
 * `all_time_listener_count` can grow), for new rows, and where the stored value is below the new
 * month count; any other entity's all-time total cannot have changed.
 */
function recentUpsertSql(tables: EntityTables): string {
  const { key, daily, popularity } = tables;
  return upsertChangedRowsSql(
    tables,
    `${windowTotalsSql(tables)},
recent_daily AS (
  SELECT DISTINCT d.${key} AS entity_id
    FROM ${daily} d
   WHERE d.day >= $1::date - $5::int AND d.day <= $1::date
),
targets AS (
  SELECT COALESCE(w.entity_id, r.entity_id) AS entity_id,
         COALESCE(w.day_count, 0) AS day_count,
         COALESCE(w.week_count, 0) AS week_count,
         COALESCE(w.month_count, 0) AS month_count,
         stored.all_time_count AS stored_all_time_count,
         (r.entity_id IS NOT NULL
           OR stored.${key} IS NULL
           OR stored.all_time_count < COALESCE(w.month_count, 0)) AS needs_all_time
    FROM window_totals w
    FULL JOIN recent_daily r ON r.entity_id = w.entity_id
    LEFT JOIN ${popularity} stored ON stored.${key} = COALESCE(w.entity_id, r.entity_id)
),
all_time_totals AS (
  SELECT d.${key} AS entity_id, SUM(d.all_time_listener_count)::int AS all_time_count
    FROM ${daily} d
   WHERE d.${key} IN (SELECT t.entity_id FROM targets t WHERE t.needs_all_time)
   GROUP BY d.${key}
),
refreshed AS (
  SELECT t.entity_id, t.day_count, t.week_count, t.month_count,
         COALESCE(a.all_time_count, t.stored_all_time_count, 0) AS all_time_count
    FROM targets t
    LEFT JOIN all_time_totals a ON a.entity_id = t.entity_id
)`
  );
}

/**
 * `$1` today, `$2` month lookback. All-time totals stay. Also zeroes an entity whose only events
 * in the window come from flagged listeners.
 */
function recentZeroSql(tables: EntityTables): string {
  const { key, events, popularity } = tables;
  return `UPDATE ${popularity} AS p
   SET day_count = 0, week_count = 0, month_count = 0
 WHERE (p.day_count <> 0 OR p.week_count <> 0 OR p.month_count <> 0)
   AND NOT EXISTS (
         SELECT 1 FROM ${events} e
          WHERE e.${key} = p.${key}
            AND ${countedEventsWhere(tables, '$2')}
       )`;
}

/** `$1` today, `$2`–`$4` day, week, and month lookbacks. */
function fullUpsertSql(tables: EntityTables): string {
  const { key, daily } = tables;
  return upsertChangedRowsSql(
    tables,
    `${windowTotalsSql(tables)},
all_time_totals AS (
  SELECT d.${key} AS entity_id, SUM(d.all_time_listener_count)::int AS all_time_count
    FROM ${daily} d
   GROUP BY d.${key}
),
refreshed AS (
  SELECT COALESCE(w.entity_id, a.entity_id) AS entity_id,
         COALESCE(w.day_count, 0) AS day_count,
         COALESCE(w.week_count, 0) AS week_count,
         COALESCE(w.month_count, 0) AS month_count,
         COALESCE(a.all_time_count, 0) AS all_time_count
    FROM window_totals w
    FULL JOIN all_time_totals a ON a.entity_id = w.entity_id
)`
  );
}

/** `$1` today, `$2` month lookback. */
function fullZeroSql(tables: EntityTables): string {
  const { key, daily, events, popularity } = tables;
  return `UPDATE ${popularity} AS p
   SET day_count = 0, week_count = 0, month_count = 0, all_time_count = 0
 WHERE (p.day_count <> 0 OR p.week_count <> 0 OR p.month_count <> 0 OR p.all_time_count <> 0)
   AND NOT EXISTS (SELECT 1 FROM ${daily} d WHERE d.${key} = p.${key})
   AND NOT EXISTS (
         SELECT 1 FROM ${events} e
          WHERE e.${key} = p.${key}
            AND ${countedEventsWhere(tables, '$2')}
       )`;
}

/**
 * Serializes refresh runs per entity type until the transaction ends. Any other writer of range
 * totals that must not interleave with a refresh takes this lock, with this exact key.
 */
async function lockPopularityRefresh(
  manager: EntityManager,
  entityType: StatsEntityType
): Promise<void> {
  await manager.query(
    `SELECT pg_advisory_xact_lock(hashtextextended('popularity_refresh:' || $1::text, 0))`,
    [entityType]
  );
}

async function refreshEntityType(
  manager: EntityManager,
  entityType: StatsEntityType,
  today: string,
  mode: StatsPopularityRefreshMode
): Promise<StatsPopularityRefreshTypeResult> {
  const tables = STATS_ENTITY_TABLES[entityType];
  const { day, week, month } = STATS_POPULARITY_RANGE_LOOKBACK_DAYS;

  await lockPopularityRefresh(manager, entityType);

  if (mode === 'full') {
    const rowsWritten = rowsWrittenFrom(
      await manager.query(fullUpsertSql(tables), [today, day, week, month])
    );
    const rowsZeroed = statementRowCount(await manager.query(fullZeroSql(tables), [today, month]));
    return { entityType, rowsWritten, rowsZeroed };
  }

  const rowsWritten = rowsWrittenFrom(
    await manager.query(recentUpsertSql(tables), [today, day, week, month, ALL_TIME_RECHECK_DAYS])
  );
  const rowsZeroed = statementRowCount(await manager.query(recentZeroSql(tables), [today, month]));
  return { entityType, rowsWritten, rowsZeroed };
}

/**
 * Rebuilds range totals from counted events and daily totals for every entity type; `today` is the
 * UTC date `YYYY-MM-DD` the windows end on. Each type runs in its own transaction under its own
 * lock.
 */
export async function refreshStatsPopularity(input: {
  today: string;
  mode: StatsPopularityRefreshMode;
}): Promise<StatsPopularityRefreshTypeResult[]> {
  const { today, mode } = input;
  if (!UTC_DATE_PATTERN.test(today)) {
    throw new Error(`stats popularity refresh: today must be YYYY-MM-DD, got "${today}"`);
  }

  const results: StatsPopularityRefreshTypeResult[] = [];
  for (const entityType of STATS_ENTITY_TYPES) {
    results.push(
      await AppDataSourceReadWrite.transaction((manager) =>
        refreshEntityType(manager, entityType, today, mode)
      )
    );
  }
  await refreshPersonPopularityInTransaction(today);
  return results;
}
