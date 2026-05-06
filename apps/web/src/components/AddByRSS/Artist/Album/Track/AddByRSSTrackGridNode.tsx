'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import {
  buildDTOChannelImageLoadCandidates,
  prependDistinctImageCandidate,
} from '@podverse/helpers';

import { IMAGES } from '../../../../../constants/images';
import type { AddByRSSFeedRecord } from '../../../../../utils/addByRSS/types';
import { CommonTrackGridNodeSimple } from '../../../../Common/Artist/Album/Track/CommonTrackGridNodeSimple';

type AddByRSSTrackGridNodeProps = {
  feed: AddByRSSFeedRecord;
};

export const AddByRSSTrackGridNode: React.FC<AddByRSSTrackGridNodeProps> = ({ feed }) => {
  const tMedia = useTranslations('media');
  const tMisc = useTranslations('misc');
  const feedTitle = feed.mappedFeed?.channel?.channel?.title ?? feed.title ?? feed.feedUrl;
  const channelImages = feed.mappedFeed?.channel?.images;
  const imageCandidates = prependDistinctImageCandidate(
    feed.imageUrl,
    buildDTOChannelImageLoadCandidates(channelImages, IMAGES.LIST.GRID.SIZE_FIND_TARGET, 'lesser')
  );
  const author = feed.mappedFeed?.channel?.about?.author ?? null;
  const url = `/add-by-rss/track/${feed.idText}`;

  return (
    <CommonTrackGridNodeSimple
      href={url}
      title={feedTitle || tMedia('music.track_image')}
      subtitle={author ?? tMisc('untitled')}
      imageCandidates={imageCandidates}
    />
  );
};
