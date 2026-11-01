'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * Page controls stay mounted across a page change. Any other filter change, including a section
 * chip, hides them until that query commits a page count. The count can match the previous one;
 * the commit is what shows the controls again.
 */
export type PaginationSettleSnapshot = {
  key: string;
  serial: number;
};

export function paginationQueryKey(params: object): string {
  const record = params as Record<string, unknown>;
  const entries = Object.keys(record)
    .filter((key) => key !== 'page')
    .sort()
    .map((key) => [key, record[key]]);
  return JSON.stringify(entries);
}

export function settlePaginationTotalPages(
  snapshot: PaginationSettleSnapshot,
  queryKey: string,
  resultsSerial: number,
  totalPages: number
): { snapshot: PaginationSettleSnapshot; totalPages: number } {
  const next =
    resultsSerial !== snapshot.serial ? { key: queryKey, serial: resultsSerial } : snapshot;
  return {
    snapshot: next,
    totalPages: next.key === queryKey ? totalPages : 1,
  };
}

export function useSettledTotalPages(
  params: object,
  totalPages: number,
  resultsSerial: number
): number {
  const queryKey = paginationQueryKey(params);
  const settledRef = useRef<PaginationSettleSnapshot>({
    key: queryKey,
    serial: resultsSerial,
  });
  const settled = settlePaginationTotalPages(
    settledRef.current,
    queryKey,
    resultsSerial,
    totalPages
  );
  settledRef.current = settled.snapshot;
  return settled.totalPages;
}

export function useCommittedPaginationTotalPages<T extends object>(
  filterParams: T,
  totalPages: number,
  setTotalPagesState: (next: number) => void
): { totalPages: number; setTotalPages: (next: number) => void } {
  const [resultsSerial, setResultsSerial] = useState(0);
  const setTotalPages = useCallback(
    (next: number) => {
      setTotalPagesState(next);
      setResultsSerial((current) => current + 1);
    },
    [setTotalPagesState]
  );
  const visibleTotalPages = useSettledTotalPages(filterParams, totalPages, resultsSerial);
  return { totalPages: visibleTotalPages, setTotalPages };
}
