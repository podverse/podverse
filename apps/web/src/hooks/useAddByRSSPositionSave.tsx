'use client';

import { useCallback } from 'react';
import { getQueueForMedium } from '@podverse/helpers';
import { useAccount } from '../contexts/Account';
import { useMediaPlayer } from '../contexts/MediaPlayer';
import { useQueues } from '../contexts/Queue';
import { apiRequestService } from '../factories/apiRequestService';

/**
 * Returns callbacks to save add-by-RSS playback position and to add to history on ended.
 */
export function useAddByRSSPositionSave() {
  const { mpAddByRSS } = useMediaPlayer();
  const { queues } = useQueues();
  const { loggedInAccount } = useAccount();

  const savePosition = useCallback(
    (positionSeconds: number) => {
      if (!loggedInAccount || !mpAddByRSS?.resourceData) return;
      const mediumId = mpAddByRSS.resourceData.medium_id;
      if (typeof mediumId !== 'number') return;
      const queue = getQueueForMedium(queues, mediumId);
      if (!queue?.id_text) return;
      apiRequestService
        .reqQueueResourceItemAddByRSSAddNowPlaying(queue.id_text, {
          add_by_rss_resource_data: mpAddByRSS.resourceData,
          playback_position: String(positionSeconds),
        })
        .catch(() => {
          // Best-effort
        });
    },
    [loggedInAccount, mpAddByRSS, queues]
  );

  const handleEnded = useCallback(
    async (positionSeconds: number) => {
      if (!loggedInAccount || !mpAddByRSS?.resourceData) return;
      const mediumId = mpAddByRSS.resourceData.medium_id;
      if (typeof mediumId !== 'number') return;
      const queue = getQueueForMedium(queues, mediumId);
      if (!queue?.id_text) return;
      await apiRequestService
        .reqQueueResourceItemAddByRSSAddHistory(queue.id_text, {
          add_by_rss_resource_data: mpAddByRSS.resourceData,
          playback_position: String(positionSeconds),
          completed: true,
        })
        .catch(() => {
          // Best-effort
        });
    },
    [loggedInAccount, mpAddByRSS, queues]
  );

  return { savePosition, handleEnded };
}
