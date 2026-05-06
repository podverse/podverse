'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import React from 'react';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import { formatDateAbbrev, mergeDTOItemThenChannelImageCandidates } from '@podverse/helpers';

import { IMAGES } from '../../../../constants/images';
import { ROUTES } from '../../../../constants/routes';
import { SkeletonFlashImage } from '../../../Image/SkeletonFlashImage';

import styles from '../../../../styles/components/Common/List/ListGridNode.module.scss';

interface Props {
  channel: DTOChannel;
  item: DTOItem;
  showChannelInfo?: boolean;
}

export const ListEpisodeGridNode: React.FC<Props> = ({ channel, item, showChannelInfo }) => {
  const url = `${ROUTES.EPISODE}/${item.id_text}`;
  const episodeArtworkCandidates = mergeDTOItemThenChannelImageCandidates(
    item.item_images,
    channel.channel_images,
    IMAGES.LIST.EPISODES.DESKTOP.SIZE_FIND_TARGET,
    'lesser'
  );
  const tMedia = useTranslations('media');
  const locale = useLocale();

  return (
    <Link href={url} className={styles.link}>
      <div className={styles.gridNode}>
        <SkeletonFlashImage
          candidates={episodeArtworkCandidates}
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
