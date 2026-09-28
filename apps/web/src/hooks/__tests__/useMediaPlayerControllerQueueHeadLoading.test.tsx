/**
 * Queue-head loading: same-item guard on play/pause, and automatic loads that give way
 * to a load applied after they start (request-generation).
 */
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DTOChannel, DTOClip, DTOItem, DTOQueueResource } from '@podverse/helpers';

import {
  clearPlaybackHandoffLocalState,
  readPlaybackHandoffLocalState,
  writePlaybackHandoffLocalState,
} from '../playbackHandoffState';
import { useMediaPlayerControllerQueueHeadLoading } from '../useMediaPlayerControllerQueueHeadLoading';

type MediaPlayerState = {
  mpChannel: DTOChannel | null;
  mpItem: DTOItem | null;
  mpClip: DTOClip | null;
  mpIsPlaying: boolean;
};

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

const hoisted = vi.hoisted(() => {
  const player: MediaPlayerState = {
    mpChannel: null,
    mpItem: null,
    mpClip: null,
    mpIsPlaying: false,
  };
  const upcoming: DTOQueueResource[] = [];
  const playbackLoadGenerationRef = { current: 0 };
  return {
    mediaPlayerResourceUpdate: vi.fn(),
    reqItemGetByIdOrIdText: vi.fn(),
    reqChannelGetByIdOrIdText: vi.fn(),
    reqQueueResourcesPromoteUpcomingToNowPlaying: vi.fn(),
    queueResourcesLoadActive: vi.fn(),
    player,
    upcoming,
    playbackLoadGenerationRef,
  };
});

vi.mock('../../contexts/AutoQueue', () => ({
  checkIsActiveRowHighestKey: () => false,
  useAutoQueue: () => ({
    autoQueueResources: {},
    autoQueueActiveRow: null,
    autoQueueConfig: {
      playlist_id_text: null,
      disabled: false,
      random: false,
      repeat: false,
      nextPage: 1,
      shuffleHash: '',
    },
  }),
}));

vi.mock('../../contexts/LocalSettings', () => ({
  useLocalSettings: () => ({ preferredMediaType: null }),
}));

const pendingMusicQueueLoadIntentRef = { current: null };
const defaultEnclosureParams = {
  type: 'default',
  enclosureRowSelected: null,
  sourceRowSelected: null,
};

vi.mock('../../contexts/MediaPlayer', () => ({
  useMediaPlayer: () => ({
    ...hoisted.player,
    mpItemSoundbite: null,
    mpAddByRSS: null,
    mpDuration: 180,
    pendingMusicQueueLoadIntentRef,
    playbackLoadGenerationRef: hoisted.playbackLoadGenerationRef,
    mpEnclosureSelectedParams: defaultEnclosureParams,
    setMPEnclosureSelectedParams: vi.fn(),
    setMPItemChapters: vi.fn(),
    setMPItemLabeledItemEnclosures: vi.fn(),
  }),
}));

vi.mock('../../contexts/MediaPlayerCurrentTime', () => ({
  useMediaPlayerCurrentTime: () => ({ mpCurrentTime: 0 }),
}));

const activeQueue = { id_text: 'queue-1' };

vi.mock('../../contexts/Queue', () => ({
  useQueues: () => ({
    activeQueue,
    activeQueueUpcomingResources: hoisted.upcoming,
  }),
}));

vi.mock('../../factories/apiRequestService', () => ({
  getApiRequestService: () => ({
    reqItemGetByIdOrIdText: hoisted.reqItemGetByIdOrIdText,
    reqChannelGetByIdOrIdText: hoisted.reqChannelGetByIdOrIdText,
    reqItemParseAndGetChapters: async () => ({ data: [] }),
    reqQueueResourcesPromoteUpcomingToNowPlaying:
      hoisted.reqQueueResourcesPromoteUpcomingToNowPlaying,
  }),
}));

