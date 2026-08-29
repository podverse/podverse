import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../auth/AuthProvider';
import { notificationsRepository } from '../data/repositories';

const DEFAULT_POLL_INTERVAL_MS = 60000;

const seenEventListeners = new Set<() => void>();

export const emitNotificationsSeenEvent = (): void => {
  for (const notify of seenEventListeners) {
    notify();
  }
};

export const useNotificationsUnseenCount = (
  params: { enabled: boolean; pollIntervalMs?: number } = { enabled: true }
): number => {
  const { enabled, pollIntervalMs = DEFAULT_POLL_INTERVAL_MS } = params;
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const [unseenCount, setUnseenCount] = useState(0);

  const requestContext = useMemo(() => {
    return {
      accessToken,
      clearSession,
      refreshToken,
      setTokens,
    };
  }, [accessToken, clearSession, refreshToken, setTokens]);

  const refreshUnseenCount = useCallback(async () => {
    if (!enabled || status !== 'authenticated') {
      setUnseenCount(0);
      return;
    }

    try {
      const nextCount = await notificationsRepository.getUnseenCount(requestContext);
      setUnseenCount(Math.max(0, nextCount));
    } catch (error) {
      console.warn('Could not refresh mobile notifications unseen count', error);
    }
  }, [enabled, requestContext, status]);

  useEffect(() => {
    void refreshUnseenCount();
  }, [refreshUnseenCount]);

  useFocusEffect(
    useCallback(() => {
      void refreshUnseenCount();
    }, [refreshUnseenCount])
  );

  useEffect(() => {
    if (!enabled || status !== 'authenticated') {
      return;
    }

    const intervalId = setInterval(() => {
      void refreshUnseenCount();
    }, pollIntervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, pollIntervalMs, refreshUnseenCount, status]);

  useEffect(() => {
    const onSeenEvent = () => {
      void refreshUnseenCount();
    };

    seenEventListeners.add(onSeenEvent);
    return () => {
      seenEventListeners.delete(onSeenEvent);
    };
  }, [refreshUnseenCount]);

  return unseenCount;
};
