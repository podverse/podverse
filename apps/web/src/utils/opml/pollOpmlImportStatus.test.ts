import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OpmlImportStatusResponse } from '@podverse/helpers-requests';

const { reqAccountOpmlImportStatusMock, sleepMock } = vi.hoisted(() => ({
  reqAccountOpmlImportStatusMock: vi.fn(),
  sleepMock: vi.fn(async () => {}),
}));

vi.mock('../../factories/apiRequestService', () => ({
  getApiRequestService: () => ({
    reqAccountOpmlImportStatus: reqAccountOpmlImportStatusMock,
  }),
}));

vi.mock('@podverse/helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/helpers')>();
  return {
    ...actual,
    sleep: sleepMock,
  };
});

import { pollOpmlImportStatus } from './pollOpmlImportStatus';

const buildStatus = (status: OpmlImportStatusResponse['status']): OpmlImportStatusResponse => ({
  requestId: 'req-1',
  accountId: 1,
  status,
  totals: {
    total: 1,
    subscribed: 0,
    enqueuedIndexed: 0,
    addedByRss: 0,
    failed: 0,
    skippedExisting: 0,
    rateLimited: 0,
  },
  results: [],
  updatedAt: new Date().toISOString(),
});

describe('pollOpmlImportStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sleepMock.mockResolvedValue(undefined);
  });

  it('polls until completed and invokes onStatusUpdate for each poll', async () => {
    reqAccountOpmlImportStatusMock
      .mockResolvedValueOnce(buildStatus('processing'))
      .mockResolvedValueOnce(buildStatus('processing'))
      .mockResolvedValueOnce(buildStatus('completed'));
    const onStatusUpdate = vi.fn();

    const result = await pollOpmlImportStatus({ requestId: 'req-1', onStatusUpdate });

    expect(result.status).toBe('completed');
    expect(reqAccountOpmlImportStatusMock).toHaveBeenCalledTimes(3);
    expect(onStatusUpdate).toHaveBeenCalledTimes(3);
    // Two non-terminal polls sleep; the terminal poll returns immediately.
    expect(sleepMock).toHaveBeenCalledTimes(2);
  });

  it('returns immediately on a failed terminal status', async () => {
    reqAccountOpmlImportStatusMock.mockResolvedValueOnce(buildStatus('failed'));
    const onStatusUpdate = vi.fn();

    const result = await pollOpmlImportStatus({ requestId: 'req-1', onStatusUpdate });

    expect(result.status).toBe('failed');
    expect(reqAccountOpmlImportStatusMock).toHaveBeenCalledTimes(1);
    expect(sleepMock).not.toHaveBeenCalled();
  });

  it('throws when the job never reaches a terminal state within the attempt budget', async () => {
    reqAccountOpmlImportStatusMock.mockResolvedValue(buildStatus('processing'));
    const onStatusUpdate = vi.fn();

    await expect(
      pollOpmlImportStatus({ requestId: 'req-timeout', onStatusUpdate })
    ).rejects.toThrow(/timed out/i);
    // The loop is bounded; it must stop polling instead of looping forever.
    expect(reqAccountOpmlImportStatusMock).toHaveBeenCalledTimes(100);
  });
});