vi.mock('../../utils/addByRSS/playFromQueueResource', () => ({
  loadAddByRSSIndexItemFromResourceData: vi.fn(),
}));

vi.mock('../useAutoQueueLoadResources', () => ({
  useAutoQueueLoadResources: () => vi.fn(),
}));

vi.mock('../useMediaPlayerResourceUpdate', () => ({
  useMediaPlayerResourceUpdate: () => hoisted.mediaPlayerResourceUpdate,
}));

vi.mock('../usePlayAddByRSS', () => ({
  usePlayAddByRSS: () => vi.fn(),
}));

vi.mock('../useQueueResourcesLoadActive', () => ({
  useQueueResourcesLoadActive: () => hoisted.queueResourcesLoadActive,
}));

vi.mock('../useQueueResourceUpdateNowPlaying', () => ({
  useQueueResourcesUpdateNowPlaying: () => vi.fn(),
}));

// Fixtures carry only the fields the hook reads; the full DTOs are far wider.
const channel = { id: 1, id_text: 'channel-1' } as unknown as DTOChannel;
const item = {
  id: 1,
  id_text: 'item-1',
  title: 'Track One',
  channel_id: 1,
  item_enclosures: [],
} as unknown as DTOItem;
const otherItem = {
  id: 2,
  id_text: 'item-2',
  title: 'Track Two',
  channel_id: 1,
  item_enclosures: [],
} as unknown as DTOItem;
const clip = { id: 7, id_text: 'clip-7', item } as unknown as DTOClip;
const queueHead = {
  id: 15,
  list_position: '0',
  playback_position: '0',
  item,
  item_id: 1,
  clip_id: null,
  item_soundbite_id: null,
  last_played_at: null,
} as unknown as DTOQueueResource;
const upcomingQueueHead = {
  ...queueHead,
  id: 16,
  list_position: '1',
} as unknown as DTOQueueResource;

function Harness() {
  useMediaPlayerControllerQueueHeadLoading();
  return null;
}

