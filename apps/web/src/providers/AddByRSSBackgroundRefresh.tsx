'use client';

import { useEffect } from 'react';

import { useAccount } from '../contexts/Account';
import { useConfig } from '../contexts/Config';
import { runAddByRSSBackgroundRefresh } from '../utils/addByRSS/backgroundRefresh';

/** Refreshes Add by RSS feeds on load and whenever the tab comes back into view. Renders nothing. */
export function AddByRSSBackgroundRefresh(): null {
  const { loggedInAccount } = useAccount();
  const addByRSSEnabled = useConfig().public.catalog.addByRSSEnabled;

  useEffect(() => {
    if (!addByRSSEnabled || !loggedInAccount) {
      return undefined;
    }
    const run = () => {
      void runAddByRSSBackgroundRefresh(loggedInAccount);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        run();
      }
    };

    run();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [addByRSSEnabled, loggedInAccount]);

  return null;
}
