'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import React from 'react';

import type { DTOLiveItem } from '@podverse/helpers';
import {
  getQueryParamFromQueueMediumId,
  LiveItemStatusEnum,
  stripAndDecodeHtml,
} from '@podverse/helpers';

import { ImagesPerView } from '../../Image/ImagesPerView';
import { LiveItemStatus } from '../../LiveItem/LiveItemStatus';
import { ReadableDate } from '../../Time/ReadableDate';
import { ReadableTime } from '../../Time/ReadableTime';
import { IMAGES } from '../../../constants/images';
import { getAddByRSSLivestreamPath } from '../../../utils/addByRSS/itemPath';
import type { AddByRSSLivestreamIndexItem } from '../../../utils/addByRSS/types';
import styles from '../../../styles/components/Common/List/LiveItem/ListLiveItemRow.module.scss';

type AddByRSSLivestreamRowProps = {
  item: AddByRSSLivestreamIndexItem;
  showChannelInfo?: boolean;
};

export const AddByRSSLivestreamRow: React.FC<AddByRSSLivestreamRowProps> = ({
  item,
  showChannelInfo,
}) => {
  const tMedia = useTranslations('media');
  const mediumParam = getQueryParamFromQueueMediumId(item.mediumId) ?? 'podcast';
  const mediumSlug = mediumParam === 'music' ? 'music' : 'podcast';
  const url = getAddByRSSLivestreamPath(item.idText, mediumSlug);
  const title = item.item.title ?? tMedia('livestream.livestream');
  const description = showChannelInfo
    ? item.channelTitle
    : stripAndDecodeHtml(item.item.description ?? '');
  const imageUrl = item.item.image ?? item.channelImageUrl ?? undefined;
  const liveStatusId = item.liveItem.live_item_status ?? LiveItemStatusEnum.Pending;
  const startTime = item.liveItem.start_time;
  const endTime = item.liveItem.end_time ?? null;
  const liveItemDto = {
    id: 0,
    item_id: 0,
    live_item_status_id: liveStatusId,
    live_item_status: { id: liveStatusId },
    start_time: startTime?.toISOString?.() ?? '',
    end_time: endTime?.toISOString?.() ?? null,
  } as unknown as DTOLiveItem;

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
            <LiveItemStatus live_item={liveItemDto} />
            <div className={styles.timeSection}>
              <ReadableDate date={startTime?.toISOString?.() ?? ''} />
              {' • '}
              <ReadableTime
                start={startTime?.toISOString?.() ?? ''}
                end={endTime?.toISOString?.() ?? null}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
