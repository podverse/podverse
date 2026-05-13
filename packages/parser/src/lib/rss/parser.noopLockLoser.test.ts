import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  handleAllRemoteItemsFeedParsingMock,
  handleGetRSSFeedMock,
  handleNewItemNotificationsMock,
  handleNewLiveItemNotificationsMock,
  handleParsedChannelMock,
  handleParsedChannelSeasonsMock,
  handleParsedFeedMock,
  handleParsedItemsMock,
  handleParsedLiveItemsMock,
  handleRequestRSSFeedMock,
  feedLogUpdateMock,
  feedServiceTryStartParsingMock,
  feedServiceUpdateMock,
  onDemandCreateMock,
  onDemandGetCountMock,
  accountGetMock,
  warnMock,
} = vi.hoisted(() => ({
  handleAllRemoteItemsFeedParsingMock: vi.fn(),
  handleGetRSSFeedMock: vi.fn(),
  handleNewItemNotificationsMock: vi.fn(),
  handleNewLiveItemNotificationsMock: vi.fn(),
  handleParsedChannelMock: vi.fn(),
  handleParsedChannelSeasonsMock: vi.fn(),
  handleParsedFeedMock: vi.fn(),
  handleParsedItemsMock: vi.fn(),
  handleParsedLiveItemsMock: vi.fn(),
  handleRequestRSSFeedMock: vi.fn(),
  feedLogUpdateMock: vi.fn(),
  feedServiceTryStartParsingMock: vi.fn(),
  feedServiceUpdateMock: vi.fn(),
  onDemandCreateMock: vi.fn(),
  onDemandGetCountMock: vi.fn(),
  accountGetMock: vi.fn(),
  warnMock: vi.fn(),
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
    logError: vi.fn(),
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
  handleParsedChannel: handleParsedChannelMock,
}));

vi.mock('@parser/lib/rss/channel/channelSeason.js', () => ({
  handleParsedChannelSeasons: handleParsedChannelSeasonsMock,
}));

vi.mock('@parser/lib/rss/item/item.js', () => ({
  handleParsedItems: handleParsedItemsMock,
}));

vi.mock('@parser/lib/rss/liveItem/liveItem.js', () => ({
  handleParsedLiveItems: handleParsedLiveItemsMock,
}));

vi.mock('@parser/lib/rss/remoteItemParser.js', () => ({
  handleAllRemoteItemsFeedParsing: handleAllRemoteItemsFeedParsingMock,
}));

vi.mock('../notifications/handleNewItemNotifications.js', () => ({
  handleNewItemNotifications: handleNewItemNotificationsMock,
}));

vi.mock('../notifications/handleNewLiveItemNotifications.js', () => ({
  handleNewLiveItemNotifications: handleNewLiveItemNotificationsMock,
}));

vi.mock('../_request.js', () => ({
  _request: vi.fn(),
}));

vi.mock('@podverse/helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/helpers')>();
  return {
    ...actual,
    DEFAULT_HTTP_TIMEOUT_MS: 1000,
    getOnDemandParserEventDateRange: vi.fn(() => new Date()),
    ON_DEMAND_ADD_PARSER_LIMIT: 999,
    ON_DEMAND_REFRESH_PARSER_LIMIT: 999,
    OnDemandParserEventType: {
      ADD: 'ADD',
      REFRESH: 'REFRESH',
    },
    sleep: vi.fn(),
  };
});

vi.mock('@podverse/helpers-requests', () => ({
  getStatusCodeFromError: vi.fn(() => null),
}));

vi.mock('@podverse/parser-mapping', () => ({
  compatChannelImageDtos: vi.fn(() => []),
  compatItemImageDtos: vi.fn(() => []),
}));

vi.mock('@podverse/orm', () => ({
  AccountService: class AccountService {
    get = accountGetMock;
  },
  ChannelSeasonService: class ChannelSeasonService {
    getChannelSeasonIndex = vi.fn();
  },
  ChannelService: class ChannelService {
    getOrCreateByFeed = vi.fn();
  },
  checkIfSpamFeed: vi.fn(() => false),
  FeedConditionSourceEnum: {
    Auto: 'auto',
  },
  FeedConditionTypeKeyEnum: {
    OversizedDetected: 'oversized_detected',
    SpamDetected: 'spam_detected',
  },
  FeedLifecycleStateKeyEnum: {
    Active: 'active',
    PendingArchive: 'pending_archive',
    Archived: 'archived',
    Takedown: 'takedown',
  },
  FeedPolicyService: class FeedPolicyService {
    recomputePolicy = vi.fn(() => Promise.resolve({ parse_allowed: true }));
    getActiveConditionKeys = vi.fn(() => Promise.resolve([]));
    setCondition = vi.fn();
  },
  shouldAttemptFeedParseFromLifecycleAndPolicy: vi.fn(() => true),
  FeedLogService: class FeedLogService {
    get = vi.fn();
    update = feedLogUpdateMock;
  },
  FeedService: class FeedService {
    tryStartParsing = feedServiceTryStartParsingMock;
    refreshFeedPolicy = vi.fn(() => Promise.resolve({ parse_allowed: true }));
    update = feedServiceUpdateMock;
  },
  OnDemandParserEventService: class OnDemandParserEventService {
    getCountByAccountIdAndTypeSince = onDemandGetCountMock;
    create = onDemandCreateMock;
  },
}));

import { OnDemandParserEventType } from '@podverse/helpers';

import { parseRSSFeedAndSaveToDatabase } from './parser.js';

describe('parseRSSFeedAndSaveToDatabase lock loser no-op', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handleGetRSSFeedMock.mockResolvedValue({
      id: 101,
      url: 'https://canonical.example.com/feed',
      podcast_index_id: 5778820,
      max_response_body_bytes_override: null,
      feed_lifecycle_state: {
        feed_lifecycle_state_type: { state_key: 'active' },
      },
    });
    feedServiceTryStartParsingMock.mockResolvedValue(false);
    onDemandGetCountMock.mockResolvedValue(0);
    accountGetMock.mockResolvedValue({ id: 1 });
  });

  it('returns early with no writes when parsing lock is not acquired', async () => {
    const result = await parseRSSFeedAndSaveToDatabase('https://new.example.com/feed', 5778820, {
      forceParse: false,
      onDemandParserEvent: {
        accountId: 1,
        remoteParentPodcastIndexId: null,
        type: OnDemandParserEventType.ADD,
      },
    });

    expect(result).toEqual({
      remoteItemsToParse: [],
      imageHints: [],
    });

    expect(handleRequestRSSFeedMock).not.toHaveBeenCalled();
    expect(handleParsedFeedMock).not.toHaveBeenCalled();
    expect(handleParsedChannelSeasonsMock).not.toHaveBeenCalled();
    expect(handleParsedChannelMock).not.toHaveBeenCalled();
    expect(handleParsedItemsMock).not.toHaveBeenCalled();
    expect(handleParsedLiveItemsMock).not.toHaveBeenCalled();
    expect(handleNewItemNotificationsMock).not.toHaveBeenCalled();
    expect(handleNewLiveItemNotificationsMock).not.toHaveBeenCalled();
    expect(handleAllRemoteItemsFeedParsingMock).not.toHaveBeenCalled();
    expect(feedLogUpdateMock).not.toHaveBeenCalled();
    expect(feedServiceUpdateMock).not.toHaveBeenCalled();
    expect(onDemandCreateMock).not.toHaveBeenCalled();
    expect(accountGetMock).not.toHaveBeenCalled();
    expect(warnMock).toHaveBeenCalledWith('Feed 101 is already parsing.');
  });
});
