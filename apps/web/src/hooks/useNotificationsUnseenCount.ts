'use client';

import { useCallback, useEffect, useState } from 'react';

import { getApiRequestService } from '../factories/apiRequestService';

const POLL_INTERVAL_MS = 60_000;
const SEEN_EVENT_NAME = 'podverse:notifications-seen';

type UseNotificationsUnseenCountOptions = {
  enabled: boolean;
};

export function emitNotificationsSeenEvent() {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new Event(SEEN_EVENT_NAME));
}

export function useNotificationsUnseenCount({
  enabled,
}: UseNotificationsUnseenCountOptions): number {
  const [unseenCount, setUnseenCount] = useState(0);

  const refreshUnseenCount = useCallback(async () => {
    if (!enabled) {
      setUnseenCount(0);
      return;
    }

    try {
      const data = await getApiRequestService().reqNotificationsUnseenCount();
      setUnseenCount(data.unseen_count);
    } catch {
      setUnseenCount(0);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setUnseenCount(0);
      return;
    }

    void refreshUnseenCount();

    const intervalId = window.setInterval(() => {
      void refreshUnseenCount();
    }, POLL_INTERVAL_MS);

    const handleFocus = () => {
      void refreshUnseenCount();
    };
    const handleSeen = () => {
      void refreshUnseenCount();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener(SEEN_EVENT_NAME, handleSeen);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener(SEEN_EVENT_NAME, handleSeen);
    };
  }, [enabled, refreshUnseenCount]);

  return unseenCount;
}
