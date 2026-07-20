import { useCallback } from 'react';

import type { DTOQueueResource } from '@podverse/helpers/dto';

import { useAuth } from '../auth/AuthProvider';
import { queueRepository } from '../data';

export function useQueueResources() {
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();

  const fetchNowPlaying = useCallback(
    async (queueIdText: string): Promise<DTOQueueResource | null> => {
      if (status !== 'authenticated') {
        return null;
      }

      return queueRepository.getNowPlaying(
        { accessToken, clearSession, refreshToken, setTokens },
        queueIdText
      );
    },
    [accessToken, clearSession, refreshToken, setTokens, status]
  );

  const fetchUpcoming = useCallback(
    async (queueIdText: string): Promise<DTOQueueResource[]> => {
      if (status !== 'authenticated') {
        return [];
      }

      return queueRepository.getUpcoming(
        { accessToken, clearSession, refreshToken, setTokens },
        queueIdText
      );
    },
    [accessToken, clearSession, refreshToken, setTokens, status]
  );

  const fetchHistoryPage = useCallback(
    async (queueIdText: string, page: number): Promise<DTOQueueResource[]> => {
      if (status !== 'authenticated') {
        return [];
      }

      return queueRepository.getHistoryPage(
        { accessToken, clearSession, refreshToken, setTokens },
        queueIdText,
        page
      );
    },
    [accessToken, clearSession, refreshToken, setTokens, status]
  );

  return {
    fetchHistoryPage,
    fetchNowPlaying,
    fetchUpcoming,
  };
}
