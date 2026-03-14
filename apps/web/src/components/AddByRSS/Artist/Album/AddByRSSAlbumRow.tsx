'use client';

import React from 'react';

import type { AddByRSSFeedRecord } from '../../../../utils/addByRSS/types';
import { CommonAlbumListRow } from '../../../Common/Artist/Album/CommonAlbumRow';
import type { AlbumListItem } from '../../../Common/Artist/Album/types';

type AddByRSSAlbumRowProps = {
  feed: AddByRSSFeedRecord;
};

export const AddByRSSAlbumRow: React.FC<AddByRSSAlbumRowProps> = ({ feed }) => {
  const item: AlbumListItem = {
    id: feed.idText,
    title: feed.mappedFeed?.channel?.channel?.title ?? feed.title ?? feed.feedUrl,
    imageUrl: feed.imageUrl ?? feed.mappedFeed?.channel?.images?.[0]?.url ?? undefined,
    href: `/add-by-rss/album/${feed.idText}`,
    subtitle: feed.mappedFeed?.channel?.about?.author ?? null,
  };

  return <CommonAlbumListRow item={item} />;
};
