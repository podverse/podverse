'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DTOChannel } from '@podverse/helpers';
import { getTotalPages, removeQueryParamByPattern } from '@podverse/helpers';
import type { QueryParamsGetMany } from '@podverse/helpers-requests';
import { apiRequestService } from '../../factories/apiRequestService';
import { useAccount } from '../../contexts/Account';
import { useSkipInitialEffect } from '../../hooks/useSkipInitialEffect';
import { useFilterDefaults } from '../../hooks/useFilterDefaults';
import { useListPageCache } from '../../hooks/useListPageCache';
import { getPodcastsPageFilterParams } from './PodcastsPageDropdownConfig';
import { ROUTES } from '../../constants/routes';

interface PodcastsPageContextType {
  filterParams: QueryParamsGetMany;
  setFilterParams: (params: QueryParamsGetMany) => void;
  channels: DTOChannel[];
  setChannels: (channels: DTOChannel[]) => void;
  totalPages: number;
  setTotalPages: (totalPages: number) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  showSubscribeMessage: boolean;
  setShowSubscribeMessage: (show: boolean) => void;
  showCategoriesModal: boolean;
  setShowCategoriesModal: (show: boolean) => void;
}

const PodcastsPageContext = createContext<PodcastsPageContextType | undefined>(undefined);

interface PodcastsPageContextProviderProps {
  children: ReactNode;
  initialQueryParams: QueryParamsGetMany;
  ssrChannels: DTOChannel[];
  ssrTotalPages: number;
}

export const PodcastsPageContextProvider = ({
  children,
  initialQueryParams,
  ssrChannels,
  ssrTotalPages,
}: PodcastsPageContextProviderProps) => {
  const router = useRouter();

  // Use the list page cache hook for back navigation caching
  const {
    filterParams,
    setFilterParams,
    data: channels,
    setData: setChannels,
    totalPages,
    setTotalPages,
    shouldSkipFetch,
  } = useListPageCache<QueryParamsGetMany, DTOChannel[]>({
    routeKey: 'podcasts',
    initialParams: initialQueryParams,
    ssrData: ssrChannels ?? [],
    ssrTotalPages,
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSubscribeMessage, setShowSubscribeMessage] = useState<boolean>(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState<boolean>(false);
  const { loggedInAccount } = useAccount();
  const medium = 'av';

  useFilterDefaults('podcasts', filterParams);

  useSkipInitialEffect(() => {
    // Skip fetch if we just restored from cache - data is already correct
    if (shouldSkipFetch.current) {
      shouldSkipFetch.current = false;
      return;
    }

    async function fetchChannels() {
      if (filterParams.type === 'subscribed') {
        if (!loggedInAccount) {
          setChannels([]);
          setShowSubscribeMessage(true);
          return;
        }
      }

      setIsLoading(true);

      const { currentSort, currentRange, currentType } = getPodcastsPageFilterParams(
        {
          page: filterParams.page,
          type: filterParams.type,
          sort: filterParams.sort,
          range: filterParams.range,
          category: filterParams.category,
        },
        !!loggedInAccount
      );

      const response = await apiRequestService.reqChannelGetMany({
        page: filterParams.page,
        medium,
        type: currentType,
        sort: currentSort,
        range: currentRange,
        category: filterParams.category,
      });

      if (!filterParams.category) {
        router.replace(removeQueryParamByPattern(ROUTES.PODCASTS, 'category'));
      }

      const totalPages = getTotalPages(
        response.meta.count,
        response.meta.limit,
        response.data.length,
        filterParams.page
      );
      setTotalPages(totalPages);
      setChannels(response.data);
      setShowSubscribeMessage(false);
      setIsLoading(false);
    }
    fetchChannels();
  }, [filterParams, loggedInAccount]);

  return (
    <PodcastsPageContext.Provider
      value={{
        filterParams,
        setFilterParams,
        channels,
        setChannels,
        totalPages,
        setTotalPages,
        isLoading,
        setIsLoading,
        showSubscribeMessage,
        setShowSubscribeMessage,
        showCategoriesModal,
        setShowCategoriesModal,
      }}
    >
      {children}
    </PodcastsPageContext.Provider>
  );
};

export const usePodcastsPageContext = () => {
  const ctx = useContext(PodcastsPageContext);
  if (!ctx) {
    throw new Error('usePodcastsPageContext must be used within a PodcastsPageContextProvider');
  }
  return ctx;
};
