'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import React from 'react';

import {
  findDTOChannelImageBySize,
  findDTOItemImageBySize,
  formatDateAbbrev,
} from '@podverse/helpers';

import { IMAGES } from '../../../../constants/images';
import { ROUTES } from '../../../../constants/routes';
import { Image } from '../../../Image/Image';
import type { EpisodeListGridNodeProps } from './types';

import styles from '../../../../styles/components/Common/List/ListGridNode.module.scss';

export const CommonEpisodeListGridNode: React.FC<EpisodeListGridNodeProps> = ({
  channel,
  item,
  showChannelInfo,
}) => {
  const url = `${ROUTES.EPISODE}/${item.id_text}`;
  const channelImage = findDTOChannelImageBySize(
    channel.channel_images,
    IMAGES.LIST.EPISODES.DESKTOP.SIZE_FIND_TARGET,
    'lesser'
  );
  const itemImage = findDTOItemImageBySize(
    item.item_images,
    IMAGES.LIST.EPISODES.DESKTOP.SIZE_FIND_TARGET,
    'lesser'
  );
  const tMedia = useTranslations('media');
  const locale = useLocale();

  return (
    <Link href={url} className={styles.link}>
      <div className={styles.gridNode}>
        <Image
          src={itemImage?.url || channelImage?.url}
          alt={item.title || tMedia('podcast.episode_image')}
          width={IMAGES.LIST.GRID.SIZE}
          height={IMAGES.LIST.GRID.SIZE}
          className={styles.image}
        />
        <div className={styles.title}>{item.title}</div>
        {showChannelInfo && <div className={styles.channelTitle}>{channel?.title}</div>}
        {item.pub_date && (
          <span className={styles.lastPubDate}>{formatDateAbbrev(item.pub_date, locale)}</span>
        )}
      </div>
    </Link>
  );
};
