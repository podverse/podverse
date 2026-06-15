/**
 * Parser ↔ condition activation coverage; aligns with parity matrix **07b** scenarios involving
 * `spam_detected` / lifecycle-driven parsing (see `packages/orm/src/lib/feedEffectivePolicyComputed.test.ts`).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const conditionMocks = vi.hoisted(() => ({
  shouldAttemptFeedParseFromLifecycleAndPolicy: vi.fn(() => true),
  tryStartParsing: vi.fn(() => true),
  refreshFeedPolicy: vi.fn(() => Promise.resolve({ parse_allowed: true })),
  setCondition: vi.fn(() => Promise.resolve()),
  recomputePolicy: vi.fn(() => Promise.resolve({ parse_allowed: true })),
  getActiveConditionKeys: vi.fn(() => Promise.resolve([])),
}));

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
  feedServiceUpdateMock,
  onDemandCreateMock,
  onDemandGetCountMock,
  accountGetMock,
  warnMock,
  logErrorMock,
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
  feedServiceUpdateMock: vi.fn(),
  onDemandCreateMock: vi.fn(),
  onDemandGetCountMock: vi.fn(),
  accountGetMock: vi.fn(),
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
    resolveParserMaxFeedBodyBytes: vi.fn(() => 10_000_000),
    sleep: vi.fn(),
  };
});

vi.mock('@podverse/helpers-requests', () => ({
  getStatusCodeFromError: vi.fn(() => null),
  isTlsOrProtocolError: vi.fn(() => false),
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
    getChannelSeasonIndex = vi.fn().mockResolvedValue({});
  },
  ChannelService: class ChannelService {
    getOrCreateByFeed = vi.fn().mockResolvedValue({ id: 1, id_text: 'c1' });
  },
  checkIfSpamFeed: vi.fn(() => false),
  DEFAULT_SPAM_FEED_ITEM_THRESHOLDS: {
    defaultLimit: 10_000,
    spamPermittedLimit: 100_000,
  },
  FeedConditionSourceEnum: {
    Auto: 'auto',
  },
  FeedConditionTypeKeyEnum: {
    OversizedDetected: 'oversized_detected',
    SpamDetected: 'spam_detected',
    SpamPermitted: 'spam_permitted',
  },
  FeedLifecycleStateKeyEnum: {
    Active: 'active',
    PendingArchive: 'pending_archive',
    Archived: 'archived',
    Takedown: 'takedown',
  },
  FeedPolicyService: class FeedPolicyService {
    recomputePolicy = conditionMocks.recomputePolicy;
    setCondition = conditionMocks.setCondition;
    getActiveConditionKeys = conditionMocks.getActiveConditionKeys;
  },
  FeedLogService: class FeedLogService {
    get = vi.fn().mockResolvedValue(null);
    update = feedLogUpdateMock;
  },
  FeedService: class FeedService {
    tryStartParsing = conditionMocks.tryStartParsing;
    refreshFeedPolicy = conditionMocks.refreshFeedPolicy;
    update = feedServiceUpdateMock;
  },
  OnDemandParserEventService: class OnDemandParserEventService {
    getCountByAccountIdAndTypeSince = onDemandGetCountMock;
    create = onDemandCreateMock;
  },
  resolveSpamFeedItemThresholds: vi.fn((t: unknown) => t),
  shouldAttemptFeedParseFromLifecycleAndPolicy:
    conditionMocks.shouldAttemptFeedParseFromLifecycleAndPolicy,
}));

import { OnDemandParserEventType } from '@podverse/helpers';
import { FeedConditionSourceEnum, FeedConditionTypeKeyEnum } from '@podverse/orm';

import { parseRSSFeedAndSaveToDatabase } from './parser.js';

const baseFeed = {
  id: 202,
  url: 'https://example.com/feed.xml',
  podcast_index_id: 9001,
  max_response_body_bytes_override: null,
  spam_item_limit_override: null,
  feed_lifecycle_state: {
    feed_lifecycle_state_type: { state_key: 'active' },
  },
};

describe('parseRSSFeedAndSaveToDatabase condition / policy gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    conditionMocks.shouldAttemptFeedParseFromLifecycleAndPolicy.mockReturnValue(true);
    conditionMocks.tryStartParsing.mockResolvedValue(true);
    conditionMocks.recomputePolicy.mockResolvedValue({ parse_allowed: true });
    conditionMocks.getActiveConditionKeys.mockResolvedValue([]);
    handleGetRSSFeedMock.mockResolvedValue(baseFeed);
    handleRequestRSSFeedMock.mockResolvedValue({
      items: [],
      podcastLiveItems: [],
    });
    handleParsedFeedMock.mockImplementation(async (_parsed: unknown, f: { id: number }) => f);
    handleParsedChannelSeasonsMock.mockResolvedValue(undefined);
    handleParsedChannelMock.mockResolvedValue(undefined);
    handleParsedItemsMock.mockResolvedValue({
      newItemGuids: [],
      newItemGuidEnclosureUrls: [],
    });
    handleParsedLiveItemsMock.mockResolvedValue({
      pendingItemGuids: [],
      liveItemGuids: [],
    });
    onDemandGetCountMock.mockResolvedValue(0);
    accountGetMock.mockResolvedValue({ id: 1 });
    feedServiceUpdateMock.mockImplementation(async (_id: number, dto: unknown) => dto);
  });

  it('does not acquire parsing lock when lifecycle/policy gate denies parse', async () => {
    conditionMocks.shouldAttemptFeedParseFromLifecycleAndPolicy.mockReturnValue(false);

    const result = await parseRSSFeedAndSaveToDatabase('https://example.com/feed.xml', 9001, {
      forceParse: true,
      onDemandParserEvent: {
        accountId: 1,
        remoteParentPodcastIndexId: null,
        type: OnDemandParserEventType.ADD,
      },
    });

    expect(result).toEqual({ remoteItemsToParse: [], imageHints: [] });
    expect(conditionMocks.tryStartParsing).not.toHaveBeenCalled();
    expect(handleRequestRSSFeedMock).not.toHaveBeenCalled();
    expect(logErrorMock).toHaveBeenCalled();
  });

  it('sets oversized_detected and refreshes policy when HTTP path exceeds max response bytes', async () => {
    handleRequestRSSFeedMock.mockRejectedValue(new Error('maxbodylength exceeded'));

    const result = await parseRSSFeedAndSaveToDatabase('https://example.com/feed.xml', 9001, {
      forceParse: true,
      onDemandParserEvent: {
        accountId: null,
        remoteParentPodcastIndexId: null,
        type: null,
      },
    });

    expect(result).toEqual({ remoteItemsToParse: [], imageHints: [] });

    expect(conditionMocks.setCondition).toHaveBeenCalledWith(
      expect.objectContaining({
        feedId: baseFeed.id,
        conditionKey: FeedConditionTypeKeyEnum.OversizedDetected,
        isActive: true,
        source: FeedConditionSourceEnum.Auto,
      })
    );
    expect(conditionMocks.refreshFeedPolicy).toHaveBeenCalledWith(baseFeed.id);

    const spamActivations = conditionMocks.setCondition.mock.calls.filter(
      (call) =>
        call[0]?.conditionKey === FeedConditionTypeKeyEnum.SpamDetected &&
        call[0]?.isActive === true
    );
    expect(spamActivations).toHaveLength(0);
  });
});
