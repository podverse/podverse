import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  campaignGetByIdTextMock,
  campaignMarkSendingMock,
  campaignMarkSentMock,
  claimDueBatchMock,
  dispatchAdminNotificationCampaignMock,
  listDuePendingBatchMock,
  loggerErrorMock,
  loggerInfoMock,
  loggerWarnMock,
  markCancelledMock,
  markCompletedMock,
  markFailedMock,
  parseAdminNotificationSendPayloadMock,
  releaseStaleRunningBeforeMock,
  requeueWithBackoffMock,
} = vi.hoisted(() => ({
  campaignGetByIdTextMock: vi.fn(),
  campaignMarkSendingMock: vi.fn(),
  campaignMarkSentMock: vi.fn(),
  claimDueBatchMock: vi.fn(),
  dispatchAdminNotificationCampaignMock: vi.fn(),
  listDuePendingBatchMock: vi.fn(),
  loggerErrorMock: vi.fn(),
  loggerInfoMock: vi.fn(),
  loggerWarnMock: vi.fn(),
  markCancelledMock: vi.fn(),
  markCompletedMock: vi.fn(),
  markFailedMock: vi.fn(),
  parseAdminNotificationSendPayloadMock: vi.fn(),
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

  class MockAdminNotificationCampaignService {
    getByIdText = campaignGetByIdTextMock;
    markSending = campaignMarkSendingMock;
    markSent = campaignMarkSentMock;
  }

  return {
    ADMIN_NOTIFICATION_SEND_JOB_TYPE: 'admin-notification-send',
    AdminNotificationCampaignService: MockAdminNotificationCampaignService,
    ScheduledJobService: MockScheduledJobService,
    dispatchAdminNotificationCampaign: dispatchAdminNotificationCampaignMock,
    parseAdminNotificationSendPayload: parseAdminNotificationSendPayloadMock,
  };
});

import { scheduledJobsRunDue } from './runDue.js';

const campaignJob = {
  attempts: 1,
  dedupe_key: 'admin-notification:campaign:abc',
  id: 18,
  job_type: 'admin-notification-send',
  max_attempts: 5,
  payload: { campaignIdText: 'abc' },
};

describe('scheduledJobsRunDue', () => {
  beforeEach(() => {
    campaignGetByIdTextMock.mockReset();
    campaignMarkSendingMock.mockReset();
    campaignMarkSentMock.mockReset();
    claimDueBatchMock.mockReset();
    dispatchAdminNotificationCampaignMock.mockReset();
    listDuePendingBatchMock.mockReset();
    loggerErrorMock.mockReset();
    loggerInfoMock.mockReset();
    loggerWarnMock.mockReset();
    markCancelledMock.mockReset();
    markCompletedMock.mockReset();
    markFailedMock.mockReset();
    parseAdminNotificationSendPayloadMock.mockReset();
    releaseStaleRunningBeforeMock.mockReset();
    requeueWithBackoffMock.mockReset();

    releaseStaleRunningBeforeMock.mockResolvedValue(0);
    claimDueBatchMock.mockResolvedValue([]);
    parseAdminNotificationSendPayloadMock.mockReturnValue({ campaignIdText: 'abc' });
  });

  it('runs dry-run listing without claiming jobs', async () => {
    listDuePendingBatchMock.mockResolvedValue([
      {
        attempts: 0,
        id: 9,
        job_type: 'admin-notification-send',
        max_attempts: 5,
        run_after: new Date('2026-03-01T00:00:00.000Z'),
      },
    ]);

    await scheduledJobsRunDue({ 'dry-run': '', _: [] });

    expect(listDuePendingBatchMock).toHaveBeenCalledTimes(1);
    expect(claimDueBatchMock).not.toHaveBeenCalled();
  });

  it('cancels rather than retries when the handler reports the work is moot', async () => {
    claimDueBatchMock.mockResolvedValue([campaignJob]);
    campaignGetByIdTextMock.mockResolvedValue(null);

    await scheduledJobsRunDue({ _: [] });

    expect(markCancelledMock).toHaveBeenCalledWith(18, 'Notification campaign not found');
    expect(dispatchAdminNotificationCampaignMock).not.toHaveBeenCalled();
    expect(markCompletedMock).not.toHaveBeenCalled();
    expect(requeueWithBackoffMock).not.toHaveBeenCalled();
  });

  it('marks completed after the handler succeeds', async () => {
    claimDueBatchMock.mockResolvedValue([campaignJob]);
    campaignGetByIdTextMock.mockResolvedValue({ id: 3 });

    await scheduledJobsRunDue({ _: [] });

    expect(dispatchAdminNotificationCampaignMock).toHaveBeenCalledTimes(1);
    expect(markCompletedMock).toHaveBeenCalledWith(18);
    expect(markCancelledMock).not.toHaveBeenCalled();
  });

  it('fails a job whose type has no registered handler', async () => {
    claimDueBatchMock.mockResolvedValue([
      {
        attempts: 0,
        dedupe_key: 'unrecognized:account:7',
        id: 21,
        job_type: 'not-a-real-job-type',
        max_attempts: 5,
        payload: {},
      },
    ]);

    await scheduledJobsRunDue({ _: [] });

    expect(markFailedMock).toHaveBeenCalledWith(
      21,
      'No handler registered for job_type=not-a-real-job-type'
    );
  });

  it('requeues with backoff when the handler throws and attempts remain', async () => {
    claimDueBatchMock.mockResolvedValue([campaignJob]);
    campaignGetByIdTextMock.mockRejectedValue(new Error('database unavailable'));

    await scheduledJobsRunDue({ _: [] });

    expect(requeueWithBackoffMock).toHaveBeenCalledWith(18, 'database unavailable', 10 * 60 * 1000);
    expect(markFailedMock).not.toHaveBeenCalled();
  });
});
