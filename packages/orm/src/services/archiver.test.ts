import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  captureRemovedReferencesMock,
  clipFindOneMock,
  feedCreateQueryBuilderMock,
  feedQbGetManyMock,
  feedQbGetRawManyMock,
  feedQbInnerJoinMock,
  feedQbLimitMock,
  feedQbOrderByMock,
  feedReadFindMock,
  feedSaveMock,
  feedQueryMock,
  feedServiceSetLifecycleMock,
  feedServiceUpdateMock,
  itemDeleteMock,
  itemFlagStatusGetMock,
  itemQueryMock,
  itemReadFindMock,
  itemSaveMock,
  managerDeleteMock,
  managerQueryMock,
  playlistFindOneMock,
  pruneQueueResourcesMock,
} = vi.hoisted(() => {
  const feedQbGetManyMock = vi.fn();
  const feedQbGetRawManyMock = vi.fn();
  const feedQbInnerJoinMock = vi.fn();
  const feedQbLimitMock = vi.fn();
  const feedQbOrderByMock = vi.fn();
  const makeFeedQueryBuilder = () => {
    const qb = {
      distinct: vi.fn(() => qb),
      innerJoinAndSelect: vi.fn(() => qb),
      innerJoin: (...args: unknown[]) => {
        feedQbInnerJoinMock(...args);
        return qb;
      },
      where: vi.fn(() => qb),
      andWhere: vi.fn(() => qb),
      select: vi.fn(() => qb),
      addSelect: vi.fn(() => qb),
      orderBy: (...args: unknown[]) => {
        feedQbOrderByMock(...args);
        return qb;
      },
      limit: (value: unknown) => {
        feedQbLimitMock(value);
        return qb;
      },
      getMany: feedQbGetManyMock,
      getRawMany: feedQbGetRawManyMock,
    };
    return qb;
  };

  return {
    captureRemovedReferencesMock: vi.fn(async () => ({ clips: 0, playlistEntries: 0 })),
    clipFindOneMock: vi.fn(),
    feedCreateQueryBuilderMock: vi.fn(makeFeedQueryBuilder),
    feedQbGetManyMock,
    feedQbGetRawManyMock,
    feedQbInnerJoinMock,
    feedQbLimitMock,
    feedQbOrderByMock,
    feedReadFindMock: vi.fn(),
    feedSaveMock: vi.fn(),
    feedQueryMock: vi.fn(),
    feedServiceSetLifecycleMock: vi.fn(() => Promise.resolve()),
    feedServiceUpdateMock: vi.fn(() => Promise.resolve()),
    itemDeleteMock: vi.fn(),
    itemFlagStatusGetMock: vi.fn(),
    itemQueryMock: vi.fn(),
    itemReadFindMock: vi.fn(),
    itemSaveMock: vi.fn(),
    managerDeleteMock: vi.fn(),
    managerQueryMock: vi.fn(),
    playlistFindOneMock: vi.fn(),
    pruneQueueResourcesMock: vi.fn(),
  };
});

const { ClipEntity, FeedEntity, ItemEntity, PlaylistResourceEntity } = vi.hoisted(() => ({
  ClipEntity: class Clip {},
  FeedEntity: class Feed {},
  ItemEntity: class Item {},
  PlaylistResourceEntity: class PlaylistResource {},
}));

