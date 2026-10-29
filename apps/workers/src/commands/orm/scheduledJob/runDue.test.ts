import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  campaignGetByIdTextMock,
  campaignMarkSendingMock,
  campaignMarkSentMock,
  claimDueBatchMock,
  dispatchAdminNotificationCampaignMock,
  feedGetMock,
  feedGetByPodcastIndexIdMock,
  getIndexProviderMock,
  listDuePendingBatchMock,
  loggerErrorMock,
  loggerInfoMock,
  loggerWarnMock,
  markCancelledMock,
  markCompletedMock,
  markFailedMock,
  parseAdminNotificationSendPayloadMock,
  parsePodcastIndexFeedDirectlyMock,
  recheckRemoteChannelStubMock,
  releaseStaleRunningBeforeMock,
  repointRemoteChannelStubMock,
  requeueWithBackoffMock,
  shouldAttemptFeedParseMock,
} = vi.hoisted(() => ({
  campaignGetByIdTextMock: vi.fn(),
  campaignMarkSendingMock: vi.fn(),
  campaignMarkSentMock: vi.fn(),
  claimDueBatchMock: vi.fn(),
  dispatchAdminNotificationCampaignMock: vi.fn(),
  feedGetMock: vi.fn(),
  feedGetByPodcastIndexIdMock: vi.fn(),
  getIndexProviderMock: vi.fn(),
  listDuePendingBatchMock: vi.fn(),
  loggerErrorMock: vi.fn(),
  loggerInfoMock: vi.fn(),
  loggerWarnMock: vi.fn(),
  markCancelledMock: vi.fn(),
  markCompletedMock: vi.fn(),
  markFailedMock: vi.fn(),
  parseAdminNotificationSendPayloadMock: vi.fn(),
  parsePodcastIndexFeedDirectlyMock: vi.fn(),
  recheckRemoteChannelStubMock: vi.fn(),
  releaseStaleRunningBeforeMock: vi.fn(),
  repointRemoteChannelStubMock: vi.fn(),
  requeueWithBackoffMock: vi.fn(),
  shouldAttemptFeedParseMock: vi.fn(),
}));

vi.mock('@workers/commands/parser/rss/parseFeed.js', () => ({
  parsePodcastIndexFeedDirectly: parsePodcastIndexFeedDirectlyMock,
}));

vi.mock('@workers/config/index.js', () => ({
  getPodcastIndexConfig: () => ({ rateLimitDelay: 333 }),
}));

vi.mock('@workers/factories/indexProvider.js', () => ({
  getIndexProvider: getIndexProviderMock,
}));

vi.mock('@workers/factories/logger.js', () => ({
  getLogger: () => ({
    error: loggerErrorMock,
    info: loggerInfoMock,
    warn: loggerWarnMock,
  }),
}));

