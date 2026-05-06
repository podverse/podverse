'use client';

import React from 'react';

import type { AddByRSSFeedRecord } from '../../../../utils/addByRSS/types';
import { addByRSSFeedListArtworkCandidates } from '../../../../utils/image/addByRSSFeedListArtworkCandidates';
import { CommonAlbumListGridNode } from '../../../Common/Artist/Album/CommonAlbumGridNode';
import type { AlbumListItem } from '../../../Common/Artist/Album/types';

type AddByRSSAlbumGridNodeProps = {
  feed: AddByRSSFeedRecord;
};

export const AddByRSSAlbumGridNode: React.FC<AddByRSSAlbumGridNodeProps> = ({ feed }) => {
  const item: AlbumListItem = {
    id: feed.idText,
    title: feed.mappedFeed?.channel?.channel?.title ?? feed.title ?? feed.feedUrl,
    imageCandidates: addByRSSFeedListArtworkCandidates(feed),
    href: `/add-by-rss/album/${feed.idText}`,
    subtitle: feed.mappedFeed?.channel?.about?.author ?? null,
  };

  return <CommonAlbumListGridNode item={item} />;
};
