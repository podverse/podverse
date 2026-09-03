import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ScheduledJobStatusEnum } from '@podverse/helpers';

const { deleteMock, findReadMock, findWriteMock, findOneMock, saveMock, updateMock } = vi.hoisted(
  () => ({
    deleteMock: vi.fn(),
    findReadMock: vi.fn(),
    findWriteMock: vi.fn(),
    findOneMock: vi.fn(),
    saveMock: vi.fn(),
    updateMock: vi.fn(),
  })
);

const { ScheduledJobEntity } = vi.hoisted(() => ({
  ScheduledJobEntity: class ScheduledJob {},
}));

vi.mock('@orm/db/index.js', () => ({
  AppDataSourceRead: {
    getRepository: () => ({
      find: findReadMock,
      findOne: findOneMock,
    }),
  },
  AppDataSourceReadWrite: {
    getRepository: () => ({
      delete: deleteMock,
      find: findWriteMock,
      findOne: findOneMock,
      save: saveMock,
      create: (row: unknown) => row,
      update: updateMock,
    }),
  },
}));

vi.mock('@orm/entities/account/scheduledJob.js', () => ({
  ScheduledJob: ScheduledJobEntity,
}));

import { ScheduledJobService } from './scheduledJob.js';

describe('ScheduledJobService', () => {
  beforeEach(() => {
    deleteMock.mockReset();
    findReadMock.mockReset();
    findWriteMock.mockReset();
    findOneMock.mockReset();
    saveMock.mockReset();
    updateMock.mockReset();
  });

  it('upsertByDedupeKey creates a pending row when none exists', async () => {
    findOneMock.mockResolvedValueOnce(null);
    saveMock.mockImplementation(async (row) => ({ id: 5, ...row }));

    const service = new ScheduledJobService();
    const result = await service.upsertByDedupeKey({
      dedupe_key: 'admin-notification:campaign:abc',
      job_type: 'admin-notification-send',
      payload: { account_id: 9 },
      run_after: new Date('2026-06-10T00:00:00.000Z'),
    });

    expect(result).toMatchObject({
      id: 5,
      dedupe_key: 'admin-notification:campaign:abc',
      status: ScheduledJobStatusEnum.Pending,
      attempts: 0,
      max_attempts: 5,
    });
  });

  it('upsertByDedupeKey resets existing row to pending state', async () => {
    findOneMock.mockResolvedValueOnce({
      attempts: 3,
      dedupe_key: 'admin-notification:campaign:abc',
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
      dedupe_key: 'admin-notification:campaign:abc',
      job_type: 'admin-notification-send',
      payload: { account_id: 9 },
      run_after: new Date('2026-06-20T00:00:00.000Z'),
    });

    expect(result).toMatchObject({
      dedupe_key: 'admin-notification:campaign:abc',
      last_error: null,
      locked_at: null,
      locked_by: null,
      status: ScheduledJobStatusEnum.Pending,
    });
  });

  it('claimDueBatch marks due pending rows as running and increments attempts', async () => {
    findWriteMock.mockResolvedValueOnce([
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

  it('listDuePendingBatch returns pending rows without claiming', async () => {
    const now = new Date('2026-05-02T00:00:00.000Z');
    findReadMock.mockResolvedValueOnce([
      {
        id: 12,
        run_after: new Date('2026-05-01T00:00:00.000Z'),
        status: ScheduledJobStatusEnum.Pending,
      },
    ]);

    const service = new ScheduledJobService();
    const rows = await service.listDuePendingBatch({ limit: 50, now });

    expect(rows).toHaveLength(1);
    expect(findReadMock).toHaveBeenCalledTimes(1);
    expect(findReadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
      })
    );
  });

  it('markCancelled updates a claimed job status to cancelled', async () => {
    findOneMock.mockResolvedValueOnce({
      id: 33,
      last_error: null,
      locked_at: new Date('2026-01-01T00:00:00.000Z'),
      locked_by: 'worker-a',
      status: ScheduledJobStatusEnum.Running,
    });
    saveMock.mockImplementation(async (row) => row);

    const service = new ScheduledJobService();
    const result = await service.markCancelled(33, 'membership no longer valid');

    expect(result).toMatchObject({
      id: 33,
      last_error: 'membership no longer valid',
      locked_at: null,
      locked_by: null,
      status: ScheduledJobStatusEnum.Cancelled,
    });
  });

  it('releaseStaleRunningBefore resets running rows with old lock timestamps', async () => {
    updateMock.mockResolvedValueOnce({ affected: 2 });

    const service = new ScheduledJobService();
    const affected = await service.releaseStaleRunningBefore(new Date('2026-01-01T00:00:00.000Z'));

    expect(affected).toBe(2);
    expect(updateMock).toHaveBeenCalledTimes(1);
  });

  it('deleteTerminalBefore removes completed, cancelled, and failed rows only', async () => {
    deleteMock.mockResolvedValueOnce({ affected: 4 });

    const service = new ScheduledJobService();
    const deleted = await service.deleteTerminalBefore(new Date('2026-01-01T00:00:00.000Z'));

    expect(deleted).toBe(4);
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(deleteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: expect.any(Object),
        updated_at: expect.any(Object),
      })
    );
  });
});
