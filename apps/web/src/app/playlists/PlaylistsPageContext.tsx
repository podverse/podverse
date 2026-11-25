'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import type { DTOPlaylist, QueryParamsQueueMedium } from '@podverse/helpers';
import { getTotalPages } from '@podverse/helpers';
import type { QueryParamsPlaylists } from '@podverse/helpers-requests';

import { useAccount } from '../../contexts/Account';
import { useConfig } from '../../contexts/Config';
import { getApiRequestService } from '../../factories/apiRequestService';
import { useFilterDefaults } from '../../hooks/useFilterDefaults';
import { useListPageCache } from '../../hooks/useListPageCache';
import { useSkipInitialEffect } from '../../hooks/useSkipInitialEffect';
import { getPlaylistsPageFilterParams } from './PlaylistsPageDropdownConfig';

interface PlaylistsPageContextType {
  listScope: 'page' | 'browse';
  filterParams: QueryParamsPlaylists;
  setFilterParams: (params: QueryParamsPlaylists) => void;
  musicFilterVisible: boolean;
  playlists: DTOPlaylist[];
  setPlaylists: (playlists: DTOPlaylist[]) => void;
  totalPages: number;
  setTotalPages: (totalPages: number) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  showLoginMessage: boolean;
  setShowLoginMessage: (show: boolean) => void;
}

const PlaylistsPageContext = createContext<PlaylistsPageContextType | undefined>(undefined);

interface PlaylistsPageContextProviderProps {
  children: ReactNode;
  initialQueryParams: QueryParamsPlaylists;
  listScope: 'page' | 'browse';
  musicFilterVisible: boolean;
  rememberedMedium?: QueryParamsQueueMedium;
  ssrPlaylists: DTOPlaylist[];
  ssrTotalPages: number;
}

export const PlaylistsPageContextProvider = ({
  children,
  initialQueryParams,
  listScope,
  musicFilterVisible: initialMusicFilterVisible,
  rememberedMedium,
  ssrPlaylists,
  ssrTotalPages,
}: PlaylistsPageContextProviderProps) => {
  const musicEnabled = useConfig().public.catalog.musicEnabled;
  // Use the list page cache hook for back navigation caching
  const {
    filterParams,
    setFilterParams: setCachedFilterParams,
    data: playlists,
    setData: setPlaylists,
    totalPages,
    setTotalPages,
    shouldSkipFetch,
  } = useListPageCache<QueryParamsPlaylists, DTOPlaylist[]>({
    routeKey: listScope === 'browse' ? 'browse-playlists' : 'playlists',
    initialParams: initialQueryParams,
    ssrData: ssrPlaylists ?? [],
    ssrTotalPages,
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showLoginMessage, setShowLoginMessage] = useState<boolean>(false);
  const [musicFilterVisible, setMusicFilterVisible] = useState(
    () => musicEnabled || initialMusicFilterVisible
  );
  const [keepRememberedMedium, setKeepRememberedMedium] = useState(
    () => rememberedMedium !== undefined
  );
  const playlistRequestIdRef = useRef(0);
  const { loggedInAccount } = useAccount();

  const setFilterParams = useCallback(
    (params: QueryParamsPlaylists) => {
      setKeepRememberedMedium(false);
      setCachedFilterParams(params);
    },
    [setCachedFilterParams]
  );

  const cookieFilterParams = useMemo(() => {
    if (!keepRememberedMedium || rememberedMedium === undefined) {
      return filterParams;
    }
    if (filterParams.medium === rememberedMedium) {
      return filterParams;
    }
    return { ...filterParams, medium: rememberedMedium };
  }, [filterParams, keepRememberedMedium, rememberedMedium]);

  useFilterDefaults(listScope === 'browse' ? 'browse-playlists' : 'playlists', cookieFilterParams);

  useSkipInitialEffect(() => {
    // Skip fetch if we just restored from cache - data is already correct
    if (shouldSkipFetch.current) {
      shouldSkipFetch.current = false;
      return;
    }

    const requestId = playlistRequestIdRef.current + 1;
    playlistRequestIdRef.current = requestId;
    const isCurrent = () => playlistRequestIdRef.current === requestId;

    async function fetchPlaylists() {
      if (filterParams.type === 'private' || filterParams.type === 'private_followed') {
        if (!loggedInAccount) {
          if (!isCurrent()) {
            return;
          }
          setPlaylists([]);
          setShowLoginMessage(true);
          return;
        }
      }

      setIsLoading(true);

      const { currentSort, currentRange, currentType, currentMedium } =
        getPlaylistsPageFilterParams(
          {
            page: filterParams.page,
            type: filterParams.type,
            sort: filterParams.sort,
            range: filterParams.range,
            medium: filterParams.medium,
          },
          !!loggedInAccount
        );

      const api = getApiRequestService();

      if (musicEnabled) {
        const response = await api.reqPlaylistGetMany({
          page: filterParams.page,
          type: currentType,
          sort: currentSort,
          range: currentRange,
          medium: currentMedium,
        });
        if (!isCurrent()) {
          return;
        }
        applyPlaylistPage(response, filterParams.page);
        setMusicFilterVisible(true);
        return;
      }

      if (currentMedium === 'music') {
        const response = await api.reqPlaylistGetMany({
          page: filterParams.page,
          type: currentType,
          sort: currentSort,
          range: currentRange,
          medium: 'music',
        });
        if (!isCurrent()) {
          return;
        }
        if (response.data.length === 0) {
          setFilterParams({ ...filterParams, medium: 'all', page: 1 });
          return;
        }
        applyPlaylistPage(response, filterParams.page);
        setMusicFilterVisible(true);
        return;
      }

      const [response, musicProbe] = await Promise.all([
        api.reqPlaylistGetMany({
          page: filterParams.page,
          type: currentType,
          sort: currentSort,
          range: currentRange,
          medium: currentMedium,
        }),
        api.reqPlaylistGetMany({
          page: 1,
          type: currentType,
          sort: currentSort,
          range: currentRange,
          medium: 'music',
        }),
      ]);
      if (!isCurrent()) {
        return;
      }
      applyPlaylistPage(response, filterParams.page);
      setMusicFilterVisible(musicProbe.data.length > 0);
    }

    function applyPlaylistPage(
      response: { data: DTOPlaylist[]; meta: { count: number | null; limit: number } },
      page: number
    ) {
      const nextTotalPages = getTotalPages(
        response.meta.count,
        response.meta.limit,
        response.data.length,
        page
      );
      setTotalPages(nextTotalPages);
      setPlaylists(response.data);
      setShowLoginMessage(false);
      setIsLoading(false);
    }

    void fetchPlaylists();
  }, [filterParams, loggedInAccount, musicEnabled, setFilterParams]);

  return (
    <PlaylistsPageContext.Provider
      value={{
        listScope,
        filterParams,
        setFilterParams,
        musicFilterVisible,
        playlists,
        setPlaylists,
        totalPages,
        setTotalPages,
        isLoading,
        setIsLoading,
        showLoginMessage,
        setShowLoginMessage,
      }}
    >
      {children}
    </PlaylistsPageContext.Provider>
  );
};

export const usePlaylistsPageContext = () => {
  const ctx = useContext(PlaylistsPageContext);
  if (!ctx) {
    throw new Error('usePlaylistsPageContext must be used within a PlaylistsPageContextProvider');
  }
  return ctx;
};
