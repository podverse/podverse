'use client';

import React from 'react';

import { ListSearchResultsPodcastIndexFeeds } from '../../components/List/SearchResults/ListSearchResultsPodcastIndexFeeds';
import LoadingSpinnerOverlay from '../../components/LoadingSpinner/LoadingSpinnerOverlay';
import { useSearchPageContext } from './SearchPageContext';

export const SearchPageList: React.FC = () => {
  const { searchResultFeeds, isLoading } = useSearchPageContext();

  return (
    <>
      <ListSearchResultsPodcastIndexFeeds searchResultPodcastIndexFeeds={searchResultFeeds} />
      <LoadingSpinnerOverlay isLoading={isLoading} />
    </>
  );
};
