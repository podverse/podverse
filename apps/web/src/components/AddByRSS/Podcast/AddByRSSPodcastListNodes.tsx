'use client';

import React from 'react';

import type { AddByRSSFeedRecord } from '../../../utils/addByRSS/types';
import { addByRSSFeedListArtworkCandidates } from '../../../utils/image/addByRSSFeedListArtworkCandidates';
import { CommonPodcastListNodes } from '../../Common/Podcast/CommonPodcastNodes';
import type { PodcastListItem } from '../../Common/Podcast/types';
import type { ViewSelectedOption } from '../../ViewSelector/ViewSelector';

type AddByRSSPodcastListNodesProps = {
  feeds: AddByRSSFeedRecord[];
  viewSelected: ViewSelectedOption;
};

export const AddByRSSPodcastListNodes: React.FC<AddByRSSPodcastListNodesProps> = ({
  feeds,
  viewSelected,
}) => {
  const items: PodcastListItem[] = feeds.map((feed) => {
    const feedTitle = feed.mappedFeed?.channel?.channel?.title ?? feed.title ?? feed.feedUrl;
    const imageCandidates = addByRSSFeedListArtworkCandidates(feed);
    const rawLastPubDate = feed.mappedFeed?.channel?.about?.last_pub_date ?? null;
    const lastPubDate =
      rawLastPubDate instanceof Date ? rawLastPubDate.toISOString() : rawLastPubDate;

    return {
      id: feed.idText,
      title: feedTitle ?? '',
      imageCandidates,
      href: `/add-by-rss/podcast/${feed.idText}`,
      lastPubDate,
    };
  });

  return <CommonPodcastListNodes items={items} viewSelected={viewSelected} />;
};
