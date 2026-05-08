'use client';

import { useCallback, useState } from 'react';

export type UseAsyncPageLoadingReturn = {
  isLoading: boolean;
  runAsyncLoad: (fn: () => Promise<void>) => Promise<void>;
};

/**
 * Tracks async list-load phases for pairing with {@link NavigationLoadingOverlay}.
 */
export function useAsyncPageLoading(): UseAsyncPageLoadingReturn {
  const [isLoading, setIsLoading] = useState(false);

  const runAsyncLoad = useCallback(async (fn: () => Promise<void>) => {
    setIsLoading(true);
    try {
      await fn();
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, runAsyncLoad };
}