describe('useMediaPlayerControllerQueueHeadLoading', () => {
  beforeEach(() => {
    clearPlaybackHandoffLocalState();
    hoisted.mediaPlayerResourceUpdate.mockReset();
    hoisted.reqItemGetByIdOrIdText.mockReset().mockResolvedValue(item);
    hoisted.reqChannelGetByIdOrIdText.mockReset().mockResolvedValue(channel);
    hoisted.reqQueueResourcesPromoteUpcomingToNowPlaying.mockReset().mockResolvedValue(undefined);
    hoisted.queueResourcesLoadActive.mockReset().mockResolvedValue({
      activeQueue,
      activeResource: null,
      historyMoved: 0,
      queues: [],
      upcomingResources: [],
      upcomingManualCount: 0,
    });
    hoisted.upcoming = [queueHead];
    hoisted.player = {
      mpChannel: null,
      mpItem: null,
      mpClip: null,
      mpIsPlaying: false,
    };
    hoisted.playbackLoadGenerationRef.current = 0;
  });

  afterEach(() => {
    cleanup();
  });

  it('does not reload the item already in the player when play state flips', async () => {
    hoisted.player = { mpChannel: channel, mpItem: item, mpClip: null, mpIsPlaying: true };
    const { rerender } = render(<Harness />);

    hoisted.player = { ...hoisted.player, mpIsPlaying: false };
    rerender(<Harness />);
    await Promise.resolve();

    expect(hoisted.reqItemGetByIdOrIdText).not.toHaveBeenCalled();
    expect(hoisted.mediaPlayerResourceUpdate).not.toHaveBeenCalled();
  });

  it('still loads the plain item when the player holds a clip of that item', async () => {
    hoisted.player = { mpChannel: channel, mpItem: item, mpClip: clip, mpIsPlaying: false };
    render(<Harness />);

    await waitFor(() => {
      expect(hoisted.mediaPlayerResourceUpdate).toHaveBeenCalled();
    });
    expect(hoisted.reqItemGetByIdOrIdText).toHaveBeenCalledWith('item-1');
  });

  it('does not apply an empty-player head load after a playback load is applied', async () => {
    const itemDeferred = createDeferred<DTOItem>();
    hoisted.reqItemGetByIdOrIdText.mockReturnValue(itemDeferred.promise);
    writePlaybackHandoffLocalState({
      itemIdText: 'local-before',
      itemTitle: 'Local Before',
      lastPlayedAt: null,
    });

    render(<Harness />);

    await waitFor(() => {
      expect(hoisted.reqItemGetByIdOrIdText).toHaveBeenCalledWith('item-1');
    });

    hoisted.playbackLoadGenerationRef.current += 1;
    itemDeferred.resolve(item);

    await waitFor(() => {
      expect(hoisted.reqChannelGetByIdOrIdText).toHaveBeenCalled();
    });
    expect(hoisted.mediaPlayerResourceUpdate).not.toHaveBeenCalled();
    expect(readPlaybackHandoffLocalState()?.itemIdText).toBe('local-before');
  });

  it('loads a now-playing head paused with skipNowPlayingWrite when the player stays empty', async () => {
    render(<Harness />);

    await waitFor(() => {
      expect(hoisted.mediaPlayerResourceUpdate).toHaveBeenCalled();
    });

    expect(hoisted.mediaPlayerResourceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        skipNowPlayingWrite: true,
        isPlaying: false,
        shouldPlay: false,
      })
    );
  });

  it('aborts upcoming-head adoption after promote when a playback load is applied', async () => {
    const promoteDeferred = createDeferred<undefined>();
    hoisted.upcoming = [upcomingQueueHead];
    hoisted.reqQueueResourcesPromoteUpcomingToNowPlaying.mockReturnValue(promoteDeferred.promise);

    render(<Harness />);

    await waitFor(() => {
      expect(hoisted.reqQueueResourcesPromoteUpcomingToNowPlaying).toHaveBeenCalledWith('queue-1');
    });

    hoisted.playbackLoadGenerationRef.current += 1;
    promoteDeferred.resolve(undefined);

    await waitFor(() => {
      expect(hoisted.queueResourcesLoadActive).toHaveBeenCalledWith(undefined, {
        queueIdText: 'queue-1',
      });
    });
    expect(hoisted.reqItemGetByIdOrIdText).not.toHaveBeenCalled();
    expect(hoisted.mediaPlayerResourceUpdate).not.toHaveBeenCalled();
  });

  it('applies only the latest automatic load when two dispatches overlap for the same head', async () => {
    const firstItemDeferred = createDeferred<DTOItem>();
    const secondItemDeferred = createDeferred<DTOItem>();
    let itemCallCount = 0;
    hoisted.reqItemGetByIdOrIdText.mockImplementation(() => {
      itemCallCount += 1;
      if (itemCallCount === 1) {
        return firstItemDeferred.promise;
      }
      return secondItemDeferred.promise;
    });

    hoisted.player = { mpChannel: channel, mpItem: item, mpClip: clip, mpIsPlaying: false };
    const { rerender } = render(<Harness />);

    await waitFor(() => {
      expect(hoisted.reqItemGetByIdOrIdText).toHaveBeenCalledTimes(1);
    });

    hoisted.player = { ...hoisted.player, mpIsPlaying: true };
    rerender(<Harness />);

    await waitFor(() => {
      expect(hoisted.reqItemGetByIdOrIdText).toHaveBeenCalledTimes(2);
    });

    firstItemDeferred.resolve(item);
    await waitFor(() => {
      expect(hoisted.reqChannelGetByIdOrIdText).toHaveBeenCalled();
    });
    expect(hoisted.mediaPlayerResourceUpdate).not.toHaveBeenCalled();

    secondItemDeferred.resolve(otherItem);
    await waitFor(() => {
      expect(hoisted.mediaPlayerResourceUpdate).toHaveBeenCalledTimes(1);
    });
  });
});