vi.mock('@workers/lib/remoteStubs/remoteStubActions.js', () => ({
  recheckRemoteChannelStub: recheckRemoteChannelStubMock,
  repointRemoteChannelStub: repointRemoteChannelStubMock,
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

  class MockFeedService {
    get = feedGetMock;
    getByPodcastIndexId = feedGetByPodcastIndexIdMock;
  }

  return {
    ADMIN_NOTIFICATION_SEND_JOB_TYPE: 'admin-notification-send',
    AdminNotificationCampaignService: MockAdminNotificationCampaignService,
    FEED_FORCE_REPARSE_JOB_TYPE: 'feed-force-reparse',
    FeedLifecycleStateKeyEnum: { Active: 'active' },
    FeedService: MockFeedService,
    REMOTE_STUB_PROMOTE_JOB_TYPE: 'remote-stub-promote',
    REMOTE_STUB_RECHECK_JOB_TYPE: 'remote-stub-recheck',
    REMOTE_STUB_REPOINT_JOB_TYPE: 'remote-stub-repoint',
    ScheduledJobService: MockScheduledJobService,
    dispatchAdminNotificationCampaign: dispatchAdminNotificationCampaignMock,
    parseAdminNotificationSendPayload: parseAdminNotificationSendPayloadMock,
    parseFeedForceReparsePayload: (payload: { feedId?: unknown }) =>
      typeof payload.feedId === 'number'
        ? { feedId: payload.feedId, reason: 'description_tier_change' }
        : null,
    parseRemoteStubPromotePayload: (payload: {
      indexProvider?: unknown;
      providerFeedId?: unknown;
    }) =>
      payload.indexProvider === 'podcast_index' && typeof payload.providerFeedId === 'string'
        ? { indexProvider: payload.indexProvider, providerFeedId: payload.providerFeedId.trim() }
        : null,
    parseRemoteStubRecheckPayload: (payload: { remoteChannelStubId?: unknown }) =>
      typeof payload.remoteChannelStubId === 'number'
        ? { remoteChannelStubId: payload.remoteChannelStubId }
        : null,
    parseRemoteStubRepointPayload: (payload: {
      remoteChannelStubId?: unknown;
      targetProviderFeedId?: unknown;
    }) =>
      typeof payload.remoteChannelStubId === 'number' &&
      typeof payload.targetProviderFeedId === 'string' &&
      payload.targetProviderFeedId.trim() !== ''
        ? {
            remoteChannelStubId: payload.remoteChannelStubId,
            targetProviderFeedId: payload.targetProviderFeedId.trim(),
          }
        : null,
    shouldAttemptFeedParseFromLifecycleAndPolicy: shouldAttemptFeedParseMock,
  };
});

import { scheduledJobsRunDue } from './runDue.js';

const reparseJob = {
  attempts: 1,
  created_at: new Date('2026-10-01T12:00:00.000Z'),
  dedupe_key: 'feed-force-reparse:55',
  id: 31,
  job_type: 'feed-force-reparse',
  max_attempts: 5,
  payload: { feedId: 55, reason: 'description_tier_change' },
};

const campaignJob = {
  attempts: 1,
  dedupe_key: 'admin-notification:campaign:abc',
  id: 18,
  job_type: 'admin-notification-send',
  max_attempts: 5,
  payload: { campaignIdText: 'abc' },
};

const recheckJob = {
  attempts: 1,
  created_at: new Date('2026-10-01T12:00:00.000Z'),
  dedupe_key: 'remote-stub-recheck:77',
  id: 41,
  job_type: 'remote-stub-recheck',
  max_attempts: 5,
  payload: { remoteChannelStubId: 77 },
};

const repointJob = {
  attempts: 1,
  created_at: new Date('2026-10-01T12:00:00.000Z'),
  dedupe_key: 'remote-stub-repoint:78',
  id: 42,
  job_type: 'remote-stub-repoint',
  max_attempts: 5,
  payload: { remoteChannelStubId: 78, targetProviderFeedId: '9002' },
};

const promoteJob = {
  attempts: 1,
  created_at: new Date('2026-10-01T12:00:00.000Z'),
  dedupe_key: 'remote-stub-promote:podcast_index:9055',
  id: 43,
  job_type: 'remote-stub-promote',
  max_attempts: 5,
  payload: { indexProvider: 'podcast_index', providerFeedId: '9055' },
};

describe('scheduledJobsRunDue', () => {
  beforeEach(() => {
    campaignGetByIdTextMock.mockReset();
    campaignMarkSendingMock.mockReset();
    campaignMarkSentMock.mockReset();
    claimDueBatchMock.mockReset();
    dispatchAdminNotificationCampaignMock.mockReset();
    feedGetByPodcastIndexIdMock.mockReset();
    getIndexProviderMock.mockReset();
    listDuePendingBatchMock.mockReset();
    loggerErrorMock.mockReset();
    loggerInfoMock.mockReset();
    loggerWarnMock.mockReset();
    markCancelledMock.mockReset();
    markCompletedMock.mockReset();
    markFailedMock.mockReset();
    parseAdminNotificationSendPayloadMock.mockReset();
    recheckRemoteChannelStubMock.mockReset();
    releaseStaleRunningBeforeMock.mockReset();
    repointRemoteChannelStubMock.mockReset();
    requeueWithBackoffMock.mockReset();
    shouldAttemptFeedParseMock.mockReset();
    parsePodcastIndexFeedDirectlyMock.mockReset();

    releaseStaleRunningBeforeMock.mockResolvedValue(0);
    claimDueBatchMock.mockResolvedValue([]);
    parseAdminNotificationSendPayloadMock.mockReturnValue({ campaignIdText: 'abc' });
    getIndexProviderMock.mockReturnValue({ id: 'podcast_index' });
    recheckRemoteChannelStubMock.mockResolvedValue('refreshed');
    repointRemoteChannelStubMock.mockResolvedValue('repointed');
    feedGetByPodcastIndexIdMock.mockResolvedValue(null);
    shouldAttemptFeedParseMock.mockReturnValue(true);
    parsePodcastIndexFeedDirectlyMock.mockResolvedValue(undefined);
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

  describe('feed-force-reparse', () => {
    beforeEach(() => {
      feedGetMock.mockReset();
      parsePodcastIndexFeedDirectlyMock.mockReset();
      shouldAttemptFeedParseMock.mockReset();
      claimDueBatchMock.mockResolvedValue([reparseJob]);
      shouldAttemptFeedParseMock.mockReturnValue(true);
      parsePodcastIndexFeedDirectlyMock.mockResolvedValue(undefined);
    });

    it('cancels when the feed no longer exists', async () => {
      feedGetMock.mockResolvedValue(null);

      await scheduledJobsRunDue({ _: [] });

      expect(markCancelledMock).toHaveBeenCalledWith(31, 'Feed not found');
      expect(parsePodcastIndexFeedDirectlyMock).not.toHaveBeenCalled();
    });

    it('cancels when the feed may not be parsed', async () => {
      feedGetMock.mockResolvedValue({
        id: 55,
        podcast_index_id: 9055,
        feed_lifecycle_state: { feed_lifecycle_state_type: { state_key: 'merged' } },
        feed_policy: null,
      });
      shouldAttemptFeedParseMock.mockReturnValue(false);

      await scheduledJobsRunDue({ _: [] });

      expect(markCancelledMock).toHaveBeenCalledWith(
        31,
        'Feed may not be parsed (lifecycle=merged)'
      );
      expect(parsePodcastIndexFeedDirectlyMock).not.toHaveBeenCalled();
    });

    it('force parses and suppresses notifications for items older than the job', async () => {
      feedGetMock.mockResolvedValue({
        id: 55,
        podcast_index_id: 9055,
        feed_lifecycle_state: null,
        feed_policy: null,
      });

      await scheduledJobsRunDue({ _: [] });

      expect(parsePodcastIndexFeedDirectlyMock).toHaveBeenCalledWith(9055, true, {
        enqueueFollowUpWork: true,
        suppressNewItemSideEffectsPublishedBeforeMs: reparseJob.created_at.getTime(),
      });
      expect(markCompletedMock).toHaveBeenCalledWith(31);
    });
  });

  describe('remote-stub jobs', () => {
    it('dispatches each remote-stub job type to its handler', async () => {
      claimDueBatchMock.mockResolvedValue([recheckJob, repointJob, promoteJob]);

      await scheduledJobsRunDue({ _: [] });

      expect(recheckRemoteChannelStubMock).toHaveBeenCalledWith(
        { id: 'podcast_index' },
        77,
        { rateLimitDelayMs: 333 }
      );
      expect(repointRemoteChannelStubMock).toHaveBeenCalledWith(
        { id: 'podcast_index' },
        78,
        '9002'
      );
      expect(parsePodcastIndexFeedDirectlyMock).toHaveBeenCalledWith(9055, true, {
        enqueueFollowUpWork: true,
        suppressNewItemSideEffectsPublishedBeforeMs: promoteJob.created_at.getTime(),
      });
    });

    it('cancels recheck when the remote stub is missing', async () => {
      claimDueBatchMock.mockResolvedValue([recheckJob]);
      recheckRemoteChannelStubMock.mockResolvedValue('missing');

      await scheduledJobsRunDue({ _: [] });

      expect(markCancelledMock).toHaveBeenCalledWith(41, 'Remote stub not found');
      expect(requeueWithBackoffMock).not.toHaveBeenCalled();
    });

    it('requeues recheck when the index provider is unavailable', async () => {
      claimDueBatchMock.mockResolvedValue([recheckJob]);
      recheckRemoteChannelStubMock.mockResolvedValue('unavailable');

      await scheduledJobsRunDue({ _: [] });

      expect(requeueWithBackoffMock).toHaveBeenCalledWith(
        41,
        'Index provider unavailable',
        10 * 60 * 1000
      );
      expect(markCancelledMock).not.toHaveBeenCalledWith(41, expect.any(String));
    });

    it('cancels repoint when the target provider feed is not found', async () => {
      claimDueBatchMock.mockResolvedValue([repointJob]);
      repointRemoteChannelStubMock.mockResolvedValue('target_not_found');

      await scheduledJobsRunDue({ _: [] });

      expect(markCancelledMock).toHaveBeenCalledWith(42, 'Target provider feed not found');
      expect(markCompletedMock).not.toHaveBeenCalledWith(42);
    });

    it('promotes by force parsing and suppresses side effects older than job creation', async () => {
      claimDueBatchMock.mockResolvedValue([promoteJob]);

      await scheduledJobsRunDue({ _: [] });

      expect(parsePodcastIndexFeedDirectlyMock).toHaveBeenCalledWith(9055, true, {
        enqueueFollowUpWork: true,
        suppressNewItemSideEffectsPublishedBeforeMs: promoteJob.created_at.getTime(),
      });
      expect(markCompletedMock).toHaveBeenCalledWith(43);
    });

    it('cancels promote when feed lifecycle and policy block parsing', async () => {
      claimDueBatchMock.mockResolvedValue([promoteJob]);
      feedGetByPodcastIndexIdMock.mockResolvedValue({
        id: 55,
        podcast_index_id: 9055,
        feed_lifecycle_state: { feed_lifecycle_state_type: { state_key: 'merged' } },
        feed_policy: null,
      });
      shouldAttemptFeedParseMock.mockReturnValue(false);

      await scheduledJobsRunDue({ _: [] });

      expect(markCancelledMock).toHaveBeenCalledWith(
        43,
        'Feed may not be parsed (lifecycle=merged)'
      );
      expect(parsePodcastIndexFeedDirectlyMock).not.toHaveBeenCalled();
    });

    it('cancels promote when provider feed id is not a positive Podcast Index id', async () => {
      claimDueBatchMock.mockResolvedValue([
        {
          ...promoteJob,
          payload: { indexProvider: 'podcast_index', providerFeedId: 'abc' },
        },
      ]);

      await scheduledJobsRunDue({ _: [] });

      expect(markCancelledMock).toHaveBeenCalledWith(43, 'Invalid Podcast Index feed id');
      expect(parsePodcastIndexFeedDirectlyMock).not.toHaveBeenCalled();
    });
  });
});
