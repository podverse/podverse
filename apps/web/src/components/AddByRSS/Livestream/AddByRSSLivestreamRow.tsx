'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTOLiveItem } from '@podverse/helpers';
import {
  getQueryParamFromQueueMediumId,
  LiveItemStatusEnum,
  stripAndDecodeHtml,
  toIsoOrNull,
} from '@podverse/helpers';

import { IMAGES } from '../../../constants/images';
import type { AddByRSSListContextState } from '../../../contexts/AddByRSSListContext';
import { useAddByRSSListContext } from '../../../contexts/AddByRSSListContext';
import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { usePlayAddByRSS } from '../../../hooks/usePlayAddByRSS';
import { getAddByRSSLivestreamPath } from '../../../utils/addByRSS/itemPath';
import type { AddByRSSLivestreamIndexItem } from '../../../utils/addByRSS/types';
import { ImagesPerView } from '../../Image/ImagesPerView';
import { LiveItemStatus } from '../../LiveItem/LiveItemStatus';
import { PlayButtonRow } from '../../MediaPlayer/Buttons/PlayButtonRow';
import { ReadableDate } from '../../Time/ReadableDate';
import { ReadableTime } from '../../Time/ReadableTime';

import styles from '../../../styles/components/Common/List/LiveItem/ListLiveItemRow.module.scss';

type AddByRSSLivestreamRowProps = {
  item: AddByRSSLivestreamIndexItem;
  showChannelInfo?: boolean;
  /** When set, play will set this list context for autoplay-next from list. */
  listContext?: AddByRSSListContextState | null;
};

export const AddByRSSLivestreamRow: React.FC<AddByRSSLivestreamRowProps> = ({
  item,
  showChannelInfo,
  listContext: listContextProp,
}) => {
  const tMedia = useTranslations('media');
  const { mpAddByRSS, mpIsPlaying, setMPIsPlaying } = useMediaPlayer();
  const { setAddByRSSListContext } = useAddByRSSListContext();
  const playAddByRSS = usePlayAddByRSS();

  const mediumParam = getQueryParamFromQueueMediumId(item.mediumId) ?? 'podcast';
  const mediumSlug = mediumParam === 'music' ? 'music' : 'podcast';
  const url = getAddByRSSLivestreamPath(item.idText, mediumSlug);
  const title = item.item.title ?? tMedia('livestream.livestream');
  const description = showChannelInfo
    ? item.channelTitle
    : stripAndDecodeHtml(item.item.description ?? '');
  const imageUrl = item.item.image ?? item.channelImageUrl ?? undefined;
  const liveStatusId = item.liveItem.live_item_status ?? LiveItemStatusEnum.Pending;
  const startTimeRaw = item.liveItem.start_time;
  const endTimeRaw = item.liveItem.end_time ?? null;
  const startTimeIso = toIsoOrNull(startTimeRaw);
  const endTimeIso =
    endTimeRaw !== null && endTimeRaw !== undefined ? toIsoOrNull(endTimeRaw) : null;

  const liveItemDto = {
    id: 0,
    item_id: 0,
    live_item_status_id: liveStatusId,
    live_item_status: { id: liveStatusId },
    start_time: startTimeIso ?? '',
    end_time: endTimeIso,
  } as unknown as DTOLiveItem;

  const playButtonOnClick = () => {
    if (mpAddByRSS?.idText === item.idText) {
      setMPIsPlaying(!mpIsPlaying);
    } else {
      if (listContextProp) {
        setAddByRSSListContext(listContextProp);
      }
      playAddByRSS(item);
    }
  };

  return (
    <div className={styles.row}>
      <ImagesPerView
        src={imageUrl}
        alt={title || tMedia('livestream.livestream_image')}
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
            <h3>{title}</h3>
            <div className={styles.subtitle}>{description}</div>
          </div>
        </Link>
        <div className={styles.bottomSection}>
          <div className={styles.bottomSectionStart}>
            {liveStatusId === LiveItemStatusEnum.Live && (
              <PlayButtonRow item={null} addByRSSIdText={item.idText} onClick={playButtonOnClick} />
            )}
            <LiveItemStatus live_item={liveItemDto} />
            {startTimeIso !== null && (
              <div className={styles.timeSection}>
                <ReadableDate date={startTimeIso} />
                {' • '}
                <ReadableTime start={startTimeIso} end={endTimeIso} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
