import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../auth/AuthProvider';
import { notificationsRepository } from '../data/repositories';

const DEFAULT_POLL_INTERVAL_MS = 60000;

const readEventListeners = new Set<() => void>();

export const emitNotificationsReadEvent = (): void => {
  for (const notify of readEventListeners) {
    notify();
  }
};

export const useNotificationsUnreadCount = (
  params: { enabled: boolean; pollIntervalMs?: number } = { enabled: true }
): number => {
  const { enabled, pollIntervalMs = DEFAULT_POLL_INTERVAL_MS } = params;
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const requestContext = useMemo(() => {
    return {
      accessToken,
      clearSession,
      refreshToken,
      setTokens,
    };
  }, [accessToken, clearSession, refreshToken, setTokens]);

  const refreshUnreadCount = useCallback(async () => {
    if (!enabled || status !== 'authenticated') {
      setUnreadCount(0);
      return;
    }

    try {
      const nextCount = await notificationsRepository.getUnreadCount(requestContext);
      setUnreadCount(Math.max(0, nextCount));
    } catch (error) {
      console.warn('Could not refresh mobile notifications unread count', error);
    }
  }, [enabled, requestContext, status]);

  useEffect(() => {
    void refreshUnreadCount();
  }, [refreshUnreadCount]);

  useFocusEffect(
    useCallback(() => {
      void refreshUnreadCount();
    }, [refreshUnreadCount])
  );

  useEffect(() => {
    if (!enabled || status !== 'authenticated') {
      return;
    }

    const intervalId = setInterval(() => {
      void refreshUnreadCount();
    }, pollIntervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, pollIntervalMs, refreshUnreadCount, status]);

  useEffect(() => {
    const onReadEvent = () => {
      void refreshUnreadCount();
    };

    readEventListeners.add(onReadEvent);
    return () => {
      readEventListeners.delete(onReadEvent);
    };
  }, [refreshUnreadCount]);

  return unreadCount;
};
