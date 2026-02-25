'use client';

import type { SearchPodcastsFeed } from '@podverse/helpers';
import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';
import { getApiRequestService } from '../../factories/apiRequestService';
import { useSkipInitialEffect } from '../../hooks/useSkipInitialEffect';

type SearchPageParams = {
  q: string;
};

interface SearchPageContextType {
  searchParams: SearchPageParams;
  setSearchParams: (params: SearchPageParams) => void;
  searchResultFeeds: SearchPodcastsFeed[];
  setSearchResultFeeds: (feeds: SearchPodcastsFeed[]) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}

const SearchPageContext = createContext<SearchPageContextType | undefined>(undefined);

interface SearchPageContextProviderProps {
  children: ReactNode;
}

export const SearchPageContextProvider = ({ children }: SearchPageContextProviderProps) => {
  const [searchParams, setSearchParams] = useState<SearchPageParams>({ q: '' });
  const [searchResultFeeds, setSearchResultFeeds] = useState<SearchPodcastsFeed[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const apiRequestService = getApiRequestService();

  useSkipInitialEffect(() => {
    async function fetchSearchResults() {
      const trimmedQ = searchParams.q.trim();
      setIsLoading(true);
      if (trimmedQ) {
        try {
          const response = await apiRequestService.reqPodcastIndexSearchPodcasts({
            q: trimmedQ,
          });
          setSearchResultFeeds(response.feeds);
        } catch (error) {
          console.error('Error fetching search results:', error);
          setSearchResultFeeds([]);
        }
      } else {
        setSearchResultFeeds([]);
      }
      setIsLoading(false);
    }
    fetchSearchResults();
  }, [searchParams]);

  return (
    <SearchPageContext.Provider
      value={{
        searchParams,
        setSearchParams,
        searchResultFeeds,
        setSearchResultFeeds,
        isLoading,
        setIsLoading,
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
