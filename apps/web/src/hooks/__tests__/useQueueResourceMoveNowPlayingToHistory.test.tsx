import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DTOItem } from '@podverse/helpers';

import { useQueueResourcesMoveNowPlayingToHistory } from '../useQueueResourceMoveNowPlayingToHistory';

const hoisted = vi.hoisted(() => {
  const api = {
    reqQueueResourceClipAddHistory: vi.fn(() => Promise.resolve()),
    reqQueueResourceItemSoundbiteAddHistory: vi.fn(() => Promise.resolve()),
    reqQueueResourceItemAddHistory: vi.fn(() => Promise.resolve()),
  };

  return {
    api,
    updateAbridgedIndex: vi.fn(),
  };
});

vi.mock('../../factories/apiRequestService', () => ({
  getApiRequestService: () => hoisted.api,
}));

vi.mock('../../contexts/Account', () => ({
  useAccount: () => ({
    loggedInAccount: { id: 1 },
  }),
}));

vi.mock('../../contexts/Queue', () => ({
  useQueues: () => ({
    activeQueue: {
      id: 1,
      id_text: 'queue-1',
    },
  }),
}));

vi.mock('../useQueueResourcesAbridgedIndexUpdate', () => ({
  useQueueResourcesAbridgedIndexUpdate: () => hoisted.updateAbridgedIndex,
}));

const item: DTOItem = {
  id: 10,
  id_text: 'item-10',
  title: 'Test item',
  channel_id: 1,
} as unknown as DTOItem;

describe('useQueueResourcesMoveNowPlayingToHistory', () => {
  beforeEach(() => {
    hoisted.api.reqQueueResourceClipAddHistory.mockClear();
    hoisted.api.reqQueueResourceItemSoundbiteAddHistory.mockClear();
    hoisted.api.reqQueueResourceItemAddHistory.mockClear();
    hoisted.updateAbridgedIndex.mockClear();
  });

  it('posts complete when moving ended now-playing item to history', async () => {
    const { result } = renderHook(() => useQueueResourcesMoveNowPlayingToHistory());

    await act(async () => {
      await result.current({
        completed: true,
        mpClip: null,
        mpItem: item,
        mpItemSoundbite: null,
      });
    });

    expect(hoisted.api.reqQueueResourceItemAddHistory).toHaveBeenCalledWith(
      'queue-1',
      'item-10',
      expect.objectContaining({
        completed: true,
        playback_position: '0',
        playback_event_kind: 'complete',
        last_played_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      })
    );
  });

  it('posts skip when moving manually skipped now-playing item to history', async () => {
    const { result } = renderHook(() => useQueueResourcesMoveNowPlayingToHistory());

    await act(async () => {
      await result.current({
        completed: false,
        mpClip: null,
        mpItem: item,
        mpItemSoundbite: null,
      });
    });

    expect(hoisted.api.reqQueueResourceItemAddHistory).toHaveBeenCalledWith(
      'queue-1',
      'item-10',
      expect.objectContaining({
        completed: false,
        playback_event_kind: 'skip',
        last_played_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      })
    );
  });
});
