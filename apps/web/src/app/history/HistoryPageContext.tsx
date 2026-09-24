'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

import type { DTOQueue, DTOQueueResource } from '@podverse/helpers';
import { getQueueMediumIdFromType, getTotalPages } from '@podverse/helpers';
import type { QueryParamsHistory } from '@podverse/helpers-requests';

import { useAccount } from '../../contexts/Account';
import { checkBackNavFlag } from '../../contexts/Navigation';
import { getApiRequestService } from '../../factories/apiRequestService';
import { usePageStateCache } from '../../hooks/usePageStateCache';
import {
  QUEUE_DATA_CHANGED_EVENT,
  queueResourceIdFromChangeEvent,
} from '../../lib/queue/queueDataChanged';
import { definedProps, getPageState } from '../../utils/pageStateCache';

// Type for cached data
interface HistoryCachedData {
  queueResources: DTOQueueResource[];
  totalPages: number;
}

interface HistoryPageContextType {
  filterParams: QueryParamsHistory;
  setFilterParams: (params: QueryParamsHistory) => void;
  queueResources: DTOQueueResource[];
  setQueueResources: (resources: DTOQueueResource[]) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  showLoginMessage: boolean;
  setShowLoginMessage: (show: boolean) => void;
  totalPages: number;
  setTotalPages: (totalPages: number) => void;
}

const HistoryPageContext = createContext<HistoryPageContextType | undefined>(undefined);

interface HistoryPageContextProviderProps {
  children: ReactNode;
  initialQueryParams: QueryParamsHistory;
  ssrQueues: DTOQueue[];
  ssrQueueResources?: DTOQueueResource[];
}

export const HistoryPageContextProvider = ({
  children,
  initialQueryParams,
  ssrQueues,
  ssrQueueResources,
}: HistoryPageContextProviderProps) => {
  // Use synchronous sessionStorage check instead of async React state
  const isBackNav = checkBackNavFlag();

  // Check for cached state on back navigation
  const cachedState = isBackNav
    ? getPageState<QueryParamsHistory, HistoryCachedData>('history')
    : null;
  const restoredFromCacheRef = useRef(!!cachedState?.data);

  const [filterParams, setFilterParams] = useState<QueryParamsHistory>(
    cachedState?.filterParams ?? initialQueryParams
  );
  const [queueResources, setQueueResources] = useState<DTOQueueResource[]>(
    cachedState?.data?.queueResources ?? ssrQueueResources ?? []
  );
  const [isLoading, setIsLoading] = useState<boolean>(!cachedState?.data); // Not loading if restored from cache
  const [totalPages, setTotalPages] = useState<number>(cachedState?.data?.totalPages ?? 1);
  const [showLoginMessage, setShowLoginMessage] = useState<boolean>(false);
  const [queueDataRevision, setQueueDataRevision] = useState(0);
  const hasCompletedLoadRef = useRef(cachedState?.data !== undefined);
  const historyRequestIdRef = useRef(0);
  const { loggedInAccount } = useAccount();

  // Hook to save/restore page state for back navigation
  usePageStateCache<QueryParamsHistory, HistoryCachedData>({
    routeKey: 'history',
    filterParams,
    setFilterParams,
    data: { queueResources, totalPages },
    setData: (cached) => {
      setQueueResources(cached.queueResources);
      setTotalPages(cached.totalPages);
    },
    ...definedProps({ cachedScrollPosition: cachedState?.scrollPosition }),
  });

  useEffect(() => {
    const onQueueDataChanged = (event: Event) => {
      historyRequestIdRef.current += 1;
      const queueResourceId = queueResourceIdFromChangeEvent(event);
      if (queueResourceId !== null) {
        setQueueResources((current) => current.filter((row) => row.id !== queueResourceId));
      }
      setQueueDataRevision((current) => current + 1);
    };

    window.addEventListener(QUEUE_DATA_CHANGED_EVENT, onQueueDataChanged);
    return () => {
      window.removeEventListener(QUEUE_DATA_CHANGED_EVENT, onQueueDataChanged);
    };
  }, []);

  useEffect(() => {
    // Skip fetch if we just restored from cache - data is already correct
    if (restoredFromCacheRef.current) {
      restoredFromCacheRef.current = false;
      return;
    }

    async function fetchQueueResources() {
      const requestId = historyRequestIdRef.current + 1;
      historyRequestIdRef.current = requestId;
      const isCurrent = () => historyRequestIdRef.current === requestId;

      if (!loggedInAccount) {
        if (!isCurrent()) {
          return;
        }
        setQueueResources([]);
        setShowLoginMessage(true);
        setIsLoading(false);
        hasCompletedLoadRef.current = true;
        return;
      }

      const isReload = hasCompletedLoadRef.current;
      if (!isReload) {
        setIsLoading(true);
      }

      const currentMediumId = getQueueMediumIdFromType(filterParams.medium);
      const currentQueue = ssrQueues.find((q) => q.medium_id === currentMediumId);

      if (currentQueue) {
        const response =
          await getApiRequestService().reqQueueResourcesGetHistoryByQueueIdTextPaginated(
            currentQueue.id_text,
            filterParams.page
          );
        if (!isCurrent()) {
          return;
        }
        setQueueResources(response.data);
        const totalPages = getTotalPages(
          response.meta.count,
          response.meta.limit,
          response.data.length,
          filterParams.page
        );
        setTotalPages(totalPages);
      }

      if (!isCurrent()) {
        return;
      }
      setShowLoginMessage(false);
      hasCompletedLoadRef.current = true;
      setIsLoading(false);
    }

    void fetchQueueResources();
  }, [filterParams, loggedInAccount, queueDataRevision, ssrQueues]);

  return (
    <HistoryPageContext.Provider
      value={{
        filterParams,
        setFilterParams,
        queueResources,
        setQueueResources,
        isLoading,
        setIsLoading,
        showLoginMessage,
        setShowLoginMessage,
        totalPages,
        setTotalPages,
      }}
    >
      {children}
    </HistoryPageContext.Provider>
  );
};

export const useHistoryPageContext = () => {
  const ctx = useContext(HistoryPageContext);
  if (!ctx) {
    throw new Error('useHistoryPageContext must be used within a HistoryPageContextProvider');
  }
  return ctx;
};
