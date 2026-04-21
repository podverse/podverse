import { describe, expect, it } from 'vitest';

import {
  chunkIdsForInClause,
  mergeHistoryListOptions,
  QUEUE_HISTORY_DEFAULT_TAKE,
  QUEUE_HISTORY_MAX_TAKE,
  QUEUE_IN_CLAUSE_MAX_IDS,
  sanitizeQueueHistoryTakeSkip,
} from './queueResourceListGuardrails.js';

describe('sanitizeQueueHistoryTakeSkip', () => {
  it('defaults take when omitted', () => {
    expect(sanitizeQueueHistoryTakeSkip(undefined)).toEqual({
      take: QUEUE_HISTORY_DEFAULT_TAKE,
      skip: 0,
    });
  });

  it('clamps excessive take to the policy max', () => {
    expect(sanitizeQueueHistoryTakeSkip({ take: 999_999 })).toEqual({
      take: QUEUE_HISTORY_MAX_TAKE,
      skip: 0,
    });
  });

  it('preserves normal take values', () => {
    expect(sanitizeQueueHistoryTakeSkip({ take: 60 })).toEqual({
      take: 60,
      skip: 0,
    });
  });

  it('clamps skip and preserves take', () => {
    expect(sanitizeQueueHistoryTakeSkip({ take: 100, skip: 2_000_000 })).toEqual({
      take: 100,
      skip: 1_000_000,
    });
  });

  it('coerces invalid take to default', () => {
    expect(sanitizeQueueHistoryTakeSkip({ take: Number.NaN })).toEqual({
      take: QUEUE_HISTORY_DEFAULT_TAKE,
      skip: 0,
    });
    expect(sanitizeQueueHistoryTakeSkip({ take: 0 })).toEqual({
      take: QUEUE_HISTORY_DEFAULT_TAKE,
      skip: 0,
    });
  });
});

describe('mergeHistoryListOptions', () => {
  it('does not allow callers to override fixed where clause via passthrough spread', () => {
    const base = {
      where: { id: 1 },
      order: { id: 'DESC' as const },
      relations: ['a'],
    };

    const merged = mergeHistoryListOptions(base, {
      where: { id: 999 },
      take: 5000,
    });

    expect(merged.where).toEqual({ id: 1 });
    expect(merged.take).toBe(QUEUE_HISTORY_MAX_TAKE);
  });
});

describe('chunkIdsForInClause', () => {
  it('chunks large id lists into bounded batches', () => {
    const ids = Array.from({ length: QUEUE_IN_CLAUSE_MAX_IDS + 50 }, (_, i) => i + 1);
    const chunks = chunkIdsForInClause(ids, QUEUE_IN_CLAUSE_MAX_IDS);
    expect(chunks.length).toBe(2);
    expect(chunks[0]?.length).toBe(QUEUE_IN_CLAUSE_MAX_IDS);
    expect(chunks[1]?.length).toBe(50);
  });
});
