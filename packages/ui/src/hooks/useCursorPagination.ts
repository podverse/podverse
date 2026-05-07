'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type CursorPageResult<T> = {
  items: T[];
  nextContinuationToken?: string;
};

export type UseCursorPaginationParams<T> = {
  fetchPage: (continuationToken: string | undefined) => Promise<CursorPageResult<T>>;
};

type PageCache<T> = {
  tokenUsed: string | undefined;
  items: T[];
  nextContinuationToken: string | undefined;
};

export type UseCursorPaginationReturn<T> = {
  items: T[];
  pageNumber: number;
  hasPrev: boolean;
  hasNext: boolean;
  isLoading: boolean;
  error: unknown;
  goNext: () => Promise<void>;
  goPrev: () => void;
  reset: () => Promise<void>;
  refetch: () => Promise<void>;
};

export function useCursorPagination<T>({
  fetchPage,
}: UseCursorPaginationParams<T>): UseCursorPaginationReturn<T> {
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;

  const [history, setHistory] = useState<PageCache<T>[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(undefined);

  const loadFirstPage = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    setActiveIndex(0);
    try {
      const result = await fetchRef.current(undefined);
      const page: PageCache<T> = {
        tokenUsed: undefined,
        items: result.items,
        nextContinuationToken: result.nextContinuationToken,
      };
      setHistory([page]);
    } catch (e) {
      setError(e);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  const current = history[activeIndex];
  const items = current?.items ?? [];
  const pageNumber = history.length === 0 ? 1 : activeIndex + 1;
  const hasPrev = activeIndex > 0;
  const hasNext =
    current !== undefined &&
    (activeIndex < history.length - 1 ||
      (current.nextContinuationToken !== undefined && current.nextContinuationToken !== ''));

  const goNext = useCallback(async () => {
    if (current === undefined) {
      return;
    }
    if (activeIndex < history.length - 1) {
      setActiveIndex(activeIndex + 1);
      return;
    }
    const nextTok = current.nextContinuationToken;
    if (nextTok === undefined || nextTok === '') {
      return;
    }
    setIsLoading(true);
    setError(undefined);
    try {
      const result = await fetchRef.current(nextTok);
      const page: PageCache<T> = {
        tokenUsed: nextTok,
        items: result.items,
        nextContinuationToken: result.nextContinuationToken,
      };
      setHistory((h) => [...h, page]);
      setActiveIndex((i) => i + 1);
    } catch (e) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [activeIndex, current, history.length]);

  const goPrev = useCallback(() => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
  }, [activeIndex]);

  const reset = useCallback(async () => {
    await loadFirstPage();
  }, [loadFirstPage]);

  const refetch = useCallback(async () => {
    const cur = history[activeIndex];
    if (cur === undefined) {
      return;
    }
    setIsLoading(true);
    setError(undefined);
    try {
      const result = await fetchRef.current(cur.tokenUsed);
      const page: PageCache<T> = {
        tokenUsed: cur.tokenUsed,
        items: result.items,
        nextContinuationToken: result.nextContinuationToken,
      };
      setHistory((h) => {
        const next = [...h];
        next[activeIndex] = page;
        return next;
      });
    } catch (e) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [activeIndex, history]);

  return {
    items,
    pageNumber,
    hasPrev,
    hasNext,
    isLoading,
    error,
    goNext,
    goPrev,
    reset,
    refetch,
  };
}
