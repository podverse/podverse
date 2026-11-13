import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ScheduledJobStatusEnum } from '@podverse/helpers';

const { upsertByDedupeKeyMock } = vi.hoisted(() => ({
  upsertByDedupeKeyMock: vi.fn(),
}));

vi.mock('@orm/db/index.js', () => ({
  AppDataSourceRead: { getRepository: () => ({}) },
  AppDataSourceReadWrite: { getRepository: () => ({}) },
}));

vi.mock('@orm/services/account/scheduledJob.js', () => ({
  ScheduledJobService: class {
    upsertByDedupeKey = upsertByDedupeKeyMock;
  },
}));

import {
  buildV4MigrationFeedRetryDedupeKey,
  getV4MigrationFeedRetryBackoffMs,
  isV4MigrationFeedSettled,
  parseV4MigrationFeedRetryPayload,
  scheduleV4MigrationFeedRetry,
  V4_MIGRATION_FEED_RETRY_JOB_TYPE,
  V4_MIGRATION_FEED_RETRY_MAX_ATTEMPTS,
} from './v4MigrationFeedRetryScheduler.js';

const HOUR_MS = 60 * 60 * 1000;

describe('parseV4MigrationFeedRetryPayload', () => {
  it('accepts a positive integer feed id', () => {
    expect(parseV4MigrationFeedRetryPayload({ feedId: 42 })).toEqual({ feedId: 42 });
  });

  it('rejects a missing, string, or non-positive feed id', () => {
    expect(parseV4MigrationFeedRetryPayload({})).toBeNull();
    expect(parseV4MigrationFeedRetryPayload({ feedId: '42' })).toBeNull();
    expect(parseV4MigrationFeedRetryPayload({ feedId: 0 })).toBeNull();
    expect(parseV4MigrationFeedRetryPayload({ feedId: 1.5 })).toBeNull();
    expect(parseV4MigrationFeedRetryPayload(null)).toBeNull();
  });
});

describe('buildV4MigrationFeedRetryDedupeKey', () => {
  it('keys one job per feed', () => {
    expect(buildV4MigrationFeedRetryDedupeKey(42)).toBe('v4-migration-feed-retry:42');
  });
});

describe('scheduleV4MigrationFeedRetry', () => {
  beforeEach(() => {
    upsertByDedupeKeyMock.mockReset();
    upsertByDedupeKeyMock.mockResolvedValue({ id: 1 });
  });

  it('upserts by the feed dedupe key with six attempts', async () => {
    const runAfter = new Date('2026-11-12T06:00:00.000Z');

    await scheduleV4MigrationFeedRetry(42, runAfter);

    expect(upsertByDedupeKeyMock).toHaveBeenCalledWith({
      dedupe_key: 'v4-migration-feed-retry:42',
      job_type: V4_MIGRATION_FEED_RETRY_JOB_TYPE,
      max_attempts: V4_MIGRATION_FEED_RETRY_MAX_ATTEMPTS,
      payload: { feedId: 42 },
      run_after: runAfter,
    });
    expect(V4_MIGRATION_FEED_RETRY_MAX_ATTEMPTS).toBe(6);
  });
});

describe('getV4MigrationFeedRetryBackoffMs', () => {
  it('steps through 1 hour, 6 hours, 24 hours, 72 hours, and 168 hours', () => {
    expect([1, 2, 3, 4, 5].map(getV4MigrationFeedRetryBackoffMs)).toEqual([
      HOUR_MS,
      6 * HOUR_MS,
      24 * HOUR_MS,
      72 * HOUR_MS,
      168 * HOUR_MS,
    ]);
  });

  it('keeps the longest delay past the ladder', () => {
    expect(getV4MigrationFeedRetryBackoffMs(9)).toBe(168 * HOUR_MS);
  });
});

describe('isV4MigrationFeedSettled', () => {
  const finished = new Date('2026-11-01T00:00:00.000Z');
  const failed = new Date('2026-11-02T00:00:00.000Z');

  it('is settled once a parse has finished, whatever the retry job says', () => {
    expect(
      isV4MigrationFeedSettled({
        lastFinishedParseTime: finished,
        lastFailedParseTime: failed,
        retryJobStatus: ScheduledJobStatusEnum.Pending,
      })
    ).toBe(true);
  });

  it('waits while the retry job is pending or running', () => {
    for (const retryJobStatus of [ScheduledJobStatusEnum.Pending, ScheduledJobStatusEnum.Running]) {
      expect(
        isV4MigrationFeedSettled({
          lastFinishedParseTime: null,
          lastFailedParseTime: failed,
          retryJobStatus,
        })
      ).toBe(false);
    }
  });

  it('is settled when the retry job failed or was cancelled', () => {
    for (const retryJobStatus of [
      ScheduledJobStatusEnum.Failed,
      ScheduledJobStatusEnum.Cancelled,
    ]) {
      expect(
        isV4MigrationFeedSettled({
          lastFinishedParseTime: null,
          lastFailedParseTime: failed,
          retryJobStatus,
        })
      ).toBe(true);
    }
  });

  it('without a retry job, is settled after one failed parse and not before any parse', () => {
    expect(
      isV4MigrationFeedSettled({
        lastFinishedParseTime: null,
        lastFailedParseTime: failed,
        retryJobStatus: null,
      })
    ).toBe(true);
    expect(
      isV4MigrationFeedSettled({
        lastFinishedParseTime: null,
        lastFailedParseTime: null,
        retryJobStatus: null,
      })
    ).toBe(false);
  });
});
