'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTOChannel } from '@podverse/helpers';
import { findDTOChannelImageForList } from '@podverse/helpers';

import { IMAGES } from '../../../../constants/images';
import { ROUTES } from '../../../../constants/routes';
import { Image } from '../../../Image/Image';

import styles from '../../../../styles/components/Common/List/ListGridNode.module.scss';

interface Props {
  channel: DTOChannel;
}

export const ListAlbumGridNode: React.FC<Props> = ({ channel }) => {
  const url = `${ROUTES.ALBUM}/${channel.id_text}`;
  const channel_image = findDTOChannelImageForList(
    channel.channel_images,
    IMAGES.LIST.PODCASTS.SIZE_FIND_TARGET,
    'lesser'
  );
  const tMedia = useTranslations('media');
  const tMisc = useTranslations('misc');

  return (
    <Link href={url} className={styles.link}>
      <div className={styles.gridNode}>
        <Image
          src={channel_image?.url}
          alt={channel.title || tMedia('music.album_image')}
          width={IMAGES.LIST.GRID.SIZE}
          height={IMAGES.LIST.GRID.SIZE}
          className={styles.image}
        />
        <div className={styles.title}>{channel.title}</div>
        {channel.channel_about?.author && (
          <span className={styles.lastPubDate}>
            {channel.channel_about.author || tMisc('untitled')}
          </span>
        )}
      </div>
    </Link>
  );
};
