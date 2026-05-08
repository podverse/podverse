'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTOChannel } from '@podverse/helpers';
import { buildDTOChannelImageLoadCandidates } from '@podverse/helpers';
import { SkeletonFlashImage } from '@podverse/ui';

import { IMAGES } from '../../../../constants/images';
import { ROUTES } from '../../../../constants/routes';

import styles from '../../../../styles/components/Common/List/ListGridNode.module.scss';

interface Props {
  channel: DTOChannel;
}

export const ListArtistGridNode: React.FC<Props> = ({ channel }) => {
  const url = `${ROUTES.ARTIST}/${channel.id_text}`;
  const artistArtworkCandidates = buildDTOChannelImageLoadCandidates(
    channel.channel_images,
    IMAGES.LIST.PODCASTS.SIZE_FIND_TARGET,
    'lesser'
  );
  const tMedia = useTranslations('media');
  const tMisc = useTranslations('misc');

  return (
    <Link href={url} className={styles.link}>
      <div className={styles.gridNode}>
        <SkeletonFlashImage
          candidates={artistArtworkCandidates}
          alt={channel.title || tMedia('music.artist_image')}
          width={IMAGES.LIST.GRID.SIZE}
          height={IMAGES.LIST.GRID.SIZE}
          className={styles.image}
        />
        <div className={styles.title}>{channel.title}</div>
        {channel.channel_about?.last_pub_date && (
          <span className={styles.lastPubDate}>
            {channel.channel_about?.author || tMisc('untitled')}
          </span>
        )}
      </div>
    </Link>
  );
};
