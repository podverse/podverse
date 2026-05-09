import { useCallback, useEffect, useRef } from 'react';

import type { DTOChannel, DTOClip, DTOItem, DTOItemSoundbite } from '@podverse/helpers';
import { getQueueMediumIdFromMediumId, updateQueueResourceAbridgedIndex } from '@podverse/helpers';

import { useAccount } from '../contexts/Account';
import { useQueues } from '../contexts/Queue';
import { useQueueResourcesAbridgedIndex } from '../contexts/QueueResourcesAbridgedIndex';
import { getApiRequestService } from '../factories/apiRequestService';
import { writeAnonymousPlaybackSnapshotFromPlayerState } from '../utils/anonymousPlaybackStorage';
import { buildQueueResourceAbridgedUpdatesFromNowPlayingLike } from '../utils/nowPlayingParamsToAbridgedUpdates';
import { useQueueResourcesAbridgedIndexUpdate } from './useQueueResourcesAbridgedIndexUpdate';

export type UpdateNowPlayingParams = {
  mpChannel: DTOChannel | null;
  mpClip: DTOClip | null;
  mpItem: DTOItem | null;
  mpItemSoundbite: DTOItemSoundbite | null;
  mpDuration?: number;
  mpCurrentTime?: number;
};

export function useQueueResourcesUpdateNowPlaying() {
  const { loggedInAccount } = useAccount();
  const { queues, setActiveQueue } = useQueues();
  const updateAbridgedIndex = useQueueResourcesAbridgedIndexUpdate();
  const { queueResourcesAbridgedIndex, setQueueResourcesAbridgedIndex } =
    useQueueResourcesAbridgedIndex();

  const queuesRef = useRef(queues);
  const loggedInAccountRef = useRef(loggedInAccount);
  const queueResourcesAbridgedIndexRef = useRef(queueResourcesAbridgedIndex);

  useEffect(() => {
    queuesRef.current = queues;
  }, [queues]);
  useEffect(() => {
    loggedInAccountRef.current = loggedInAccount;
  }, [loggedInAccount]);
  useEffect(() => {
    queueResourcesAbridgedIndexRef.current = queueResourcesAbridgedIndex;
  }, [queueResourcesAbridgedIndex]);

  return useCallback(async (params: UpdateNowPlayingParams) => {
    const apiRequestService = getApiRequestService();

    const { mpChannel, mpClip, mpItem, mpItemSoundbite, mpDuration, mpCurrentTime } = params;

    const activeQueue = queuesRef.current.find((q) => {
      return (
        q.medium_id === (mpChannel?.medium_id && getQueueMediumIdFromMediumId(mpChannel?.medium_id))
      );
    });

    if (loggedInAccountRef.current && activeQueue) {
      updateAbridgedIndex();

      apiRequestService.reqQueueUpdateIsActiveQueue(activeQueue.id_text, true);
      setActiveQueue({
        ...activeQueue,
        is_active_queue: true,
      });

      if (mpClip) {
        await apiRequestService.reqQueueResourceClipAddNowPlaying(
          activeQueue.id_text,
          mpClip.id_text,
          {
            playback_position: mpCurrentTime?.toString(),
            media_file_duration: mpDuration?.toString(),
          }
        );
      } else if (mpItemSoundbite) {
        await apiRequestService.reqQueueResourceItemSoundbiteAddNowPlaying(
          activeQueue.id_text,
          mpItemSoundbite.id_text,
          {
            playback_position: mpCurrentTime?.toString(),
            media_file_duration: mpDuration?.toString(),
          }
        );
      } else if (mpItem) {
        await apiRequestService.reqQueueResourceItemAddNowPlaying(
          activeQueue.id_text,
          mpItem.id_text,
          {
            playback_position: mpCurrentTime?.toString(),
            media_file_duration: mpDuration?.toString(),
          }
        );
      }
      return;
    }

    if (loggedInAccountRef.current) {
      return;
    }

    const hasPlayable = mpClip || mpItem || mpItemSoundbite;
    if (!hasPlayable) {
      return;
    }

    const updates = buildQueueResourceAbridgedUpdatesFromNowPlayingLike(
      params,
      queueResourcesAbridgedIndexRef.current
    );
    setQueueResourcesAbridgedIndex(
      updateQueueResourceAbridgedIndex(queueResourcesAbridgedIndexRef.current, updates)
    );
    writeAnonymousPlaybackSnapshotFromPlayerState(params);
  }, []);
}
