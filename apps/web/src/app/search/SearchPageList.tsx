'use client';

import React from 'react';

import { CommonPodcastListNodes } from '../../components/Common/Podcast/CommonPodcastNodes';
import { ListSearchResultsPodcastIndexFeeds } from '../../components/List/SearchResults/ListSearchResultsPodcastIndexFeeds';
import { WebLoadingSpinnerOverlay } from '../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { NoResults } from '../../components/NoResults/NoResults';
import { Pagination } from '../../components/Pagination/Pagination';
import { getChannelPath } from '../../utils/redirect/redirectToChannelPageByMedium';
import { scrollMainToTop } from '../../utils/scroll';
import { podcastListItemFromChannel } from '../../utils/subscribed/channelListItems';
import { useSearchPageContext } from './SearchPageContext';

import styles from '../../styles/components/Common/List/Podcasts/ListPodcasts.module.scss';

export const SearchPageList: React.FC = () => {
  const {
    catalogChannels,
    catalogPage,
    catalogTotalPages,
    isCatalogSearch,
    isLoading,
    searchParams,
    searchResultFeeds,
    setCatalogPage,
  } = useSearchPageContext();
  const resultCount = isCatalogSearch ? catalogChannels.length : searchResultFeeds.length;
  const showEmpty = !isLoading && searchParams.q.trim() !== '' && resultCount === 0;

  const handleCatalogPage = (page: number) => {
    setCatalogPage(page);
    scrollMainToTop();
  };

  let results: React.ReactNode = null;
  if (showEmpty) {
    results = <NoResults role="status" />;
  } else if (!isCatalogSearch) {
    results = (
      <ListSearchResultsPodcastIndexFeeds searchResultPodcastIndexFeeds={searchResultFeeds} />
    );
  } else if (catalogChannels.length > 0) {
    results = (
      <Pagination
        currentPage={catalogPage}
        totalPages={catalogTotalPages}
        setPage={handleCatalogPage}
        paginationControlsClassName={styles.paginationControls}
      >
        <CommonPodcastListNodes
          items={catalogChannels.map((channel) => ({
            ...podcastListItemFromChannel(channel, null),
            href: getChannelPath(channel),
          }))}
          viewSelected="rows"
        />
      </Pagination>
    );
  }

  return (
    <>
      {results}
      <WebLoadingSpinnerOverlay isLoading={isLoading} />
    </>
  );
};
