import { describe, expect, it } from 'vitest';

import type { DTOItem } from '@podverse/helpers/dto';
import { LiveItemStatusEnum } from '@podverse/helpers/dto';

import { resolveRestoredItemLoad } from './restoredItemLoad';

function itemWithLiveStatus(statusId: LiveItemStatusEnum): DTOItem {
  // The decision reads live_item only; the rest of DTOItem is not part of this contract.
  return {
    id_text: 'item-live',
    live_item: {
      id: 1,
      item_id: 1,
      live_item_status: { id: statusId },
      live_item_status_id: statusId,
      start_time: '2026-06-05T00:00:00.000Z',
    },
  } as DTOItem;
}

describe('resolveRestoredItemLoad', () => {
  it('loads a fresh item that is live', () => {
    const item = itemWithLiveStatus(LiveItemStatusEnum.Live);
    expect(
      resolveRestoredItemLoad({ fresh: { item, kind: 'found' }, knownLiveBeforeFetch: true })
    ).toEqual({ action: 'load', item });
  });

  it('loads a fresh item that is pending', () => {
    const item = itemWithLiveStatus(LiveItemStatusEnum.Pending);
    expect(
      resolveRestoredItemLoad({ fresh: { item, kind: 'found' }, knownLiveBeforeFetch: true })
    ).toEqual({ action: 'load', item });
  });

  it('retires a fresh item that has ended', () => {
    const item = itemWithLiveStatus(LiveItemStatusEnum.Ended);
    expect(
      resolveRestoredItemLoad({ fresh: { item, kind: 'found' }, knownLiveBeforeFetch: true })
    ).toEqual({ action: 'retire', reason: 'ended' });
  });

  it('loads a fresh item that is no longer a live item', () => {
    const item = { id_text: 'item-regular', live_item: null } as DTOItem;
    expect(
      resolveRestoredItemLoad({ fresh: { item, kind: 'found' }, knownLiveBeforeFetch: true })
    ).toEqual({ action: 'load', item });
  });

  it('retires a missing item that was known to be live', () => {
    expect(
      resolveRestoredItemLoad({ fresh: { kind: 'not-found' }, knownLiveBeforeFetch: true })
    ).toEqual({ action: 'retire', reason: 'not-found' });
  });

  it('retires a missing item that was not known to be live', () => {
    expect(
      resolveRestoredItemLoad({ fresh: { kind: 'not-found' }, knownLiveBeforeFetch: false })
    ).toEqual({ action: 'retire', reason: 'not-found' });
  });

  it('loads the stored copy when a known livestream cannot be read', () => {
    expect(
      resolveRestoredItemLoad({ fresh: { kind: 'unavailable' }, knownLiveBeforeFetch: true })
    ).toEqual({ action: 'load-stored' });
  });

  it('loads the stored copy when an item that was not known to be live cannot be read', () => {
    expect(
      resolveRestoredItemLoad({ fresh: { kind: 'unavailable' }, knownLiveBeforeFetch: false })
    ).toEqual({ action: 'load-stored' });
  });
});
