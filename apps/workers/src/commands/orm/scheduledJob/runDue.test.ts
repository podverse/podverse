import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  accountGetMock,
  claimDueBatchMock,
  createAccountNotificationWithOptionalPushMock,
  listDuePendingBatchMock,
  loggerErrorMock,
  loggerInfoMock,
  loggerWarnMock,
  markCancelledMock,
  markCompletedMock,
  markFailedMock,
  releaseStaleRunningBeforeMock,
  requeueWithBackoffMock,
} = vi.hoisted(() => ({
  accountGetMock: vi.fn(),
  claimDueBatchMock: vi.fn(),
  createAccountNotificationWithOptionalPushMock: vi.fn(),
  listDuePendingBatchMock: vi.fn(),
  loggerErrorMock: vi.fn(),
  loggerInfoMock: vi.fn(),
  loggerWarnMock: vi.fn(),
  markCancelledMock: vi.fn(),
  markCompletedMock: vi.fn(),
  markFailedMock: vi.fn(),
  releaseStaleRunningBeforeMock: vi.fn(),
  requeueWithBackoffMock: vi.fn(),
}));

vi.mock('@workers/factories/logger.js', () => ({
  getLogger: () => ({
    error: loggerErrorMock,
    info: loggerInfoMock,
    warn: loggerWarnMock,
  }),
}));

vi.mock('@podverse/orm', () => {
  class MockScheduledJobService {
    claimDueBatch = claimDueBatchMock;
    listDuePendingBatch = listDuePendingBatchMock;
    markCancelled = markCancelledMock;
    markCompleted = markCompletedMock;
    markFailed = markFailedMock;
    releaseStaleRunningBefore = releaseStaleRunningBeforeMock;
    requeueWithBackoff = requeueWithBackoffMock;
  }

  class MockAccountService {
    get = accountGetMock;
  }

  class MockAdminNotificationCampaignService {
    getByIdText = vi.fn();
    markSending = vi.fn();
    markSent = vi.fn();
  }

  return {
    ADMIN_NOTIFICATION_SEND_JOB_TYPE: 'admin-notification-send',
    AccountService: MockAccountService,
    AdminNotificationCampaignService: MockAdminNotificationCampaignService,
    MEMBERSHIP_EXPIRY_REMINDER_JOB_TYPE: 'membership-expiry-reminder',
    ScheduledJobService: MockScheduledJobService,
    createAccountNotificationWithOptionalPush: createAccountNotificationWithOptionalPushMock,
    dispatchAdminNotificationCampaign: vi.fn(),
    parseAdminNotificationSendPayload: () => null,
    parseMembershipExpiryReminderPayload: (payload: Record<string, unknown>) => {
      const accountId = payload.accountId;
      const expiresAt = payload.expiresAt;
      if (typeof accountId !== 'number' || typeof expiresAt !== 'string') {
        return null;
      }
      const parsedDate = new Date(expiresAt);
      if (Number.isNaN(parsedDate.getTime())) {
        return null;
      }
      return {
        accountId,
        expiresAt: parsedDate,
        expiresAtIso: expiresAt,
      };
    },
  };
});

import { scheduledJobsRunDue } from './runDue.js';

describe('scheduledJobsRunDue', () => {
  beforeEach(() => {
    accountGetMock.mockReset();
    claimDueBatchMock.mockReset();
    createAccountNotificationWithOptionalPushMock.mockReset();
    listDuePendingBatchMock.mockReset();
    loggerErrorMock.mockReset();
    loggerInfoMock.mockReset();
    loggerWarnMock.mockReset();
    markCancelledMock.mockReset();
    markCompletedMock.mockReset();
    markFailedMock.mockReset();
    releaseStaleRunningBeforeMock.mockReset();
    requeueWithBackoffMock.mockReset();

    releaseStaleRunningBeforeMock.mockResolvedValue(0);
    claimDueBatchMock.mockResolvedValue([]);
  });

  it('runs dry-run listing without claiming jobs', async () => {
    listDuePendingBatchMock.mockResolvedValue([
      {
        attempts: 0,
        id: 9,
        job_type: 'membership-expiry-reminder',
        max_attempts: 5,
        run_after: new Date('2026-03-01T00:00:00.000Z'),
      },
    ]);

    await scheduledJobsRunDue({ 'dry-run': '', _: [] });

    expect(listDuePendingBatchMock).toHaveBeenCalledTimes(1);
    expect(claimDueBatchMock).not.toHaveBeenCalled();
  });

  it('cancels stale membership reminder when expiry changed', async () => {
    claimDueBatchMock.mockResolvedValue([
      {
        attempts: 1,
        dedupe_key: 'membership-expiry:account:7',
        id: 17,
        job_type: 'membership-expiry-reminder',
        max_attempts: 5,
        payload: {
          accountId: 7,
          expiresAt: '2099-03-10T00:00:00.000Z',
        },
      },
    ]);
    accountGetMock.mockResolvedValue({
      account_membership_status: {
        membership_expires_at: new Date('2099-03-12T00:00:00.000Z'),
      },
      id: 7,
    });

    await scheduledJobsRunDue({ _: [] });

    expect(markCancelledMock).toHaveBeenCalledWith(
      17,
      'Membership expiration changed before reminder execution'
    );
    expect(createAccountNotificationWithOptionalPushMock).not.toHaveBeenCalled();
    expect(markCompletedMock).not.toHaveBeenCalled();
  });

  it('creates in-app reminder and marks completed when membership still matches payload', async () => {
    claimDueBatchMock.mockResolvedValue([
      {
        attempts: 1,
        dedupe_key: 'membership-expiry:account:8',
        id: 18,
        job_type: 'membership-expiry-reminder',
        max_attempts: 5,
        payload: {
          accountId: 8,
          expiresAt: '2099-03-10T00:00:00.000Z',
        },
      },
    ]);
    accountGetMock.mockResolvedValue({
      account_membership_status: {
        membership_expires_at: new Date('2099-03-10T00:00:00.000Z'),
      },
      id: 8,
    });
    createAccountNotificationWithOptionalPushMock.mockResolvedValue([]);

    await scheduledJobsRunDue({ _: [] });

    expect(createAccountNotificationWithOptionalPushMock).toHaveBeenCalledTimes(1);
    expect(markCompletedMock).toHaveBeenCalledWith(18);
    expect(markCancelledMock).not.toHaveBeenCalled();
  });
});
