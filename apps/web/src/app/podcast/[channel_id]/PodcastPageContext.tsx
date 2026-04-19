'use client';

import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { createContext, useContext, useRef, useState } from 'react';

import type { DTOClip, DTOItem, DTOItemSoundbite } from '@podverse/helpers';
import { getTotalPages } from '@podverse/helpers';
import type { QueryParamsChannel } from '@podverse/helpers-requests';

import { useAccount } from '../../../contexts/Account';
import { checkBackNavFlag } from '../../../contexts/Navigation';
import { getApiRequestService } from '../../../factories/apiRequestService';
import { usePageStateCache } from '../../../hooks/usePageStateCache';
import { useSkipInitialEffect } from '../../../hooks/useSkipInitialEffect';
import { definedProps, getPageState } from '../../../utils/pageStateCache';
import { getPodcastPageFilterParams } from './PodcastPageDropdownConfig';

// Type for cached data
interface PodcastPageCachedData {
  items: DTOItem[];
  itemSoundbites: DTOItemSoundbite[];
  clips: DTOClip[];
  totalPages: number;
}

interface PodcastPageContextType {
  filterParams: QueryParamsChannel;
  setFilterParams: (params: QueryParamsChannel) => void;
  items: DTOItem[];
  setItems: (items: DTOItem[]) => void;
  itemSoundbites: DTOItemSoundbite[];
  setItemSoundbites: (itemSoundbites: DTOItemSoundbite[]) => void;
  clips: DTOClip[];
  setClips: (clips: DTOClip[]) => void;
  totalPages: number;
  setTotalPages: (totalPages: number) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}

const PodcastPageContext = createContext<PodcastPageContextType | undefined>(undefined);

interface PodcastPageContextProviderProps {
  children: ReactNode;
  initialQueryParams: QueryParamsChannel;
  ssrItemsWithLiveItem: DTOItem[];
  ssrItemSoundbites?: DTOItemSoundbite[];
  ssrItems: DTOItem[];
  ssrClips: DTOClip[];
  ssrTotalPages: number;
}

export const PodcastPageContextProvider = ({
  children,
  initialQueryParams,
  ssrItemsWithLiveItem,
  ssrItemSoundbites,
  ssrItems,
  ssrClips,
  ssrTotalPages,
}: PodcastPageContextProviderProps) => {
  const params = useParams();

  if (!params.channel_id) {
    return;
  }
  const channel_id = params.channel_id as string;
  const routeKey = `podcast-${channel_id}`;

  // Use synchronous sessionStorage check instead of async React state
  const isBackNav = checkBackNavFlag();

  // Check for cached state on back navigation
  const cachedState = isBackNav
    ? getPageState<QueryParamsChannel, PodcastPageCachedData>(routeKey)
    : null;
  const restoredFromCacheRef = useRef(!!cachedState?.data);

  const [filterParams, setFilterParams] = useState<QueryParamsChannel>(
    cachedState?.filterParams ?? initialQueryParams
  );
  const [items, setItems] = useState<DTOItem[]>(cachedState?.data?.items ?? ssrItems ?? []);
  const [itemSoundbites, setItemSoundbites] = useState<DTOItemSoundbite[]>(
    cachedState?.data?.itemSoundbites ?? ssrItemSoundbites ?? []
  );
  const [clips, setClips] = useState<DTOClip[]>(cachedState?.data?.clips ?? ssrClips ?? []);
  const [totalPages, setTotalPages] = useState<number>(
    cachedState?.data?.totalPages ?? ssrTotalPages ?? 1
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { loggedInAccount } = useAccount();

  // Hook to save/restore page state for back navigation
  usePageStateCache<QueryParamsChannel, PodcastPageCachedData>({
    routeKey,
    filterParams,
    setFilterParams,
    data: { items, itemSoundbites, clips, totalPages },
    setData: (cached) => {
      setItems(cached.items);
      setItemSoundbites(cached.itemSoundbites);
      setClips(cached.clips);
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

    if (
      filterParams.type === 'about' ||
      filterParams.type === 'podroll' ||
      filterParams.type === 'boosts'
    ) {
      return;
    }

    async function fetchItems() {
      const { currentPage, currentSort, currentRange } = getPodcastPageFilterParams({
        page: filterParams.page,
        type: filterParams.type,
        sort: filterParams.sort,
        range: filterParams.range,
      });

      const response = await getApiRequestService().reqItemGetManyByChannel({
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

    async function fetchItemSoundbites() {
      const { currentSort } = getPodcastPageFilterParams({
        page: filterParams.page,
        type: filterParams.type,
        sort: filterParams.sort,
        range: filterParams.range,
      });

      const response = await getApiRequestService().reqItemSoundbiteGetManyByChannelIdText(
        channel_id,
        {
          page: filterParams.page,
          sort: currentSort !== 'top' ? currentSort : 'recent',
        }
      );

      const totalPages = getTotalPages(
        response.meta.count,
        response.meta.limit,
        response.data.length,
        filterParams.page
      );
      setTotalPages(totalPages);
      setItemSoundbites(response.data);
    }

    async function fetchClips() {
      const { currentPage, currentSort, currentRange } = getPodcastPageFilterParams({
        page: filterParams.page,
        type: filterParams.type,
        sort: filterParams.sort,
        range: filterParams.range,
      });

      const response = await getApiRequestService().reqClipGetManyByChannelPublic({
        idOrIdText: channel_id,
        page: currentPage,
        sort: currentSort,
        range: currentRange,
      });

      const totalPages = getTotalPages(
        response.meta.count,
        response.meta.limit,
        response.data.length,
        currentPage
      );
      setTotalPages(totalPages);
      setClips(response.data);
    }

    async function fetchData() {
      setIsLoading(true);

      if (filterParams.type === 'episodes') {
        await fetchItems();
      } else if (filterParams.type === 'clips') {
        await fetchClips();
      } else if (filterParams.type === 'soundbites') {
        await fetchItemSoundbites();
      }

      setIsLoading(false);
    }

    fetchData();
  }, [filterParams, loggedInAccount]);

  return (
    <PodcastPageContext.Provider
      value={{
        filterParams,
        setFilterParams,
        items,
        setItems,
        itemSoundbites,
        setItemSoundbites,
        clips,
        setClips,
        totalPages,
        setTotalPages,
        isLoading,
        setIsLoading,
      }}
    >
      {children}
    </PodcastPageContext.Provider>
  );
};

export const usePodcastPageContext = () => {
  const ctx = useContext(PodcastPageContext);
  if (!ctx) {
    throw new Error('usePodcastPageContext must be used within a PodcastPageContextProvider');
  }
  return ctx;
};
