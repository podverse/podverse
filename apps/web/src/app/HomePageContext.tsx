'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';

import type { DTOChannel } from '@podverse/helpers';
import { getTotalPages } from '@podverse/helpers';
import type { QueryParamsHome } from '@podverse/helpers-requests';

import { useAccount } from '../contexts/Account';
import { getApiRequestService } from '../factories/apiRequestService';
import { useFilterDefaults } from '../hooks/useFilterDefaults';
import { useListPageCache } from '../hooks/useListPageCache';
import { useSkipInitialEffect } from '../hooks/useSkipInitialEffect';
import { getHomePageFilterParams } from './HomePageDropdownConfig';

interface HomePageContextType {
  filterParams: QueryParamsHome;
  setFilterParams: (params: QueryParamsHome) => void;
  channels: DTOChannel[];
  setChannels: (channels: DTOChannel[]) => void;
  totalPages: number;
  setTotalPages: (totalPages: number) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}

const HomePageContext = createContext<HomePageContextType | undefined>(undefined);

interface HomePageContextProviderProps {
  children: ReactNode;
  initialQueryParams: QueryParamsHome;
  ssrChannels: DTOChannel[];
  ssrTotalPages: number;
}

export const HomePageContextProvider = ({
  children,
  initialQueryParams,
  ssrChannels,
  ssrTotalPages,
}: HomePageContextProviderProps) => {
  // Use the list page cache hook for back navigation caching
  const {
    filterParams,
    setFilterParams,
    data: channels,
    setData: setChannels,
    totalPages,
    setTotalPages,
    shouldSkipFetch,
  } = useListPageCache<QueryParamsHome, DTOChannel[]>({
    routeKey: 'home',
    initialParams: initialQueryParams,
    ssrData: ssrChannels ?? [],
    ssrTotalPages,
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { loggedInAccount } = useAccount();

  useFilterDefaults('home', filterParams);

  useSkipInitialEffect(() => {
    // Skip fetch if we just restored from cache - data is already correct
    if (shouldSkipFetch.current) {
      shouldSkipFetch.current = false;
      return;
    }

    async function fetchChannels() {
      if (!loggedInAccount) {
        setChannels([]);
        return;
      }

      setIsLoading(true);

      const { currentSort, currentMedium, currentPage } = getHomePageFilterParams({
        page: filterParams.page,
        medium: filterParams.medium,
        sort: filterParams.sort,
      });

      const response = await getApiRequestService().reqChannelGetMany({
        page: currentPage,
        medium: currentMedium,
        type: 'subscribed',
        sort: currentSort,
        range: null,
        category: null,
      });

      const totalPages = getTotalPages(
        response.meta.count,
        response.meta.limit,
        response.data.length,
        currentPage
      );
      setTotalPages(totalPages);
      setChannels(response.data);
      setIsLoading(false);
    }

    fetchChannels();
  }, [filterParams, loggedInAccount]);

  return (
    <HomePageContext.Provider
      value={{
        filterParams,
        setFilterParams,
        channels,
        setChannels,
        totalPages,
        setTotalPages,
        isLoading,
        setIsLoading,
      }}
    >
      {children}
    </HomePageContext.Provider>
  );
};

export const useHomePageContext = () => {
  const ctx = useContext(HomePageContext);
  if (!ctx) {
    throw new Error('useHomePageContext must be used within a HomePageContextProvider');
  }
  return ctx;
};
