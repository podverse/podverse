'use client';

import React from 'react';

import { ListSearchResultsPodcastIndexFeeds } from '../../components/List/SearchResults/ListSearchResultsPodcastIndexFeeds';
import { WebLoadingSpinnerOverlay } from '../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { useSearchPageContext } from './SearchPageContext';

export const SearchPageList: React.FC = () => {
  const { searchResultFeeds, isLoading } = useSearchPageContext();

  return (
    <>
      <ListSearchResultsPodcastIndexFeeds searchResultPodcastIndexFeeds={searchResultFeeds} />
      <WebLoadingSpinnerOverlay isLoading={isLoading} />
    </>
  );
};
