'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTOChannel, DTOItem, DTOLiveItem } from '@podverse/helpers';
import {
  getQueryParamFromQueueMediumId,
  mergeDTOItemThenChannelImageCandidates,
} from '@podverse/helpers';

import { IMAGES } from '../../../constants/images';
import { ROUTES } from '../../../constants/routes';
import { SkeletonFlashImage } from '../../Image/SkeletonFlashImage';
import { ReadableDate } from '../../Time/ReadableDate';
import { ReadableTime } from '../../Time/ReadableTime';

import styles from '../../../styles/components/Common/List/ListGridNode.module.scss';

interface Props {
  channel: DTOChannel;
  item: DTOItem;
  live_item: DTOLiveItem;
  showChannelInfo?: boolean;
}

export const ListLiveItemGridNode: React.FC<Props> = ({
  channel,
  item,
  live_item,
  showChannelInfo,
}) => {
  const medium = getQueryParamFromQueueMediumId(channel.medium_id) || 'av';
  const url =
    medium === 'av'
      ? `${ROUTES.PODCAST_LIVESTREAM}/${item.id_text}`
      : `${ROUTES.MUSIC_LIVESTREAM}/${item.id_text}`;
  const liveArtworkCandidates = mergeDTOItemThenChannelImageCandidates(
    item.item_images,
    channel.channel_images,
    IMAGES.LIST.LIVESTREAMS.DESKTOP.SIZE_FIND_TARGET,
    'lesser'
  );
  const tMedia = useTranslations('media');

  return (
    <Link href={url} className={styles.link}>
      <div className={styles.gridNode}>
        <SkeletonFlashImage
          candidates={liveArtworkCandidates}
          alt={item.title || tMedia('livestream.livestream_image')}
          width={IMAGES.LIST.GRID.SIZE}
          height={IMAGES.LIST.GRID.SIZE}
          className={styles.image}
        />
        <div className={styles.title}>{item.title}</div>
        {showChannelInfo && <div className={styles.channelTitle}>{channel?.title}</div>}
        <div className={styles.lastPubDate}>
          <ReadableDate date={live_item.start_time} />
          {' • '}
          <ReadableTime start={live_item.start_time} end={live_item.end_time || null} />
        </div>
      </div>
    </Link>
  );
};
