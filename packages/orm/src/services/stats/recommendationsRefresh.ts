import { AppDataSourceReadWrite } from '@orm/db/index.js';
import type { EntityManager } from 'typeorm';

import { MediumEnum } from '@podverse/helpers';

/*
 * Rebuilds show similarity and per-listener recommendations from the 1–5 Taste Profile
 * weight. Incremental mode refreshes shows and listeners whose taste or override is newer
 * than their last stamp. Full mode rebuilds every show that still has a taste row and
 * drops similarity and recommendations for shows and listeners that no longer do.
 * Subscriptions are not applied here. Contracts: docs/features/POPULARITY-AND-TASTE-PROFILE.md.
 */

export type RecommendationsRefreshMode = 'incremental' | 'full';

export type RecommendationsRefreshResult = {
  mode: RecommendationsRefreshMode;
  skipped: boolean;
  similarityChannels: number;
  listeners: number;
  recommendationRows: number;
};

/** Session lock so a second run waits out or skips instead of writing the same rows. */
const RECOMMENDATIONS_LOCK_KEY = 814220261;

const SIMILARITY_CHANNEL_CHUNK = 25;
const LISTENER_CHUNK = 50;
const MIN_SHARED_LISTENERS = 3;
const NEIGHBOR_LIMIT = 50;
const RECOMMENDATION_LIMIT = 50;

const PODCAST_MEDIUM_IDS = `${MediumEnum.Podcast}, ${MediumEnum.PodcastL}`;
const ALBUM_MEDIUM_IDS = `${MediumEnum.Music}, ${MediumEnum.MusicL}`;
const ARTIST_MEDIUM_ID = `${MediumEnum.PublisherMusic}`;

const TASTE_TOUCHED_AT = `GREATEST(tp.scores_updated_at, COALESCE(tp.weight_override_at, tp.scores_updated_at))`;

const EFFECTIVE_WEIGHT = `COALESCE(weight_override, LEAST(5, 1 + listen_count / 5))::double precision`;

const DIRTY_CHANNELS_SQL = `SELECT DISTINCT tp.channel_id
  FROM stats_taste_profile tp
  LEFT JOIN stats_show_similarity_state state ON state.channel_id = tp.channel_id
  WHERE ${TASTE_TOUCHED_AT} > COALESCE(state.computed_at, '-infinity'::timestamptz)
  ORDER BY tp.channel_id`;

const ALL_CHANNELS_SQL = `SELECT DISTINCT channel_id
  FROM stats_taste_profile
  ORDER BY channel_id`;

const DIRTY_LISTENERS_SQL = `SELECT DISTINCT tp.listener_id::text AS listener_id
  FROM stats_taste_profile tp
  LEFT JOIN stats_recommendation_state state ON state.listener_id = tp.listener_id
  WHERE ${TASTE_TOUCHED_AT} > COALESCE(state.computed_at, '-infinity'::timestamptz)
  ORDER BY listener_id`;

const ALL_LISTENERS_SQL = `SELECT DISTINCT listener_id::text AS listener_id
  FROM stats_taste_profile
  ORDER BY listener_id`;

const DROP_STALE_SIMILARITY_SQL = `DELETE FROM stats_show_similarity similarity
  WHERE NOT EXISTS (
    SELECT 1 FROM stats_taste_profile tp WHERE tp.channel_id = similarity.channel_id
  )`;

const DROP_STALE_SIMILARITY_STATE_SQL = `DELETE FROM stats_show_similarity_state state
  WHERE NOT EXISTS (
    SELECT 1 FROM stats_taste_profile tp WHERE tp.channel_id = state.channel_id
  )`;

const DROP_STALE_RECOMMENDATIONS_SQL = `DELETE FROM stats_recommendation recommendation
  WHERE NOT EXISTS (
    SELECT 1 FROM stats_taste_profile tp WHERE tp.listener_id = recommendation.listener_id
  )`;

const DROP_STALE_RECOMMENDATION_STATE_SQL = `DELETE FROM stats_recommendation_state state
  WHERE NOT EXISTS (
    SELECT 1 FROM stats_taste_profile tp WHERE tp.listener_id = state.listener_id
  )`;

