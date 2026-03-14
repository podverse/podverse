'use client';

import React from 'react';

import type { AddByRSSFeedRecord } from '../../../utils/addByRSS/types';
import { CommonArtistListRow } from '../../Common/Artist/CommonArtistRow';
import type { ArtistListItem } from '../../Common/Artist/types';

type AddByRSSArtistRowProps = {
  feed: AddByRSSFeedRecord;
};

export const AddByRSSArtistRow: React.FC<AddByRSSArtistRowProps> = ({ feed }) => {
  const item: ArtistListItem = {
    id: feed.idText,
    title: feed.mappedFeed?.channel?.channel?.title ?? feed.title ?? feed.feedUrl,
    imageUrl: feed.imageUrl ?? feed.mappedFeed?.channel?.images?.[0]?.url ?? undefined,
    href: `/add-by-rss/artist/${feed.idText}`,
    subtitle: feed.mappedFeed?.channel?.about?.author ?? null,
  };

  return <CommonArtistListRow item={item} />;
};
