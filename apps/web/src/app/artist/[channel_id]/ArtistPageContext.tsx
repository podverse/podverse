'use client';

import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';

import type { QueryParamsChannelMusicArtist } from '@podverse/helpers-requests';

import { checkBackNavFlag } from '../../../contexts/Navigation';
import { usePageStateCache } from '../../../hooks/usePageStateCache';
import { definedProps, getPageState } from '../../../utils/pageStateCache';

interface ArtistPageContextType {
  filterParams: QueryParamsChannelMusicArtist;
  setFilterParams: (params: QueryParamsChannelMusicArtist) => void;
}

const ArtistPageContext = createContext<ArtistPageContextType | undefined>(undefined);

interface ArtistPageContextProviderProps {
  children: ReactNode;
  initialQueryParams: QueryParamsChannelMusicArtist;
}

export const ArtistPageContextProvider = ({
  children,
  initialQueryParams,
}: ArtistPageContextProviderProps) => {
  const params = useParams();

  const channel_id = params.channel_id as string;
  const routeKey = `artist-${channel_id}`;

  // Use synchronous sessionStorage check instead of async React state
  const isBackNav = checkBackNavFlag();

  // Check for cached state on back navigation
  const cachedState = isBackNav ? getPageState<QueryParamsChannelMusicArtist>(routeKey) : null;

  const [filterParams, setFilterParams] = useState<QueryParamsChannelMusicArtist>(
    cachedState?.filterParams ?? initialQueryParams
  );

  // Hook to save/restore page state for back navigation (filterParams only)
  usePageStateCache<QueryParamsChannelMusicArtist>({
    routeKey,
    filterParams,
    setFilterParams,
    ...definedProps({ cachedScrollPosition: cachedState?.scrollPosition }),
  });

  return (
    <ArtistPageContext.Provider
      value={{
        filterParams,
        setFilterParams,
      }}
    >
      {children}
    </ArtistPageContext.Provider>
  );
};

export const useArtistPageContext = () => {
  const ctx = useContext(ArtistPageContext);
  if (!ctx) {
    throw new Error('useArtistPageContext must be used within a ArtistPageContextProvider');
  }
  return ctx;
};
