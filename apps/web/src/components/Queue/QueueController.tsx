'use client';

import { useEffect, useEffectEvent, useRef } from 'react';

import { useMediaPlayer } from '../../contexts/MediaPlayer';
import { useQueueResourcesLoadActive } from '../../hooks/useQueueResourcesLoadActive';

export const QueueController: React.FC = () => {
  const queueResourcesLoadActive = useQueueResourcesLoadActive();
  const { mpAddByRSS, mpClip, mpItem, mpItemSoundbite } = useMediaPlayer();

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

  const hydrateActiveQueue = useEffectEvent(async () => {
    const loaded = await queueResourcesLoadActive();
    if (loaded.activeResource !== null || loaded.activeQueue === null) {
      return;
    }

    const playerEmpty =
      mpItemRef.current === null &&
      mpAddByRSSRef.current === null &&
      mpClipRef.current === null &&
      mpItemSoundbiteRef.current === null;
    if (!playerEmpty) {
      return;
    }

    const otherQueues = loaded.queues.filter(
      (queue) => queue.id_text !== loaded.activeQueue?.id_text
    );
    for (const otherQueue of otherQueues) {
      const otherLoaded = await queueResourcesLoadActive(undefined, {
        queueIdText: otherQueue.id_text,
      });
      if (otherLoaded.activeResource !== null) {
        return;
      }
    }

    await queueResourcesLoadActive();
  });

  useEffect(() => {
    void hydrateActiveQueue();
  }, []);

  return null;
};
