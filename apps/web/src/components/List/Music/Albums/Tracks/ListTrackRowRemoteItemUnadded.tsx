'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import type { EpisodeByGuidResponse } from '@podverse/helpers';
import { ImagesPerView } from '@podverse/ui';

import { IMAGES } from '../../../../../constants/images';
import { ROUTES } from '../../../../../constants/routes';
import { Link } from '../../../../Link/Link';

import styles from '../../../../../styles/components/Common/List/Podcasts/Episodes/ListEpisodeRow.module.scss';

interface Props {
  itemUnadded: NonNullable<EpisodeByGuidResponse['episode']>;
  showChannelInfo?: boolean;
}

export const ListTrackRowRemoteItemUnadded: React.FC<Props> = ({
  itemUnadded,
  showChannelInfo,
}) => {
  const url = `${ROUTES.PODCAST_INDEX}/feed/${itemUnadded.feedId}`;
  const tMedia = useTranslations('media');
  const tMisc = useTranslations('misc');

  return (
    <div className={styles.trackRow}>
      <Link href={url} className={styles.trackClickable}>
        <ImagesPerView
          src={itemUnadded.image || itemUnadded.feedImage}
          alt={itemUnadded.title || tMedia('music.track_image')}
          widthDesktop={IMAGES.LIST.TRACKS.DESKTOP.SIZE}
          heightDesktop={IMAGES.LIST.TRACKS.DESKTOP.SIZE}
          widthMobile={IMAGES.LIST.TRACKS.MOBILE.SIZE}
          heightMobile={IMAGES.LIST.TRACKS.MOBILE.SIZE}
          classNameDesktop={styles.image}
          classNameMobile={styles.imageMobile}
        />
        <div className={styles.trackWrapper}>
          <div className={styles.trackContent}>
            <div className={styles.trackTextWrapper}>
              <h3 className={styles.trackTitle}>{itemUnadded.title}</h3>
              {showChannelInfo && (
                <div className={styles.trackArtist}>
                  {itemUnadded.feedTitle || tMisc('untitled')}
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};
