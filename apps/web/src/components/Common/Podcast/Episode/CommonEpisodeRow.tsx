'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React from 'react';
import { FaGripLines } from 'react-icons/fa6';

import {
  getQueueForMedium,
  mergeDTOItemThenChannelImageCandidates,
  stripAndDecodeHtml,
} from '@podverse/helpers';
import { getShuffleHash } from '@podverse/helpers-requests';
import type { MoreButtonMenuItem } from '@podverse/ui';
import { ImagesPerView, MoreButton } from '@podverse/ui';

import { IMAGES } from '../../../../constants/images';
import { ROUTES } from '../../../../constants/routes';
import { useAccount } from '../../../../contexts/Account';
import { useAutoQueue } from '../../../../contexts/AutoQueue';
import { useMediaPlayer } from '../../../../contexts/MediaPlayer';
import { useModals } from '../../../../contexts/Modals';
import { useQueues } from '../../../../contexts/Queue';
import { useQueueResourcesAbridgedIndex } from '../../../../contexts/QueueResourcesAbridgedIndex';
import { getApiRequestService } from '../../../../factories/apiRequestService';
import { useMediaPlayerResourceUpdate } from '../../../../hooks/useMediaPlayerResourceUpdate';
import { downloadEpisodeWithModal } from '../../../../utils/downloadModal/downloadEpisodeWithModal';
import { downloadAndSaveFile } from '../../../../utils/fileDownloader';
import { PlayButtonRow } from '../../../MediaPlayer/Buttons/PlayButtonRow';
import { ReadableDate } from '../../../Time/ReadableDate';
import { getDurationAndPositionStr, ReadableDuration } from '../../../Time/ReadableDuration';
import { showToastPromise, showToastPromiseWithLoading } from '../../../Toast/Toast';
import type { EpisodeListRowProps } from './types';

import styles from '../../../../styles/components/Common/List/Podcasts/Episodes/ListEpisodeRow.module.scss';

export const CommonEpisodeListRow: React.FC<EpisodeListRowProps> = ({
  channel,
  isEditModeQueue,
  item,
  showChannelInfo,
  removeFromQueue,
  isEditModePlaylist,
  removeFromPlaylist,
  playlist_id_text,
}) => {
  const apiRequestService = getApiRequestService();
  const url = `${ROUTES.EPISODE}/${item.id_text}`;
  const episodeArtworkCandidates = mergeDTOItemThenChannelImageCandidates(
    item.item_images,
    channel.channel_images,
    IMAGES.LIST.EPISODES.DESKTOP.SIZE_FIND_TARGET,
    'lesser'
  );
  const tFeatures = useTranslations('features');
  const tMedia = useTranslations('media');
  const tMediaPlayer = useTranslations('media_player');
  const tInstructions = useTranslations('instructions');
  const { queues } = useQueues();
  const { loggedInAccount } = useAccount();
  const { mpItem, mpIsPlaying, setMPIsPlaying } = useMediaPlayer();
  const mediaPlayerResourceUpdate = useMediaPlayerResourceUpdate();
  const { setModalPlaylistAddTo, setModalSourceSelector, setModalLoginRequired } = useModals();
  const { queueResourcesAbridgedIndex } = useQueueResourcesAbridgedIndex();
  const { durationStr, positionStr } = getDurationAndPositionStr(item, queueResourcesAbridgedIndex);
  const { autoQueueConfig } = useAutoQueue();

  const playButtonOnClick = () => {
    if (item.id === mpItem?.id) {
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
          playlist_id_text,
          disabled: false,
          random: autoQueueConfig.random,
          repeat: autoQueueConfig.repeat,
          nextPage: 1,
          shuffleHash: getShuffleHash(),
        },
        autoQueueShouldClear: true,
      });
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
      showToastPromise(apiRequestService.reqQueueResourceItemAddNext(queue.id_text, item.id_text), {
        success: tFeatures('queue.added_to_queue'),
        error: tFeatures('queue.add_error'),
      });
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
      showToastPromise(apiRequestService.reqQueueResourceItemAddLast(queue.id_text, item.id_text), {
        success: tFeatures('queue.added_to_queue'),
        error: tFeatures('queue.add_error'),
      });
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
      item_soundbite: null,
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
        apiRequestService.reqQueueResourceItemAddHistory(queue.id_text, item.id_text, {
          completed: true,
        }),
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

  const removeFromQueueOnClick = async () => {
    const queue = getQueueForMedium(queues, channel.medium_id);

    async function handler() {
      if (queue) {
        await apiRequestService.reqQueueResourceItemDelete(queue.id_text, item.id_text);
        removeFromQueue?.();
      }
    }

    showToastPromise(handler, {
      success: tFeatures('queue.removed_from_queue'),
      error: tFeatures('queue.remove_error'),
    });
  };

  const removeFromPlaylistOnClick = async () => {
    async function handler() {
      if (playlist_id_text) {
        await apiRequestService.reqPlaylistResourceItemDelete(playlist_id_text, item.id_text);
        removeFromPlaylist?.();
      }
    }

    showToastPromise(handler, {
      success: tFeatures('playlist.removed_from_playlist'),
      error: tFeatures('playlist.remove_error'),
    });
  };

  const moreButtonMenuItems: MoreButtonMenuItem[] = [
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

  if (isEditModeQueue) {
    moreButtonMenuItems.push({
      label: tFeatures('queue.remove_from_queue'),
      onClick: removeFromQueueOnClick,
      variant: 'danger',
    });
  }

  if (isEditModePlaylist) {
    moreButtonMenuItems.push({
      label: tFeatures('playlist.remove_from_playlist'),
      onClick: removeFromPlaylistOnClick,
      variant: 'danger',
    });
  }

  return (
    <div className={styles.row}>
      {(isEditModeQueue || isEditModePlaylist) && (
        <div className={styles.editingButtons}>
          <FaGripLines />
        </div>
      )}
      <ImagesPerView
        candidates={episodeArtworkCandidates}
        alt={item.title || tMedia('podcast.episode_image')}
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
            <h3>{item.title}</h3>
            {showChannelInfo && <div className={styles.channelTitle}>{channel.title}</div>}
            <div className={styles.subtitle}>
              {stripAndDecodeHtml(item.item_description?.value)}
            </div>
          </div>
        </Link>
        <div className={styles.bottomSection}>
          <div className={styles.bottomSectionStart}>
            <PlayButtonRow item={item} onClick={playButtonOnClick} />
            <div className={styles.timeSection}>
              <ReadableDate date={item.pub_date} />
              {durationStr ? ' • ' : null}
              <ReadableDuration durationStr={durationStr} positionStr={positionStr} />
            </div>
          </div>
          <div className={styles.bottomSectionEnd}>
            <MoreButton
              ariaLabel={tMedia('more_options')}
              moreButtonMenuItems={moreButtonMenuItems}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