const SIMILARITY_INSERT_SQL = `WITH weights AS (
    SELECT listener_id, channel_id, ${EFFECTIVE_WEIGHT} AS weight
    FROM stats_taste_profile
  ),
  norms AS (
    SELECT channel_id, sqrt(sum(weight * weight)) AS norm
    FROM weights
    GROUP BY channel_id
  ),
  pairs AS (
    SELECT seed.channel_id,
           other.channel_id AS other_channel_id,
           sum(seed.weight * other.weight) AS dot
    FROM weights seed
    JOIN weights other
      ON other.listener_id = seed.listener_id
     AND other.channel_id <> seed.channel_id
    WHERE seed.channel_id = ANY($1::int[])
    GROUP BY seed.channel_id, other.channel_id
    HAVING count(*) >= ${MIN_SHARED_LISTENERS}
  ),
  ranked AS (
    SELECT pairs.channel_id,
           pairs.other_channel_id,
           pairs.dot / (seed_norm.norm * other_norm.norm) AS score,
           row_number() OVER (
             PARTITION BY pairs.channel_id
             ORDER BY pairs.dot / (seed_norm.norm * other_norm.norm) DESC, pairs.other_channel_id
           ) AS rank
    FROM pairs
    JOIN norms seed_norm ON seed_norm.channel_id = pairs.channel_id
    JOIN norms other_norm ON other_norm.channel_id = pairs.other_channel_id
    WHERE seed_norm.norm > 0 AND other_norm.norm > 0
  )
  INSERT INTO stats_show_similarity (channel_id, other_channel_id, score, computed_at)
  SELECT channel_id, other_channel_id, LEAST(score, 1), now()
  FROM ranked
  WHERE rank <= ${NEIGHBOR_LIMIT}
  RETURNING 1`;

const SIMILARITY_STATE_SQL = `INSERT INTO stats_show_similarity_state (channel_id, computed_at)
  SELECT unnest($1::int[]), now()
  ON CONFLICT (channel_id) DO UPDATE SET computed_at = EXCLUDED.computed_at`;

const RECOMMENDATION_INSERT_SQL = `WITH weights AS (
    SELECT listener_id, channel_id, ${EFFECTIVE_WEIGHT} AS weight
    FROM stats_taste_profile
    WHERE listener_id = ANY($1::uuid[])
  ),
  scored AS (
    SELECT seed.listener_id,
           similarity.other_channel_id AS channel_id,
           sum(seed.weight * similarity.score) AS score
    FROM weights seed
    JOIN stats_show_similarity similarity ON similarity.channel_id = seed.channel_id
    WHERE NOT EXISTS (
      SELECT 1 FROM stats_taste_profile taste
      WHERE taste.listener_id = seed.listener_id
        AND taste.channel_id = similarity.other_channel_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM stats_taste_profile_hidden hidden
      WHERE hidden.listener_id = seed.listener_id
        AND hidden.channel_id = similarity.other_channel_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM stats_channel_hidden channel_hidden
      WHERE channel_hidden.listener_id = seed.listener_id
        AND channel_hidden.channel_id = similarity.other_channel_id
    )
    GROUP BY seed.listener_id, similarity.other_channel_id
  ),
  with_chip AS (
    SELECT scored.listener_id,
           scored.channel_id,
           scored.score,
           CASE
             WHEN channel.medium_id IN (${PODCAST_MEDIUM_IDS}) THEN 'podcasts'
             WHEN channel.medium_id IN (${ALBUM_MEDIUM_IDS}) THEN 'albums'
             WHEN channel.medium_id = ${ARTIST_MEDIUM_ID} THEN 'artists'
             ELSE NULL
           END AS chip
    FROM scored
    JOIN channel ON channel.id = scored.channel_id
  ),
  ranked AS (
    SELECT listener_id,
           channel_id,
           score,
           row_number() OVER (
             PARTITION BY listener_id, chip
             ORDER BY score DESC, channel_id
           ) AS rank,
           max(score) OVER (PARTITION BY listener_id, chip) AS top_score
    FROM with_chip
    WHERE chip IS NOT NULL
  )
  INSERT INTO stats_recommendation (listener_id, channel_id, score, strength, computed_at)
  SELECT listener_id,
         channel_id,
         score,
         GREATEST(1, LEAST(5, round(score / top_score * 5)))::smallint,
         now()
  FROM ranked
  WHERE rank <= ${RECOMMENDATION_LIMIT} AND top_score > 0
  RETURNING 1`;

const RECOMMENDATION_STATE_SQL = `INSERT INTO stats_recommendation_state (listener_id, computed_at)
  SELECT unnest($1::uuid[]), now()
  ON CONFLICT (listener_id) DO UPDATE SET computed_at = EXCLUDED.computed_at`;

function chunks<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function columnNumbers(result: unknown, key: string): number[] {
  if (!Array.isArray(result)) {
    return [];
  }
  const ids: number[] = [];
  for (const row of result) {
    if (!isRecord(row)) {
      continue;
    }
    const value = row[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      ids.push(value);
    } else if (typeof value === 'string' && value !== '' && Number.isFinite(Number(value))) {
      ids.push(Number(value));
    }
  }
  return ids;
}

