'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTORemoteChannelStub } from '@podverse/helpers';
import { buildIndexProviderFeedPath } from '@podverse/helpers';
import { SkeletonFlashImage } from '@podverse/ui';

import { IMAGES } from '../../../../constants/images';
import { nonEmptyTrimmed } from '../../../Content/remoteItemStubRow';

import styles from '../../../../styles/components/Common/List/Podcasts/ListPodcastRow.module.scss';

interface Props {
  channelUnadded: DTORemoteChannelStub;
}

export const ListAlbumRowRemoteItemUnadded: React.FC<Props> = ({ channelUnadded }) => {
  const tMedia = useTranslations('media');
  const tMisc = useTranslations('misc');
  const titleText = nonEmptyTrimmed(channelUnadded.title);
  const authorText = nonEmptyTrimmed(channelUnadded.author);

  return (
    <Link
      href={buildIndexProviderFeedPath(
        channelUnadded.index_provider,
        channelUnadded.provider_feed_id
      )}
      className={styles.link}
    >
      <div className={styles.listItem}>
        <SkeletonFlashImage
          src={nonEmptyTrimmed(channelUnadded.image_url) ?? undefined}
          alt={titleText ?? tMedia('music.album_image')}
          width={IMAGES.LIST.ALBUMS.SIZE}
          height={IMAGES.LIST.ALBUMS.SIZE}
          className={styles.image}
        />
        <div className={styles.content}>
          <h3 className={styles.title}>{titleText ?? tMisc('untitled')}</h3>
          {authorText !== null && <span className={styles.lastPubDate}>{authorText}</span>}
        </div>
      </div>
    </Link>
  );
};
