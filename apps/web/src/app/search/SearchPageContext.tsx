'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useRef, useState } from 'react';

import type {
  DTOChannel,
  QueryParamsPodcastIndexSearchMedium,
  SearchPodcastsFeed,
} from '@podverse/helpers';
import { getTotalPages, SEARCH_LIST_SORT_PREF_SCOPE } from '@podverse/helpers';

import { useConfig } from '../../contexts/Config';
import { getApiRequestService } from '../../factories/apiRequestService';
import { useSkipInitialEffect } from '../../hooks/useSkipInitialEffect';
import { useSortPref } from '../../hooks/useSortPref';

type SearchPageParams = {
  medium: QueryParamsPodcastIndexSearchMedium;
  q: string;
};

interface SearchPageContextType {
  searchParams: SearchPageParams;
  setSearchParams: (params: SearchPageParams) => void;
  searchResultFeeds: SearchPodcastsFeed[];
  setSearchResultFeeds: (feeds: SearchPodcastsFeed[]) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  isCatalogSearch: boolean;
  catalogChannels: DTOChannel[];
  catalogPage: number;
  setCatalogPage: (page: number) => void;
  catalogTotalPages: number;
}

const SearchPageContext = createContext<SearchPageContextType | undefined>(undefined);

interface SearchPageContextProviderProps {
  children: ReactNode;
  initialMedium: QueryParamsPodcastIndexSearchMedium;
}

export const SearchPageContextProvider = ({
  children,
  initialMedium,
}: SearchPageContextProviderProps) => {
  const [searchParams, setSearchParamsState] = useState<SearchPageParams>({
    medium: initialMedium,
    q: '',
  });
  const [searchResultFeeds, setSearchResultFeeds] = useState<SearchPodcastsFeed[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const isCatalogSearch = useConfig().public.catalog.podcastIndexIdAllowlist !== null;
  const [catalogChannels, setCatalogChannels] = useState<DTOChannel[]>([]);
  const [catalogPage, setCatalogPage] = useState<number>(1);
  const [catalogTotalPages, setCatalogTotalPages] = useState<number>(1);
  const catalogRequestIdRef = useRef(0);
  const apiRequestService = getApiRequestService();

  const setSearchParams = useCallback((params: SearchPageParams) => {
    setSearchParamsState(params);
    setCatalogPage(1);
  }, []);

  useSortPref({
    hasExplicitUrlParams: false,
    scope: SEARCH_LIST_SORT_PREF_SCOPE,
    values: { type: searchParams.medium },
  });

  useSkipInitialEffect(() => {
    async function fetchSearchResults() {
      catalogRequestIdRef.current += 1;
      const requestId = catalogRequestIdRef.current;
      const trimmedQ = searchParams.q.trim();
      setIsLoading(true);
      if (!trimmedQ) {
        setSearchResultFeeds([]);
        setCatalogChannels([]);
        setCatalogTotalPages(1);
      } else if (isCatalogSearch) {
        try {
          const response = await apiRequestService.reqChannelSearchByTitle({
            q: trimmedQ,
            medium: searchParams.medium,
            page: catalogPage,
          });
          if (requestId !== catalogRequestIdRef.current) {
            return;
          }
          setCatalogChannels(response.data);
          setCatalogTotalPages(
            getTotalPages(
              response.meta.count,
              response.meta.limit,
              response.data.length,
              catalogPage
            )
          );
        } catch (error) {
          if (requestId !== catalogRequestIdRef.current) {
            return;
          }
          console.error('Error fetching catalog search results:', error);
          setCatalogChannels([]);
          setCatalogTotalPages(1);
        }
      } else {
        try {
          const response = await apiRequestService.reqPodcastIndexSearchPodcasts({
            medium: searchParams.medium,
            q: trimmedQ,
          });
          setSearchResultFeeds(response.feeds);
        } catch (error) {
          console.error('Error fetching search results:', error);
          setSearchResultFeeds([]);
        }
      }
      setIsLoading(false);
    }
    fetchSearchResults();
  }, [searchParams, catalogPage]);

  return (
    <SearchPageContext.Provider
      value={{
        searchParams,
        setSearchParams,
        searchResultFeeds,
        setSearchResultFeeds,
        isLoading,
        setIsLoading,
        isCatalogSearch,
        catalogChannels,
        catalogPage,
        setCatalogPage,
        catalogTotalPages,
      }}
    >
      {children}
    </SearchPageContext.Provider>
  );
};

export const useSearchPageContext = () => {
  const ctx = useContext(SearchPageContext);
  if (!ctx) {
    throw new Error('useSearchPageContext must be used within a SearchPageContextProvider');
  }
  return ctx;
};
