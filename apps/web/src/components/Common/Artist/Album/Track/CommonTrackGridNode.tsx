'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import { mergeDTOItemThenChannelImageCandidates } from '@podverse/helpers';
import { SkeletonFlashImage } from '@podverse/ui';

import { IMAGES } from '../../../../../constants/images';
import { ROUTES } from '../../../../../constants/routes';

import styles from '../../../../../styles/components/Common/List/ListGridNode.module.scss';

type CommonTrackListGridNodeProps = {
  channel: DTOChannel;
  item: DTOItem;
  showChannelInfo?: boolean;
};

export const CommonTrackListGridNode: React.FC<CommonTrackListGridNodeProps> = ({
  channel,
  item,
  showChannelInfo,
}) => {
  const url = `${ROUTES.TRACK}/${item.id_text}`;
  const imageCandidates = mergeDTOItemThenChannelImageCandidates(
    item.item_images,
    channel.channel_images,
    IMAGES.LIST.EPISODES.DESKTOP.SIZE_FIND_TARGET,
    'lesser'
  );
  const tMedia = useTranslations('media');
  const tMisc = useTranslations('misc');

  return (
    <Link href={url} className={styles.link}>
      <div className={styles.gridNode}>
        <SkeletonFlashImage
          candidates={imageCandidates}
          alt={item.title || tMedia('music.track_image')}
          width={IMAGES.LIST.GRID.SIZE}
          height={IMAGES.LIST.GRID.SIZE}
          className={styles.image}
        />
        <div className={styles.title}>{item.title}</div>
        {showChannelInfo && (
          <span className={styles.lastPubDate}>
            {channel?.channel_about?.author || tMisc('untitled')}
          </span>
        )}
      </div>
    </Link>
  );
};
