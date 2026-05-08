'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export type UseCookieModeListRefreshOptions = {
  /** Path without query string (e.g. `/users`). */
  basePath: string;
  runAsyncLoad: () => Promise<void>;
  /** When omitted, `router.refresh()` runs after `runAsyncLoad`. */
  onListMetadataChange?: () => Promise<void> | void;
};

export type UseCookieModeListRefreshReturn = {
  /** Clears URL search params, refetches list data, then refreshes route metadata or calls the optional hook. */
  refreshListAfterCookieMutation: () => Promise<void>;
};

/**
 * Cookie-mode table refresh: strip query string, reload client list state, then soft-refresh.
 */
export function useCookieModeListRefresh({
  basePath,
  runAsyncLoad,
  onListMetadataChange,
}: UseCookieModeListRefreshOptions): UseCookieModeListRefreshReturn {
  const router = useRouter();

  const refreshListAfterCookieMutation = useCallback(async () => {
    router.replace(basePath);
    await runAsyncLoad();
    if (onListMetadataChange !== undefined) {
      await onListMetadataChange();
      return;
    }
    router.refresh();
  }, [basePath, onListMetadataChange, router, runAsyncLoad]);

  return { refreshListAfterCookieMutation };
}
