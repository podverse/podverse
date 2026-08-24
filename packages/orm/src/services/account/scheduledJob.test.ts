import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ScheduledJobStatusEnum } from '@podverse/helpers';

const { findMock, findOneMock, saveMock } = vi.hoisted(() => ({
  findMock: vi.fn(),
  findOneMock: vi.fn(),
  saveMock: vi.fn(),
}));

const { ScheduledJobEntity } = vi.hoisted(() => ({
  ScheduledJobEntity: class ScheduledJob {},
}));

vi.mock('@orm/db/index.js', () => ({
  AppDataSourceRead: {
    getRepository: () => ({
      findOne: findOneMock,
    }),
  },
  AppDataSourceReadWrite: {
    getRepository: () => ({
      find: findMock,
      findOne: findOneMock,
      save: saveMock,
      create: (row: unknown) => row,
    }),
  },
}));

vi.mock('@orm/entities/account/scheduledJob.js', () => ({
  ScheduledJob: ScheduledJobEntity,
}));

import { ScheduledJobService } from './scheduledJob.js';

describe('ScheduledJobService', () => {
  beforeEach(() => {
    findMock.mockReset();
    findOneMock.mockReset();
    saveMock.mockReset();
  });

  it('upsertByDedupeKey creates a pending row when none exists', async () => {
    findOneMock.mockResolvedValueOnce(null);
    saveMock.mockImplementation(async (row) => ({ id: 5, ...row }));

    const service = new ScheduledJobService();
    const result = await service.upsertByDedupeKey({
      dedupe_key: 'membership-expiry:account:9',
      job_type: 'membership-expiry-reminder',
      payload: { account_id: 9 },
      run_after: new Date('2026-06-10T00:00:00.000Z'),
    });

    expect(result).toMatchObject({
      id: 5,
      dedupe_key: 'membership-expiry:account:9',
      status: ScheduledJobStatusEnum.Pending,
      attempts: 0,
      max_attempts: 5,
    });
  });

  it('upsertByDedupeKey resets existing row to pending state', async () => {
    findOneMock.mockResolvedValueOnce({
      attempts: 3,
      dedupe_key: 'membership-expiry:account:9',
      id: 9,
      last_error: 'timeout',
      locked_at: new Date('2026-01-01T00:00:00.000Z'),
      locked_by: 'worker-a',
      max_attempts: 8,
      payload: { stale: true },
      run_after: new Date('2026-01-01T00:00:00.000Z'),
      status: ScheduledJobStatusEnum.Failed,
    });
    saveMock.mockImplementation(async (row) => row);

    const service = new ScheduledJobService();
    const result = await service.upsertByDedupeKey({
      dedupe_key: 'membership-expiry:account:9',
      job_type: 'membership-expiry-reminder',
      payload: { account_id: 9 },
      run_after: new Date('2026-06-20T00:00:00.000Z'),
    });

    expect(result).toMatchObject({
      dedupe_key: 'membership-expiry:account:9',
      last_error: null,
      locked_at: null,
      locked_by: null,
      status: ScheduledJobStatusEnum.Pending,
    });
  });

  it('claimDueBatch marks due pending rows as running and increments attempts', async () => {
    findMock.mockResolvedValueOnce([
      {
        attempts: 0,
        id: 11,
        run_after: new Date('2026-05-01T00:00:00.000Z'),
        status: ScheduledJobStatusEnum.Pending,
      },
    ]);
    saveMock.mockImplementation(async (rows) => rows);

    const service = new ScheduledJobService();
    const claimed = await service.claimDueBatch({
      limit: 10,
      now: new Date('2026-05-02T00:00:00.000Z'),
      worker_id: 'worker-1',
    });

    expect(claimed).toHaveLength(1);
    expect(claimed[0]).toMatchObject({
      attempts: 1,
      locked_by: 'worker-1',
      status: ScheduledJobStatusEnum.Running,
    });
  });
});
