import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryMock = vi.fn();

vi.mock('@orm/db/index.js', () => ({
  AppDataSourceReadWrite: {
    getRepository: () => ({
      query: queryMock,
    }),
  },
}));

vi.mock('@orm/entities/queue/queueResource.js', () => ({
  QueueResource: class QueueResource {},
}));

vi.mock('@orm/entities/clip.js', () => ({ Clip: class Clip {} }));
vi.mock('@orm/entities/item/item.js', () => ({ Item: class Item {} }));
vi.mock('@orm/entities/item/itemSoundbite.js', () => ({
  ItemSoundbite: class ItemSoundbite {},
}));

import { ItemFlagStatusStatusEnum } from '@orm/entities/item/itemFlagStatus.js';

import { pruneNonActiveItemBackedQueueResourceRows } from './queueResourceActiveItemFilter.js';

describe('pruneNonActiveItemBackedQueueResourceRows', () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue({ raw: [] });
  });

  it('runs three DELETEs parameterised to non-Active item status', async () => {
    await pruneNonActiveItemBackedQueueResourceRows();
    expect(queryMock).toHaveBeenCalledTimes(3);
    const p = [ItemFlagStatusStatusEnum.Active];
    expect(queryMock.mock.calls[0]?.[1]).toEqual(p);
    expect(queryMock.mock.calls[1]?.[1]).toEqual(p);
    expect(queryMock.mock.calls[2]?.[1]).toEqual(p);
    for (const call of queryMock.mock.calls) {
      const q = String(call[0]);
      expect(q).toMatch(/DELETE FROM queue_resource/);
      expect(q).toMatch(/item_flag_status_id <> \$1/);
    }
  });
});
