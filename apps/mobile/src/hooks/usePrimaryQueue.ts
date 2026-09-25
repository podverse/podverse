import { useCallback } from 'react';

import type { DTOQueue } from '@podverse/helpers/dto';
import type { QueueListMedium } from '@podverse/helpers/medium';
import { getQueueListMediumFromActiveQueues } from '@podverse/helpers/medium';
import { getQueueForMedium } from '@podverse/helpers/queue';

import { useAuth } from '../auth/AuthProvider';
import { queueRepository, selectPrimaryQueue } from '../data';

/** Re-exported for backward compatibility; selection now lives in the queue repository. */
export function getPrimaryQueue(queues: DTOQueue[]): DTOQueue | null {
  return selectPrimaryQueue(queues);
}

export function usePrimaryQueue() {
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();

  const fetchPrimaryQueue = useCallback(async (): Promise<DTOQueue | null> => {
    if (status !== 'authenticated') {
      return null;
    }

    return queueRepository.getPrimaryQueue({ accessToken, clearSession, refreshToken, setTokens });
  }, [accessToken, clearSession, refreshToken, setTokens, status]);

  /** Resolve the AV or Music account queue without writing the active-queue store. */
  const fetchQueueForMedium = useCallback(
    async (mediumId: number): Promise<DTOQueue | null> => {
      if (status !== 'authenticated') {
        return null;
      }

      const queues = await queueRepository.getQueues({
        accessToken,
        clearSession,
        refreshToken,
        setTokens,
      });
      return getQueueForMedium(queues, mediumId);
    },
    [accessToken, clearSession, refreshToken, setTokens, status]
  );

  /**
   * Medium chip for queue / history: account `is_active_queue` medium, else podcasts (`av`).
   * Does not write the active-queue store.
   */
  const fetchActiveQueueListMedium = useCallback(async (): Promise<QueueListMedium> => {
    if (status !== 'authenticated') {
      return getQueueListMediumFromActiveQueues([]);
    }

    const queues = await queueRepository.getQueues({
      accessToken,
      clearSession,
      refreshToken,
      setTokens,
    });
    return getQueueListMediumFromActiveQueues(queues);
  }, [accessToken, clearSession, refreshToken, setTokens, status]);

  return {
    fetchActiveQueueListMedium,
    fetchPrimaryQueue,
    fetchQueueForMedium,
  };
}
