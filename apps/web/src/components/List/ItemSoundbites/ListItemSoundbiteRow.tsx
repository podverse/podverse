'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React from 'react';
import { FaGripLines } from 'react-icons/fa6';

import type {
  DTOChannel,
  DTOItem,
  DTOItemSoundbite,
  EnclosureSelectedParams,
} from '@podverse/helpers';
import { getQueueForMedium, mergeDTOItemThenChannelImageCandidates } from '@podverse/helpers';
import { getShuffleHash } from '@podverse/helpers-requests';
import type { MoreButtonMenuItem } from '@podverse/ui';
import { ImagesPerView } from '@podverse/ui';

import { IMAGES } from '../../../constants/images';
import { ROUTES } from '../../../constants/routes';
import { useAccount } from '../../../contexts/Account';
import { useAutoQueue } from '../../../contexts/AutoQueue';
import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { useModals } from '../../../contexts/Modals';
import { useQueues } from '../../../contexts/Queue';
import { getApiRequestService } from '../../../factories/apiRequestService';
import { useMediaPlayerResourceUpdate } from '../../../hooks/useMediaPlayerResourceUpdate';
import { playbackTargetFromStandardLoad } from '../../../lib/playback';
import { ItemRowMoreActions } from '../../Media/ItemRowMoreActions';
import { PlayButtonRow } from '../../MediaPlayer/Buttons/PlayButtonRow';
import { ReadableDate } from '../../Time/ReadableDate';
import { ReadableTimeRange } from '../../Time/ReadableTimeRange';
import { showToastPromise } from '../../Toast/Toast';

import styles from '../../../styles/components/List/ItemSoundbites/ListItemSoundbiteRow.module.scss';

interface ListItemSoundbiteProps {
  channel: DTOChannel | null;
  item: DTOItem | null;
  item_soundbite: DTOItemSoundbite;
  showItemInfo?: boolean;
  showChannelInfo?: boolean;
  isEditModeQueue?: boolean;
  removeFromQueue?: () => void;
  isEditModePlaylist?: boolean;
  removeFromPlaylist?: () => void;
  playlist_id_text: string | null;
  onPlayAndRemove?: () => void;
}

