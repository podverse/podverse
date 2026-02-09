'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { DTOChannel, DTOItem, DTOItemChapter } from '@podverse/helpers';
import { findDTOChannelImageBySize, findDTOItemImageBySize } from '@podverse/helpers';
import { getShuffleHash } from '@podverse/helpers-requests';
import React from 'react';
import { ImagesPerView } from '../../Image/ImagesPerView';
import { ROUTES } from '../../../constants/routes';
import { IMAGES } from '../../../constants/images';
import { PlayButtonRow } from '../../MediaPlayer/Buttons/PlayButtonRow';
import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { ReadableTimeRange } from '../../Time/ReadableTimeRange';
import { ReadableDate } from '../../Time/ReadableDate';
import { useMediaPlayerResourceUpdate } from '../../../hooks/useMediaPlayerResourceUpdate';
import { useAutoQueue } from '../../../contexts/AutoQueue';
import styles from '../../../styles/components/List/ItemChapters/ListItemChapterRow.module.scss';

interface ListItemChapterRowProps {
  channel?: DTOChannel | null;
  item?: DTOItem | null;
  item_chapter: DTOItemChapter;
  showChannelInfo?: boolean;
  showItemInfo?: boolean;
  /** When provided and channel/item are null (e.g. add-by-RSS), called on play click to seek. */
  onPlayChapter?: (chapter: DTOItemChapter) => void;
  /** When provided, used as Link href instead of chapter route (e.g. '#' for add-by-RSS). */
  getChapterHref?: (chapter: DTOItemChapter) => string;
}

export const ListItemChapterRow: React.FC<ListItemChapterRowProps> = ({
  channel,
  item,
  item_chapter,
  showChannelInfo,
  showItemInfo,
  onPlayChapter,
  getChapterHref,
}) => {
  const url =
    getChapterHref !== undefined && getChapterHref !== null
      ? getChapterHref(item_chapter)
      : `${ROUTES.CHAPTER}/${item_chapter.id_text}`;

  channel = channel || item?.channel || item_chapter.item_chapters_feed?.item?.channel || null;
  item = item || item_chapter.item_chapters_feed?.item || null;

  const channel_images = channel?.channel_images;
  const item_images = item?.item_images;

  const channel_image = findDTOChannelImageBySize(
    channel_images,
    IMAGES.LIST.CLIPS.SIZE_FIND_TARGET,
    'lesser'
  );
  const item_image = findDTOItemImageBySize(
    item_images,
    IMAGES.LIST.CLIPS.SIZE_FIND_TARGET,
    'lesser'
  );

  const tMisc = useTranslations('misc');
  const tInfo = useTranslations('info');
  const { mpItemChapter, mpIsPlaying, setMPIsPlaying } = useMediaPlayer();
  const mediaPlayerResourceUpdate = useMediaPlayerResourceUpdate();
  const { autoQueueConfig } = useAutoQueue();

  const itemChapterTitle = item_chapter.title || tMisc('untitled');
  const channelTitle = channel?.title || tMisc('untitled');
  const itemTitle = item?.title || tMisc('untitled');
  const itemPubDate = item?.pub_date;
  const startTime = item_chapter.start_time;
  const endTime = item_chapter.end_time;

  const playButtonOnClick = () => {
    if (item_chapter.id_text === mpItemChapter?.id_text) {
      setMPIsPlaying(!mpIsPlaying);
    } else if (channel && item) {
      mediaPlayerResourceUpdate({
        shouldPlay: true,
        channel: channel,
        clip: null,
        item: item,
        itemChapter: item_chapter,
        itemChapterShouldSeek: true,
        itemSoundbite: null,
        isPlaying: true,
        skipMoveNowPlayingToHistory: false,
        enclosureSelectedParams: 'use-active-item-or-default',
        newAutoQueueConfig: {
          playlist_id_text: null,
          disabled: false,
          random: autoQueueConfig.random,
          repeat: autoQueueConfig.repeat,
          nextPage: 1,
          shuffleHash: getShuffleHash(),
        },
        autoQueueShouldClear: true,
      });
    } else if (onPlayChapter) {
      onPlayChapter(item_chapter);
    }
  };

  return (
    <div className={styles.row}>
      <ImagesPerView
        src={item_chapter?.img || item_image?.url || channel_image?.url}
        alt={tInfo('chapter.chapter_image')}
        widthDesktop={IMAGES.LIST.ITEM_CHAPTERS.SIZE}
        heightDesktop={IMAGES.LIST.ITEM_CHAPTERS.SIZE}
        widthMobile={IMAGES.LIST.ITEM_CHAPTERS.SIZE}
        heightMobile={IMAGES.LIST.ITEM_CHAPTERS.SIZE}
        classNameDesktop={styles.image}
        classNameMobile={styles.imageMobile}
        href={url}
      />
      <div className={styles.content}>
        <Link href={url}>
          <div className={styles.topSection}>
            <h3
              className={
                styles.clipTitle +
                (mpItemChapter?.id_text === item_chapter.id_text && !showItemInfo
                  ? ' ' + 'highlighted-text'
                  : '')
              }
            >
              {itemChapterTitle}
            </h3>
            {(showChannelInfo || showItemInfo) && (
              <div className={styles.subtitle}>
                {showChannelInfo && channelTitle}
                {showChannelInfo && showItemInfo && ' • '}
                {showItemInfo && itemTitle}
              </div>
            )}
          </div>
        </Link>
        <div className={styles.bottomSection}>
          <div className={styles.bottomSectionStart}>
            <PlayButtonRow item_chapter={item_chapter} item={item} onClick={playButtonOnClick} />
            <div className={styles.timeSection}>
              {showItemInfo && (
                <>
                  <ReadableDate date={itemPubDate} />
                  {' • '}
                </>
              )}
              <ReadableTimeRange startTime={startTime} endTime={endTime} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
