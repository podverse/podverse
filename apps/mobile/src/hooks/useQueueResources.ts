import { useCallback } from 'react';

import type { DTOQueueResource } from '@podverse/helpers';

import { requestWithMobileAuthRefresh } from '../auth';
import { useAuth } from '../auth/AuthProvider';

export function useQueueResources() {
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();

  const fetchNowPlaying = useCallback(
    async (queueIdText: string): Promise<DTOQueueResource | null> => {
      if (status !== 'authenticated') {
        return null;
      }

      return requestWithMobileAuthRefresh(
        {
          accessToken,
          clearSession,
          refreshToken,
          setTokens,
        },
        async (api) => api.reqQueueResourcesGetNowPlayingByQueueIdText(queueIdText)
      );
    },
    [accessToken, clearSession, refreshToken, setTokens, status]
  );

  const fetchUpcoming = useCallback(
    async (queueIdText: string): Promise<DTOQueueResource[]> => {
      if (status !== 'authenticated') {
        return [];
      }

      return requestWithMobileAuthRefresh(
        {
          accessToken,
          clearSession,
          refreshToken,
          setTokens,
        },
        async (api) => api.reqQueueResourcesGetAllUpcomingByQueueIdText(queueIdText)
      );
    },
    [accessToken, clearSession, refreshToken, setTokens, status]
  );

  const fetchHistoryPage = useCallback(
    async (queueIdText: string, page: number): Promise<DTOQueueResource[]> => {
      if (status !== 'authenticated') {
        return [];
      }

      const response = await requestWithMobileAuthRefresh(
        {
          accessToken,
          clearSession,
          refreshToken,
          setTokens,
        },
        async (api) => api.reqQueueResourcesGetHistoryByQueueIdTextPaginated(queueIdText, page)
      );
      return response.data;
    },
    [accessToken, clearSession, refreshToken, setTokens, status]
  );

  return {
    fetchHistoryPage,
    fetchNowPlaying,
    fetchUpcoming,
  };
}
