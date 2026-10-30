import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DTOItem } from '@podverse/helpers';
import { LiveItemStatusEnum } from '@podverse/helpers';

import { fetchFreshRestoredItem } from './fetchFreshRestoredItem';

const mocks = vi.hoisted(() => ({
  reqItemGetByIdOrIdText: vi.fn(),
}));

vi.mock('../../factories/apiRequestService', () => ({
  getApiRequestService: () => ({
    reqItemGetByIdOrIdText: mocks.reqItemGetByIdOrIdText,
  }),
}));

// Fixtures carry only the fields the decision reads.
const liveItem = {
  live_item: { live_item_status: { id: LiveItemStatusEnum.Live } },
} as unknown as DTOItem;
const endedItem = {
  live_item: { live_item_status: { id: LiveItemStatusEnum.Ended } },
} as unknown as DTOItem;
const notLiveItem = { live_item: null } as unknown as DTOItem;

describe('fetchFreshRestoredItem', () => {
  beforeEach(() => {
    mocks.reqItemGetByIdOrIdText.mockReset();
  });

  it('returns a live item and keeps it', async () => {
    mocks.reqItemGetByIdOrIdText.mockResolvedValue(liveItem);

    await expect(fetchFreshRestoredItem('item-live')).resolves.toEqual({
      item: liveItem,
      decision: { action: 'keep', reason: 'live' },
    });
  });

  it('returns an ended livestream and retires it', async () => {
    mocks.reqItemGetByIdOrIdText.mockResolvedValue(endedItem);

    await expect(fetchFreshRestoredItem('item-ended')).resolves.toEqual({
      item: endedItem,
      decision: { action: 'retire', reason: 'ended' },
    });
  });

  it('returns an item that is not a livestream and keeps it', async () => {
    mocks.reqItemGetByIdOrIdText.mockResolvedValue(notLiveItem);

    await expect(fetchFreshRestoredItem('item-episode')).resolves.toEqual({
      item: notLiveItem,
      decision: { action: 'keep', reason: 'not-live-item' },
    });
  });

  it('retires a missing item when the read answers 404', async () => {
    mocks.reqItemGetByIdOrIdText.mockRejectedValue({ status: 404 });

    await expect(fetchFreshRestoredItem('missing')).resolves.toEqual({
      item: null,
      decision: { action: 'retire', reason: 'not-found' },
    });
  });

  it('keeps the item with no answer when the read answers 503', async () => {
    mocks.reqItemGetByIdOrIdText.mockRejectedValue({ status: 503 });

    await expect(fetchFreshRestoredItem('item-live')).resolves.toEqual({
      item: null,
      decision: { action: 'keep', reason: 'status-unavailable' },
    });
  });

  it('keeps the item with no answer when the read fails without a status', async () => {
    mocks.reqItemGetByIdOrIdText.mockRejectedValue(new Error('network'));

    await expect(fetchFreshRestoredItem('item-live')).resolves.toEqual({
      item: null,
      decision: { action: 'keep', reason: 'status-unavailable' },
    });
  });

  it('keeps the item with no answer when the read resolves null', async () => {
    mocks.reqItemGetByIdOrIdText.mockResolvedValue(null);

    await expect(fetchFreshRestoredItem('item-live')).resolves.toEqual({
      item: null,
      decision: { action: 'keep', reason: 'status-unavailable' },
    });
  });
});
