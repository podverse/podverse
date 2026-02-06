'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { CommonTrackGridNodeSimple } from '../../../../Common/Artist/Album/Track/CommonTrackGridNodeSimple';
import { getAddByRSSItemPath } from '../../../../../utils/addByRSS/itemPath';
import type { AddByRSSItemIndexItem } from '../../../../../utils/addByRSS/types';

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
  const imageUrl = item.bundle.images?.[0]?.url ?? item.channelImageUrl;
  const subtitle = showChannelInfo ? item.channelTitle : null;

  return (
    <CommonTrackGridNodeSimple
      href={getAddByRSSItemPath(item.idText, 'tracks')}
      title={title}
      subtitle={subtitle}
      imageUrl={imageUrl}
    />
  );
};
