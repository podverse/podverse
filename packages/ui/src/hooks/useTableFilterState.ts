'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { mergeTableListStateInBrowserCookie } from '../lib/cookies/browserCookies';

/** Debounce before pushing URL or writing cookie after search input changes. */
export const TABLE_SEARCH_DEBOUNCE_MS = 400;

export type UseTableFilterStateOptions = {
  allColumnIds: string[];
  basePath: string;
  currentQueryParams: Record<string, string>;
  initialColumns: string[];
  initialSearch: string;
  /** When search changes, these query params are also applied (e.g. reset page). */
  searchSyncParams?: Record<string, string>;
  /** After cookie writes in cookie mode; falls back to `router.refresh()` when omitted. */
  afterCookieListMutation?: () => Promise<void>;
  tableListStateCookieName?: string;
  tableListStateListKey?: string;
};

export type UseTableFilterStateReturn = {
  handleColumnSelectionChange: (columnIds: string[]) => void;
  search: string;
  selectedColumnIds: string[];
  setSearch: (value: string) => void;
};

export function useTableFilterState({
  initialSearch,
  initialColumns,
  allColumnIds,
  basePath,
  currentQueryParams,
  searchSyncParams,
  tableListStateCookieName,
  tableListStateListKey,
  afterCookieListMutation,
}: UseTableFilterStateOptions): UseTableFilterStateReturn {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const lastInitialSearchRef = useRef(initialSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedColumnIds, setSelectedColumnIds] = useState<string[]>(() =>
    initialColumns.length > 0 ? initialColumns : [...allColumnIds]
  );

  const cookieRefreshMode =
    tableListStateCookieName !== undefined &&
    tableListStateCookieName.trim() !== '' &&
    tableListStateListKey !== undefined &&
    tableListStateListKey.trim() !== '';

  useEffect(() => {
    if (initialSearch !== lastInitialSearchRef.current) {
      lastInitialSearchRef.current = initialSearch;
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  const queryParamsKey = JSON.stringify(currentQueryParams);
  useEffect(() => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
    if (search === initialSearch) {
      return;
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      if (cookieRefreshMode) {
        mergeTableListStateInBrowserCookie(tableListStateCookieName, tableListStateListKey, {
          search: search.trim(),
          page: 1,
        });
        void (afterCookieListMutation !== undefined
          ? afterCookieListMutation()
          : Promise.resolve(router.refresh()));
        return;
      }
      const params = new URLSearchParams(currentQueryParams);
      if (search.trim() !== '') {
        params.set('search', search.trim());
      } else {
        params.delete('search');
      }
      if (searchSyncParams !== undefined) {
        for (const [k, v] of Object.entries(searchSyncParams)) {
          params.set(k, v);
        }
      }
      const query = params.toString();
      router.push(query !== '' ? `${basePath}?${query}` : basePath);
    }, TABLE_SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [
    afterCookieListMutation,
    basePath,
    cookieRefreshMode,
    currentQueryParams,
    initialSearch,
    queryParamsKey,
    router,
    search,
    searchSyncParams,
    tableListStateCookieName,
    tableListStateListKey,
  ]);

  const handleColumnSelectionChange = useCallback(
    (columnIds: string[]) => {
      setSelectedColumnIds(columnIds);
      if (cookieRefreshMode) {
        mergeTableListStateInBrowserCookie(tableListStateCookieName, tableListStateListKey, {
          columns: columnIds.join(','),
          page: 1,
        });
        void (afterCookieListMutation !== undefined
          ? afterCookieListMutation()
          : Promise.resolve(router.refresh()));
        return;
      }
      const params = new URLSearchParams(currentQueryParams);
      params.set('columns', columnIds.join(','));
      router.push(`${basePath}?${params.toString()}`);
    },
    [
      afterCookieListMutation,
      basePath,
      cookieRefreshMode,
      currentQueryParams,
      router,
      tableListStateCookieName,
      tableListStateListKey,
    ]
  );

  return {
    handleColumnSelectionChange,
    search,
    selectedColumnIds,
    setSearch,
  };
}