export const ListItemSoundbiteRow: React.FC<ListItemSoundbiteProps> = ({
  channel,
  item,
  item_soundbite,
  showItemInfo,
  showChannelInfo,
  isEditModeQueue,
  removeFromQueue,
  isEditModePlaylist,
  removeFromPlaylist,
  playlist_id_text,
  onPlayAndRemove,
}) => {
  const apiRequestService = getApiRequestService();
  const url = `${ROUTES.OFFICIAL_CLIP}/${item_soundbite.id_text}`;

  channel = item?.channel || channel || null;
  item = item_soundbite.item || item || null;

  const channel_images = channel?.channel_images;
  const item_images = item?.item_images;

  const soundbiteArtworkCandidates = mergeDTOItemThenChannelImageCandidates(
    item_images,
    channel_images,
    IMAGES.LIST.CLIPS.SIZE_FIND_TARGET,
    'lesser'
  );

  const tFeatures = useTranslations('features');
  const tMedia = useTranslations('media');
  const tMediaPlayer = useTranslations('media_player');
  const tMisc = useTranslations('misc');
  const tInstructions = useTranslations('instructions');
  const { mpItemSoundbite, mpIsPlaying, setMPIsPlaying } = useMediaPlayer();
  const mediaPlayerResourceUpdate = useMediaPlayerResourceUpdate();
  const { setModalPlaylistAddTo, setModalLoginRequired } = useModals();
  const { loggedInAccount } = useAccount();
  const { queues } = useQueues();
  const { autoQueueConfig } = useAutoQueue();

  const itemSoundbiteTitle = item_soundbite.title || tMisc('untitled');
  const channelTitle = channel?.title || tMisc('untitled');
  const itemTitle = item?.title || tMisc('untitled');
  const itemPubDate = item?.pub_date;
  const startTime = item_soundbite.start_time;
  const endTime = `${Number(item_soundbite.start_time) + Number(item_soundbite.duration)}`;

  const isActiveItem = item_soundbite.id === mpItemSoundbite?.id;

  const loadItem = (
    enclosureSelectedParams: EnclosureSelectedParams | 'use-active-item-or-default'
  ) => {
    if (channel === null || item === null) {
      return;
    }
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

    if (channel) {
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

    if (channel) {
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
      item: item || item_soundbite.item || null,
      clip: null,
      item_soundbite,
    });
  };

  const removeFromQueueOnClick = async () => {
    if (channel) {
      const queue = getQueueForMedium(queues, channel.medium_id);
      async function handler() {
        if (queue) {
          await apiRequestService.reqQueueResourceItemSoundbiteDelete(
            queue.id_text,
            item_soundbite.id_text
          );
          removeFromQueue?.();
        }
      }
      showToastPromise(handler, {
        success: tFeatures('queue.removed_from_queue'),
        error: tFeatures('queue.remove_error'),
      });
    }
  };

  const removeFromPlaylistOnClick = async () => {
    async function handler() {
      if (playlist_id_text) {
        await apiRequestService.reqPlaylistResourceItemSoundbiteDelete(
          playlist_id_text,
          item_soundbite.id_text
        );
        removeFromPlaylist?.();
      }
    }

    showToastPromise(handler, {
      success: tFeatures('playlist.removed_from_playlist'),
      error: tFeatures('playlist.remove_error'),
    });
  };

  const moreButtonMenuItems: MoreButtonMenuItem[] = isEditModePlaylist
    ? [
        {
          label: tFeatures('playlist.remove_from_playlist'),
          onClick: removeFromPlaylistOnClick,
          variant: 'danger',
        },
      ]
    : [
        {
          label: tMediaPlayer('play'),
          onClick: () => alert(tMediaPlayer('play')),
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
      ];

  if (isEditModeQueue) {
    moreButtonMenuItems.push({
      label: tFeatures('queue.remove_from_queue'),
      onClick: removeFromQueueOnClick,
      variant: 'danger',
    });
  }

  if (isEditModePlaylist) {
    // Menu already limited to remove-from-playlist in edit mode.
  }

  return (
    <div className={styles.row}>
      {(isEditModeQueue || isEditModePlaylist) && (
        <div className={styles.editingButtons}>
          <FaGripLines />
        </div>
      )}
      <ImagesPerView
        candidates={soundbiteArtworkCandidates}
        alt={itemTitle || tMedia('podcast.episode_image')}
        widthDesktop={IMAGES.LIST.CLIPS.SIZE}
        heightDesktop={IMAGES.LIST.CLIPS.SIZE}
        widthMobile={IMAGES.LIST.CLIPS.SIZE}
        heightMobile={IMAGES.LIST.CLIPS.SIZE}
        classNameDesktop={styles.image}
        classNameMobile={styles.imageMobile}
        href={onPlayAndRemove ? undefined : url}
        onClick={onPlayAndRemove}
      />
      <div className={styles.content}>
        {onPlayAndRemove ? (
          <button type="button" className={styles.clickableTopSection} onClick={onPlayAndRemove}>
            <div className={styles.topSection}>
              <h3 className={styles.clipTitle}>{itemSoundbiteTitle}</h3>
              {(showChannelInfo || showItemInfo) && (
                <div className={styles.subtitle}>
                  {showChannelInfo && channelTitle}
                  {showChannelInfo && showItemInfo && ' • '}
                  {showItemInfo && itemTitle}
                </div>
              )}
            </div>
          </button>
        ) : (
          <Link href={url}>
            <div className={styles.topSection}>
              <h3 className={styles.clipTitle}>{itemSoundbiteTitle}</h3>
              {(showChannelInfo || showItemInfo) && (
                <div className={styles.subtitle}>
                  {showChannelInfo && channelTitle}
                  {showChannelInfo && showItemInfo && ' • '}
                  {showItemInfo && itemTitle}
                </div>
              )}
            </div>
          </Link>
        )}
        <div className={styles.bottomSection}>
          <div className={styles.bottomSectionStart}>
            <PlayButtonRow
              item_soundbite={item_soundbite}
              item={item || item_soundbite.item || null}
              onClick={onPlayAndRemove ?? playButtonOnClick}
            />
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
          <div className={styles.bottomSectionEnd}>
            <ItemRowMoreActions
              enclosures={item?.item_enclosures ?? []}
              itemTitle={itemTitle}
              ariaLabel={tMedia('more_options')}
              moreButtonMenuItems={moreButtonMenuItems}
              onLoadInPlayerWithSource={
                isActiveItem ? undefined : (params) => loadItem(params)
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};
