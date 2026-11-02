import { getDataSourceReadWrite } from '@orm/context.js';
import type { PodcastIndexStreamKeyEnum } from '@orm/entities/feed/podcastIndexStreamCursor.js';
import { PodcastIndexStreamCursor } from '@orm/entities/feed/podcastIndexStreamCursor.js';
import { readQueryResultRows } from '@orm/lib/queryResultRows.js';
import type { Repository } from 'typeorm';

export type PodcastIndexStreamCursorState = {
  streamKey: string;
  nextSince: number;
  position: number | null;
  updatedAt: Date;
};

export type PodcastIndexStreamCursorAdvance = {
  streamKey: PodcastIndexStreamKeyEnum;
  nextSince: number;
  position: number | null;
};

export type PodcastIndexStreamExclusiveRun<T> = { acquired: true; result: T } | { acquired: false };

/**
 * Upsert that only moves `next_since` forward. A smaller `next_since` leaves the row untouched;
 * a null `position` keeps the stored one.
 */
const ADVANCE_SQL = `
  INSERT INTO public.podcast_index_stream_cursor AS existing (stream_key, next_since, "position")
  VALUES ($1, $2, $3)
  ON CONFLICT (stream_key) DO UPDATE SET
    next_since = EXCLUDED.next_since,
    "position" = COALESCE(EXCLUDED."position", existing."position")
  WHERE EXCLUDED.next_since >= existing.next_since
`;

const REPLACE_SQL = `
  INSERT INTO public.podcast_index_stream_cursor (stream_key, next_since, "position")
  VALUES ($1, $2, $3)
  ON CONFLICT (stream_key) DO UPDATE SET
    next_since = EXCLUDED.next_since,
    "position" = EXCLUDED."position"
`;

const CLEAR_SQL = `DELETE FROM public.podcast_index_stream_cursor WHERE stream_key = $1`;

const TRY_LOCK_SQL = `SELECT pg_try_advisory_lock(hashtextextended('podcast_index_stream_cursor:' || $1::text, 0)) AS locked`;
const UNLOCK_SQL = `SELECT pg_advisory_unlock(hashtextextended('podcast_index_stream_cursor:' || $1::text, 0))`;

export class PodcastIndexStreamCursorService {
  private repositoryReadWrite: Repository<PodcastIndexStreamCursor>;

  constructor() {
    this.repositoryReadWrite = getDataSourceReadWrite().getRepository(PodcastIndexStreamCursor);
  }

  async get(streamKey: PodcastIndexStreamKeyEnum): Promise<PodcastIndexStreamCursorState | null> {
    const row = await this.repositoryReadWrite.findOne({ where: { stream_key: streamKey } });
    return row === null ? null : stateFromRow(row);
  }

  /** Saves the stream position. Never moves `next_since` backwards; returns the stored state. */
  async advance(params: PodcastIndexStreamCursorAdvance): Promise<PodcastIndexStreamCursorState> {
    await this.repositoryReadWrite.query(ADVANCE_SQL, [
      params.streamKey,
      params.nextSince,
      params.position,
    ]);
    const stored = await this.get(params.streamKey);
    if (stored === null) {
      throw new Error(
        `PodcastIndexStreamCursorService.advance: cursor ${params.streamKey} missing after upsert`
      );
    }
    return stored;
  }

  /**
   * Writes exactly these values, including a smaller `next_since` or a null `position`. For rows
   * that are not forward-only streams, such as `gap_sweep` progress.
   */
  async replace(params: PodcastIndexStreamCursorAdvance): Promise<void> {
    await this.repositoryReadWrite.query(REPLACE_SQL, [
      params.streamKey,
      params.nextSince,
      params.position,
    ]);
  }

  async clear(streamKey: PodcastIndexStreamKeyEnum): Promise<void> {
    await this.repositoryReadWrite.query(CLEAR_SQL, [streamKey]);
  }

  /**
   * Runs `run` while holding a session advisory lock for the stream on one dedicated connection,
   * so two runs never read the same stream at once. Returns `{ acquired: false }` without calling
   * `run` when another session holds the lock. The lock ends with the connection if the process
   * dies.
   */
  async withExclusiveRun<T>(
    streamKey: PodcastIndexStreamKeyEnum,
    run: () => Promise<T>
  ): Promise<PodcastIndexStreamExclusiveRun<T>> {
    const queryRunner = getDataSourceReadWrite().createQueryRunner();
    try {
      await queryRunner.connect();
      const lockResult: unknown = await queryRunner.query(TRY_LOCK_SQL, [streamKey]);
      const lockRow = readQueryResultRows(lockResult)?.[0];
      const locked = isRecord(lockRow) && lockRow.locked === true;
      if (!locked) {
        return { acquired: false };
      }
      try {
        return { acquired: true, result: await run() };
      } finally {
        await queryRunner.query(UNLOCK_SQL, [streamKey]);
      }
    } finally {
      await queryRunner.release();
    }
  }
}

function stateFromRow(row: PodcastIndexStreamCursor): PodcastIndexStreamCursorState {
  const nextSince = finiteInteger(row.next_since);
  if (nextSince === null) {
    throw new Error(`podcast_index_stream_cursor ${row.stream_key} has a non-numeric next_since`);
  }
  return {
    streamKey: row.stream_key,
    nextSince,
    position: finiteInteger(row.position),
    updatedAt: row.updated_at,
  };
}

function finiteInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
