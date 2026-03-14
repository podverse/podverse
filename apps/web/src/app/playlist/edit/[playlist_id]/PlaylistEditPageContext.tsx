'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

import type { DTOPlaylist, DTOPlaylistResource } from '@podverse/helpers';

import { getApiRequestService } from '../../../../factories/apiRequestService';

interface PlaylistEditPageContextType {
  tabSelectedKey: 'info' | 'items';
  setTabSelectedKey: (key: 'info' | 'items') => void;
  medium: string;
  setMedium: (medium: string) => void;
  sharableStatus: string;
  setSharableStatus: (status: string) => void;
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (description: string) => void;
  isUpdating: boolean;
  setIsUpdating: (isUpdating: boolean) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  playlistResources: DTOPlaylistResource[];
  setPlaylistResources: (resources: DTOPlaylistResource[]) => void;
}

const PlaylistEditPageContext = createContext<PlaylistEditPageContextType | undefined>(undefined);

interface PlaylistEditPageContextProviderProps {
  children: ReactNode;
  ssrPlaylist: DTOPlaylist;
}

export const PlaylistEditPageContextProvider = ({
  children,
  ssrPlaylist,
}: PlaylistEditPageContextProviderProps) => {
  const [tabSelectedKey, setTabSelectedKey] = useState<'info' | 'items'>('info');
  const [medium, setMedium] = useState<string>(`${ssrPlaylist.medium_id}`);
  const [sharableStatus, setSharableStatus] = useState<string>(`${ssrPlaylist.sharable_status_id}`);
  const [title, setTitle] = useState<string>(ssrPlaylist.title || '');
  const [description, setDescription] = useState<string>(ssrPlaylist.description || '');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [playlistResources, setPlaylistResources] = useState<DTOPlaylistResource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    async function fetchPlaylistResourcesAll() {
      setIsLoading(true);
      const response =
        await getApiRequestService().reqPlaylistResourceGetAllByPlaylistIdTextPrivate(
          ssrPlaylist.id_text
        );

      setPlaylistResources(response);
      setIsLoading(false);
    }

    if (tabSelectedKey === 'items') {
      fetchPlaylistResourcesAll();
    }
  }, [tabSelectedKey]);

  return (
    <PlaylistEditPageContext.Provider
      value={{
        tabSelectedKey,
        setTabSelectedKey,
        medium,
        setMedium,
        title,
        setTitle,
        description,
        setDescription,
        sharableStatus,
        setSharableStatus,
        isUpdating,
        setIsUpdating,
        isLoading,
        setIsLoading,
        playlistResources,
        setPlaylistResources,
      }}
    >
      {children}
    </PlaylistEditPageContext.Provider>
  );
};

export const usePlaylistEditPageContext = () => {
  const ctx = useContext(PlaylistEditPageContext);
  if (!ctx) {
    throw new Error(
      'usePlaylistEditPageContext must be used within a PlaylistEditPageContextProvider'
    );
  }
  return ctx;
};
