'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { appendDistinctImageCandidate, buildDTOItemImageLoadCandidates } from '@podverse/helpers';

import { IMAGES } from '../../../../../constants/images';
import { getAddByRSSItemPath } from '../../../../../utils/addByRSS/itemPath';
import type { AddByRSSItemIndexItem } from '../../../../../utils/addByRSS/types';
import { CommonTrackGridNodeSimple } from '../../../../Common/Artist/Album/Track/CommonTrackGridNodeSimple';

type AddByRSSTrackGridCardProps = {
  item: AddByRSSItemIndexItem;
  showChannelInfo?: boolean;
};

export const AddByRSSTrackGridCard: React.FC<AddByRSSTrackGridCardProps> = ({
  item,
  showChannelInfo,
}) => {
  const tMedia = useTranslations('media');
  const title = item.bundle.item.title ?? tMedia('music.track_image');
  const itemImageCandidates = buildDTOItemImageLoadCandidates(
    item.bundle.images,
    IMAGES.LIST.GRID.SIZE_FIND_TARGET,
    'lesser'
  );
  const imageCandidates = appendDistinctImageCandidate(item.channelImageUrl, itemImageCandidates);
  const subtitle = showChannelInfo ? item.channelTitle : null;

  return (
    <CommonTrackGridNodeSimple
      href={getAddByRSSItemPath(item.idText, 'tracks')}
      title={title}
      subtitle={subtitle}
      imageCandidates={imageCandidates}
    />
  );
};
