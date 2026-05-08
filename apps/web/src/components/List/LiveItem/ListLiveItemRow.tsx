'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTOChannel, DTOItem, DTOLiveItem } from '@podverse/helpers';
import {
  getQueryParamFromQueueMediumId,
  LiveItemStatusEnum,
  mergeDTOItemThenChannelImageCandidates,
  stripAndDecodeHtml,
} from '@podverse/helpers';
import { getShuffleHash } from '@podverse/helpers-requests';
import { ImagesPerView } from '@podverse/ui';

import { IMAGES } from '../../../constants/images';
import { ROUTES } from '../../../constants/routes';
import { useAutoQueue } from '../../../contexts/AutoQueue';
import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { useMediaPlayerResourceUpdate } from '../../../hooks/useMediaPlayerResourceUpdate';
import { LiveItemStatus } from '../../LiveItem/LiveItemStatus';
import { PlayButtonRow } from '../../MediaPlayer/Buttons/PlayButtonRow';
import { ReadableDate } from '../../Time/ReadableDate';
import { ReadableTime } from '../../Time/ReadableTime';

import styles from '../../../styles/components/Common/List/LiveItem/ListLiveItemRow.module.scss';

interface Props {
  channel: DTOChannel;
  item: DTOItem;
  live_item: DTOLiveItem;
  showChannelInfo?: boolean;
  showLiveItemStatus?: boolean;
}

export const ListLiveItemRow: React.FC<Props> = ({
  channel,
  item,
  live_item,
  showChannelInfo,
  showLiveItemStatus,
}) => {
  const medium = getQueryParamFromQueueMediumId(channel.medium_id) || 'av';
  const url =
    medium === 'av'
      ? `${ROUTES.PODCAST_LIVESTREAM}/${item.id_text}`
      : `${ROUTES.MUSIC_LIVESTREAM}/${item.id_text}`;
  const liveArtworkCandidates = mergeDTOItemThenChannelImageCandidates(
    item.item_images,
    channel.channel_images,
    IMAGES.LIST.LIVESTREAMS.DESKTOP.SIZE_FIND_TARGET,
    'lesser'
  );
  const tMedia = useTranslations('media');
  const { mpItem, mpIsPlaying, setMPIsPlaying } = useMediaPlayer();
  const mediaPlayerResourceUpdate = useMediaPlayerResourceUpdate();
  const { autoQueueConfig } = useAutoQueue();

  const playButtonOnClick = () => {
    if (item.id_text === mpItem?.id_text) {
      setMPIsPlaying(!mpIsPlaying);
    } else {
      mediaPlayerResourceUpdate({
        shouldPlay: true,
        channel: channel,
        clip: null,
        item: item,
        itemChapter: null,
        itemChapterShouldSeek: false,
        itemSoundbite: null,
        enclosureSelectedParams: 'use-active-item-or-default',
        isPlaying: true,
        skipMoveNowPlayingToHistory: false,
        newAutoQueueConfig: {
          playlist_id_text: null,
          disabled: true,
          random: autoQueueConfig.random,
          repeat: autoQueueConfig.repeat,
          nextPage: 1,
          shuffleHash: getShuffleHash(),
        },
        autoQueueShouldClear: true,
      });
    }
  };

  return (
    <div className={styles.row}>
      <ImagesPerView
        candidates={liveArtworkCandidates}
        alt={item.title || tMedia('livestream.livestream_image')}
        widthDesktop={IMAGES.LIST.LIVESTREAMS.DESKTOP.SIZE}
        heightDesktop={IMAGES.LIST.LIVESTREAMS.DESKTOP.SIZE}
        widthMobile={IMAGES.LIST.LIVESTREAMS.MOBILE.SIZE}
        heightMobile={IMAGES.LIST.LIVESTREAMS.MOBILE.SIZE}
        classNameDesktop={styles.image}
        classNameMobile={styles.imageMobile}
        href={url}
      />
      <div className={styles.content}>
        <Link href={url}>
          <div className={styles.topSection}>
            <h3>{item.title}</h3>
            <div className={styles.subtitle}>
              {!showChannelInfo && stripAndDecodeHtml(item.item_description?.value)}
              {showChannelInfo && channel.title}
            </div>
          </div>
        </Link>
        <div className={styles.bottomSection}>
          <div className={styles.bottomSectionStart}>
            {live_item.live_item_status.id === LiveItemStatusEnum.Live && (
              <PlayButtonRow item={item} onClick={playButtonOnClick} />
            )}
            {showLiveItemStatus && <LiveItemStatus live_item={live_item} />}
            <div className={styles.timeSection}>
              <ReadableDate date={live_item.start_time} />
              {' • '}
              <ReadableTime start={live_item.start_time} end={live_item.end_time || null} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
