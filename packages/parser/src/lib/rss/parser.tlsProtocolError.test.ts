import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  handleGetRSSFeedMock,
  handleParsedFeedMock,
  handleRequestRSSFeedMock,
  feedLogUpdateMock,
  feedServiceTryStartParsingMock,
  feedServiceUpdateMock,
  warnMock,
  logErrorMock,
} = vi.hoisted(() => ({
  handleGetRSSFeedMock: vi.fn(),
  handleParsedFeedMock: vi.fn(),
  handleRequestRSSFeedMock: vi.fn(),
  feedLogUpdateMock: vi.fn(),
  feedServiceTryStartParsingMock: vi.fn(),
  feedServiceUpdateMock: vi.fn(),
  warnMock: vi.fn(),
  logErrorMock: vi.fn(),
}));

vi.mock('@parser/config/index.js', () => ({
  config: {
    parser: {
      addRemoteItemsToMQ: false,
    },
  },
}));

vi.mock('@parser/factories/loggerService.js', () => ({
  loggerService: {
    info: vi.fn(),
    warn: warnMock,
    logError: logErrorMock,
  },
}));

vi.mock('@parser/factories/timerManager.js', () => ({
  timerManager: {
    start: vi.fn(),
    end: vi.fn(),
    endAll: vi.fn(),
  },
}));

vi.mock('@parser/lib/rss/feed/feed.js', () => ({
  handleGetRSSFeed: handleGetRSSFeedMock,
  handleParsedFeed: handleParsedFeedMock,
  handleRequestRSSFeed: handleRequestRSSFeedMock,
}));

vi.mock('@parser/lib/rss/channel/channel.js', () => ({
  handleParsedChannel: vi.fn(),
}));

vi.mock('@parser/lib/rss/channel/channelSeason.js', () => ({
  handleParsedChannelSeasons: vi.fn(),
}));

vi.mock('@parser/lib/rss/item/item.js', () => ({
  handleParsedItems: vi.fn(),
}));

vi.mock('@parser/lib/rss/liveItem/liveItem.js', () => ({
  handleParsedLiveItems: vi.fn(),
}));

vi.mock('@parser/lib/rss/remoteItemParser.js', () => ({
  handleAllRemoteItemsFeedParsing: vi.fn(),
}));

vi.mock('../notifications/handleNewItemNotifications.js', () => ({
  handleNewItemNotifications: vi.fn(),
}));

vi.mock('../notifications/handleNewLiveItemNotifications.js', () => ({
  handleNewLiveItemNotifications: vi.fn(),
}));

vi.mock('../_request.js', () => ({
  _request: vi.fn(),
}));

vi.mock('@podverse/helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/helpers')>();
  return {
    ...actual,
    sleep: vi.fn(),
  };
});

vi.mock('@podverse/helpers-requests', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/helpers-requests')>();
  return {
    ...actual,
    getStatusCodeFromError: vi.fn(() => null),
  };
});

vi.mock('@podverse/parser-mapping', () => ({
  compatChannelImageDtos: vi.fn(() => []),
  compatItemImageDtos: vi.fn(() => []),
}));

vi.mock('@podverse/orm', () => ({
  ChannelSeasonService: class ChannelSeasonService {
    getChannelSeasonIndex = vi.fn();
  },
  ChannelService: class ChannelService {
    getOrCreateByFeed = vi.fn();
  },
  checkIfSpamFeed: vi.fn(() => false),
  FeedConditionSourceEnum: { Auto: 'auto' },
  FeedConditionTypeKeyEnum: {
    OversizedDetected: 'oversized_detected',
    SpamDetected: 'spam_detected',
  },
  FeedLifecycleStateKeyEnum: { Active: 'active' },
  FeedPolicyService: class FeedPolicyService {
    recomputePolicy = vi.fn(() => Promise.resolve({ parse_allowed: true }));
    getActiveConditionKeys = vi.fn(() => Promise.resolve([]));
    setCondition = vi.fn();
  },
  shouldAttemptFeedParseFromLifecycleAndPolicy: vi.fn(() => true),
  FeedLogService: class FeedLogService {
    get = vi.fn(() => Promise.resolve({ parse_errors: 0 }));
    update = feedLogUpdateMock;
  },
  FeedService: class FeedService {
    tryStartParsing = feedServiceTryStartParsingMock;
    refreshFeedPolicy = vi.fn(() => Promise.resolve({ parse_allowed: true }));
    update = feedServiceUpdateMock;
  },
  OnDemandParserEventService: class OnDemandParserEventService {
    getCountByAccountIdAndTypeSince = vi.fn();
    create = vi.fn();
  },
}));

import { parseRSSFeedAndSaveToDatabase } from './parser.js';

describe('parseRSSFeedAndSaveToDatabase TLS/protocol errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handleGetRSSFeedMock.mockResolvedValue({
      id: 202,
      url: 'https://rss.autopod.xyz/show/3785.rss',
      podcast_index_id: 3785,
      max_response_body_bytes_override: null,
      feed_lifecycle_state: {
        feed_lifecycle_state_type: { state_key: 'active' },
      },
    });
    feedServiceTryStartParsingMock.mockResolvedValue(true);
    feedServiceUpdateMock.mockResolvedValue({});
    feedLogUpdateMock.mockResolvedValue({});
    handleRequestRSSFeedMock.mockRejectedValue(
      new Error(
        'Unknown Error: write EPROTO SSL routines:tls_validate_record_header:wrong version number'
      )
    );
  });

  it('logs a TLS/protocol warning and does not call logError', async () => {
    const result = await parseRSSFeedAndSaveToDatabase(
      'https://rss.autopod.xyz/show/3785.rss',
      3785,
      {
        forceParse: false,
        onDemandParserEvent: {
          accountId: null,
          remoteParentPodcastIndexId: null,
          type: null,
        },
      }
    );

    expect(result).toEqual({ remoteItemsToParse: [], imageHints: [] });
    expect(warnMock).toHaveBeenCalledWith(
      expect.stringContaining('TLS/protocol error (feed skipped)')
    );
    expect(logErrorMock).not.toHaveBeenCalled();
    expect(feedLogUpdateMock).toHaveBeenCalled();
  });
});
