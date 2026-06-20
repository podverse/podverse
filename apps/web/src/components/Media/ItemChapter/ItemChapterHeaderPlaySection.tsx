'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import type {
  DTOChannel,
  DTOItem,
  DTOItemChapter,
  EnclosureSelectedParams,
} from '@podverse/helpers';
import { getShuffleHash } from '@podverse/helpers-requests';

import { useAutoQueue } from '../../../contexts/AutoQueue';
import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { useModals } from '../../../contexts/Modals';
import { useMediaPlayerResourceUpdate } from '../../../hooks/useMediaPlayerResourceUpdate';
import { playbackTargetFromStandardLoad } from '../../../lib/playback';
import { downloadEpisodeWithModal } from '../../../utils/downloadModal/downloadEpisodeWithModal';
import { downloadAndSaveFile } from '../../../utils/fileDownloader';
import { PlayButtonLarge } from '../../MediaPlayer/Buttons/PlayButtonLarge';
import { ReadableDate } from '../../Time/ReadableDate';
import { ReadableTimeRange } from '../../Time/ReadableTimeRange';
import { showToastPromiseWithLoading } from '../../Toast/Toast';
import { ItemRowMoreActions } from '../ItemRowMoreActions';

import styles from '../../../styles/components/Media/ItemChapter/ItemChapterHeaderPlaySection.module.scss';

type ItemChapterHeaderPlaySectionProps = {
  channel: DTOChannel;
  item: DTOItem;
  item_chapter: DTOItemChapter;
};

export const ItemChapterHeaderPlaySection: React.FC<ItemChapterHeaderPlaySectionProps> = ({
  item_chapter,
  item,
  channel,
}) => {
  const tFeatures = useTranslations('features');
  const tMedia = useTranslations('media');
  const tMediaPlayer = useTranslations('media_player');
  const { mpItemChapter, mpIsPlaying, setMPIsPlaying } = useMediaPlayer();
  const { setModalSourceSelector } = useModals();
  const mediaPlayerResourceUpdate = useMediaPlayerResourceUpdate();
  const { autoQueueConfig } = useAutoQueue();

  const isActiveItem = item_chapter.id_text === mpItemChapter?.id_text;

  const loadItem = (
    enclosureSelectedParams: EnclosureSelectedParams | 'use-active-item-or-default'
  ) => {
    mediaPlayerResourceUpdate({
      target: playbackTargetFromStandardLoad({
        channel,
        clip: null,
        item,
        itemChapter: item_chapter,
        itemSoundbite: null,
        musicIntent: 'explicit_play',
      }),
      itemChapterShouldSeek: true,
      shouldPlay: true,
      enclosureSelectedParams,
      isPlaying: true,
      skipMoveNowPlayingToHistory: false,
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
  };

  const playButtonOnClick = () => {
    if (isActiveItem) {
      setMPIsPlaying(!mpIsPlaying);
    } else {
      loadItem('use-active-item-or-default');
    }
  };

  const downloadEpisode = async () => {
    downloadEpisodeWithModal({
      item,
      setModalSourceSelector,
      tFeatures,
      showToastPromiseWithLoading,
      downloadAndSaveFile,
    });
  };

  const moreButtonMenuItems = [
    {
      label: tMediaPlayer('play'),
      onClick: playButtonOnClick,
    },
    {
      label: tFeatures('download.download_episode'),
      onClick: downloadEpisode,
    },
  ];

  return (
    <div className={styles.playSection}>
      <div className={styles.sectionStart}>
        <PlayButtonLarge item_chapter={item_chapter} onClick={playButtonOnClick} />
        <div className={styles.timeSection}>
          <ReadableDate date={item.pub_date} />
          {item.item_about?.duration ? ' • ' : null}
          <ReadableTimeRange startTime={item_chapter.start_time} endTime={item_chapter.end_time} />
        </div>
      </div>
      <div className={styles.sectionEnd}>
        <ItemRowMoreActions
          enclosures={item.item_enclosures}
          itemTitle={item.title}
          ariaLabel={tMedia('more_options')}
          moreButtonMenuItems={moreButtonMenuItems}
          isLarge
          onLoadInPlayerWithSource={isActiveItem ? undefined : (params) => loadItem(params)}
        />
      </div>
    </div>
  );
};
