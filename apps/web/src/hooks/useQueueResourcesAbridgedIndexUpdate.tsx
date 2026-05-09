import { useCallback, useEffect, useRef } from 'react';

import type { QueueResourceAbridgedUpdates } from '@podverse/helpers';
import { updateQueueResourceAbridgedIndex } from '@podverse/helpers';

import { useMediaPlayer } from '../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../contexts/MediaPlayerCurrentTime';
import { useQueueResourcesAbridgedIndex } from '../contexts/QueueResourcesAbridgedIndex';

export function useQueueResourcesAbridgedIndexUpdate() {
  const { mpClip, mpItemSoundbite, mpItem, mpDuration } = useMediaPlayer();
  const { mpCurrentTime } = useMediaPlayerCurrentTime();
  const { queueResourcesAbridgedIndex, setQueueResourcesAbridgedIndex } =
    useQueueResourcesAbridgedIndex();

  const mpClipRef = useRef(mpClip);
  const mpItemSoundbiteRef = useRef(mpItemSoundbite);
  const mpItemRef = useRef(mpItem);
  const mpDurationRef = useRef(mpDuration);
  const mpCurrentTimeRef = useRef(mpCurrentTime);
  const queueResourcesAbridgedIndexRef = useRef(queueResourcesAbridgedIndex);

  useEffect(() => {
    mpClipRef.current = mpClip;
  }, [mpClip]);
  useEffect(() => {
    mpItemSoundbiteRef.current = mpItemSoundbite;
  }, [mpItemSoundbite]);
  useEffect(() => {
    mpItemRef.current = mpItem;
  }, [mpItem]);
  useEffect(() => {
    mpDurationRef.current = mpDuration;
  }, [mpDuration]);
  useEffect(() => {
    mpCurrentTimeRef.current = mpCurrentTime;
  }, [mpCurrentTime]);
  useEffect(() => {
    queueResourcesAbridgedIndexRef.current = queueResourcesAbridgedIndex;
  }, [queueResourcesAbridgedIndex]);

  return useCallback((completed?: boolean) => {
    const progressValue = completed ? '0' : (mpCurrentTimeRef.current?.toString() ?? '0');

    const updates: QueueResourceAbridgedUpdates = {
      clip: mpClipRef.current
        ? {
            i: mpClipRef.current.id,
            p: progressValue,
            d: mpDurationRef.current?.toString() ?? '0',
            z:
              completed !== undefined
                ? completed
                : queueResourcesAbridgedIndexRef.current.clips[mpClipRef.current.id]?.z === true,
          }
        : null,
      item_soundbite: mpItemSoundbiteRef.current
        ? {
            i: mpItemSoundbiteRef.current.id,
            p: progressValue,
            d: mpDurationRef.current?.toString() ?? '0',
            z:
              completed !== undefined
                ? completed
                : queueResourcesAbridgedIndexRef.current.item_soundbites[
                    mpItemSoundbiteRef.current.id
                  ]?.z === true,
          }
        : null,
      item: mpItemRef.current
        ? {
            i: mpItemRef.current.id,
            p: progressValue,
            d: mpDurationRef.current?.toString() ?? '0',
            z:
              completed !== undefined
                ? completed
                : queueResourcesAbridgedIndexRef.current.items[mpItemRef.current.id]?.z === true,
          }
        : null,
      add_by_rss_resource_data: null,
    };

    const updatedIndex = updateQueueResourceAbridgedIndex(
      queueResourcesAbridgedIndexRef.current,
      updates
    );
    setQueueResourcesAbridgedIndex(updatedIndex);
  }, []);
}
