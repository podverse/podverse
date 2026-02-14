'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';
import type { DTOItem } from '@podverse/helpers';
import { getTotalPages } from '@podverse/helpers';
import type { QueryParamsGetManyPartialMusic } from '@podverse/helpers-requests';
import { getApiRequestService } from '../../factories/apiRequestService';
import { useAccount } from '../../contexts/Account';
import { useSkipInitialEffect } from '../../hooks/useSkipInitialEffect';
import { useFilterDefaults } from '../../hooks/useFilterDefaults';
import { useListPageCache } from '../../hooks/useListPageCache';
import { getTracksPageFilterParams } from './TracksPageDropdownConfig';

interface TracksPageContextType {
  filterParams: QueryParamsGetManyPartialMusic;
  setFilterParams: (params: QueryParamsGetManyPartialMusic) => void;
  items: DTOItem[];
  setItems: (items: DTOItem[]) => void;
  totalPages: number;
  setTotalPages: (totalPages: number) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  showSubscribeMessage: boolean;
  setShowSubscribeMessage: (show: boolean) => void;
}

const TracksPageContext = createContext<TracksPageContextType | undefined>(undefined);

interface TracksPageContextProviderProps {
  children: ReactNode;
  initialQueryParams: QueryParamsGetManyPartialMusic;
  ssrItems: DTOItem[];
  ssrTotalPages: number;
}

export const TracksPageContextProvider = ({
  children,
  initialQueryParams,
  ssrItems,
  ssrTotalPages,
}: TracksPageContextProviderProps) => {
  // Use the list page cache hook for back navigation caching
  const {
    filterParams,
    setFilterParams,
    data: items,
    setData: setItems,
    totalPages,
    setTotalPages,
    shouldSkipFetch,
  } = useListPageCache<QueryParamsGetManyPartialMusic, DTOItem[]>({
    routeKey: 'tracks',
    initialParams: initialQueryParams,
    ssrData: ssrItems ?? [],
    ssrTotalPages,
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSubscribeMessage, setShowSubscribeMessage] = useState<boolean>(false);
  const { loggedInAccount } = useAccount();
  const apiRequestService = getApiRequestService();
  const medium = 'music';

  useFilterDefaults('tracks', filterParams);

  useSkipInitialEffect(() => {
    // Skip fetch if we just restored from cache - data is already correct
    if (shouldSkipFetch.current) {
      shouldSkipFetch.current = false;
      return;
    }

    async function fetchItems() {
      if (filterParams.type === 'subscribed') {
        if (!loggedInAccount) {
          setItems([]);
          setShowSubscribeMessage(true);
          return;
        }
      }

      setIsLoading(true);

      const { currentSort, currentRange, currentType } = getTracksPageFilterParams(
        {
          page: filterParams.page,
          type: filterParams.type,
          sort: filterParams.sort,
          range: filterParams.range,
        },
        !!loggedInAccount
      );

      const response = await apiRequestService.reqItemGetMany({
        page: filterParams.page,
        medium,
        type: currentType,
        sort: currentSort,
        range: currentRange,
        category: null,
      });

      const totalPages = getTotalPages(
        response.meta.count,
        response.meta.limit,
        response.data.length,
        filterParams.page
      );
      setTotalPages(totalPages);
      setItems(response.data);
      setShowSubscribeMessage(false);
      setIsLoading(false);
    }
    fetchItems();
  }, [filterParams, loggedInAccount]);

  return (
    <TracksPageContext.Provider
      value={{
        filterParams,
        setFilterParams,
        items,
        setItems,
        totalPages,
        setTotalPages,
        isLoading,
        setIsLoading,
        showSubscribeMessage,
        setShowSubscribeMessage,
      }}
    >
      {children}
    </TracksPageContext.Provider>
  );
};

export const useTracksPageContext = () => {
  const ctx = useContext(TracksPageContext);
  if (!ctx) {
    throw new Error('useTracksPageContext must be used within a TracksPageContextProvider');
  }
  return ctx;
};
