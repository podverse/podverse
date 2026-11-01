'use client';

import React from 'react';

import { ListSearchResultsPodcastIndexFeeds } from '../../components/List/SearchResults/ListSearchResultsPodcastIndexFeeds';
import { WebLoadingSpinnerOverlay } from '../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { NoResults } from '../../components/NoResults/NoResults';
import { useSearchPageContext } from './SearchPageContext';

export const SearchPageList: React.FC = () => {
  const { isLoading, searchParams, searchResultFeeds } = useSearchPageContext();
  const showEmpty = !isLoading && searchParams.q.trim() !== '' && searchResultFeeds.length === 0;

  return (
    <>
      {showEmpty ? (
        <NoResults role="status" />
      ) : (
        <ListSearchResultsPodcastIndexFeeds searchResultPodcastIndexFeeds={searchResultFeeds} />
      )}
      <WebLoadingSpinnerOverlay isLoading={isLoading} />
    </>
  );
};
