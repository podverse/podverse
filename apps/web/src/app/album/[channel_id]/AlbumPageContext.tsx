'use client';

import { useParams } from 'next/navigation';
import type { DTOItem } from '@podverse/helpers';
import { getTotalPages } from '@podverse/helpers';
import type { QueryParamsChannelMusicAlbum } from '@podverse/helpers-requests';
import type { ReactNode } from 'react';
import { createContext, useContext, useState, useRef } from 'react';
import { getApiRequestService } from '../../../factories/apiRequestService';
import { useAccount } from '../../../contexts/Account';
import { checkBackNavFlag } from '../../../contexts/Navigation';
import { useSkipInitialEffect } from '../../../hooks/useSkipInitialEffect';
import { usePageStateCache } from '../../../hooks/usePageStateCache';
import { getPageState, definedProps } from '../../../utils/pageStateCache';
import { getAlbumPageFilterParams } from './AlbumPageDropdownConfig';

// Type for cached data
interface AlbumPageCachedData {
  items: DTOItem[];
  totalPages: number;
}

interface AlbumPageContextType {
  filterParams: QueryParamsChannelMusicAlbum;
  setFilterParams: (params: QueryParamsChannelMusicAlbum) => void;
  items: DTOItem[];
  setItems: (items: DTOItem[]) => void;
  totalPages: number;
  setTotalPages: (totalPages: number) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}

const AlbumPageContext = createContext<AlbumPageContextType | undefined>(undefined);

interface AlbumPageContextProviderProps {
  children: ReactNode;
  initialQueryParams: QueryParamsChannelMusicAlbum;
  ssrItemsWithLiveItem: DTOItem[];
  ssrItems: DTOItem[];
  ssrTotalPages: number;
}

export const AlbumPageContextProvider = ({
  children,
  initialQueryParams,
  ssrItemsWithLiveItem,
  ssrItems,
  ssrTotalPages,
}: AlbumPageContextProviderProps) => {
  const params = useParams();

  if (!params.channel_id) {
    return;
  }
  const channel_id = params.channel_id as string;
  const routeKey = `album-${channel_id}`;

  // Use synchronous sessionStorage check instead of async React state
  const isBackNav = checkBackNavFlag();

  // Check for cached state on back navigation
  const cachedState = isBackNav
    ? getPageState<QueryParamsChannelMusicAlbum, AlbumPageCachedData>(routeKey)
    : null;
  const restoredFromCacheRef = useRef(!!cachedState?.data);

  const [filterParams, setFilterParams] = useState<QueryParamsChannelMusicAlbum>(
    cachedState?.filterParams ?? initialQueryParams
  );
  const [items, setItems] = useState<DTOItem[]>(cachedState?.data?.items ?? ssrItems ?? []);
  const [totalPages, setTotalPages] = useState<number>(
    cachedState?.data?.totalPages ?? ssrTotalPages ?? 1
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { loggedInAccount } = useAccount();

  // Hook to save/restore page state for back navigation
  usePageStateCache<QueryParamsChannelMusicAlbum, AlbumPageCachedData>({
    routeKey,
    filterParams,
    setFilterParams,
    data: { items, totalPages },
    setData: (cached) => {
      setItems(cached.items);
      setTotalPages(cached.totalPages);
    },
    ...definedProps({ cachedScrollPosition: cachedState?.scrollPosition }),
  });

  useSkipInitialEffect(() => {
    // Skip fetch if we just restored from cache - data is already correct
    if (restoredFromCacheRef.current) {
      restoredFromCacheRef.current = false;
      return;
    }

    if (filterParams.type === 'about' || filterParams.type === 'podroll') {
      return;
    }

    async function fetchItems() {
      const { currentPage, currentSort, currentRange } = getAlbumPageFilterParams({
        page: filterParams.page,
        type: filterParams.type,
        sort: filterParams.sort,
        range: filterParams.range,
      });

      const response = await getApiRequestService().reqItemGetManyByChannelBySeason({
        idOrIdText: channel_id,
        page: currentPage,
        sort: currentSort,
        range: currentRange,
      });

      const items =
        ssrItemsWithLiveItem.length > 0 && filterParams.page === 1
          ? [...ssrItemsWithLiveItem, ...response.data]
          : response.data;

      const totalPages = getTotalPages(
        response.meta.count,
        response.meta.limit,
        response.data.length,
        currentPage
      );
      setTotalPages(totalPages);
      setItems(items);
    }

    async function fetchData() {
      setIsLoading(true);

      if (filterParams.type === 'tracks') {
        await fetchItems();
      }

      setIsLoading(false);
    }

    fetchData();
  }, [filterParams, loggedInAccount]);

  return (
    <AlbumPageContext.Provider
      value={{
        filterParams,
        setFilterParams,
        items,
        setItems,
        totalPages,
        setTotalPages,
        isLoading,
        setIsLoading,
      }}
    >
      {children}
    </AlbumPageContext.Provider>
  );
};

export const useAlbumPageContext = () => {
  const ctx = useContext(AlbumPageContext);
  if (!ctx) {
    throw new Error('useAlbumPageContext must be used within a AlbumPageContextProvider');
  }
  return ctx;
};
