'use client';

import type { DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTOQueueResource } from '@podverse/helpers';
import { getQueueForMedium, MediumEnum } from '@podverse/helpers';
import { Button, ImagesPerView, MoreButton } from '@podverse/ui';

import { IMAGES } from '../../../constants/images';
import { useAccount } from '../../../contexts/Account';
import { useModals } from '../../../contexts/Modals';
import { useQueues } from '../../../contexts/Queue';
import { getApiRequestService } from '../../../factories/apiRequestService';
import { useMarkQueueResourcePlayed } from '../../../hooks/useMarkQueueResourcePlayed';
import { usePlayAddByRSS } from '../../../hooks/usePlayAddByRSS';
import { useQueueAddWithGate } from '../../../hooks/useQueueAddWithGate';
import { parsePlaybackSeconds } from '../../../lib/playback';
import { markPlayedAfterWrite } from '../../../lib/queue/queueResourcePlayed';
import { loadAddByRSSIndexItemFromResourceData } from '../../../utils/addByRSS/playFromQueueResource';
import { addByRSSResourceMergedArtworkCandidates } from '../../../utils/image/addByRSSResourceArtworkCandidates';
import { ReadableDate } from '../../Time/ReadableDate';
import { ReadableDuration } from '../../Time/ReadableDuration';
import { showToastPromise } from '../../Toast/Toast';
import { ListClipRow } from '../Clips/ListClipRow';
import { ListItemSoundbiteRow } from '../ItemSoundbites/ListItemSoundbiteRow';
import { ListReorderHandle } from '../ListReorderHandle';
import { ListTrackRow } from '../Music/Albums/Tracks/ListTrackRow';
import { ListEpisodeRow } from '../Podcasts/Episodes/ListEpisodeRow';

import styles from '../../../styles/components/Common/List/Podcasts/Episodes/ListEpisodeRow.module.scss';

interface Props {
  queueResource: DTOQueueResource;
  removeFromQueue?: () => void;
  isEditModeQueue: boolean;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  onPlayAndRemove?: () => void;
}

