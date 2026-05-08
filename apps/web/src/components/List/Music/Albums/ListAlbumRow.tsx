'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTOChannel } from '@podverse/helpers';
import { buildDTOChannelImageLoadCandidates } from '@podverse/helpers';
import { SkeletonFlashImage } from '@podverse/ui';

import { IMAGES } from '../../../../constants/images';
import { ROUTES } from '../../../../constants/routes';

import styles from '../../../../styles/components/Common/List/Podcasts/ListPodcastRow.module.scss';

interface Props {
  channel: DTOChannel;
}

export const ListAlbumRow: React.FC<Props> = ({ channel }) => {
  const url = `${ROUTES.ALBUM}/${channel.id_text}`;
  const albumArtworkCandidates = buildDTOChannelImageLoadCandidates(
    channel.channel_images,
    IMAGES.LIST.PODCASTS.SIZE_FIND_TARGET,
    'lesser'
  );
  const tMedia = useTranslations('media');
  const tMisc = useTranslations('misc');

  return (
    <Link href={url} className={styles.link}>
      <div className={styles.listItem}>
        <SkeletonFlashImage
          candidates={albumArtworkCandidates}
          alt={channel.title || tMedia('music.album_image')}
          width={IMAGES.LIST.ALBUMS.SIZE}
          height={IMAGES.LIST.ALBUMS.SIZE}
          className={styles.image}
        />
        <div className={styles.content}>
          <h3 className={styles.title}>{channel.title}</h3>
          {channel.channel_about?.author && (
            <span className={styles.lastPubDate}>
              {channel.channel_about.author || tMisc('untitled')}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};
