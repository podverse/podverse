'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import type {
  DTOChannel,
  DTOItem,
  DTOItemSoundbite,
  EnclosureSelectedParams,
} from '@podverse/helpers';
import { getQueueForMedium } from '@podverse/helpers';
import { getShuffleHash } from '@podverse/helpers-requests';

import { useAccount } from '../../../contexts/Account';
import { useAutoQueue } from '../../../contexts/AutoQueue';
import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { useModals } from '../../../contexts/Modals';
import { useQueues } from '../../../contexts/Queue';
import { getApiRequestService } from '../../../factories/apiRequestService';
import { useMediaPlayerResourceUpdate } from '../../../hooks/useMediaPlayerResourceUpdate';
import { playbackTargetFromStandardLoad } from '../../../lib/playback';
import { downloadEpisodeWithModal } from '../../../utils/downloadModal/downloadEpisodeWithModal';
import { downloadAndSaveFile } from '../../../utils/fileDownloader';
import { PlayButtonLarge } from '../../MediaPlayer/Buttons/PlayButtonLarge';
import { ReadableDate } from '../../Time/ReadableDate';
import { ReadableTimeRange } from '../../Time/ReadableTimeRange';
import { showToastPromise, showToastPromiseWithLoading } from '../../Toast/Toast';
import { ItemRowMoreActions } from '../ItemRowMoreActions';

import styles from '../../../styles/components/Media/ItemSoundbite/ItemSoundbiteHeaderPlaySection.module.scss';

type ItemSoundbiteHeaderPlaySectionProps = {
  channel: DTOChannel;
  item: DTOItem;
  item_soundbite: DTOItemSoundbite;
};

export const ItemSoundbiteHeaderPlaySection: React.FC<ItemSoundbiteHeaderPlaySectionProps> = ({
  item_soundbite,
  item,
  channel,
}) => {
  const apiRequestService = getApiRequestService();
  const tFeatures = useTranslations('features');
  const tMedia = useTranslations('media');
  const tMediaPlayer = useTranslations('media_player');
  const tInstructions = useTranslations('instructions');
  const { queues } = useQueues();
  const { setModalPlaylistAddTo, setModalSourceSelector, setModalLoginRequired } = useModals();
  const { mpItemSoundbite, mpIsPlaying, setMPIsPlaying } = useMediaPlayer();
  const mediaPlayerResourceUpdate = useMediaPlayerResourceUpdate();
  const { loggedInAccount } = useAccount();
  const { autoQueueConfig } = useAutoQueue();

  const startTime = item_soundbite.start_time;
  const endTime = `${Number(item_soundbite.start_time) + Number(item_soundbite.duration)}`;

  const isActiveItem = item_soundbite.id_text === mpItemSoundbite?.id_text;

  const loadItem = (
    enclosureSelectedParams: EnclosureSelectedParams | 'use-active-item-or-default'
  ) => {
    mediaPlayerResourceUpdate({
      target: playbackTargetFromStandardLoad({
        channel,
        clip: null,
        item,
        itemChapter: null,
        itemSoundbite: item_soundbite,
        musicIntent: 'explicit_play',
      }),
      itemChapterShouldSeek: false,
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

  const addToQueueNextOnClick = async () => {
    if (!loggedInAccount) {
      setModalLoginRequired({
        title: null,
        message: tInstructions('login_to_add_to_queue'),
      });
      return;
    }

    const queue = getQueueForMedium(queues, channel.medium_id);
    if (queue) {
      showToastPromise(
        apiRequestService.reqQueueResourceItemSoundbiteAddNext(
          queue.id_text,
          item_soundbite.id_text
        ),
        {
          success: tFeatures('queue.added_to_queue'),
          error: tFeatures('queue.add_error'),
        }
      );
    }
  };

  const addToQueueLastOnClick = async () => {
    if (!loggedInAccount) {
      setModalLoginRequired({
        title: null,
        message: tInstructions('login_to_add_to_queue'),
      });
      return;
    }

    const queue = getQueueForMedium(queues, channel.medium_id);
    if (queue) {
      showToastPromise(
        apiRequestService.reqQueueResourceItemSoundbiteAddLast(
          queue.id_text,
          item_soundbite.id_text
        ),
        {
          success: tFeatures('queue.added_to_queue'),
          error: tFeatures('queue.add_error'),
        }
      );
    }
  };

  const addToPlaylistOnClick = () => {
    if (!loggedInAccount) {
      setModalLoginRequired({
        title: null,
        message: tInstructions('login_to_add_to_playlist'),
      });
      return;
    }

    setModalPlaylistAddTo({
      channel: channel,
      item: item,
      clip: null,
      item_soundbite: item_soundbite,
    });
  };

  const markAsPlayedOnClick = async () => {
    if (!loggedInAccount) {
      setModalLoginRequired({
        title: null,
        message: tInstructions('login_to_mark_as_played'),
      });
      return;
    }

    const queue = getQueueForMedium(queues, channel.medium_id);
    if (queue) {
      showToastPromise(
        apiRequestService.reqQueueResourceItemSoundbiteAddHistory(
          queue.id_text,
          item_soundbite.id_text,
          {
            completed: true,
          }
        ),
        {
          success: tFeatures('history.marked_as_played'),
          error: tFeatures('history.mark_as_played_error'),
        }
      );
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
      label: tFeatures('queue.queue_next'),
      onClick: addToQueueNextOnClick,
    },
    {
      label: tFeatures('queue.queue_last'),
      onClick: addToQueueLastOnClick,
    },
    {
      label: tFeatures('playlist.add_to_playlist'),
      onClick: addToPlaylistOnClick,
    },
    {
      label: tFeatures('history.mark_as_played'),
      onClick: markAsPlayedOnClick,
    },
    {
      label: tFeatures('download.download_episode'),
      onClick: downloadEpisode,
    },
  ];

  return (
    <div className={styles.playSection}>
      <div className={styles.sectionStart}>
        <PlayButtonLarge item_soundbite={item_soundbite} onClick={playButtonOnClick} />
        <div className={styles.timeSection}>
          <ReadableDate date={item.pub_date} />
          {item.item_about?.duration ? ' • ' : null}
          <ReadableTimeRange startTime={startTime} endTime={endTime} />
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
