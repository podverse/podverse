'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';
import type { DTOChannel } from '@podverse/helpers';
import { getTotalPages } from '@podverse/helpers';
import type { QueryParamsGetManyMusic } from '@podverse/helpers-requests';
import { apiRequestService } from '../../factories/apiRequestService';
import { useAccount } from '../../contexts/Account';
import { useSkipInitialEffect } from '../../hooks/useSkipInitialEffect';
import { useFilterDefaults } from '../../hooks/useFilterDefaults';
import { useListPageCache } from '../../hooks/useListPageCache';
import { getArtistsPageFilterParams } from './ArtistsPageDropdownConfig';

interface ArtistsPageContextType {
  filterParams: QueryParamsGetManyMusic;
  setFilterParams: (params: QueryParamsGetManyMusic) => void;
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

const ArtistsPageContext = createContext<ArtistsPageContextType | undefined>(undefined);

interface ArtistsPageContextProviderProps {
  children: ReactNode;
  initialQueryParams: QueryParamsGetManyMusic;
  ssrChannels: DTOChannel[];
  ssrTotalPages: number;
}

export const ArtistsPageContextProvider = ({
  children,
  initialQueryParams,
  ssrChannels,
  ssrTotalPages,
}: ArtistsPageContextProviderProps) => {
  // Use the list page cache hook for back navigation caching
  const {
    filterParams,
    setFilterParams,
    data: channels,
    setData: setChannels,
    totalPages,
    setTotalPages,
    shouldSkipFetch,
  } = useListPageCache<QueryParamsGetManyMusic, DTOChannel[]>({
    routeKey: 'artists',
    initialParams: initialQueryParams,
    ssrData: ssrChannels ?? [],
    ssrTotalPages,
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSubscribeMessage, setShowSubscribeMessage] = useState<boolean>(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState<boolean>(false);
  const { loggedInAccount } = useAccount();

  useFilterDefaults('artists', filterParams);

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

      const { currentSort, currentRange, currentType } = getArtistsPageFilterParams(
        {
          page: filterParams.page,
          type: filterParams.type,
          sort: filterParams.sort,
          range: filterParams.range,
        },
        !!loggedInAccount
      );

      const response = await apiRequestService.reqChannelGetMany({
        page: filterParams.page,
        medium: 'publisher-music',
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
      setChannels(response.data);
      setShowSubscribeMessage(false);
      setIsLoading(false);
    }
    fetchChannels();
  }, [filterParams, loggedInAccount]);

  return (
    <ArtistsPageContext.Provider
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
    </ArtistsPageContext.Provider>
  );
};

export const useArtistsPageContext = () => {
  const ctx = useContext(ArtistsPageContext);
  if (!ctx) {
    throw new Error('useArtistsPageContext must be used within a ArtistsPageContextProvider');
  }
  return ctx;
};
