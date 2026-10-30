/**
 * Parser post-save coverage for parseRSSFeedAndSaveToDatabase: failure timestamps,
 * hash-on-success, and notification call order.
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
  handleNewItemAutoDownloadPushesMock,
  handleNewItemNotificationsMock,
  handleNewLiveItemNotificationsMock,
  handleParsedChannelMock,
  handleParsedChannelSeasonsMock,
  handleParsedFeedMock,
  handleParsedItemsMock,
  handleParsedLiveItemsMock,
  itemGetManyByGuidMock,
  itemGetManyByGuidEnclosureUrlMock,
  handleRequestRSSFeedMock,
  feedLogGetMock,
  feedLogUpdateMock,
  feedServiceUpdateMock,
  onDemandCreateMock,
  onDemandGetCountMock,
  pendingFollowGetMock,
  pendingFollowRemoveMock,
  followChannelMock,
  accountGetMock,
  logErrorMock,
  getOrCreateByFeedMock,
} = vi.hoisted(() => ({
  handleAllRemoteItemsFeedParsingMock: vi.fn(),
  handleGetRSSFeedMock: vi.fn(),
  handleNewItemAutoDownloadPushesMock: vi.fn(),
  handleNewItemNotificationsMock: vi.fn(),
  handleNewLiveItemNotificationsMock: vi.fn(),
  handleParsedChannelMock: vi.fn(),
  handleParsedChannelSeasonsMock: vi.fn(),
  handleParsedFeedMock: vi.fn(),
  handleParsedItemsMock: vi.fn(),
  handleParsedLiveItemsMock: vi.fn(),
  itemGetManyByGuidMock: vi.fn(),
  itemGetManyByGuidEnclosureUrlMock: vi.fn(),
  handleRequestRSSFeedMock: vi.fn(),
  feedLogGetMock: vi.fn(),
  feedLogUpdateMock: vi.fn(),
  feedServiceUpdateMock: vi.fn(),
  onDemandCreateMock: vi.fn(),
  onDemandGetCountMock: vi.fn(),
  pendingFollowGetMock: vi.fn(),
  pendingFollowRemoveMock: vi.fn(),
  followChannelMock: vi.fn(),
  accountGetMock: vi.fn(),
  logErrorMock: vi.fn(),
  getOrCreateByFeedMock: vi.fn(),
}));

vi.mock('@parser/config/index.js', () => ({
  config: {
    parser: {
      addRemoteItemsToMQ: false,
    },
  },
}));

vi.mock('@parser/context.js', () => ({
  getParserConfig: vi.fn(() => ({ parser: undefined })),
  getPodcastIndexService: vi.fn(() => ({
    podcastGetById: vi.fn().mockResolvedValue(null),
  })),
}));

vi.mock('@parser/factories/loggerService.js', () => ({
  loggerService: {
    info: vi.fn(),
    warn: vi.fn(),
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

vi.mock('../notifications/handleNewItemAutoDownloadPushes.js', () => ({
  handleNewItemAutoDownloadPushes: handleNewItemAutoDownloadPushesMock,
}));

vi.mock('../notifications/handleNewLiveItemNotifications.js', () => ({
  handleNewLiveItemNotifications: handleNewLiveItemNotificationsMock,
}));

vi.mock('../notifications/handleNewRemoteItemNotifications.js', () => ({
  handleNewRemoteItemNotifications: vi.fn(),
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
    getOrCreateByFeed = getOrCreateByFeedMock;
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
    get = feedLogGetMock;
    update = feedLogUpdateMock;
  },
  FeedService: class FeedService {
    tryStartParsing = conditionMocks.tryStartParsing;
    refreshFeedPolicy = conditionMocks.refreshFeedPolicy;
    update = feedServiceUpdateMock;
  },
  ItemService: class ItemService {
    getManyByGuid = itemGetManyByGuidMock;
    getManyByGuidEnclosureUrl = itemGetManyByGuidEnclosureUrlMock;
  },
  OnDemandParserEventService: class OnDemandParserEventService {
    getCountByAccountIdAndTypeSince = onDemandGetCountMock;
    create = onDemandCreateMock;
  },
  AccountPendingFollowingChannelService: class AccountPendingFollowingChannelService {
    getPendingFollowsForChannel = pendingFollowGetMock;
    removePendingFollow = pendingFollowRemoveMock;
  },
  AccountFollowingChannelService: class AccountFollowingChannelService {
    followChannel = followChannelMock;
  },
  resolveSpamFeedItemThresholds: vi.fn((t: unknown) => t),
  shouldAttemptFeedParseFromLifecycleAndPolicy:
    conditionMocks.shouldAttemptFeedParseFromLifecycleAndPolicy,
}));

import type { DescriptionIngestContext } from './descriptionIngestContext.js';
import { recordPreparedDescription } from './descriptionIngestContext.js';
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

const parsedFeedFixture = {
  items: [{ guid: 'item-1' }],
  podcastLiveItems: [{ guid: 'live-1' }],
};

const parseOptions = {
  forceParse: true,
  onDemandParserEvent: {
    accountId: null,
    remoteParentPodcastIndexId: null,
    type: null,
  },
} as const;

const firstInvocationOrder = (mock: {
  mock: { invocationCallOrder: readonly number[] };
}): number => {
  const order = mock.mock.invocationCallOrder[0];
  if (order === undefined) {
    throw new Error('Expected the mock to have been called');
  }
  return order;
};

describe('parseRSSFeedAndSaveToDatabase failure timestamp and hash-on-success', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    conditionMocks.shouldAttemptFeedParseFromLifecycleAndPolicy.mockReturnValue(true);
    conditionMocks.tryStartParsing.mockResolvedValue(true);
    conditionMocks.recomputePolicy.mockResolvedValue({ parse_allowed: true });
    conditionMocks.getActiveConditionKeys.mockResolvedValue([]);
    feedLogGetMock.mockResolvedValue({ parse_errors: 2 });
    handleGetRSSFeedMock.mockResolvedValue(baseFeed);
    handleRequestRSSFeedMock.mockResolvedValue(parsedFeedFixture);
    handleParsedFeedMock.mockImplementation(async (_parsed: unknown, f: { id: number }) => f);
    handleParsedChannelSeasonsMock.mockResolvedValue(undefined);
    handleParsedChannelMock.mockResolvedValue(undefined);
    getOrCreateByFeedMock.mockResolvedValue({ id: 1, id_text: 'c1' });
    handleParsedItemsMock.mockResolvedValue({
      hadStoredItems: true,
      newItemGuids: [],
      newItemGuidEnclosureUrls: [],
      updatedItemIds: [],
    });
    itemGetManyByGuidMock.mockResolvedValue([]);
    itemGetManyByGuidEnclosureUrlMock.mockResolvedValue([]);
    handleParsedLiveItemsMock.mockResolvedValue({
      pendingItemGuids: [],
      liveItemGuids: [],
    });
    handleAllRemoteItemsFeedParsingMock.mockResolvedValue([]);
    feedServiceUpdateMock.mockImplementation(async (_id: number, dto: unknown) => dto);
    pendingFollowGetMock.mockResolvedValue([]);
    pendingFollowRemoveMock.mockResolvedValue(undefined);
    followChannelMock.mockResolvedValue(undefined);
  });

  it('records last_failed_parse_time when handleParsedLiveItems throws', async () => {
    handleParsedLiveItemsMock.mockRejectedValueOnce(new Error('live item parse failed'));

    await parseRSSFeedAndSaveToDatabase(baseFeed.url, baseFeed.podcast_index_id, parseOptions);

    expect(feedLogUpdateMock).toHaveBeenCalledWith(
      baseFeed,
      expect.objectContaining({
        parse_errors: 3,
        last_failed_parse_time: expect.any(Date),
      })
    );
    expect(feedLogUpdateMock).not.toHaveBeenCalledWith(
      baseFeed,
      expect.objectContaining({ last_finished_parse_time: expect.any(Date) })
    );
  });

  it('does not write last_parsed_file_hash when parse fails mid-run', async () => {
    handleParsedLiveItemsMock.mockRejectedValueOnce(new Error('live item parse failed'));

    await parseRSSFeedAndSaveToDatabase(baseFeed.url, baseFeed.podcast_index_id, parseOptions);

    const hashUpdateCall = feedServiceUpdateMock.mock.calls.find(
      ([, dto]: [number, { last_parsed_file_hash?: string }]) =>
        dto.last_parsed_file_hash !== undefined
    );
    expect(hashUpdateCall).toBeUndefined();
  });

  it('writes last_parsed_file_hash when parse completes successfully', async () => {
    await parseRSSFeedAndSaveToDatabase(baseFeed.url, baseFeed.podcast_index_id, parseOptions);

    expect(feedLogUpdateMock).toHaveBeenCalledWith(
      baseFeed,
      expect.objectContaining({ last_finished_parse_time: expect.any(Date) })
    );
    expect(feedServiceUpdateMock).toHaveBeenCalledWith(
      baseFeed.id,
      expect.objectContaining({ last_parsed_file_hash: expect.any(String) })
    );
  });

  it('resolves pending follows into directory follows after channel upsert', async () => {
    pendingFollowGetMock.mockResolvedValueOnce([
      {
        id: 17,
        account_id: 10,
        podcast_index_id: baseFeed.podcast_index_id,
        feed_url: baseFeed.url,
      },
      {
        id: 18,
        account_id: 11,
        podcast_index_id: baseFeed.podcast_index_id,
        feed_url: baseFeed.url,
      },
    ]);

    await parseRSSFeedAndSaveToDatabase(baseFeed.url, baseFeed.podcast_index_id, parseOptions);

    expect(pendingFollowGetMock).toHaveBeenCalledWith({
      podcast_index_id: baseFeed.podcast_index_id,
      feed_url: baseFeed.url,
    });
    expect(followChannelMock).toHaveBeenCalledTimes(2);
    expect(followChannelMock).toHaveBeenNthCalledWith(1, 10, 'c1');
    expect(followChannelMock).toHaveBeenNthCalledWith(2, 11, 'c1');
    expect(pendingFollowRemoveMock).toHaveBeenCalledTimes(2);
    expect(pendingFollowRemoveMock).toHaveBeenNthCalledWith(1, 17);
    expect(pendingFollowRemoveMock).toHaveBeenNthCalledWith(2, 18);
  });

  it('does not write last_parsed_file_hash when last_finished_parse_time update fails', async () => {
    feedLogUpdateMock.mockRejectedValueOnce(new Error('feed log update failed'));

    await parseRSSFeedAndSaveToDatabase(baseFeed.url, baseFeed.podcast_index_id, parseOptions);

    const hashUpdateCall = feedServiceUpdateMock.mock.calls.find(
      ([, dto]: [number, { last_parsed_file_hash?: string }]) =>
        dto.last_parsed_file_hash !== undefined
    );
    expect(hashUpdateCall).toBeUndefined();
  });

  it('sends livestream notifications before new-content and auto-download pushes', async () => {
    const newItemIdentifiers = {
      hadStoredItems: true,
      newItemGuids: ['item-1'],
      newItemGuidEnclosureUrls: [],
      updatedItemIds: [],
    };
    const newLiveItemIdentifiers = {
      pendingItemGuids: ['pending-1'],
      liveItemGuids: ['live-1'],
    };
    handleParsedItemsMock.mockResolvedValue(newItemIdentifiers);
    handleParsedLiveItemsMock.mockResolvedValue(newLiveItemIdentifiers);

    await parseRSSFeedAndSaveToDatabase(baseFeed.url, baseFeed.podcast_index_id, parseOptions);

    expect(handleNewLiveItemNotificationsMock).toHaveBeenCalledWith(
      { id: 1, id_text: 'c1' },
      newLiveItemIdentifiers
    );
    expect(handleNewItemNotificationsMock).toHaveBeenCalledWith(
      { id: 1, id_text: 'c1' },
      newItemIdentifiers
    );
    expect(handleNewItemAutoDownloadPushesMock).toHaveBeenCalledWith(
      { id: 1, id_text: 'c1' },
      newItemIdentifiers
    );
    expect(firstInvocationOrder(handleNewLiveItemNotificationsMock)).toBeLessThan(
      firstInvocationOrder(handleNewItemNotificationsMock)
    );
    expect(firstInvocationOrder(handleNewItemNotificationsMock)).toBeLessThan(
      firstInvocationOrder(handleNewItemAutoDownloadPushesMock)
    );
  });

  it('sends new-content then auto-download pushes when no livestream identifiers are new', async () => {
    const newItemIdentifiers = {
      hadStoredItems: true,
      newItemGuids: [],
      newItemGuidEnclosureUrls: ['https://example.com/ep.mp3'],
      updatedItemIds: [],
    };
    handleParsedItemsMock.mockResolvedValue(newItemIdentifiers);
    handleParsedLiveItemsMock.mockResolvedValue({
      pendingItemGuids: [],
      liveItemGuids: [],
    });

    await parseRSSFeedAndSaveToDatabase(baseFeed.url, baseFeed.podcast_index_id, parseOptions);

    expect(handleNewLiveItemNotificationsMock).not.toHaveBeenCalled();
    expect(handleNewItemNotificationsMock).toHaveBeenCalledWith(
      { id: 1, id_text: 'c1' },
      newItemIdentifiers
    );
    expect(handleNewItemAutoDownloadPushesMock).toHaveBeenCalledWith(
      { id: 1, id_text: 'c1' },
      newItemIdentifiers
    );
    expect(firstInvocationOrder(handleNewItemNotificationsMock)).toBeLessThan(
      firstInvocationOrder(handleNewItemAutoDownloadPushesMock)
    );
  });

  it('does not send new-content or auto-download pushes for a livestream-only parse', async () => {
    handleParsedItemsMock.mockResolvedValue({
      hadStoredItems: true,
      newItemGuids: [],
      newItemGuidEnclosureUrls: [],
      updatedItemIds: [],
    });
    handleParsedLiveItemsMock.mockResolvedValue({
      pendingItemGuids: [],
      liveItemGuids: ['live-1'],
    });

    await parseRSSFeedAndSaveToDatabase(baseFeed.url, baseFeed.podcast_index_id, parseOptions);

    expect(handleNewLiveItemNotificationsMock).toHaveBeenCalledTimes(1);
    expect(handleNewItemNotificationsMock).not.toHaveBeenCalled();
    expect(handleNewItemAutoDownloadPushesMock).not.toHaveBeenCalled();
  });

  it('does not send new-episode side effects on the first parse of a channel', async () => {
    handleParsedItemsMock.mockResolvedValue({
      hadStoredItems: false,
      newItemGuids: ['ep-1', 'ep-2', 'ep-3'],
      newItemGuidEnclosureUrls: ['https://example.com/a.mp3'],
      updatedItemIds: [],
    });
    handleParsedLiveItemsMock.mockResolvedValue({
      pendingItemGuids: [],
      liveItemGuids: ['live-1'],
    });

    await parseRSSFeedAndSaveToDatabase(baseFeed.url, baseFeed.podcast_index_id, parseOptions);

    expect(handleNewLiveItemNotificationsMock).toHaveBeenCalledTimes(1);
    expect(handleNewItemNotificationsMock).not.toHaveBeenCalled();
    expect(handleNewItemAutoDownloadPushesMock).not.toHaveBeenCalled();
    expect(itemGetManyByGuidMock).not.toHaveBeenCalled();
    expect(itemGetManyByGuidEnclosureUrlMock).not.toHaveBeenCalled();
  });

  it('sends new-episode side effects when the channel already has stored items', async () => {
    const newItemIdentifiers = {
      hadStoredItems: true,
      newItemGuids: ['item-1'],
      newItemGuidEnclosureUrls: [],
      updatedItemIds: [],
    };
    handleParsedItemsMock.mockResolvedValue(newItemIdentifiers);

    await parseRSSFeedAndSaveToDatabase(baseFeed.url, baseFeed.podcast_index_id, parseOptions);

    expect(handleNewItemNotificationsMock).toHaveBeenCalledWith(
      { id: 1, id_text: 'c1' },
      newItemIdentifiers
    );
    expect(handleNewItemAutoDownloadPushesMock).toHaveBeenCalledWith(
      { id: 1, id_text: 'c1' },
      newItemIdentifiers
    );
  });

  it('omits items published before the side-effect cutoff', async () => {
    const cutoffMs = Date.parse('2026-01-15T00:00:00.000Z');
    handleParsedItemsMock.mockResolvedValue({
      hadStoredItems: true,
      newItemGuids: ['old-ep', 'new-ep', 'undated-ep'],
      newItemGuidEnclosureUrls: [],
      updatedItemIds: [],
    });
    itemGetManyByGuidMock.mockResolvedValue([
      { guid: 'old-ep', pub_date: new Date('2026-01-01T00:00:00.000Z') },
      { guid: 'new-ep', pub_date: new Date('2026-02-01T00:00:00.000Z') },
      { guid: 'undated-ep', pub_date: null },
    ]);

    await parseRSSFeedAndSaveToDatabase(baseFeed.url, baseFeed.podcast_index_id, {
      ...parseOptions,
      suppressNewItemSideEffectsPublishedBeforeMs: cutoffMs,
    });

    const filtered = {
      hadStoredItems: true,
      newItemGuids: ['new-ep'],
      newItemGuidEnclosureUrls: [],
      updatedItemIds: [],
    };
    expect(handleNewItemNotificationsMock).toHaveBeenCalledWith({ id: 1, id_text: 'c1' }, filtered);
    expect(handleNewItemAutoDownloadPushesMock).toHaveBeenCalledWith(
      { id: 1, id_text: 'c1' },
      filtered
    );
  });

  it('reconciles live items when the feed omits them and the channel may have live items', async () => {
    const updatedItemIds = [41, 42];
    handleRequestRSSFeedMock.mockResolvedValue({
      items: [{ guid: 'item-1' }],
    });
    handleParsedItemsMock.mockResolvedValue({
      hadStoredItems: true,
      newItemGuids: [],
      newItemGuidEnclosureUrls: [],
      updatedItemIds,
    });
    getOrCreateByFeedMock.mockResolvedValue({
      id: 1,
      id_text: 'c1',
      may_have_live_items: true,
    });

    await parseRSSFeedAndSaveToDatabase(baseFeed.url, baseFeed.podcast_index_id, parseOptions);

    expect(handleParsedLiveItemsMock).toHaveBeenCalledTimes(1);
    expect(handleParsedLiveItemsMock).toHaveBeenCalledWith(
      [],
      { id: 1, id_text: 'c1', may_have_live_items: true },
      {},
      expect.anything(),
      expect.any(Set),
      updatedItemIds
    );
  });

  it('skips live item reconciliation when the feed omits them and the channel has none', async () => {
    handleRequestRSSFeedMock.mockResolvedValue({
      items: [{ guid: 'item-1' }],
    });
    getOrCreateByFeedMock.mockResolvedValue({
      id: 1,
      id_text: 'c1',
      may_have_live_items: false,
    });

    await parseRSSFeedAndSaveToDatabase(baseFeed.url, baseFeed.podcast_index_id, parseOptions);

    expect(handleParsedLiveItemsMock).not.toHaveBeenCalled();
  });
});

describe('parseRSSFeedAndSaveToDatabase description telemetry', () => {
  const recordTwoShortenedItems = async (
    _items: unknown,
    _channel: unknown,
    _channelSeasonIndex: unknown,
    context: DescriptionIngestContext
  ) => {
    recordPreparedDescription(context, {
      value: '<p>a</p>',
      preview: 'a',
      is_truncated: true,
      source_length: 12_000,
    });
    recordPreparedDescription(context, {
      value: '<p>b</p>',
      preview: 'b',
      is_truncated: true,
      source_length: 18_500,
    });
    recordPreparedDescription(context, {
      value: '<p>c</p>',
      preview: 'c',
      is_truncated: false,
      source_length: 300,
    });
    return {
      hadStoredItems: true,
      newItemGuids: [],
      newItemGuidEnclosureUrls: [],
      updatedItemIds: [],
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    conditionMocks.shouldAttemptFeedParseFromLifecycleAndPolicy.mockReturnValue(true);
    conditionMocks.tryStartParsing.mockResolvedValue(true);
    conditionMocks.recomputePolicy.mockResolvedValue({ parse_allowed: true });
    conditionMocks.getActiveConditionKeys.mockResolvedValue([]);
    feedLogGetMock.mockResolvedValue({ parse_errors: 0 });
    handleGetRSSFeedMock.mockResolvedValue(baseFeed);
    handleRequestRSSFeedMock.mockResolvedValue(parsedFeedFixture);
    handleParsedFeedMock.mockImplementation(async (_parsed: unknown, f: { id: number }) => f);
    handleParsedChannelSeasonsMock.mockResolvedValue(undefined);
    handleParsedChannelMock.mockResolvedValue(undefined);
    getOrCreateByFeedMock.mockResolvedValue({ id: 1, id_text: 'c1' });
    handleParsedItemsMock.mockImplementation(recordTwoShortenedItems);
    handleParsedLiveItemsMock.mockResolvedValue({ pendingItemGuids: [], liveItemGuids: [] });
    handleAllRemoteItemsFeedParsingMock.mockResolvedValue([]);
    feedServiceUpdateMock.mockImplementation(async (_id: number, dto: unknown) => dto);
    pendingFollowGetMock.mockResolvedValue([]);
  });

  it('records the shortened count and the longest source length on success', async () => {
    await parseRSSFeedAndSaveToDatabase(baseFeed.url, baseFeed.podcast_index_id, parseOptions);

    expect(feedServiceUpdateMock).toHaveBeenCalledWith(
      baseFeed.id,
      expect.objectContaining({
        description_truncated_count: 2,
        description_longest_source_length: 18_500,
        description_truncated_at: expect.any(Date),
      })
    );
  });

  it('writes no description telemetry when the parse fails', async () => {
    handleParsedLiveItemsMock.mockRejectedValueOnce(new Error('live item parse failed'));

    await parseRSSFeedAndSaveToDatabase(baseFeed.url, baseFeed.podcast_index_id, parseOptions);

    const telemetryCall = feedServiceUpdateMock.mock.calls.find(
      ([, dto]: [number, { description_truncated_count?: number }]) =>
        dto.description_truncated_count !== undefined
    );
    expect(telemetryCall).toBeUndefined();
  });
});
