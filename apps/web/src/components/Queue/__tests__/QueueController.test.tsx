/**
 * Signed-in queue hydration stops when a playback load is applied, never advances
 * the auto-queue on open, and falls back to another account queue by id.
 */
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DTOQueue } from '@podverse/helpers';

import { QueueController } from '../QueueController';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

const hoisted = vi.hoisted(() => {
  const playbackLoadGenerationRef = { current: 0 };
  const player = {
    mpAddByRSS: null as null,
    mpClip: null as null,
    mpItem: null as null,
    mpItemSoundbite: null as null,
  };
  return {
    queueResourcesLoadActive: vi.fn(),
    playbackLoadGenerationRef,
    player,
  };
});

vi.mock('../../../contexts/MediaPlayer', () => ({
  useMediaPlayer: () => ({
    ...hoisted.player,
    playbackLoadGenerationRef: hoisted.playbackLoadGenerationRef,
  }),
}));

vi.mock('../../../hooks/useQueueResourcesLoadActive', () => ({
  useQueueResourcesLoadActive: () => hoisted.queueResourcesLoadActive,
}));

const musicQueue = {
  id_text: 'e2eMusicQueue01',
  is_active_queue: true,
} as unknown as DTOQueue;
const podcastQueue = {
  id_text: 'e2ePodQueue01',
  is_active_queue: false,
} as unknown as DTOQueue;

describe('QueueController hydration', () => {
  beforeEach(() => {
    hoisted.queueResourcesLoadActive.mockReset();
    hoisted.playbackLoadGenerationRef.current = 0;
    hoisted.player = {
      mpAddByRSS: null,
      mpClip: null,
      mpItem: null,
      mpItemSoundbite: null,
    };
  });

  afterEach(() => {
    cleanup();
  });

  it('does not fall back to another queue when a playback load is applied during the first fetch', async () => {
    const firstLoadDeferred = createDeferred<{
      activeQueue: DTOQueue;
      activeResource: null;
      queues: DTOQueue[];
    }>();
    hoisted.queueResourcesLoadActive.mockReturnValueOnce(firstLoadDeferred.promise);

    render(<QueueController />);

    await waitFor(() => {
      expect(hoisted.queueResourcesLoadActive).toHaveBeenCalledTimes(1);
    });
    expect(hoisted.queueResourcesLoadActive).toHaveBeenCalledWith(undefined, undefined, {
      advanceAutoQueue: false,
    });

    hoisted.playbackLoadGenerationRef.current += 1;
    firstLoadDeferred.resolve({
      activeQueue: musicQueue,
      activeResource: null,
      queues: [musicQueue, podcastQueue],
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(hoisted.queueResourcesLoadActive).toHaveBeenCalledTimes(1);
  });

  it('loads a fallback queue by id and never advances auto-queue on open', async () => {
    hoisted.queueResourcesLoadActive
      .mockResolvedValueOnce({
        activeQueue: musicQueue,
        activeResource: null,
        queues: [musicQueue, podcastQueue],
      })
      .mockResolvedValueOnce({
        activeQueue: podcastQueue,
        activeResource: { id: 1 },
        queues: [musicQueue, podcastQueue],
      });

    render(<QueueController />);

    await waitFor(() => {
      expect(hoisted.queueResourcesLoadActive).toHaveBeenCalledTimes(2);
    });

    expect(hoisted.queueResourcesLoadActive).toHaveBeenNthCalledWith(1, undefined, undefined, {
      advanceAutoQueue: false,
    });
    expect(hoisted.queueResourcesLoadActive).toHaveBeenNthCalledWith(2, undefined, {
      queueIdText: 'e2ePodQueue01',
    });
  });
});