export const ListQueueResourceRow: React.FC<Props> = ({
  queueResource,
  removeFromQueue,
  isEditModeQueue,
  dragHandleProps,
  onPlayAndRemove,
}) => {
  const apiRequestService = getApiRequestService();
  const tFeatures = useTranslations('features');
  const tMedia = useTranslations('media');
  const tMediaPlayer = useTranslations('media_player');
  const tInstructions = useTranslations('instructions');
  const { loggedInAccount } = useAccount();
  const { setModalLoginRequired, setModalPlaylistAddTo } = useModals();
  const { activeQueue, queues } = useQueues();
  const playAddByRSS = usePlayAddByRSS();
  const { runQueueAdd } = useQueueAddWithGate();
  const markQueueResourcePlayed = useMarkQueueResourcePlayed();
  const item = queueResource.item;
  const clip = queueResource.clip;
  const item_soundbite = queueResource.item_soundbite;
  const add_by_rss_hash_id = queueResource.add_by_rss_hash_id;
  const is_add_by_rss_redacted = queueResource.is_add_by_rss_redacted === true;
  const showReorderHandle =
    isEditModeQueue && dragHandleProps !== null && dragHandleProps !== undefined;

  if (add_by_rss_hash_id) {
    const resourceData = queueResource.add_by_rss_resource_data;
    const addByRSSTitle = is_add_by_rss_redacted
      ? tFeatures('add_by_rss.private_item_placeholder')
      : (resourceData?.title ?? 'Add-by-RSS');

    const mediumId =
      typeof resourceData?.medium_id === 'number' ? resourceData.medium_id : MediumEnum.Podcast;
    const isMusic = mediumId === MediumEnum.Music;

    const imageCandidates = !is_add_by_rss_redacted
      ? addByRSSResourceMergedArtworkCandidates(
          resourceData,
          isMusic
            ? IMAGES.LIST.TRACKS.DESKTOP.SIZE_FIND_TARGET
            : IMAGES.LIST.EPISODES.DESKTOP.SIZE_FIND_TARGET,
          'lesser'
        )
      : [];

    const channelTitle =
      !is_add_by_rss_redacted && typeof resourceData?.channel_title === 'string'
        ? resourceData.channel_title
        : undefined;
    const pubDate =
      !is_add_by_rss_redacted && typeof resourceData?.pub_date === 'string'
        ? resourceData.pub_date
        : undefined;
    const duration =
      !is_add_by_rss_redacted && typeof resourceData?.duration === 'number'
        ? resourceData.duration
        : undefined;

    const queue = getQueueForMedium(queues, mediumId);

    const ensureLoggedIn = (action: () => void, messageKey: string) => () => {
      if (!loggedInAccount) {
        setModalLoginRequired({ title: null, message: tInstructions(messageKey) });
        return;
      }
      action();
    };

    const removeFromQueueOnClick = async () => {
      if (!activeQueue?.id_text) return;
      await apiRequestService.reqQueueResourceItemAddByRSSDelete(
        activeQueue.id_text,
        add_by_rss_hash_id
      );
      removeFromQueue?.();
    };

    const playAddByRssFromQueue = () => {
      if (is_add_by_rss_redacted || !resourceData) {
        return;
      }
      if (onPlayAndRemove) {
        onPlayAndRemove();
        return;
      }
      void (async () => {
        const indexItem = await loadAddByRSSIndexItemFromResourceData(resourceData);
        if (!indexItem) {
          return;
        }
        const playbackPosition = queueResource.playback_position
          ? parsePlaybackSeconds(queueResource.playback_position)
          : undefined;
        playAddByRSS(indexItem, playbackPosition);
      })();
    };

    const addToQueueNext = () => {
      if (!queue || !resourceData) return;
      void runQueueAdd(
        () =>
          apiRequestService.reqQueueResourceItemAddByRSSAddNext(queue.id_text, {
            add_by_rss_resource_data: resourceData,
          }),
        {
          success: tFeatures('queue.added_to_queue'),
          error: tFeatures('queue.add_error'),
        }
      );
    };

    const addToQueueLast = () => {
      if (!queue || !resourceData) return;
      void runQueueAdd(
        () =>
          apiRequestService.reqQueueResourceItemAddByRSSAddLast(queue.id_text, {
            add_by_rss_resource_data: resourceData,
          }),
        {
          success: tFeatures('queue.added_to_queue'),
          error: tFeatures('queue.add_error'),
        }
      );
    };

    const addToPlaylist = () => {
      if (!resourceData) return;
      setModalPlaylistAddTo({
        channel: null,
        item: null,
        clip: null,
        item_soundbite: null,
        addByRSSResourceData: resourceData,
        addByRSSHashId: add_by_rss_hash_id,
      });
    };

    const markAsPlayed = () => {
      if (!queue || !resourceData) return;
      showToastPromise(
        markPlayedAfterWrite(
          apiRequestService.reqQueueResourceItemAddByRSSAddHistory(queue.id_text, {
            add_by_rss_resource_data: resourceData,
            completed: true,
          }),
          () => {
            markQueueResourcePlayed({
              duration: null,
              hash: add_by_rss_hash_id,
              kind: 'add_by_rss',
            });
          }
        ),
        {
          success: tFeatures('history.marked_as_played'),
          error: tFeatures('history.mark_as_played_error'),
        }
      );
    };

    const moreButtonMenuItems =
      isEditModeQueue && !is_add_by_rss_redacted
        ? [
            {
              label: tFeatures('queue.remove_from_queue'),
              onClick: () => {
                showToastPromise(removeFromQueueOnClick(), {
                  success: tFeatures('queue.removed_from_queue'),
                  error: tFeatures('queue.remove_error'),
                });
              },
              variant: 'danger' as const,
            },
          ]
        : !isEditModeQueue && !is_add_by_rss_redacted && resourceData
          ? [
              {
                label: tMediaPlayer('play'),
                onClick: playAddByRssFromQueue,
              },
              {
                label: tFeatures('queue.queue_next'),
                onClick: ensureLoggedIn(addToQueueNext, 'login_to_add_to_queue'),
              },
              {
                label: tFeatures('queue.queue_last'),
                onClick: ensureLoggedIn(addToQueueLast, 'login_to_add_to_queue'),
              },
              {
                label: tFeatures('playlist.add_to_playlist'),
                onClick: ensureLoggedIn(addToPlaylist, 'login_to_add_to_playlist'),
              },
              {
                label: tFeatures('history.mark_as_played'),
                onClick: ensureLoggedIn(markAsPlayed, 'login_to_mark_as_played'),
              },
            ]
          : [];

    // Render music track style (compact row with play-on-click)
    if (isMusic) {
      return (
        <div className={styles.trackRow}>
          {showReorderHandle && (
            <ListReorderHandle
              className={styles.editingButtons}
              dragHandleProps={dragHandleProps}
            />
          )}
          <Button
            variant="unstyled"
            className={styles.trackClickable}
            onClick={playAddByRssFromQueue}
          >
            <ImagesPerView
              candidates={imageCandidates}
              alt={addByRSSTitle}
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
                  {channelTitle && <div className={styles.trackArtist}>{channelTitle}</div>}
                  <h3 className={styles.trackTitle}>{addByRSSTitle}</h3>
                </div>
              </div>
            </div>
          </Button>
          <MoreButton
            ariaLabel={tMedia('more_options')}
            moreButtonMenuItems={moreButtonMenuItems}
          />
        </div>
      );
    }

    // Render episode style (full row with date, duration)
    return (
      <div className={styles.row}>
        {showReorderHandle && (
          <ListReorderHandle className={styles.editingButtons} dragHandleProps={dragHandleProps} />
        )}
        <ImagesPerView
          candidates={imageCandidates}
          alt={addByRSSTitle}
          widthDesktop={IMAGES.LIST.EPISODES.DESKTOP.SIZE}
          heightDesktop={IMAGES.LIST.EPISODES.DESKTOP.SIZE}
          widthMobile={IMAGES.LIST.EPISODES.MOBILE.SIZE}
          heightMobile={IMAGES.LIST.EPISODES.MOBILE.SIZE}
          classNameDesktop={styles.image}
          classNameMobile={styles.imageMobile}
          onClick={playAddByRssFromQueue}
        />
        <div className={styles.content}>
          <button
            type="button"
            className={styles.clickableTopSection}
            onClick={playAddByRssFromQueue}
          >
            <div className={styles.topSection}>
              {channelTitle && <div className={styles.channelTitle}>{channelTitle}</div>}
              <h3>{addByRSSTitle}</h3>
            </div>
          </button>
          <div className={styles.bottomSection}>
            <div className={styles.bottomSectionStart}>
              <MoreButton
                ariaLabel={tMedia('more_options')}
                moreButtonMenuItems={moreButtonMenuItems}
              />
              <div className={styles.timeSection}>
                {pubDate && <ReadableDate date={pubDate} />}
                {pubDate && duration ? ' • ' : null}
                {duration && (
                  <ReadableDuration durationStr={duration.toString()} positionStr={null} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (item) {
    const channel = item.channel;

    if (channel) {
      if (channel.medium_id === MediumEnum.Podcast || channel.medium_id === MediumEnum.Video) {
        return (
          <ListEpisodeRow
            channel={channel}
            item={item}
            showChannelInfo
            isEditModeQueue={isEditModeQueue}
            dragHandleProps={dragHandleProps}
            removeFromQueue={removeFromQueue}
            playlist_id_text={null}
            onPlayAndRemove={onPlayAndRemove}
          />
        );
      } else if (channel.medium_id === MediumEnum.Music) {
        return (
          <ListTrackRow
            channel={channel}
            item={item}
            showChannelInfo
            isEditModeQueue={isEditModeQueue}
            dragHandleProps={dragHandleProps}
            removeFromQueue={removeFromQueue}
            playlist_id_text={null}
            onPlayAndRemove={onPlayAndRemove}
          />
        );
      }
    }
  } else if (clip) {
    const item = clip.item;
    const channel = item?.channel;

    if (channel) {
      if (channel.medium_id === MediumEnum.Podcast) {
        return (
          <ListClipRow
            channel={channel}
            item={item}
            clip={clip}
            showChannelInfo
            showItemInfo
            isEditModeQueue={isEditModeQueue}
            dragHandleProps={dragHandleProps}
            removeFromQueue={removeFromQueue}
            playlist_id_text={null}
            onPlayAndRemove={onPlayAndRemove}
          />
        );
      }
    }
  } else if (item_soundbite) {
    const item = item_soundbite.item;
    const channel = item?.channel;

    if (channel) {
      return (
        <ListItemSoundbiteRow
          channel={channel}
          item={item}
          item_soundbite={item_soundbite}
          showChannelInfo
          showItemInfo
          isEditModeQueue={isEditModeQueue}
          dragHandleProps={dragHandleProps}
          removeFromQueue={removeFromQueue}
          playlist_id_text={null}
          onPlayAndRemove={onPlayAndRemove}
        />
      );
    }
  }

  return null;
};
