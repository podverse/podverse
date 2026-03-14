'use client';

import React from 'react';

import type { AddByRSSFeedRecord } from '../../../../utils/addByRSS/types';
import { CommonAlbumListGridNode } from '../../../Common/Artist/Album/CommonAlbumGridNode';
import type { AlbumListItem } from '../../../Common/Artist/Album/types';

type AddByRSSAlbumGridNodeProps = {
  feed: AddByRSSFeedRecord;
};

export const AddByRSSAlbumGridNode: React.FC<AddByRSSAlbumGridNodeProps> = ({ feed }) => {
  const item: AlbumListItem = {
    id: feed.idText,
    title: feed.mappedFeed?.channel?.channel?.title ?? feed.title ?? feed.feedUrl,
    imageUrl: feed.imageUrl ?? feed.mappedFeed?.channel?.images?.[0]?.url ?? undefined,
    href: `/add-by-rss/album/${feed.idText}`,
    subtitle: feed.mappedFeed?.channel?.about?.author ?? null,
  };

  return <CommonAlbumListGridNode item={item} />;
};
