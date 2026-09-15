import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  applyLinkedPlaybackWriteTransactionalMock,
  getByIdTextMock,
  getRepositoryReadMock,
  getRepositoryReadWriteMock,
  getReplayResourceEventMock,
  managerFindOneMock,
  managerQueryMock,
  repositoryReadCreateQueryBuilderMock,
  repositoryReadFindMock,
  repositoryReadFindOneMock,
  repositoryReadWriteRemoveMock,
  transactionMock,
} = vi.hoisted(() => ({
  applyLinkedPlaybackWriteTransactionalMock: vi.fn(),
  getByIdTextMock: vi.fn(),
  getRepositoryReadMock: vi.fn(),
  getRepositoryReadWriteMock: vi.fn(),
  getReplayResourceEventMock: vi.fn(),
  managerFindOneMock: vi.fn(),
  managerQueryMock: vi.fn(),
  repositoryReadCreateQueryBuilderMock: vi.fn(),
  repositoryReadFindMock: vi.fn(),
  repositoryReadFindOneMock: vi.fn(),
  repositoryReadWriteRemoveMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock('@orm/context.js', () => ({
  getDataSourceRead: () => ({
    getRepository: getRepositoryReadMock,
  }),
  getDataSourceReadWrite: () => ({
    getRepository: getRepositoryReadWriteMock,
  }),
  getLoggerService: () => ({
    debug: vi.fn(),
  }),
}));

vi.mock('@orm/services/queue/queue.js', () => ({
  QueueService: class QueueServiceMock {
    getByIdText = getByIdTextMock;
  },
}));

vi.mock('../clip.js', () => ({
  ClipService: class ClipServiceMock {
    getByIdText = vi.fn();
  },
}));

vi.mock('../item/item.js', () => ({
  ItemService: class ItemServiceMock {
    getByIdText = vi.fn();
  },
}));

vi.mock('../item/itemSoundbite.js', () => ({
  ItemSoundbiteService: class ItemSoundbiteServiceMock {
    getByIdText = vi.fn();
  },
}));

vi.mock('./queueResourceActiveItemFilter.js', () => ({
  applyResolvesToActiveItemOrAddByRss: vi.fn(),
}));

import { QueueResourceService } from './queueResource.js';

describe('QueueResourceService playback policy', () => {
  beforeEach(() => {
    applyLinkedPlaybackWriteTransactionalMock.mockReset();
    getByIdTextMock.mockReset();
    getRepositoryReadMock.mockReset();
    getRepositoryReadWriteMock.mockReset();
    getReplayResourceEventMock.mockReset();
    managerFindOneMock.mockReset();
    managerQueryMock.mockReset();
    repositoryReadCreateQueryBuilderMock.mockReset();
    repositoryReadFindMock.mockReset();
    repositoryReadFindOneMock.mockReset();
    repositoryReadWriteRemoveMock.mockReset();
    transactionMock.mockReset();

    const repositoryRead = {
      createQueryBuilder: repositoryReadCreateQueryBuilderMock,
      find: repositoryReadFindMock,
      findOne: repositoryReadFindOneMock,
    };

    const manager = {
      findOne: managerFindOneMock,
      query: managerQueryMock,
      transaction: transactionMock,
    };

    const repositoryReadWrite = { manager, remove: repositoryReadWriteRemoveMock };

    getRepositoryReadMock.mockReturnValue(repositoryRead);
    getRepositoryReadWriteMock.mockReturnValue(repositoryReadWrite);
    transactionMock.mockImplementation(async (handler: (managerArg: typeof manager) => unknown) =>
      handler(manager)
    );
  });

  it('merges playback state with forward-only position and sticky completion', () => {
    const service = new QueueResourceService();
    const buildPlaybackWriteParams = Reflect.get(service, 'buildPlaybackWriteParams');

    if (typeof buildPlaybackWriteParams !== 'function') {
      throw new Error('Expected buildPlaybackWriteParams to be a function');
    }

    const existing = {
      completed: true,
      last_played_at: new Date('2026-09-13T11:00:00.000Z'),
      list_position: '-0.5',
      playback_position: '180',
    };
    const params = {
      completed: false,
      last_played_at: '2026-09-13T11:05:00.000Z',
      playback_event_kind: 'play',
      playback_position: '42',
    };

    const result = buildPlaybackWriteParams.call(
      service,
      existing,
      params,
      'history',
      '2026-09-13T11:06:00.000Z'
    );

    expect(result.isStale).toBe(false);
    expect(result.zone).toBe('now_playing');
    expect(result.persist.playback_position).toBe('180');
    expect(result.persist.completed).toBe(true);
  });

  it('marks writes with older timestamps as stale no-ops', () => {
    const service = new QueueResourceService();
    const buildPlaybackWriteParams = Reflect.get(service, 'buildPlaybackWriteParams');

    if (typeof buildPlaybackWriteParams !== 'function') {
      throw new Error('Expected buildPlaybackWriteParams to be a function');
    }

    const existing = {
      completed: false,
      last_played_at: new Date('2026-09-13T12:00:00.000Z'),
      list_position: '-0.5',
      playback_position: '12',
    };

    const result = buildPlaybackWriteParams.call(
      service,
      existing,
      { last_played_at: '2026-09-13T11:59:59.000Z', playback_event_kind: 'pause' },
      'history',
      '2026-09-13T12:00:05.000Z'
    );

    expect(result.isStale).toBe(true);
  });

  it('orders history reads by last_played_at desc with list_position tiebreaker', async () => {
    getByIdTextMock.mockResolvedValue({ id: 22 });

    const countQb = {
      andWhere: vi.fn().mockReturnThis(),
      getCount: vi.fn().mockResolvedValue(2),
      where: vi.fn().mockReturnThis(),
    };
    const idQb = {
      addOrderBy: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([{ id: 101 }, { id: 102 }]),
      orderBy: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };

    repositoryReadCreateQueryBuilderMock.mockReturnValueOnce(countQb).mockReturnValueOnce(idQb);
    repositoryReadFindMock.mockResolvedValue([{ id: 101 }, { id: 102 }]);

    const service = new QueueResourceService();
    await service.getHistoryResourcesByQueueIdText('q-history', { skip: 0, take: 2 });

    expect(idQb.orderBy).toHaveBeenCalledWith('qr.last_played_at', 'DESC', 'NULLS LAST');
    expect(idQb.addOrderBy).toHaveBeenCalledWith('qr.list_position', 'DESC');
  });

  it('replays events in clamped timestamp order regardless of input order', async () => {
    const service = new QueueResourceService();
    managerFindOneMock.mockResolvedValue({ id: 44 });
    managerQueryMock.mockResolvedValue(undefined);

    Reflect.set(service, 'getReplayResourceEvent', getReplayResourceEventMock);
    Reflect.set(
      service,
      'applyLinkedPlaybackWriteTransactional',
      applyLinkedPlaybackWriteTransactionalMock
    );

    getReplayResourceEventMock.mockImplementation((event) => ({
      event,
      idText: `id-${event.playback_event_kind}`,
      resourceKey: 'item',
      resourceService: {
        getByIdText: vi.fn().mockResolvedValue({ id: event.playback_event_kind }),
      },
    }));

    const appliedLastPlayedAts: string[] = [];
    applyLinkedPlaybackWriteTransactionalMock.mockImplementation(
      async (_manager, _queueIdText, _queue, _resourceKey, _resourceId, params) => {
        appliedLastPlayedAts.push(String(params.last_played_at));
        return { id: appliedLastPlayedAts.length };
      }
    );

    await service.replayPlaybackEvents('queue-44', [
      {
        item_id_text: 'a',
        last_played_at: '2026-09-13T10:03:00.000Z',
        playback_event_kind: 'seek',
      },
      {
        item_id_text: 'b',
        last_played_at: '2026-09-13T10:01:00.000Z',
        playback_event_kind: 'play',
      },
      {
        item_id_text: 'c',
        last_played_at: '2026-09-13T10:02:00.000Z',
        playback_event_kind: 'pause',
      },
    ]);

    expect(appliedLastPlayedAts).toEqual([
      '2026-09-13T10:01:00.000Z',
      '2026-09-13T10:02:00.000Z',
      '2026-09-13T10:03:00.000Z',
    ]);
  });

  it('replayed batch matches one-at-a-time chronological writes', async () => {
    const service = new QueueResourceService();
    const buildPlaybackWriteParams = Reflect.get(service, 'buildPlaybackWriteParams');
    if (typeof buildPlaybackWriteParams !== 'function') {
      throw new Error('Expected buildPlaybackWriteParams to be a function');
    }

    managerFindOneMock.mockResolvedValue({ id: 44 });
    managerQueryMock.mockResolvedValue(undefined);
    Reflect.set(service, 'getReplayResourceEvent', getReplayResourceEventMock);
    Reflect.set(
      service,
      'applyLinkedPlaybackWriteTransactional',
      applyLinkedPlaybackWriteTransactionalMock
    );

    const events = [
      {
        item_id_text: 'a',
        last_played_at: '2026-09-13T10:03:00.000Z',
        playback_event_kind: 'pause',
        playback_position: '42',
      },
      {
        item_id_text: 'a',
        last_played_at: '2026-09-13T10:01:00.000Z',
        playback_event_kind: 'play',
        playback_position: '12',
      },
      {
        item_id_text: 'a',
        last_played_at: '2026-09-13T10:02:00.000Z',
        playback_event_kind: 'seek',
        playback_position: '24',
      },
    ] as const;

    getReplayResourceEventMock.mockImplementation((event) => ({
      event,
      idText: 'item-a',
      resourceKey: 'item',
      resourceService: { getByIdText: vi.fn().mockResolvedValue({ id: 900 }) },
    }));

    const chronologicalEvents = [...events].sort((a, b) =>
      a.last_played_at.localeCompare(b.last_played_at)
    );
    type PlaybackWriteParamsResult = {
      isStale: boolean;
      persist: {
        completed?: boolean;
        last_played_at?: Date | null;
        playback_position?: string;
      };
      zone: 'history' | 'now_playing' | 'upcoming' | 'removed';
    };

    let expectedState: {
      completed: boolean;
      last_played_at: Date | null;
      list_position: string;
      playback_position: string;
    } | null = null;
    for (const event of chronologicalEvents) {
      const write: PlaybackWriteParamsResult = buildPlaybackWriteParams.call(
        service,
        expectedState,
        event,
        'history',
        event.last_played_at
      );
      expectedState = {
        completed: write.persist.completed === true,
        last_played_at:
          write.persist.last_played_at instanceof Date ? write.persist.last_played_at : null,
        list_position: write.zone === 'history' ? '-1' : '0',
        playback_position: String(write.persist.playback_position ?? '0'),
      };
    }

    let replayState: {
      completed: boolean;
      last_played_at: Date | null;
      list_position: string;
      playback_position: string;
    } | null = null;
    applyLinkedPlaybackWriteTransactionalMock.mockImplementation(
      async (_manager, _queueIdText, _queue, _resourceKey, _resourceId, params) => {
        const write: PlaybackWriteParamsResult = buildPlaybackWriteParams.call(
          service,
          replayState,
          params,
          'history',
          String(params.last_played_at)
        );
        replayState = {
          completed: write.persist.completed === true,
          last_played_at:
            write.persist.last_played_at instanceof Date ? write.persist.last_played_at : null,
          list_position: write.zone === 'history' ? '-1' : '0',
          playback_position: String(write.persist.playback_position ?? '0'),
        };
        return { id: 1 };
      }
    );

    await service.replayPlaybackEvents('queue-44', [...events]);

    expect(replayState).toEqual(expectedState);
  });

  it('does not remove a row when tombstone is older than row last_played_at', async () => {
    getByIdTextMock.mockResolvedValue({ id: 9 });
    repositoryReadFindOneMock
      .mockResolvedValueOnce({
        id: 200,
        last_played_at: new Date('2026-09-13T11:00:00.000Z'),
      })
      .mockResolvedValueOnce({
        id: 200,
      });

    const service = new QueueResourceService();
    await service.removeResourceFromQueue(
      'queue-9',
      'item-9',
      {
        getByIdText: vi.fn().mockResolvedValue({ id: 99 }),
      },
      'item',
      { last_played_at: '2026-09-13T10:00:00.000Z' }
    );

    expect(repositoryReadWriteRemoveMock).not.toHaveBeenCalled();
  });
});
