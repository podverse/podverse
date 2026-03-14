'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';

import type { DTOClip } from '@podverse/helpers';
import { getTotalPages, removeQueryParamByPattern } from '@podverse/helpers';
import type { QueryParamsGetManyPartial } from '@podverse/helpers-requests';

import { ROUTES } from '../../constants/routes';
import { useAccount } from '../../contexts/Account';
import { getApiRequestService } from '../../factories/apiRequestService';
import { useFilterDefaults } from '../../hooks/useFilterDefaults';
import { useListPageCache } from '../../hooks/useListPageCache';
import { useSkipInitialEffect } from '../../hooks/useSkipInitialEffect';
import { getEpisodesPageFilterParams } from '../episodes/EpisodesPageDropdownConfig';

interface ClipsPageContextType {
  filterParams: QueryParamsGetManyPartial;
  setFilterParams: (params: QueryParamsGetManyPartial) => void;
  clips: DTOClip[];
  setClips: (clips: DTOClip[]) => void;
  totalPages: number;
  setTotalPages: (totalPages: number) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  showSubscribeMessage: boolean;
  setShowSubscribeMessage: (show: boolean) => void;
  showCategoriesModal: boolean;
  setShowCategoriesModal: (show: boolean) => void;
}

const ClipsPageContext = createContext<ClipsPageContextType | undefined>(undefined);

interface ClipsPageContextProviderProps {
  children: ReactNode;
  initialQueryParams: QueryParamsGetManyPartial;
  ssrClips: DTOClip[];
  ssrTotalPages: number;
}

export const ClipsPageContextProvider = ({
  children,
  initialQueryParams,
  ssrClips,
  ssrTotalPages,
}: ClipsPageContextProviderProps) => {
  const router = useRouter();

  // Use the list page cache hook for back navigation caching
  const {
    filterParams,
    setFilterParams,
    data: clips,
    setData: setClips,
    totalPages,
    setTotalPages,
    shouldSkipFetch,
  } = useListPageCache<QueryParamsGetManyPartial, DTOClip[]>({
    routeKey: 'clips',
    initialParams: initialQueryParams,
    ssrData: ssrClips ?? [],
    ssrTotalPages,
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSubscribeMessage, setShowSubscribeMessage] = useState<boolean>(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState<boolean>(false);
  const { loggedInAccount } = useAccount();

  useFilterDefaults('clips', filterParams);

  useSkipInitialEffect(() => {
    // Skip fetch if we just restored from cache - data is already correct
    if (shouldSkipFetch.current) {
      shouldSkipFetch.current = false;
      return;
    }

    async function fetchItems() {
      if (filterParams.type === 'subscribed') {
        if (!loggedInAccount) {
          setClips([]);
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

      const response = await getApiRequestService().reqClipGetManyPublic({
        page: filterParams.page,
        medium: 'av',
        type: currentType,
        sort: currentSort,
        range: currentRange,
        category: filterParams.category,
      });

      if (!filterParams.category) {
        router.replace(removeQueryParamByPattern(ROUTES.CLIPS, 'category'));
      }

      const totalPages = getTotalPages(
        response.meta.count,
        response.meta.limit,
        response.data.length,
        filterParams.page
      );
      setTotalPages(totalPages);
      setClips(response.data);
      setShowSubscribeMessage(false);
      setIsLoading(false);
    }
    fetchItems();
  }, [filterParams, loggedInAccount]);

  return (
    <ClipsPageContext.Provider
      value={{
        filterParams,
        setFilterParams,
        clips,
        setClips,
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
    </ClipsPageContext.Provider>
  );
};

export const useClipsPageContext = () => {
  const ctx = useContext(ClipsPageContext);
  if (!ctx) {
    throw new Error('useClipsPageContext must be used within a ClipsPageContextProvider');
  }
  return ctx;
};
