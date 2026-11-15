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
  decideMigrationFeedRetry,
  getV4MigrationFeedRetryBackoffMs,
  isV4MigrationFeedSettled,
  parseV4MigrationFeedRetryPayload,
  scheduleV4MigrationFeedRetry,
  V4_MIGRATION_FEED_PERMANENT_MAX_ATTEMPTS,
  V4_MIGRATION_FEED_RETRY_FIRST_DELAY_MS,
  V4_MIGRATION_FEED_RETRY_JOB_TYPE,
  V4_MIGRATION_FEED_RETRY_MAX_ATTEMPTS,
} from './v4MigrationFeedRetryScheduler.js';

const HOUR_MS = 60 * 60 * 1000;

describe('parseV4MigrationFeedRetryPayload', () => {
  it('accepts a positive integer feed id and reads a missing schedule as standard', () => {
    expect(parseV4MigrationFeedRetryPayload({ feedId: 42 })).toEqual({
      feedId: 42,
      schedule: 'standard',
    });
    expect(parseV4MigrationFeedRetryPayload({ feedId: 42, schedule: 'rehearsal' })).toEqual({
      feedId: 42,
      schedule: 'rehearsal',
    });
  });

  it('rejects a missing, string, or non-positive feed id, and an unknown schedule', () => {
    expect(parseV4MigrationFeedRetryPayload({})).toBeNull();
    expect(parseV4MigrationFeedRetryPayload({ feedId: '42' })).toBeNull();
    expect(parseV4MigrationFeedRetryPayload({ feedId: 0 })).toBeNull();
    expect(parseV4MigrationFeedRetryPayload({ feedId: 1.5 })).toBeNull();
    expect(parseV4MigrationFeedRetryPayload(null)).toBeNull();
    expect(parseV4MigrationFeedRetryPayload({ feedId: 42, schedule: 'fast' })).toBeNull();
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
    expect(V4_MIGRATION_FEED_PERMANENT_MAX_ATTEMPTS).toBe(2);
    expect(V4_MIGRATION_FEED_RETRY_FIRST_DELAY_MS).toBe(15 * 60 * 1000);
  });

  it('writes the rehearsal schedule into the payload', async () => {
    const runAfter = new Date('2026-11-12T06:00:00.000Z');

    await scheduleV4MigrationFeedRetry(42, runAfter, 'rehearsal');

    expect(upsertByDedupeKeyMock).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { feedId: 42, schedule: 'rehearsal' } })
    );
  });
});

describe('getV4MigrationFeedRetryBackoffMs', () => {
  it('steps through 1 hour, 6 hours, and then one day', () => {
    expect([1, 2, 3, 4, 5].map((attempts) => getV4MigrationFeedRetryBackoffMs(attempts))).toEqual([
      HOUR_MS,
      6 * HOUR_MS,
      24 * HOUR_MS,
      24 * HOUR_MS,
      24 * HOUR_MS,
    ]);
  });

  it('keeps a one day delay past the ladder', () => {
    expect(getV4MigrationFeedRetryBackoffMs(6)).toBe(24 * HOUR_MS);
    expect(getV4MigrationFeedRetryBackoffMs(9)).toBe(24 * HOUR_MS);
  });

  it('steps through minutes on the rehearsal schedule and keeps 30 minutes past it', () => {
    const minute = 60 * 1000;
    expect(
      [1, 2, 3, 4, 5, 9].map((attempts) => getV4MigrationFeedRetryBackoffMs(attempts, 'rehearsal'))
    ).toEqual([2 * minute, 5 * minute, 10 * minute, 15 * minute, 30 * minute, 30 * minute]);
  });
});

describe('decideMigrationFeedRetry', () => {
  it('retries a permanent failure on the first attempt', () => {
    expect(decideMigrationFeedRetry(1, 'http_404')).toEqual({
      action: 'retry',
      message: 'Migration feed parse failed: reason=http_404',
    });
  });

  it('fails a permanent failure on the second attempt', () => {
    expect(decideMigrationFeedRetry(2, 'http_404')).toEqual({
      action: 'fail',
      reason: 'http_404',
    });
  });

  it('retries a timeout on the fifth attempt', () => {
    expect(decideMigrationFeedRetry(5, 'timeout')).toEqual({
      action: 'retry',
      message: 'Migration feed parse failed: reason=timeout',
    });
  });

  it('retries a missing reason as unknown', () => {
    expect(decideMigrationFeedRetry(4, null)).toEqual({
      action: 'retry',
      message: 'Migration feed parse failed: reason=unknown',
    });
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