vi.mock('@orm/db/index.js', () => ({
  AppDataSourceRead: {
    getRepository: (entity: unknown) => {
      if (entity === ItemEntity) {
        return { find: itemReadFindMock };
      }
      if (entity === FeedEntity) {
        return { createQueryBuilder: feedCreateQueryBuilderMock, find: feedReadFindMock };
      }
      if (entity === PlaylistResourceEntity) {
        return { findOne: playlistFindOneMock };
      }
      if (entity === ClipEntity) {
        return { findOne: clipFindOneMock };
      }
      return {};
    },
  },
  AppDataSourceReadWrite: {
    getRepository: (entity: unknown) => {
      if (entity === ItemEntity) {
        return { delete: itemDeleteMock, query: itemQueryMock, save: itemSaveMock };
      }
      if (entity === FeedEntity) {
        return { query: feedQueryMock, save: feedSaveMock };
      }
      return {};
    },
    transaction: async <T>(
      work: (manager: { delete: typeof managerDeleteMock; query: typeof managerQueryMock }) => T
    ): Promise<T> => work({ delete: managerDeleteMock, query: managerQueryMock }),
  },
}));

vi.mock('./removedReferences.js', () => ({
  captureRemovedReferences: captureRemovedReferencesMock,
}));

vi.mock('@orm/entities/clip.js', () => ({ Clip: ClipEntity }));
vi.mock('@orm/entities/feed/feed.js', () => ({ Feed: FeedEntity }));
vi.mock('@orm/entities/item/item.js', () => ({ Item: ItemEntity }));
vi.mock('@orm/entities/playlist/playlistResource.js', () => ({
  PlaylistResource: PlaylistResourceEntity,
}));

vi.mock('@orm/entities/item/itemFlagStatus.js', () => ({
  ItemFlagStatusStatusEnum: {
    Active: 1,
    PendingArchive: 2,
    Archived: 3,
    PendingDelete: 4,
  },
}));

vi.mock('./item/itemFlagStatus.js', () => ({
  ItemFlagStatusService: class ItemFlagStatusService {
    get = itemFlagStatusGetMock;
  },
}));

vi.mock('./queue/queueResourceActiveItemFilter.js', () => ({
  pruneNonActiveItemBackedQueueResourceRows: pruneQueueResourcesMock,
}));

const { slimArchivedItemsMock, slimArchivedChannelsMock } = vi.hoisted(() => ({
  slimArchivedItemsMock: vi.fn(async () => ({ slimmed: 0 })),
  slimArchivedChannelsMock: vi.fn(async () => ({ slimmed: 0 })),
}));

vi.mock('./archivedSlimming.js', () => ({
  slimArchivedItems: slimArchivedItemsMock,
  slimArchivedChannels: slimArchivedChannelsMock,
}));

const { convertFollowsMock, endSettledFollowsMock, deleteEmptyShowsMock } = vi.hoisted(() => ({
  convertFollowsMock: vi.fn(async () => ({
    converted: 0,
    followsMoved: 0,
    unreachable: 0,
    skipped: 0,
  })),
  endSettledFollowsMock: vi.fn(async () => ({ ended: 0 })),
  deleteEmptyShowsMock: vi.fn(async () => ({ deleted: 0 })),
}));

vi.mock('./archivedFollowConversion.js', () => ({
  convertArchivedShowFollows: convertFollowsMock,
  endSettledDirectoryFollows: endSettledFollowsMock,
}));

const { recordTakenDownContentLogMock } = vi.hoisted(() => ({
  recordTakenDownContentLogMock: vi.fn(async () => undefined),
}));

vi.mock('./accountContentLog.js', () => ({
  recordTakenDownContentLog: recordTakenDownContentLogMock,
}));

vi.mock('./archivedChannelCleanup.js', () => ({
  deleteEmptyRemovedShows: deleteEmptyShowsMock,
}));

