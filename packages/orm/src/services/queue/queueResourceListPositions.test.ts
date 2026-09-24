import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QueueResourceService } from './queueResource.js';
import {
  QUEUE_LIST_POSITION_INCREMENT,
  upcomingListPositionBeforeFirst,
} from './queueResourceListPositions.js';

const {
  getByIdTextMock,
  getRepositoryReadMock,
  getRepositoryReadWriteMock,
  repositoryReadFindOneMock,
} = vi.hoisted(() => ({
    getByIdTextMock: vi.fn(),
    getRepositoryReadMock: vi.fn(),
    getRepositoryReadWriteMock: vi.fn(),
    repositoryReadFindOneMock: vi.fn(),
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

describe('upcomingListPositionBeforeFirst', () => {
  it('starts upcoming at 1 when the queue has no upcoming row', () => {
    expect(upcomingListPositionBeforeFirst(null)).toBe('1');
  });

  it('does not treat a history position as the front of the queue', () => {
    expect(upcomingListPositionBeforeFirst('-1')).toBe('1');
  });

  it('does not treat now-playing as the front of the queue', () => {
    expect(upcomingListPositionBeforeFirst('0')).toBe('1');
  });

  it('inserts just before the first upcoming row', () => {
    expect(upcomingListPositionBeforeFirst('1')).toBe(String(1 - QUEUE_LIST_POSITION_INCREMENT));
  });

  it('stays positive when the first upcoming row is closer to 0 than one increment', () => {
    const first = String(QUEUE_LIST_POSITION_INCREMENT / 10);
    const position = Number(upcomingListPositionBeforeFirst(first));
    expect(position).toBeGreaterThan(0);
    expect(position).toBeLessThan(Number(first));
  });
});

describe('getFirstAndLastQueuedItemsByQueueIdText', () => {
  beforeEach(() => {
    getByIdTextMock.mockReset();
    repositoryReadFindOneMock.mockReset();
    getRepositoryReadMock.mockReset();
    getRepositoryReadWriteMock.mockReset();

    getRepositoryReadMock.mockReturnValue({
      findOne: repositoryReadFindOneMock,
    });
    getRepositoryReadWriteMock.mockReturnValue({
      manager: { transaction: vi.fn() },
    });
  });

  it('chooses the last upcoming row and ignores history rows', async () => {
    getByIdTextMock.mockResolvedValue({ id: 7, id_text: 'queue-1' });
    repositoryReadFindOneMock.mockResolvedValue(null);

    const service = new QueueResourceService();
    await service.getFirstAndLastQueuedItemsByQueueIdText('queue-1');

    expect(repositoryReadFindOneMock).toHaveBeenCalledTimes(2);
    const firstCall = repositoryReadFindOneMock.mock.calls[0]?.[0];
    const lastCall = repositoryReadFindOneMock.mock.calls[1]?.[0];
    expect(firstCall.where.list_position.type).toBe('moreThan');
    expect(firstCall.where.list_position.value).toBe('0');
    expect(firstCall.order).toEqual({ list_position: 'ASC' });
    expect(lastCall.where.list_position.type).toBe('moreThan');
    expect(lastCall.where.list_position.value).toBe('0');
    expect(lastCall.order).toEqual({ list_position: 'DESC' });
  });
});
