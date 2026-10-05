'use client';

import { useEffect, useEffectEvent, useRef } from 'react';

import { useMediaPlayer } from '../../contexts/MediaPlayer';
import { useQueueResourcesLoadActive } from '../../hooks/useQueueResourcesLoadActive';

export const QueueController: React.FC = () => {
  const queueResourcesLoadActive = useQueueResourcesLoadActive();
  const { mpAddByRSS, mpClip, mpItem, mpItemSoundbite, playbackLoadGenerationRef } =
    useMediaPlayer();

  const mpAddByRSSRef = useRef(mpAddByRSS);
  const mpClipRef = useRef(mpClip);
  const mpItemRef = useRef(mpItem);
  const mpItemSoundbiteRef = useRef(mpItemSoundbite);

  useEffect(() => {
    mpAddByRSSRef.current = mpAddByRSS;
  }, [mpAddByRSS]);

  useEffect(() => {
    mpClipRef.current = mpClip;
  }, [mpClip]);

  useEffect(() => {
    mpItemRef.current = mpItem;
  }, [mpItem]);

  useEffect(() => {
    mpItemSoundbiteRef.current = mpItemSoundbite;
  }, [mpItemSoundbite]);

  const isPlayerEmpty = (): boolean =>
    mpItemRef.current === null &&
    mpAddByRSSRef.current === null &&
    mpClipRef.current === null &&
    mpItemSoundbiteRef.current === null;

  const hydrateActiveQueue = useEffectEvent(async () => {
    const hydrationLoadGeneration = playbackLoadGenerationRef.current;
    const shouldStopHydration = (): boolean =>
      hydrationLoadGeneration !== playbackLoadGenerationRef.current || !isPlayerEmpty();

    const loaded = await queueResourcesLoadActive(undefined, undefined, {
      advanceAutoQueue: false,
    });
    if (shouldStopHydration()) {
      return;
    }
    if (loaded.activeResource !== null || loaded.activeQueue === null) {
      return;
    }

    if (!isPlayerEmpty()) {
      return;
    }

    const otherQueues = loaded.queues.filter(
      (queue) => queue.id_text !== loaded.activeQueue?.id_text
    );
    for (const otherQueue of otherQueues) {
      if (shouldStopHydration()) {
        return;
      }
      const otherLoaded = await queueResourcesLoadActive(undefined, {
        queueIdText: otherQueue.id_text,
      });
      if (shouldStopHydration()) {
        return;
      }
      if (otherLoaded.activeResource !== null) {
        return;
      }
    }

    if (shouldStopHydration()) {
      return;
    }
    await queueResourcesLoadActive(undefined, undefined, { advanceAutoQueue: false });
  });

  useEffect(() => {
    void hydrateActiveQueue();
  }, []);

  return null;
};
