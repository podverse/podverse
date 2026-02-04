'use client';

import React from 'react';
import { useSearchPageContext } from './SearchPageContext';
import LoadingSpinnerOverlay from '../../components/LoadingSpinner/LoadingSpinnerOverlay';
import { ListSearchResultsPodcastIndexFeeds } from '../../components/List/SearchResults/ListSearchResultsPodcastIndexFeeds';

export const SearchPageList: React.FC = () => {
  const { searchResultFeeds, isLoading } = useSearchPageContext();

  return (
    <>
      <ListSearchResultsPodcastIndexFeeds searchResultPodcastIndexFeeds={searchResultFeeds} />
      <LoadingSpinnerOverlay isLoading={isLoading} />
    </>
  );
};
