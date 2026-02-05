'use client';

import type { DTOPlaylist, DTOPlaylistResource } from '@podverse/helpers';
import { getTotalPages } from '@podverse/helpers';
import type { QueryParamsPlaylistResources } from '@podverse/helpers-requests';
import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { apiRequestService } from '../../../factories/apiRequestService';

interface PlaylistPageContextType {
  filterParams: QueryParamsPlaylistResources;
  setFilterParams: (params: QueryParamsPlaylistResources) => void;
  playlistResources: DTOPlaylistResource[];
  setPlaylistResources: (playlistResources: DTOPlaylistResource[]) => void;
  totalPages: number;
  setTotalPages: (totalPages: number) => void;
}

const PlaylistPageContext = createContext<PlaylistPageContextType | undefined>(undefined);

interface PlaylistPageContextProviderProps {
  children: ReactNode;
  ssrPlaylist: DTOPlaylist;
}

export const PlaylistPageContextProvider = ({
  children,
  ssrPlaylist,
}: PlaylistPageContextProviderProps) => {
  const [filterParams, setFilterParams] = useState<QueryParamsPlaylistResources>({ page: 1 });
  const [playlistResources, setPlaylistResources] = useState<DTOPlaylistResource[]>([]);
  const [totalPages, setTotalPages] = useState<number>(1);

  useEffect(() => {
    async function fetchPlaylistResources() {
      const response = await apiRequestService.reqPlaylistResourceGetManyByPlaylistIdText(
        ssrPlaylist.id_text,
        {
          page: filterParams.page,
        }
      );

      const totalPages = getTotalPages(
        response.meta.count,
        response.meta.limit,
        response.data.length,
        filterParams.page
      );
      setTotalPages(totalPages);
      setPlaylistResources(response.data);
    }

    fetchPlaylistResources();
  }, [filterParams]);

  return (
    <PlaylistPageContext.Provider
      value={{
        filterParams,
        setFilterParams,
        playlistResources,
        setPlaylistResources,
        totalPages,
        setTotalPages,
      }}
    >
      {children}
    </PlaylistPageContext.Provider>
  );
};

export const usePlaylistPageContext = () => {
  const ctx = useContext(PlaylistPageContext);
  if (!ctx) {
    throw new Error('usePlaylistPageContext must be used within a PlaylistPageContextProvider');
  }
  return ctx;
};