vi.mock('@orm/factories/loggerService.js', () => ({
  loggerService: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('./feed/feed.js', () => ({
  FeedService: class FeedService {
    setFeedLifecycleState = feedServiceSetLifecycleMock;
    update = feedServiceUpdateMock;
  },
}));

import { FeedLifecycleStateKeyEnum } from '@orm/entities/feed/feedLifecycleStateType.js';
import { FeedLifecycleUpdateSourceEnum } from '@orm/entities/feed/feedLifecycleUpdateSource.js';
import { ItemFlagStatusStatusEnum } from '@orm/entities/item/itemFlagStatus.js';

import {
  ArchiverService,
  CHANNEL_DETAIL_DELETE_QUERIES,
  CHANNEL_IDENTITY_DELETE_QUERIES,
  FEED_RELATIONS_PENDING_OR_SPAM,
} from './archiver.js';

function resetSlimMocks(): void {
  slimArchivedItemsMock.mockReset();
  slimArchivedItemsMock.mockResolvedValue({ slimmed: 0 });
  slimArchivedChannelsMock.mockReset();
  slimArchivedChannelsMock.mockResolvedValue({ slimmed: 0 });
}

describe('ArchiverService takedown hard-delete handling', () => {
  beforeEach(() => {
    clipFindOneMock.mockReset();
    feedCreateQueryBuilderMock.mockClear();
    feedQbGetManyMock.mockReset();
    feedQbGetRawManyMock.mockReset();
    feedQbInnerJoinMock.mockReset();
    feedQbLimitMock.mockReset();
    feedQbOrderByMock.mockReset();
    feedReadFindMock.mockReset();
    feedSaveMock.mockReset();
    feedQueryMock.mockReset();
    feedServiceSetLifecycleMock.mockReset();
    feedServiceUpdateMock.mockReset();
    itemDeleteMock.mockReset();
    itemFlagStatusGetMock.mockReset();
    itemQueryMock.mockReset();
    itemReadFindMock.mockReset();
    itemSaveMock.mockReset();
    managerDeleteMock.mockReset();
    managerQueryMock.mockReset();
    captureRemovedReferencesMock.mockClear();
    recordTakenDownContentLogMock.mockReset();
    playlistFindOneMock.mockReset();
    pruneQueueResourcesMock.mockReset();
    resetSlimMocks();
  });

  it('removes verified publisher links on either side of an archived show', () => {
    const query = CHANNEL_DETAIL_DELETE_QUERIES.find(
      (entry) => entry.table === 'channel_verified_publisher'
    );
    expect(query).toBeDefined();
    expect(query?.sql).toMatch(/channel_id = \$1 OR publisher_channel_id = \$1/);
    expect(query?.params(7)).toEqual([7]);
  });

  it('deletes channel_trailer before channel_season', () => {
    const trailer = CHANNEL_DETAIL_DELETE_QUERIES.findIndex(
      (query) => query.table === 'channel_trailer'
    );
    const season = CHANNEL_DETAIL_DELETE_QUERIES.findIndex(
      (query) => query.table === 'channel_season'
    );
    expect(trailer).toBeGreaterThanOrEqual(0);
    expect(season).toBeGreaterThan(trailer);
  });

  it('queries only Takedown feeds for hard-delete processing', async () => {
    feedReadFindMock.mockResolvedValue([]);

    const service = new ArchiverService();
    await service.getFeedsWithTakedownStatus();

    expect(feedReadFindMock).toHaveBeenCalledTimes(1);
    expect(feedReadFindMock).toHaveBeenCalledWith({
      where: {
        feed_lifecycle_state: {
          feed_lifecycle_state_type: {
            state_key: FeedLifecycleStateKeyEnum.Takedown,
          },
        },
      },
      relations: FEED_RELATIONS_PENDING_OR_SPAM,
    });
  });

  it('hard-deletes all item rows for Takedown feeds', async () => {
    feedReadFindMock.mockResolvedValue([
      { id: 10, channel: { id: 1001, items: [{ id: 101 }, { id: 102 }] } },
      { id: 20, channel: { id: 1002, items: [{ id: 201 }] } },
    ]);

    const service = new ArchiverService();
    await service.removeAllItemsForTakedownFeeds();

    expect(itemDeleteMock).not.toHaveBeenCalled();
    expect(managerDeleteMock).toHaveBeenCalledTimes(2);
    expect(managerDeleteMock).toHaveBeenNthCalledWith(1, ItemEntity, [101, 102]);
    expect(managerDeleteMock).toHaveBeenNthCalledWith(2, ItemEntity, [201]);
    expect(feedSaveMock).not.toHaveBeenCalled();
    expect(feedQueryMock).not.toHaveBeenCalled();
    const channelQueryCount =
      CHANNEL_DETAIL_DELETE_QUERIES.length + CHANNEL_IDENTITY_DELETE_QUERIES.length;
    expect(managerQueryMock).toHaveBeenCalledTimes(2 * (channelQueryCount + 1));
  });

  it('captures snapshots and clears item_merge_map before deleting the items', async () => {
    feedReadFindMock.mockResolvedValue([
      { id: 10, channel: { id: 1001, items: [{ id: 101 }, { id: 102 }] } },
    ]);

    const service = new ArchiverService();
    await service.removeAllItemsForTakedownFeeds();

    expect(captureRemovedReferencesMock).toHaveBeenCalledWith([101, 102], expect.anything());
    expect(managerQueryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('DELETE FROM item_merge_map'),
      [[101, 102]]
    );

    expect(recordTakenDownContentLogMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ channelId: 1001, itemIds: [101, 102] })
    );
    const captureOrder = captureRemovedReferencesMock.mock.invocationCallOrder[0] ?? 0;
    const logOrder = recordTakenDownContentLogMock.mock.invocationCallOrder[0] ?? 0;
    const mergeMapOrder = managerQueryMock.mock.invocationCallOrder[0] ?? 0;
    const deleteOrder = managerDeleteMock.mock.invocationCallOrder[0] ?? 0;
    expect(captureOrder).toBeLessThan(logOrder);
    expect(logOrder).toBeLessThan(mergeMapOrder);
    expect(mergeMapOrder).toBeLessThan(deleteOrder);
  });

  it('skips delete when feed channel is missing or has no items', async () => {
    feedReadFindMock.mockResolvedValue([
      { id: 10, channel: null },
      { id: 11, channel: { id: 1003, items: [] } },
      { id: 12, channel: { id: 1004, items: undefined } },
    ]);

    const service = new ArchiverService();
    await service.removeAllItemsForTakedownFeeds();

    expect(managerDeleteMock).not.toHaveBeenCalled();
    expect(feedSaveMock).not.toHaveBeenCalled();
    expect(recordTakenDownContentLogMock).toHaveBeenCalledTimes(2);
    const channelQueryCount =
      CHANNEL_DETAIL_DELETE_QUERIES.length + CHANNEL_IDENTITY_DELETE_QUERIES.length;
    expect(managerQueryMock).toHaveBeenCalledTimes(2 * channelQueryCount);
    expect(managerQueryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('DELETE FROM channel_value_recipient'),
      [1003]
    );
    expect(managerQueryMock).toHaveBeenNthCalledWith(
      channelQueryCount + 1,
      expect.stringContaining('DELETE FROM channel_value_recipient'),
      [1004]
    );
  });

  it('runs detail cleanup and then identity cleanup for a takedown channel', async () => {
    feedReadFindMock.mockResolvedValue([{ id: 10, channel: { id: 1001, items: [] } }]);

    const service = new ArchiverService();
    await service.removeAllItemsForTakedownFeeds();

    const sqls = managerQueryMock.mock.calls.map((call) => call[0]);
    expect(sqls).toEqual([
      ...CHANNEL_DETAIL_DELETE_QUERIES.map((query) => query.sql),
      ...CHANNEL_IDENTITY_DELETE_QUERIES.map((query) => query.sql),
    ]);
  });
});

describe('ArchiverService deleteArchivedItemsWithoutClipOrPlaylist', () => {
  beforeEach(() => {
    clipFindOneMock.mockReset();
    feedCreateQueryBuilderMock.mockClear();
    feedQbGetManyMock.mockReset();
    feedQbGetRawManyMock.mockReset();
    feedQbInnerJoinMock.mockReset();
    feedQbLimitMock.mockReset();
    feedQbOrderByMock.mockReset();
    feedReadFindMock.mockReset();
    feedSaveMock.mockReset();
    feedQueryMock.mockReset();
    feedServiceSetLifecycleMock.mockReset();
    feedServiceUpdateMock.mockReset();
    itemDeleteMock.mockReset();
    itemFlagStatusGetMock.mockReset();
    itemQueryMock.mockReset();
    itemReadFindMock.mockReset();
    itemSaveMock.mockReset();
    playlistFindOneMock.mockReset();
    pruneQueueResourcesMock.mockReset();
    resetSlimMocks();
  });

  it('does nothing when no archived orphan rows match', async () => {
    itemQueryMock.mockResolvedValueOnce([]);

    const service = new ArchiverService();
    await service.deleteArchivedItemsWithoutClipOrPlaylist();

    expect(itemQueryMock).toHaveBeenCalledTimes(1);
    expect(itemQueryMock).toHaveBeenCalledWith(
      expect.stringContaining('SELECT i.id AS id FROM item i'),
      [ItemFlagStatusStatusEnum.Archived, 1000]
    );
    expect(String(itemQueryMock.mock.calls[0]?.[0])).toContain('item_merge_map');
    expect(itemDeleteMock).not.toHaveBeenCalled();
  });

  it('hard-deletes archived items returned by the orphan query', async () => {
    itemQueryMock.mockResolvedValueOnce([{ id: 501 }, { id: 502 }]);

    const service = new ArchiverService();
    await service.deleteArchivedItemsWithoutClipOrPlaylist();

    expect(itemDeleteMock).toHaveBeenCalledTimes(1);
    expect(itemDeleteMock).toHaveBeenCalledWith([501, 502]);
    expect(itemQueryMock).toHaveBeenCalledTimes(1);
  });

  it('runs another batch when the first batch is full', async () => {
    const firstBatch = Array.from({ length: 1000 }, (_, index) => ({ id: index + 1 }));
    const secondBatch = Array.from({ length: 1000 }, (_, index) => ({ id: index + 10001 }));
    itemQueryMock
      .mockResolvedValueOnce(firstBatch)
      .mockResolvedValueOnce(secondBatch)
      .mockResolvedValueOnce([]);

    const service = new ArchiverService();
    await service.deleteArchivedItemsWithoutClipOrPlaylist();

    expect(itemDeleteMock).toHaveBeenCalledTimes(2);
    expect(itemDeleteMock).toHaveBeenNthCalledWith(
      1,
      firstBatch.map((row) => row.id)
    );
    expect(itemDeleteMock).toHaveBeenNthCalledWith(
      2,
      secondBatch.map((row) => row.id)
    );
    expect(itemQueryMock).toHaveBeenCalledTimes(3);
  });
});

describe('ArchiverService spam feed item cleanup', () => {
  beforeEach(() => {
    clipFindOneMock.mockReset();
    feedCreateQueryBuilderMock.mockClear();
    feedQbGetManyMock.mockReset();
    feedQbGetRawManyMock.mockReset();
    feedQbInnerJoinMock.mockReset();
    feedQbLimitMock.mockReset();
    feedQbOrderByMock.mockReset();
    feedQbGetManyMock.mockResolvedValue([]);
    feedReadFindMock.mockReset();
    feedSaveMock.mockReset();
    feedQueryMock.mockReset();
    feedServiceSetLifecycleMock.mockReset();
    feedServiceUpdateMock.mockReset();
    itemDeleteMock.mockReset();
    itemFlagStatusGetMock.mockReset();
    itemFlagStatusGetMock.mockResolvedValue({ id: ItemFlagStatusStatusEnum.Archived });
    itemQueryMock.mockReset();
    itemReadFindMock.mockReset();
    itemSaveMock.mockReset();
    playlistFindOneMock.mockReset();
    pruneQueueResourcesMock.mockReset();
    convertFollowsMock.mockReset();
    convertFollowsMock.mockResolvedValue({
      converted: 0,
      followsMoved: 0,
      unreachable: 0,
      skipped: 0,
    });
    endSettledFollowsMock.mockReset();
    endSettledFollowsMock.mockResolvedValue({ ended: 0 });
    deleteEmptyShowsMock.mockReset();
    deleteEmptyShowsMock.mockResolvedValue({ deleted: 0 });
    resetSlimMocks();
  });

  it('runs processSpamFeeds after processPendingArchiveFeeds in archiveAll', async () => {
    const order: string[] = [];
    const service = new ArchiverService();
    vi.spyOn(service, 'processPendingArchiveFeeds').mockImplementation(async () => {
      order.push('pendingArchiveFeeds');
    });
    vi.spyOn(service, 'processSpamFeeds').mockImplementation(async () => {
      order.push('spamFeeds');
    });
    vi.spyOn(service, 'processPendingArchiveItems').mockImplementation(async () => {
      order.push('pendingArchiveItems');
    });
    vi.spyOn(service, 'deleteArchivedItemsWithoutClipOrPlaylist').mockImplementation(async () => {
      order.push('deleteArchivedOrphans');
    });
    slimArchivedItemsMock.mockImplementation(async () => {
      order.push('slimItems');
      return { slimmed: 3 };
    });
    slimArchivedChannelsMock.mockImplementation(async () => {
      order.push('slimChannels');
      return { slimmed: 1 };
    });
    vi.spyOn(service, 'removeAllItemsForTakedownFeeds').mockImplementation(async () => {
      order.push('takedown');
    });
    convertFollowsMock.mockImplementation(async () => {
      order.push('convertFollows');
      return { converted: 0, followsMoved: 0, unreachable: 0, skipped: 0 };
    });
    endSettledFollowsMock.mockImplementation(async () => {
      order.push('endSettledFollows');
      return { ended: 0 };
    });
    deleteEmptyShowsMock.mockImplementation(async () => {
      order.push('deleteEmptyShows');
      return { deleted: 0 };
    });
    const feedProbe = async () => false;
    await service.archiveAll({ feedProbe });
    expect(order).toEqual([
      'pendingArchiveFeeds',
      'spamFeeds',
      'pendingArchiveItems',
      'deleteArchivedOrphans',
      'slimItems',
      'slimChannels',
      'convertFollows',
      'endSettledFollows',
      'takedown',
      'deleteEmptyShows',
    ]);
    expect(convertFollowsMock).toHaveBeenCalledWith(feedProbe);
    expect(pruneQueueResourcesMock).toHaveBeenCalledTimes(1);
  });

  it('processSpamFeeds does not load channel items when no spam feeds need cleanup', async () => {
    const service = new ArchiverService();
    await service.processSpamFeeds();
    expect(feedCreateQueryBuilderMock).toHaveBeenCalledWith('feed');
    expect(itemReadFindMock).not.toHaveBeenCalled();
    expect(feedSaveMock).not.toHaveBeenCalled();
  });

  it('processSpamFeeds hard-deletes Active items without clip or playlist and does not save feed', async () => {
    feedQbGetManyMock.mockResolvedValue([{ id: 42, channel: { id: 900 } }]);
    itemReadFindMock.mockResolvedValue([
      { id: 7001, item_flag_status: { id: ItemFlagStatusStatusEnum.Active } },
    ]);
    playlistFindOneMock.mockResolvedValue(null);
    clipFindOneMock.mockResolvedValue(null);
    const service = new ArchiverService();
    await service.processSpamFeeds();
    expect(itemDeleteMock).toHaveBeenCalledWith(7001);
    expect(itemSaveMock).not.toHaveBeenCalled();
    expect(feedSaveMock).not.toHaveBeenCalled();
  });

  it('processSpamFeeds sets Active items to Archived when a channel merge map points at them', async () => {
    feedQbGetManyMock.mockResolvedValue([{ id: 42, channel: { id: 900 } }]);
    itemReadFindMock.mockResolvedValue([
      { id: 7001, item_flag_status: { id: ItemFlagStatusStatusEnum.Active } },
    ]);
    playlistFindOneMock.mockResolvedValue(null);
    clipFindOneMock.mockResolvedValue(null);
    itemQueryMock.mockResolvedValue([{ '?column?': 1 }]);
    const service = new ArchiverService();
    await service.processSpamFeeds();
    expect(itemQueryMock).toHaveBeenCalledWith(expect.stringContaining('item_merge_map'), [7001]);
    expect(itemSaveMock).toHaveBeenCalledWith(expect.objectContaining({ id: 7001 }));
    expect(itemDeleteMock).not.toHaveBeenCalled();
  });

  it('processSpamFeeds sets Active items to Archived when a clip exists', async () => {
    feedQbGetManyMock.mockResolvedValue([{ id: 42, channel: { id: 900 } }]);
    itemReadFindMock.mockResolvedValue([
      { id: 7001, item_flag_status: { id: ItemFlagStatusStatusEnum.Active } },
    ]);
    playlistFindOneMock.mockResolvedValue(null);
    clipFindOneMock.mockResolvedValue({ id: 1 });
    const archived = { id: ItemFlagStatusStatusEnum.Archived };
    itemFlagStatusGetMock.mockResolvedValue(archived);
    const service = new ArchiverService();
    await service.processSpamFeeds();
    expect(itemSaveMock).toHaveBeenCalledTimes(1);
    expect(itemSaveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 7001,
        item_flag_status: archived,
      })
    );
    expect(itemDeleteMock).not.toHaveBeenCalled();
    expect(feedSaveMock).not.toHaveBeenCalled();
  });
});

