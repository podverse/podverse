import type { QueueResource } from '@orm/entities/queue/queueResource.js';
import type { FindManyOptions } from 'typeorm';

import { PAGINATION } from '@podverse/helpers';

/** Hard cap per history request (aligned with API pagination ceilings). */
export const QUEUE_HISTORY_MAX_TAKE = PAGINATION.MAX_COUNT;

/** Default page size when callers omit `take` (bounded history reads). */
export const QUEUE_HISTORY_DEFAULT_TAKE = PAGINATION.DEFAULT_LIMIT;

/** Max identifiers per SQL `IN (...)` clause for queue scoped reads. */
export const QUEUE_IN_CLAUSE_MAX_IDS = PAGINATION.MAX_COUNT;

/** Prevent absurd offset scans from oversized page numbers. */
const QUEUE_HISTORY_MAX_SKIP = 1_000_000;

export function chunkIdsForInClause<T>(ids: readonly T[], chunkSize: number): T[][] {
  const size = Math.max(1, Math.min(chunkSize, QUEUE_IN_CLAUSE_MAX_IDS));
  const chunks: T[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size) as T[]);
  }
  return chunks;
}

/**
 * Normalize TypeORM list options for queue history reads.
 * Only `take` / `skip` are honored from input (see `mergeHistoryListOptions`).
 */
export function sanitizeQueueHistoryTakeSkip(options?: FindManyOptions<QueueResource>): {
  take: number;
  skip: number;
} {
  let take: number;
  if (options?.take === undefined) {
    take = QUEUE_HISTORY_DEFAULT_TAKE;
  } else {
    const n = Number(options.take);
    if (!Number.isFinite(n) || n < 1) {
      take = QUEUE_HISTORY_DEFAULT_TAKE;
    } else {
      take = Math.min(Math.max(1, Math.floor(n)), QUEUE_HISTORY_MAX_TAKE);
    }
  }

  let skip = 0;
  if (options?.skip !== undefined) {
    const s = Number(options.skip);
    if (Number.isFinite(s) && s >= 0) {
      skip = Math.min(Math.floor(s), QUEUE_HISTORY_MAX_SKIP);
    }
  }

  return { take, skip };
}

/**
 * Merge caller options with guarded take/skip only — never spread arbitrary `FindManyOptions`
 * after fixed `where`/`order` (would allow query widening).
 */
export function mergeHistoryListOptions(
  base: FindManyOptions<QueueResource>,
  options?: FindManyOptions<QueueResource>
): FindManyOptions<QueueResource> {
  const { take, skip } = sanitizeQueueHistoryTakeSkip(options);
  return {
    ...base,
    relations: options?.relations ?? base.relations,
    take,
    skip,
  };
}
