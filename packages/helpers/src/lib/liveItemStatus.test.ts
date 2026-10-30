import { describe, expect, it } from 'vitest';

import type { DTOItem } from '../dtos/item/item.js';
import { LiveItemStatusEnum } from '../dtos/liveItem/liveItem.js';
import { getLiveItemStatusEnumValue, resolveItemLiveStatusId } from './liveItemStatus.js';

function itemWithLiveStatus(
  relationId: LiveItemStatusEnum,
  columnId: LiveItemStatusEnum
): Pick<DTOItem, 'live_item'> {
  return {
    live_item: {
      id: 1,
      item_id: 1,
      live_item_status: { id: relationId },
      live_item_status_id: columnId,
      start_time: '2026-06-05T00:00:00.000Z',
    },
  };
}

describe('resolveItemLiveStatusId', () => {
  it('returns null when live_item is null', () => {
    expect(resolveItemLiveStatusId({ live_item: null })).toBeNull();
  });

  it('returns null when live_item is undefined', () => {
    expect(resolveItemLiveStatusId({ live_item: undefined })).toBeNull();
  });

  it('returns Ended when the relation and the column are both Ended', () => {
    expect(
      resolveItemLiveStatusId(
        itemWithLiveStatus(LiveItemStatusEnum.Ended, LiveItemStatusEnum.Ended)
      )
    ).toBe(LiveItemStatusEnum.Ended);
  });

  it('prefers the relation when the column has a different status', () => {
    expect(
      resolveItemLiveStatusId(itemWithLiveStatus(LiveItemStatusEnum.Ended, LiveItemStatusEnum.Live))
    ).toBe(LiveItemStatusEnum.Ended);
  });

  it('reads the column when the relation is absent', () => {
    // List payloads omit `live_item_status` while `DTOLiveItem` requires the relation.
    const item = {
      live_item: {
        id: 1,
        item_id: 1,
        live_item_status_id: LiveItemStatusEnum.Live,
        start_time: '2026-06-05T00:00:00.000Z',
      },
    } as Pick<DTOItem, 'live_item'>;

    expect(resolveItemLiveStatusId(item)).toBe(LiveItemStatusEnum.Live);
  });
});

describe('getLiveItemStatusEnumValue', () => {
  it('maps ended, spaced Live, and PENDING to their enums', () => {
    expect(getLiveItemStatusEnumValue('ended')).toBe(LiveItemStatusEnum.Ended);
    expect(getLiveItemStatusEnumValue(' Live ')).toBe(LiveItemStatusEnum.Live);
    expect(getLiveItemStatusEnumValue('PENDING')).toBe(LiveItemStatusEnum.Pending);
  });

  it('returns null for unknown, empty, and null', () => {
    expect(getLiveItemStatusEnumValue('unknown')).toBeNull();
    expect(getLiveItemStatusEnumValue('')).toBeNull();
    expect(getLiveItemStatusEnumValue(null)).toBeNull();
  });
});
