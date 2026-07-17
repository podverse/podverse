import { useCallback } from 'react';

import type { DTOQueue } from '@podverse/helpers';

import { requestWithMobileAuthRefresh } from '../auth';
import { useAuth } from '../auth/AuthProvider';

export function getPrimaryQueue(queues: DTOQueue[]): DTOQueue | null {
  const activeQueue = queues.find((queue) => queue.is_active_queue);
  if (activeQueue) {
    return activeQueue;
  }

  return queues[0] ?? null;
}

export function usePrimaryQueue() {
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();

  const fetchPrimaryQueue = useCallback(async (): Promise<DTOQueue | null> => {
    if (status !== 'authenticated') {
      return null;
    }

    const queues = await requestWithMobileAuthRefresh(
      {
        accessToken,
        clearSession,
        refreshToken,
        setTokens,
      },
      async (api) => api.reqQueueGetAllForAccountPrivate()
    );
    return getPrimaryQueue(queues);
  }, [accessToken, clearSession, refreshToken, setTokens, status]);

  return {
    fetchPrimaryQueue,
  };
}