function columnTexts(result: unknown, key: string): string[] {
  if (!Array.isArray(result)) {
    return [];
  }
  const ids: string[] = [];
  for (const row of result) {
    if (!isRecord(row)) {
      continue;
    }
    const value = row[key];
    if (typeof value === 'string' && value !== '') {
      ids.push(value);
    }
  }
  return ids;
}

function returnedRows(result: unknown): number {
  return Array.isArray(result) ? result.length : 0;
}

async function replaceSimilarity(manager: EntityManager, channelIds: number[]): Promise<number> {
  await manager.query(`DELETE FROM stats_show_similarity WHERE channel_id = ANY($1::int[])`, [
    channelIds,
  ]);
  const inserted: unknown = await manager.query(SIMILARITY_INSERT_SQL, [channelIds]);
  await manager.query(SIMILARITY_STATE_SQL, [channelIds]);
  return returnedRows(inserted);
}

/**
 * Replaces stored recommendations for the given listeners. Takes the same per-listener write
 * lock the taste path uses so an on-demand rebuild cannot interleave with this replace.
 */
export async function replaceRecommendationsForListeners(
  manager: EntityManager,
  listenerIds: string[]
): Promise<number> {
  if (listenerIds.length === 0) {
    return 0;
  }
  await manager.query(
    `SELECT pg_advisory_xact_lock(hashtextextended('popularity_listen:' || listener_id::text, 0))
       FROM unnest($1::uuid[]) AS listener_id`,
    [listenerIds]
  );
  await manager.query(`DELETE FROM stats_recommendation WHERE listener_id = ANY($1::uuid[])`, [
    listenerIds,
  ]);
  const inserted: unknown = await manager.query(RECOMMENDATION_INSERT_SQL, [listenerIds]);
  await manager.query(RECOMMENDATION_STATE_SQL, [listenerIds]);
  return returnedRows(inserted);
}

/**
 * Rebuilds similarity and recommendations. A run that cannot take the lock returns
 * `skipped` and writes nothing.
 */
export async function refreshRecommendations(options: {
  mode: RecommendationsRefreshMode;
}): Promise<RecommendationsRefreshResult> {
  const empty: RecommendationsRefreshResult = {
    mode: options.mode,
    skipped: false,
    similarityChannels: 0,
    listeners: 0,
    recommendationRows: 0,
  };
  const dataSource = AppDataSourceReadWrite;
  const lockRows: unknown = await dataSource.manager.query(
    `SELECT pg_try_advisory_lock($1) AS locked`,
    [RECOMMENDATIONS_LOCK_KEY]
  );
  const locked = Array.isArray(lockRows) && isRecord(lockRows[0]) && lockRows[0].locked === true;
  if (!locked) {
    return { ...empty, skipped: true };
  }

  try {
    if (options.mode === 'full') {
      await dataSource.transaction(async (manager) => {
        await manager.query(DROP_STALE_SIMILARITY_SQL);
        await manager.query(DROP_STALE_SIMILARITY_STATE_SQL);
        await manager.query(DROP_STALE_RECOMMENDATIONS_SQL);
        await manager.query(DROP_STALE_RECOMMENDATION_STATE_SQL);
      });
    }

    const channelRows: unknown = await dataSource.manager.query(
      options.mode === 'full' ? ALL_CHANNELS_SQL : DIRTY_CHANNELS_SQL
    );
    const channelIds = columnNumbers(channelRows, 'channel_id');
    for (const channelChunk of chunks(channelIds, SIMILARITY_CHANNEL_CHUNK)) {
      await dataSource.transaction(async (manager) => {
        await replaceSimilarity(manager, channelChunk);
      });
    }

    const listenerRows: unknown = await dataSource.manager.query(
      options.mode === 'full' ? ALL_LISTENERS_SQL : DIRTY_LISTENERS_SQL
    );
    const listenerIds = columnTexts(listenerRows, 'listener_id');
    let recommendationRows = 0;
    for (const listenerChunk of chunks(listenerIds, LISTENER_CHUNK)) {
      recommendationRows += await dataSource.transaction(async (manager) =>
        replaceRecommendationsForListeners(manager, listenerChunk)
      );
    }

    return {
      mode: options.mode,
      skipped: false,
      similarityChannels: channelIds.length,
      listeners: listenerIds.length,
      recommendationRows,
    };
  } finally {
    await dataSource.manager.query(`SELECT pg_advisory_unlock($1)`, [RECOMMENDATIONS_LOCK_KEY]);
  }
}
