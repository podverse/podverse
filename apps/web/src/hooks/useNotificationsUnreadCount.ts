'use client';

import { useCallback, useEffect, useState } from 'react';

import { getApiRequestService } from '../factories/apiRequestService';

const POLL_INTERVAL_MS = 60_000;
const READ_EVENT_NAME = 'podverse:notifications-read';

type UseNotificationsUnreadCountOptions = {
  enabled: boolean;
};

export function emitNotificationsReadEvent() {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new Event(READ_EVENT_NAME));
}

export function useNotificationsUnreadCount({
  enabled,
}: UseNotificationsUnreadCountOptions): number {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!enabled) {
      setUnreadCount(0);
      return;
    }

    try {
      const data = await getApiRequestService().reqNotificationsUnreadCount();
      setUnreadCount(data.unread_count);
    } catch {
      setUnreadCount(0);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setUnreadCount(0);
      return;
    }

    void refreshUnreadCount();

    const intervalId = window.setInterval(() => {
      void refreshUnreadCount();
    }, POLL_INTERVAL_MS);

    const handleFocus = () => {
      void refreshUnreadCount();
    };
    const handleRead = () => {
      void refreshUnreadCount();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener(READ_EVENT_NAME, handleRead);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener(READ_EVENT_NAME, handleRead);
    };
  }, [enabled, refreshUnreadCount]);

  return unreadCount;
}
