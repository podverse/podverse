import { useCallback, useEffect, useRef } from 'react';

import type { DTOClip, DTOItem, DTOItemSoundbite } from '@podverse/helpers';

import { useAccount } from '../contexts/Account';
import { useQueues } from '../contexts/Queue';
import { getApiRequestService } from '../factories/apiRequestService';
import { useQueueResourcesAbridgedIndexUpdate } from './useQueueResourcesAbridgedIndexUpdate';

export type MoveNowPlayingToHistoryCallbackParams = {
  completed?: boolean;
  mpClip: DTOClip | null;
  mpItem: DTOItem | null;
  mpItemSoundbite: DTOItemSoundbite | null;
};

export function useQueueResourcesMoveNowPlayingToHistory() {
  const { loggedInAccount } = useAccount();
  const { activeQueue } = useQueues();
  const updateAbridgedIndex = useQueueResourcesAbridgedIndexUpdate();

  const activeQueueRef = useRef(activeQueue);
  const loggedInAccountRef = useRef(loggedInAccount);

  useEffect(() => {
    activeQueueRef.current = activeQueue;
  }, [activeQueue]);
  useEffect(() => {
    loggedInAccountRef.current = loggedInAccount;
  }, [loggedInAccount]);

  return useCallback(async (params: MoveNowPlayingToHistoryCallbackParams) => {
    const apiRequestService = getApiRequestService();
    const { completed, mpClip, mpItem, mpItemSoundbite } = params;
    const isLiveItem = !!mpItem?.live_item;

    if (!loggedInAccountRef.current || !activeQueueRef.current || isLiveItem) {
      return;
    }

    updateAbridgedIndex(completed);

    if (mpClip) {
      await apiRequestService.reqQueueResourceClipAddHistory(
        activeQueueRef.current.id_text,
        mpClip.id_text,
        {
          playback_position: mpClip.start_time,
          ...(completed !== undefined ? { completed } : {}),
        }
      );
    } else if (mpItemSoundbite) {
      await apiRequestService.reqQueueResourceItemSoundbiteAddHistory(
        activeQueueRef.current.id_text,
        mpItemSoundbite.id_text,
        {
          playback_position: mpItemSoundbite.start_time,
          ...(completed !== undefined ? { completed } : {}),
        }
      );
    } else if (mpItem) {
      await apiRequestService.reqQueueResourceItemAddHistory(
        activeQueueRef.current.id_text,
        mpItem.id_text,
        {
          ...(completed ? { playback_position: '0' } : {}),
          ...(completed !== undefined ? { completed } : {}),
        }
      );
    }
  }, []);
}
