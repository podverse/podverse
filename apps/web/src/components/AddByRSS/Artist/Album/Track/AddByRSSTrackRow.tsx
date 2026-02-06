'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { stripAndDecodeHtml } from '@podverse/helpers';
import { MoreButton } from '../../../../MoreButton/MoreButton';
import { CommonTrackRowSimple } from '../../../../Common/Artist/Album/Track/CommonTrackRowSimple';
import { getAddByRSSItemPath } from '../../../../../utils/addByRSS/itemPath';
import type { AddByRSSMappedFeed } from '../../../../../utils/addByRSS/types';

const alertPlaceholder = (label: string) => () => {
  window.alert(`Add by RSS: ${label}`);
};

type AddByRSSTrackRowProps = {
  itemIdText: string;
  channelTitle: string;
  channelImageUrl?: string;
  bundle: AddByRSSMappedFeed['items'][number];
};

export const AddByRSSTrackRow: React.FC<AddByRSSTrackRowProps> = ({
  itemIdText,
  channelTitle,
  channelImageUrl,
  bundle,
}) => {
  const tMedia = useTranslations('media');
  const tMediaPlayer = useTranslations('media_player');
  const tFeatures = useTranslations('features');
  const title = bundle.item.title ?? tMedia('music.track_image');
  const description = bundle.description?.value
    ? stripAndDecodeHtml(bundle.description.value)
    : channelTitle;
  const imageUrl = bundle.images?.[0]?.url ?? channelImageUrl;
  const url = getAddByRSSItemPath(itemIdText, 'tracks');

  const moreButtonMenuItems = [
    {
      label: tMediaPlayer('play'),
      onClick: alertPlaceholder(tMediaPlayer('play')),
    },
    {
      label: tFeatures('queue.queue_next'),
      onClick: alertPlaceholder(tFeatures('queue.queue_next')),
    },
    {
      label: tFeatures('queue.queue_last'),
      onClick: alertPlaceholder(tFeatures('queue.queue_last')),
    },
    {
      label: tFeatures('playlist.add_to_playlist'),
      onClick: alertPlaceholder(tFeatures('playlist.add_to_playlist')),
    },
    {
      label: tFeatures('download.download_track'),
      onClick: alertPlaceholder(tFeatures('download.download_track')),
    },
  ];

  return (
    <CommonTrackRowSimple
      href={url}
      title={title}
      subtitle={description}
      imageUrl={imageUrl}
      rightMetaNode={<MoreButton moreButtonMenuItems={moreButtonMenuItems} />}
    />
  );
};
