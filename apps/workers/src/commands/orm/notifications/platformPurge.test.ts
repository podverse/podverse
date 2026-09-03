import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_NOTIFICATION_RETENTION_DAYS,
  DEFAULT_SCHEDULED_JOB_RETENTION_DAYS,
  ONE_DAY_MS,
} from '@podverse/helpers';

const {
  deleteCreatedBeforeMock,
  deleteExpiredBeforeMock,
  deleteTerminalBeforeMock,
  loggerInfoMock,
} = vi.hoisted(() => ({
  deleteCreatedBeforeMock: vi.fn(),
  deleteExpiredBeforeMock: vi.fn(),
  deleteTerminalBeforeMock: vi.fn(),
  loggerInfoMock: vi.fn(),
}));

vi.mock('@workers/factories/logger.js', () => ({
  getLogger: () => ({
    info: loggerInfoMock,
  }),
}));

vi.mock('@podverse/orm', () => {
  class MockAccountNotificationService {
    deleteCreatedBefore = deleteCreatedBeforeMock;
    deleteExpiredBefore = deleteExpiredBeforeMock;
  }

  class MockScheduledJobService {
    deleteTerminalBefore = deleteTerminalBeforeMock;
  }

  return {
    AccountNotificationService: MockAccountNotificationService,
    ScheduledJobService: MockScheduledJobService,
  };
});

import { notificationsPlatformPurge } from './platformPurge.js';

const NOW = new Date('2026-06-15T12:00:00.000Z');

describe('notificationsPlatformPurge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    deleteCreatedBeforeMock.mockReset();
    deleteExpiredBeforeMock.mockReset();
    deleteTerminalBeforeMock.mockReset();
    loggerInfoMock.mockReset();

    deleteExpiredBeforeMock.mockResolvedValue(5);
    deleteCreatedBeforeMock.mockResolvedValue(7);
    deleteTerminalBeforeMock.mockResolvedValue(3);
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.NOTIFICATION_RETENTION_DAYS;
    delete process.env.SCHEDULED_JOB_RETENTION_DAYS;
  });

  it('deletes notifications past their own expiry as of now', async () => {
    await notificationsPlatformPurge({ _: [] });

    expect(deleteExpiredBeforeMock).toHaveBeenCalledTimes(1);
    expect(deleteExpiredBeforeMock).toHaveBeenCalledWith(NOW);
  });

  it('deletes notifications older than the retention window regardless of expiry', async () => {
    await notificationsPlatformPurge({ _: [] });

    expect(deleteCreatedBeforeMock).toHaveBeenCalledTimes(1);
    expect(deleteCreatedBeforeMock.mock.calls[0]?.[0]).toEqual(
      new Date(NOW.getTime() - DEFAULT_NOTIFICATION_RETENTION_DAYS * ONE_DAY_MS)
    );
  });

  it('gives finished scheduled jobs their own retention window', async () => {
    process.env.NOTIFICATION_RETENTION_DAYS = '10';
    process.env.SCHEDULED_JOB_RETENTION_DAYS = '90';

    await notificationsPlatformPurge({ _: [] });

    expect(deleteCreatedBeforeMock.mock.calls[0]?.[0]).toEqual(
      new Date(NOW.getTime() - 10 * ONE_DAY_MS)
    );
    expect(deleteTerminalBeforeMock.mock.calls[0]?.[0]).toEqual(
      new Date(NOW.getTime() - 90 * ONE_DAY_MS)
    );
  });

  it('falls back to the default scheduled job retention window', async () => {
    await notificationsPlatformPurge({ _: [] });

    expect(deleteTerminalBeforeMock).toHaveBeenCalledTimes(1);
    expect(deleteTerminalBeforeMock.mock.calls[0]?.[0]).toEqual(
      new Date(NOW.getTime() - DEFAULT_SCHEDULED_JOB_RETENTION_DAYS * ONE_DAY_MS)
    );
  });
});
