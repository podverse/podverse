'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React from 'react';
import { FaGripLines } from 'react-icons/fa6';

import type { DTOChannel, DTOClip, DTOItem } from '@podverse/helpers';
import { getQueueForMedium, mergeDTOItemThenChannelImageCandidates } from '@podverse/helpers';
import { getShuffleHash } from '@podverse/helpers-requests';
import type { MoreButtonMenuItem } from '@podverse/ui';
import { ImagesPerView, MoreButton } from '@podverse/ui';

import { IMAGES } from '../../../constants/images';
import { ROUTES } from '../../../constants/routes';
import { useAccount } from '../../../contexts/Account';
import { useAutoQueue } from '../../../contexts/AutoQueue';
import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { useModals } from '../../../contexts/Modals';
import { useQueues } from '../../../contexts/Queue';
import { getApiRequestService } from '../../../factories/apiRequestService';
import { useMediaPlayerResourceUpdate } from '../../../hooks/useMediaPlayerResourceUpdate';
import { PlayButtonRow } from '../../MediaPlayer/Buttons/PlayButtonRow';
import { ReadableDate } from '../../Time/ReadableDate';
import { ReadableTimeRange } from '../../Time/ReadableTimeRange';
import { showToastPromise } from '../../Toast/Toast';
import type { ListEpisodeRowLike } from '../Podcasts/Episodes/ListEpisodeRow';

import styles from '../../../styles/components/List/Clips/ListClipRow.module.scss';

interface Props {
  channel?: DTOChannel | null;
  item?: DTOItem | null;
  clip: DTOClip;
  showChannelInfo?: boolean;
  showItemInfo?: boolean;
  isEditModeQueue?: boolean;
  removeFromQueue?: () => void;
  isEditModePlaylist?: boolean;
  removeFromPlaylist?: () => void;
  playlist_id_text: string | null;
  onPlayAndRemove?: () => void;
  likeRow?: ListEpisodeRowLike;
}

export const ListClipRow: React.FC<Props> = ({
  channel,
  isEditModeQueue,
  item,
  clip,
  showChannelInfo,
  showItemInfo,
  removeFromQueue,
  isEditModePlaylist,
  removeFromPlaylist,
  playlist_id_text,
  onPlayAndRemove,
  likeRow,
}) => {
  const apiRequestService = getApiRequestService();
  const url = `${ROUTES.CLIP}/${clip.id_text}`;

  channel = clip.item?.channel || item?.channel || channel || null;
  item = clip.item || item || null;

  const channel_images = channel?.channel_images;
  const item_images = item?.item_images;

  const clipArtworkCandidates = mergeDTOItemThenChannelImageCandidates(
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
  const { mpClip, mpIsPlaying, setMPIsPlaying } = useMediaPlayer();
  const { loggedInAccount } = useAccount();
  const { setModalPlaylistAddTo, setModalLoginRequired } = useModals();
  const { queues } = useQueues();
  const mediaPlayerResourceUpdate = useMediaPlayerResourceUpdate();
  const { autoQueueConfig } = useAutoQueue();

  const clipTitle = clip.title || tMisc('untitled');
  const itemTitle = item?.title || tMisc('untitled');
  const itemPubDate = item?.pub_date;
  const channelTitle = channel?.title || tMisc('untitled');

  const playButtonOnClick = () => {
    if (clip.id_text === mpClip?.id_text) {
      setMPIsPlaying(!mpIsPlaying);
    } else {
      mediaPlayerResourceUpdate({
        channel: channel,
        clip: clip,
        item: item,
        itemChapter: null,
        itemChapterShouldSeek: false,
        itemSoundbite: null,
        isPlaying: true,
        shouldPlay: true,
        skipMoveNowPlayingToHistory: false,
        enclosureSelectedParams: 'use-active-item-or-default',
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

    if (channel) {
      const queue = getQueueForMedium(queues, channel.medium_id);
      if (queue) {
        showToastPromise(
          apiRequestService.reqQueueResourceClipAddNext(queue.id_text, clip.id_text),
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
          apiRequestService.reqQueueResourceClipAddLast(queue.id_text, clip.id_text),
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
      channel: channel || clip.item?.channel || null,
      item: item || clip.item,
      clip: clip,
      item_soundbite: null,
    });
  };

  const removeFromQueueOnClick = async () => {
    if (channel) {
      const queue = getQueueForMedium(queues, channel.medium_id);
      async function handler() {
        if (queue) {
          await apiRequestService.reqQueueResourceClipDelete(queue.id_text, clip.id_text);
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
        await apiRequestService.reqPlaylistResourceClipDelete(playlist_id_text, clip.id_text);
        removeFromPlaylist?.();
      }
    }

    showToastPromise(handler, {
      success: tFeatures('playlist.removed_from_playlist'),
      error: tFeatures('playlist.remove_error'),
    });
  };

  const onLikeFromMenu = () => {
    if (!loggedInAccount) {
      setModalLoginRequired({
        title: null,
        message: tInstructions('login_to_like'),
      });
      return;
    }
    likeRow?.onToggle();
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
        ...(likeRow
          ? [
              {
                label: likeRow.isLiked
                  ? tFeatures('playlist.remove_from_liked')
                  : tFeatures('playlist.add_to_liked'),
                onClick: onLikeFromMenu,
              } satisfies MoreButtonMenuItem,
            ]
          : []),
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

  if (!isEditModePlaylist && loggedInAccount?.id_text === clip.account?.id_text) {
    moreButtonMenuItems.push({
      label: tFeatures('clip.edit_clip'),
      onClick: () => {
        window.location.href = `${ROUTES.CLIP}/edit/${clip.id_text}`;
      },
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
        candidates={clipArtworkCandidates}
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
              <h3 className={styles.clipTitle}>{clipTitle}</h3>
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
              <h3 className={styles.clipTitle}>{clipTitle}</h3>
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
              clip={clip}
              item={item || clip.item}
              onClick={onPlayAndRemove ?? playButtonOnClick}
            />
            <div className={styles.timeSection}>
              {showItemInfo && (
                <>
                  <ReadableDate date={itemPubDate} />
                  {' • '}
                </>
              )}
              <ReadableTimeRange startTime={clip.start_time} endTime={clip.end_time} />
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
