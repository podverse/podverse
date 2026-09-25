import { useCallback, useEffect, useState } from 'react';

import type { ManagedCopySlug } from '@podverse/helpers';

import { requestWithMobileAuthRefresh, useAuth } from '../auth';

type UseManagedCopyOptions = {
  enabled?: boolean;
  slug: ManagedCopySlug;
};

type UseManagedCopyResult = {
  errorKey: string | null;
  isLoading: boolean;
  markdown: string | null;
  retry: () => void;
};

export function useManagedCopy({
  enabled = true,
  slug,
}: UseManagedCopyOptions): UseManagedCopyResult {
  const { accessToken, clearSession, refreshToken, setTokens } = useAuth();
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(enabled);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [retryCounter, setRetryCounter] = useState<number>(0);

  const retry = useCallback(() => {
    setRetryCounter((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setErrorKey(null);

    void requestWithMobileAuthRefresh(
      { accessToken, clearSession, refreshToken, setTokens },
      (api) => api.reqManagedCopyGet(slug)
    )
      .then((response) => {
        if (!cancelled) {
          setMarkdown(response.markdown);
          setErrorKey(null);
        }
      })
      .catch((error: unknown) => {
        console.warn('[useManagedCopy] load failed', { error, slug });
        if (!cancelled) {
          setErrorKey('errors.generic');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, clearSession, enabled, refreshToken, retryCounter, setTokens, slug]);

  return { errorKey, isLoading, markdown, retry };
}
