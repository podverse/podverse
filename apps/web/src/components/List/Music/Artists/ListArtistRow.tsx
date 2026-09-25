'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import React from 'react';

import type { DTOChannel } from '@podverse/helpers';
import { buildDTOChannelImageLoadCandidates, formatDateAbbrev } from '@podverse/helpers';
import { SkeletonFlashImage } from '@podverse/ui';

import { IMAGES } from '../../../../constants/images';
import { ROUTES } from '../../../../constants/routes';
import { ARTIST_ROW_UPDATED_TEST_ID } from '../../../Common/Artist/types';

import styles from '../../../../styles/components/Common/List/Podcasts/ListPodcastRow.module.scss';

interface Props {
  channel: DTOChannel;
}

export const ListArtistRow: React.FC<Props> = ({ channel }) => {
  const url = `${ROUTES.ARTIST}/${channel.id_text}`;
  const artistArtworkCandidates = buildDTOChannelImageLoadCandidates(
    channel.channel_images,
    IMAGES.LIST.PODCASTS.SIZE_FIND_TARGET,
    'lesser'
  );
  const tMedia = useTranslations('media');
  const locale = useLocale();
  const lastPubDate = channel.channel_about?.last_pub_date;

  return (
    <Link href={url} className={styles.link}>
      <div className={styles.listItem}>
        <SkeletonFlashImage
          candidates={artistArtworkCandidates}
          alt={channel.title || tMedia('music.artist_image')}
          width={IMAGES.LIST.ARTISTS.SIZE}
          height={IMAGES.LIST.ARTISTS.SIZE}
          className={styles.image}
        />
        <div className={styles.content}>
          <h3 className={styles.title}>{channel.title}</h3>
          {lastPubDate ? (
            <span className={styles.lastPubDate} data-testid={ARTIST_ROW_UPDATED_TEST_ID}>
              {formatDateAbbrev(lastPubDate, locale)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
};
