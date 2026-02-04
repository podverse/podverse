'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DTOItem } from '@podverse/helpers';
import { getTotalPages, removeQueryParamByPattern } from '@podverse/helpers';
import type { QueryParamsGetManyLivestreams } from '@podverse/helpers-requests';
import { apiRequestService } from '../../../factories/apiRequestService';
import { useAccount } from '../../../contexts/Account';
import { useSkipInitialEffect } from '../../../hooks/useSkipInitialEffect';
import { useFilterDefaults } from '../../../hooks/useFilterDefaults';
import { useListPageCache } from '../../../hooks/useListPageCache';
import { ROUTES } from '../../../constants/routes';
import { getEpisodesPageFilterParams } from '../../episodes/EpisodesPageDropdownConfig';

interface LivestreamsPageContextType {
  filterParams: QueryParamsGetManyLivestreams;
  setFilterParams: (params: QueryParamsGetManyLivestreams) => void;
  items: DTOItem[];
  setItems: (items: DTOItem[]) => void;
  totalPages: number;
  setTotalPages: (totalPages: number) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  showSubscribeMessage: boolean;
  setShowSubscribeMessage: (show: boolean) => void;
  showCategoriesModal: boolean;
  setShowCategoriesModal: (show: boolean) => void;
}

const LivestreamsPageContext = createContext<LivestreamsPageContextType | undefined>(undefined);

interface LivestreamsPageContextProviderProps {
  children: ReactNode;
  initialQueryParams: QueryParamsGetManyLivestreams;
  ssrItems: DTOItem[];
  ssrTotalPages: number;
  medium: 'av' | 'music';
}

export const LivestreamsPageContextProvider = ({
  children,
  initialQueryParams,
  ssrItems,
  ssrTotalPages,
  medium,
}: LivestreamsPageContextProviderProps) => {
  const router = useRouter();

  // Use different route keys for different mediums
  const routeKey = medium === 'av' ? 'podcasts-livestreams' : 'music-livestreams';

  // Use the list page cache hook for back navigation caching
  const {
    filterParams,
    setFilterParams,
    data: items,
    setData: setItems,
    totalPages,
    setTotalPages,
    shouldSkipFetch,
  } = useListPageCache<QueryParamsGetManyLivestreams, DTOItem[]>({
    routeKey,
    initialParams: initialQueryParams,
    ssrData: ssrItems ?? [],
    ssrTotalPages,
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSubscribeMessage, setShowSubscribeMessage] = useState<boolean>(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState<boolean>(false);
  const { loggedInAccount } = useAccount();

  const filterDefaultsPage = medium === 'av' ? 'podcasts-livestreams' : 'music-livestreams';
  useFilterDefaults(filterDefaultsPage, filterParams);

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

      const { currentSort, currentRange, currentType } = getEpisodesPageFilterParams(
        {
          page: filterParams.page,
          type: filterParams.type,
          sort: filterParams.sort,
          range: filterParams.range,
          category: filterParams.category,
        },
        !!loggedInAccount
      );

      const response = await apiRequestService.reqLiveItemGetMany(
        {
          page: filterParams.page,
          medium,
          type: currentType,
          sort: currentSort,
          range: currentRange,
          category: filterParams.category,
        },
        filterParams.liveItemType
      );

      if (!filterParams.category) {
        const route = medium === 'av' ? ROUTES.PODCASTS_LIVESTREAMS : ROUTES.MUSIC_LIVESTREAMS;
        router.replace(removeQueryParamByPattern(route, 'category'));
      }

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
    <LivestreamsPageContext.Provider
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
        showCategoriesModal,
        setShowCategoriesModal,
      }}
    >
      {children}
    </LivestreamsPageContext.Provider>
  );
};

export const useLivestreamsPageContext = () => {
  const ctx = useContext(LivestreamsPageContext);
  if (!ctx) {
    throw new Error(
      'useLivestreamsPageContext must be used within a LivestreamsPageContextProvider'
    );
  }
  return ctx;
};
