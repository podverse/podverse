'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { CommonTrackRowSimple } from '../../../../Common/Artist/Album/Track/CommonTrackRowSimple';
import type { AddByRSSFeedRecord } from '../../../../../utils/addByRSS/types';

type AddByRSSTrackFeedRowProps = {
  feed: AddByRSSFeedRecord;
};

export const AddByRSSTrackFeedRow: React.FC<AddByRSSTrackFeedRowProps> = ({ feed }) => {
  const tMedia = useTranslations('media');
  const tMisc = useTranslations('misc');
  const feedTitle = feed.mappedFeed?.channel?.channel?.title ?? feed.title ?? feed.feedUrl;
  const feedImageUrl = feed.imageUrl ?? feed.mappedFeed?.channel?.images?.[0]?.url ?? undefined;
  const author = feed.mappedFeed?.channel?.about?.author ?? null;
  const url = `/add-by-rss/track/${feed.idText}`;

  return (
    <CommonTrackRowSimple
      href={url}
      title={feedTitle || tMedia('music.track_image')}
      subtitle={author ?? tMisc('untitled')}
      imageUrl={feedImageUrl}
    />
  );
};
