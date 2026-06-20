'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React from 'react';
import { FaGripLines } from 'react-icons/fa6';

import type { DTOChannel, DTOItem, EnclosureSelectedParams } from '@podverse/helpers';
import { getQueueForMedium, mergeDTOItemThenChannelImageCandidates } from '@podverse/helpers';
import { getShuffleHash } from '@podverse/helpers-requests';
import type { MoreButtonMenuItem } from '@podverse/ui';
import { Button, ImagesPerView } from '@podverse/ui';

import { IMAGES } from '../../../../../constants/images';
import { ROUTES } from '../../../../../constants/routes';
import { useAccount } from '../../../../../contexts/Account';
import { useAutoQueue } from '../../../../../contexts/AutoQueue';
import { useMediaPlayer } from '../../../../../contexts/MediaPlayer';
import { useModals } from '../../../../../contexts/Modals';
import { useQueues } from '../../../../../contexts/Queue';
import { getApiRequestService } from '../../../../../factories/apiRequestService';
import { useMediaPlayerResourceUpdate } from '../../../../../hooks/useMediaPlayerResourceUpdate';
import { playbackTargetFromStandardLoad } from '../../../../../lib/playback';
import { downloadTrackWithModal } from '../../../../../utils/downloadModal/downloadTrackWithModal';
import { downloadAndSaveFile } from '../../../../../utils/fileDownloader';
import { ItemRowMoreActions } from '../../../../Media/ItemRowMoreActions';
import { showToastPromise, showToastPromiseWithLoading } from '../../../../Toast/Toast';

import styles from '../../../../../styles/components/Common/List/Podcasts/Episodes/ListEpisodeRow.module.scss';

type CommonTrackListRowProps = {
  channel: DTOChannel;
  item: DTOItem;
  showChannelInfo?: boolean;
  isEditModeQueue?: boolean;
  removeFromQueue?: () => void;
  isEditModePlaylist?: boolean;
  removeFromPlaylist?: () => void;
  playlist_id_text: string | null;
};

export const CommonTrackListRow: React.FC<CommonTrackListRowProps> = ({
  channel,
  isEditModeQueue,
  item,
  showChannelInfo,
  removeFromQueue,
  isEditModePlaylist,
  removeFromPlaylist,
  playlist_id_text,
}) => {
  const router = useRouter();
  const url = `${ROUTES.TRACK}/${item.id_text}`;
  const imageSizeTarget = IMAGES.LIST.TRACKS.DESKTOP.SIZE_FIND_TARGET;
  const trackArtworkCandidates = mergeDTOItemThenChannelImageCandidates(
    item.item_images,
    channel.channel_images,
    imageSizeTarget,
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
  const { autoQueueConfig } = useAutoQueue();
  const apiRequestService = getApiRequestService();

  const isActiveItem = item.id === mpItem?.id;

  const loadItem = (
    enclosureSelectedParams: EnclosureSelectedParams | 'use-active-item-or-default'
  ) => {
    mediaPlayerResourceUpdate({
      target: playbackTargetFromStandardLoad({
        channel,
        clip: null,
        item,
        itemChapter: null,
        itemSoundbite: null,
        musicIntent: 'explicit_play',
      }),
      itemChapterShouldSeek: false,
      shouldPlay: true,
      enclosureSelectedParams,
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

  const goToTrackPage = () => {
    router.push(url);
  };

  const downloadTrack = async () => {
    downloadTrackWithModal({
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
      label: tMedia('music.track_go_to'),
      onClick: goToTrackPage,
    },
    {
      label: tFeatures('download.download_track'),
      onClick: downloadTrack,
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
    <div className={styles.trackRow}>
      {(isEditModeQueue || isEditModePlaylist) && (
        <div className={styles.editingButtons}>
          <FaGripLines />
        </div>
      )}
      <Button variant="unstyled" onClick={playButtonOnClick} className={styles.trackClickable}>
        <ImagesPerView
          candidates={trackArtworkCandidates}
          alt={item.title || tMedia('music.track_image')}
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
              <h3 className={styles.trackTitle}>{item.title}</h3>
              {showChannelInfo && <div className={styles.trackArtist}>{channel.title}</div>}
            </div>
          </div>
        </div>
      </Button>
      <ItemRowMoreActions
        enclosures={item.item_enclosures}
        itemTitle={item.title}
        ariaLabel={tMedia('more_options')}
        moreButtonMenuItems={moreButtonMenuItems}
        onLoadInPlayerWithSource={isActiveItem ? undefined : (params) => loadItem(params)}
      />
    </div>
  );
};
