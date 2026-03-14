'use client';

import React from 'react';

import type { SearchPodcastsFeed } from '@podverse/helpers';

import ListSearchResultPodcastIndexFeedRow from './ListSearchResultPodcastIndexFeedRow';

type ListSearchResultsPodcastIndexFeedsProps = {
  searchResultPodcastIndexFeeds: SearchPodcastsFeed[];
};

export const ListSearchResultsPodcastIndexFeeds: React.FC<
  ListSearchResultsPodcastIndexFeedsProps
> = ({ searchResultPodcastIndexFeeds }) => {
  return (
    <>
      {searchResultPodcastIndexFeeds.map((searchResultPodcastIndexFeed) => (
        <ListSearchResultPodcastIndexFeedRow
          key={searchResultPodcastIndexFeed.id}
          searchResultPodcastIndexFeed={searchResultPodcastIndexFeed}
        />
      ))}
    </>
  );
};
