import { beforeEach, describe, expect, it, vi } from 'vitest';

const { deleteExpiredBeforeMock, deleteTerminalBeforeMock, loggerInfoMock } = vi.hoisted(() => ({
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

describe('notificationsPlatformPurge', () => {
  beforeEach(() => {
    deleteExpiredBeforeMock.mockReset();
    deleteTerminalBeforeMock.mockReset();
    loggerInfoMock.mockReset();

    deleteExpiredBeforeMock.mockResolvedValue(5);
    deleteTerminalBeforeMock.mockResolvedValue(3);
  });

  it('purges expired notifications and old terminal jobs', async () => {
    await notificationsPlatformPurge({ _: [] });

    expect(deleteExpiredBeforeMock).toHaveBeenCalledTimes(1);
    expect(deleteTerminalBeforeMock).toHaveBeenCalledTimes(1);
    expect(loggerInfoMock).toHaveBeenCalledTimes(2);
  });
});
