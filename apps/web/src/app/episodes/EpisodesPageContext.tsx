'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';

import type { DTOItem } from '@podverse/helpers';
import { getTotalPages, removeQueryParamByPattern } from '@podverse/helpers';
import type { QueryParamsGetManyPartial } from '@podverse/helpers-requests';

import { ROUTES } from '../../constants/routes';
import { useAccount } from '../../contexts/Account';
import { getApiRequestService } from '../../factories/apiRequestService';
import { useFilterDefaults } from '../../hooks/useFilterDefaults';
import { useListPageCache } from '../../hooks/useListPageCache';
import { useSkipInitialEffect } from '../../hooks/useSkipInitialEffect';
import { getEpisodesPageFilterParams } from './EpisodesPageDropdownConfig';

interface EpisodesPageContextType {
  filterParams: QueryParamsGetManyPartial;
  setFilterParams: (params: QueryParamsGetManyPartial) => void;
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

const EpisodesPageContext = createContext<EpisodesPageContextType | undefined>(undefined);

interface EpisodesPageContextProviderProps {
  children: ReactNode;
  initialQueryParams: QueryParamsGetManyPartial;
  ssrItems: DTOItem[];
  ssrTotalPages: number;
}

export const EpisodesPageContextProvider = ({
  children,
  initialQueryParams,
  ssrItems,
  ssrTotalPages,
}: EpisodesPageContextProviderProps) => {
  const router = useRouter();

  // Use the list page cache hook for back navigation caching
  const {
    filterParams,
    setFilterParams,
    data: items,
    setData: setItems,
    totalPages,
    setTotalPages,
    shouldSkipFetch,
  } = useListPageCache<QueryParamsGetManyPartial, DTOItem[]>({
    routeKey: 'episodes',
    initialParams: initialQueryParams,
    ssrData: ssrItems ?? [],
    ssrTotalPages,
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSubscribeMessage, setShowSubscribeMessage] = useState<boolean>(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState<boolean>(false);
  const { loggedInAccount } = useAccount();
  const medium = 'av';

  useFilterDefaults('episodes', filterParams);

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

      const response = await getApiRequestService().reqItemGetMany({
        page: filterParams.page,
        medium,
        type: currentType,
        sort: currentSort,
        range: currentRange,
        category: filterParams.category,
      });

      if (!filterParams.category) {
        router.replace(removeQueryParamByPattern(ROUTES.EPISODES, 'category'));
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
    <EpisodesPageContext.Provider
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
    </EpisodesPageContext.Provider>
  );
};

export const useEpisodesPageContext = () => {
  const ctx = useContext(EpisodesPageContext);
  if (!ctx) {
    throw new Error('useEpisodesPageContext must be used within a EpisodesPageContextProvider');
  }
  return ctx;
};
