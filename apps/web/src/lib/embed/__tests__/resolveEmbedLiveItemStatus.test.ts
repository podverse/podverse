import { describe, expect, it } from 'vitest';

import type { DTOItem } from '@podverse/helpers';
import { LiveItemStatusEnum } from '@podverse/helpers';

import {
  filterEmbedCurrentlyLiveChannelItems,
  isEmbedItemCurrentlyLive,
  resolveEmbedLiveItemStatusId,
} from '../resolveEmbedLiveItemStatus';

function createLiveItem(status: LiveItemStatusEnum): DTOItem {
  return {
    id: 1,
    id_text: 'live-item',
    live_item: {
      id: 10,
      item_id: 1,
      live_item_status_id: status,
      live_item_status: { id: status },
      start_time: '2026-06-05T00:00:00.000Z',
    },
  } as DTOItem;
}

describe('resolveEmbedLiveItemStatus', () => {
  it('returns null for items without live_item', () => {
    const item = { id: 1, id_text: 'episode' } as DTOItem;

    expect(resolveEmbedLiveItemStatusId(item)).toBeNull();
    expect(isEmbedItemCurrentlyLive(item)).toBe(false);
  });

  it('detects currently live items', () => {
    const item = createLiveItem(LiveItemStatusEnum.Live);

    expect(resolveEmbedLiveItemStatusId(item)).toBe(LiveItemStatusEnum.Live);
    expect(isEmbedItemCurrentlyLive(item)).toBe(true);
  });

  it('filters channel live items to currently live only', () => {
    const items = [
      createLiveItem(LiveItemStatusEnum.Live),
      createLiveItem(LiveItemStatusEnum.Pending),
      createLiveItem(LiveItemStatusEnum.Ended),
      { id: 2, id_text: 'episode' } as DTOItem,
    ];

    expect(filterEmbedCurrentlyLiveChannelItems(items)).toHaveLength(1);
    expect(filterEmbedCurrentlyLiveChannelItems(items)[0]?.id_text).toBe('live-item');
  });
});
