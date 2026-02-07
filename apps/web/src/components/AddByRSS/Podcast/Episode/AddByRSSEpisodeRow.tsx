'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import React from 'react';

import { stripAndDecodeHtml } from '@podverse/helpers';
import { ImagesPerView } from '../../../Image/ImagesPerView';
import { MoreButton } from '../../../MoreButton/MoreButton';
import { ReadableDate } from '../../../Time/ReadableDate';
import { IMAGES } from '../../../../constants/images';
import styles from '../../../../styles/components/Common/List/Podcasts/Episodes/ListEpisodeRow.module.scss';
import { getAddByRSSItemPath } from '../../../../utils/addByRSS/itemPath';
import type { AddByRSSMappedFeed } from '../../../../utils/addByRSS/types';

const alertPlaceholder = (label: string) => () => {
  window.alert(`Add by RSS: ${label}`);
};

type AddByRSSEpisodeRowProps = {
  itemIdText: string;
  channelTitle: string;
  channelImageUrl?: string;
  bundle: AddByRSSMappedFeed['items'][number];
};

export const AddByRSSEpisodeRow: React.FC<AddByRSSEpisodeRowProps> = ({
  itemIdText,
  channelTitle,
  channelImageUrl,
  bundle,
}) => {
  const tMedia = useTranslations('media');
  const tMediaPlayer = useTranslations('media_player');
  const tFeatures = useTranslations('features');
  const title = bundle.item.title ?? tMedia('podcast.episode_image');
  const description = bundle.description?.value
    ? stripAndDecodeHtml(bundle.description.value)
    : channelTitle;
  const imageUrl = bundle.images?.[0]?.url ?? channelImageUrl;
  const url = getAddByRSSItemPath(itemIdText);

  const moreButtonMenuItems = [
    {
      label: tMediaPlayer('play'),
      onClick: alertPlaceholder(tMediaPlayer('play')),
    },
    {
      label: tFeatures('queue.queue_next'),
      onClick: alertPlaceholder(tFeatures('queue.queue_next')),
    },
    {
      label: tFeatures('queue.queue_last'),
      onClick: alertPlaceholder(tFeatures('queue.queue_last')),
    },
    {
      label: tFeatures('playlist.add_to_playlist'),
      onClick: alertPlaceholder(tFeatures('playlist.add_to_playlist')),
    },
    {
      label: tFeatures('history.mark_as_played'),
      onClick: alertPlaceholder(tFeatures('history.mark_as_played')),
    },
    {
      label: tFeatures('download.download_episode'),
      onClick: alertPlaceholder(tFeatures('download.download_episode')),
    },
  ];

  return (
    <div className={styles.row}>
      <ImagesPerView
        src={imageUrl}
        alt={title || tMedia('podcast.episode_image')}
        widthDesktop={IMAGES.LIST.EPISODES.DESKTOP.SIZE}
        heightDesktop={IMAGES.LIST.EPISODES.DESKTOP.SIZE}
        widthMobile={IMAGES.LIST.EPISODES.MOBILE.SIZE}
        heightMobile={IMAGES.LIST.EPISODES.MOBILE.SIZE}
        classNameDesktop={styles.image}
        classNameMobile={styles.imageMobile}
        href={url}
      />
      <div className={styles.content}>
        <Link href={url}>
          <div className={styles.topSection}>
            <h3>{title}</h3>
            <div className={styles.subtitle}>{description}</div>
          </div>
        </Link>
        <div className={styles.bottomSection}>
          <div className={styles.bottomSectionStart}>
            <div className={styles.timeSection}>
              {bundle.item.pub_date ? (
                <ReadableDate
                  date={
                    typeof bundle.item.pub_date === 'string'
                      ? bundle.item.pub_date
                      : bundle.item.pub_date.toISOString()
                  }
                />
              ) : null}
            </div>
          </div>
          <div className={styles.bottomSectionEnd}>
            <MoreButton moreButtonMenuItems={moreButtonMenuItems} />
          </div>
        </div>
      </div>
    </div>
  );
};
