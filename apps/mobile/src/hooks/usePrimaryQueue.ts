import { useCallback } from 'react';

import type { DTOQueue } from '@podverse/helpers/dto';

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

  return {
    fetchPrimaryQueue,
  };
}