describe('ArchiverService processPendingArchiveFeeds', () => {
  const archivedLifecycle = {
    toStateKey: FeedLifecycleStateKeyEnum.Archived,
    source: FeedLifecycleUpdateSourceEnum.Archiver,
  };

  beforeEach(() => {
    clipFindOneMock.mockReset();
    feedCreateQueryBuilderMock.mockClear();
    feedQbGetManyMock.mockReset();
    feedQbGetRawManyMock.mockReset();
    feedQbInnerJoinMock.mockReset();
    feedQbLimitMock.mockReset();
    feedQbOrderByMock.mockReset();
    feedReadFindMock.mockReset();
    feedSaveMock.mockReset();
    feedQueryMock.mockReset();
    feedServiceSetLifecycleMock.mockReset();
    feedServiceUpdateMock.mockReset();
    itemDeleteMock.mockReset();
    itemFlagStatusGetMock.mockReset();
    itemFlagStatusGetMock.mockResolvedValue({ id: ItemFlagStatusStatusEnum.Archived });
    itemQueryMock.mockReset();
    itemReadFindMock.mockReset();
    itemSaveMock.mockReset();
    playlistFindOneMock.mockReset();
    pruneQueueResourcesMock.mockReset();
  });

  it('selects at most 1000 pending feeds ordered by feed id', async () => {
    const rows = Array.from({ length: 1001 }, (_, index) => ({
      feed_id: index + 1,
      channel_id: index + 100,
    }));
    feedQbGetRawManyMock.mockResolvedValue(rows);
    itemQueryMock.mockResolvedValue([]);

    const service = new ArchiverService();
    await service.processPendingArchiveFeeds();

    expect(feedQbLimitMock).toHaveBeenCalledWith(1000);
    expect(feedQbOrderByMock).toHaveBeenCalledWith('feed.id', 'ASC');
    expect(feedQbInnerJoinMock.mock.calls.some((call) => String(call[0]).includes('items'))).toBe(
      false
    );
    expect(itemReadFindMock).not.toHaveBeenCalled();
    expect(feedServiceSetLifecycleMock).toHaveBeenCalledTimes(1000);
    expect(feedServiceSetLifecycleMock).toHaveBeenNthCalledWith(1, 1, archivedLifecycle);
    expect(feedServiceSetLifecycleMock).toHaveBeenNthCalledWith(1000, 1000, archivedLifecycle);
    expect(feedServiceSetLifecycleMock).not.toHaveBeenCalledWith(1001, archivedLifecycle);
    expect(feedServiceUpdateMock).toHaveBeenNthCalledWith(1000, 1000, {
      last_parsed_file_hash: null,
    });
  });

  it('updates an item with a clip to Archived and does not delete it', async () => {
    feedQbGetRawManyMock.mockResolvedValue([{ feed_id: 4, channel_id: 40 }]);
    itemQueryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('UPDATE item')) {
        return [[], 1];
      }
      return [];
    });

    const service = new ArchiverService();
    await service.processPendingArchiveFeeds();

    const updateCall = itemQueryMock.mock.calls.find((call) =>
      String(call[0]).includes('UPDATE item')
    );
    expect(updateCall?.[1]).toEqual([
      ItemFlagStatusStatusEnum.Archived,
      [40],
      [ItemFlagStatusStatusEnum.Active, ItemFlagStatusStatusEnum.PendingArchive],
    ]);
    expect(String(updateCall?.[0])).toContain('clip.item_id');
    expect(String(updateCall?.[0])).toContain('playlist_resource.item_id');
    expect(String(updateCall?.[0])).toContain('item_merge_map.from_item_id');
    expect(itemDeleteMock).not.toHaveBeenCalled();
    expect(itemSaveMock).not.toHaveBeenCalled();
    expect(itemReadFindMock).not.toHaveBeenCalled();
  });

  it('deletes an active or pending item with neither a clip nor a playlist row', async () => {
    feedQbGetRawManyMock.mockResolvedValue([{ feed_id: 4, channel_id: 40 }]);
    itemQueryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('UPDATE item')) {
        return [[], 0];
      }
      return [{ id: 77 }];
    });

    const service = new ArchiverService();
    await service.processPendingArchiveFeeds();

    const selectCall = itemQueryMock.mock.calls.find((call) =>
      String(call[0]).includes('SELECT i.id')
    );
    expect(String(selectCall?.[0])).toContain('AND NOT (');
    expect(String(selectCall?.[0])).toContain('clip.item_id');
    expect(String(selectCall?.[0])).toContain('playlist_resource.item_id');
    expect(String(selectCall?.[0])).toContain('item_merge_map.to_item_id');
    expect(selectCall?.[1]).toEqual([
      [40],
      [ItemFlagStatusStatusEnum.Active, ItemFlagStatusStatusEnum.PendingArchive],
      1000,
    ]);
    expect(itemDeleteMock).toHaveBeenCalledTimes(1);
    expect(itemDeleteMock).toHaveBeenCalledWith([77]);
    expect(itemSaveMock).not.toHaveBeenCalled();
  });

  it('archives the feed when the channel has no matching items', async () => {
    feedQbGetRawManyMock.mockResolvedValue([{ feed_id: 4, channel_id: 40 }]);
    itemQueryMock.mockResolvedValue([]);

    const service = new ArchiverService();
    await service.processPendingArchiveFeeds();

    expect(itemDeleteMock).not.toHaveBeenCalled();
    expect(feedServiceSetLifecycleMock).toHaveBeenCalledTimes(1);
    expect(feedServiceSetLifecycleMock).toHaveBeenCalledWith(4, archivedLifecycle);
    expect(feedServiceUpdateMock).toHaveBeenCalledWith(4, { last_parsed_file_hash: null });
  });
});
