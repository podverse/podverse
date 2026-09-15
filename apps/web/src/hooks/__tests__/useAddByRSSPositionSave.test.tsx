import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getQueueMediumIdFromMediumId, MediumEnum } from '@podverse/helpers';

import { useAddByRSSPositionSave } from '../useAddByRSSPositionSave';

const hoisted = vi.hoisted(() => {
  const api = {
    reqQueueResourceItemAddByRSSAddNowPlaying: vi.fn(() => Promise.resolve()),
    reqQueueResourceItemAddByRSSAddHistory: vi.fn(() => Promise.resolve()),
  };

  return {
    api,
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
    queues: [
      {
        id: 1,
        id_text: 'queue-1',
        medium_id: getQueueMediumIdFromMediumId(MediumEnum.Podcast),
      },
    ],
  }),
}));

vi.mock('../../contexts/MediaPlayer', () => ({
  useMediaPlayer: () => ({
    mpAddByRSS: {
      idText: 'feed-1',
      resourceData: {
        medium_id: MediumEnum.Podcast,
        title: 'Example feed item',
      },
    },
  }),
}));

describe('useAddByRSSPositionSave', () => {
  beforeEach(() => {
    hoisted.api.reqQueueResourceItemAddByRSSAddNowPlaying.mockClear();
    hoisted.api.reqQueueResourceItemAddByRSSAddHistory.mockClear();
  });

  it('skips add-by-RSS progress ticks when playback is paused', async () => {
    const { result } = renderHook(() => useAddByRSSPositionSave());

    await act(async () => {
      result.current.savePosition(15, 'progress_tick', false);
      await Promise.resolve();
    });

    expect(hoisted.api.reqQueueResourceItemAddByRSSAddNowPlaying).not.toHaveBeenCalled();
  });

  it('stamps add-by-RSS now-playing writes with timestamp and event kind', async () => {
    const { result } = renderHook(() => useAddByRSSPositionSave());

    await act(async () => {
      result.current.savePosition(42, 'pause');
      await Promise.resolve();
    });

    expect(hoisted.api.reqQueueResourceItemAddByRSSAddNowPlaying).toHaveBeenCalledWith(
      'queue-1',
      expect.objectContaining({
        playback_position: '42',
        playback_event_kind: 'pause',
        last_played_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      })
    );
  });
});
