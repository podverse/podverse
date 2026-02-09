'use client';

import type { DTOQueueResource } from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';
import React from 'react';
import { useTranslations } from 'next-intl';
import ListEpisodeRow from '../Podcasts/Episodes/ListEpisodeRow';
import { ListClipRow } from '../Clips/ListClipRow';
import { ListItemSoundbiteRow } from '../ItemSoundbites/ListItemSoundbiteRow';
import { ListTrackRow } from '../Music/Albums/Tracks/ListTrackRow';
import { useQueues } from '../../../contexts/Queue';
import { apiRequestService } from '../../../factories/apiRequestService';
import { showToastPromise } from '../../Toast/Toast';
import { MoreButton } from '../../MoreButton/MoreButton';
import { FaGripLines } from 'react-icons/fa6';
import { ImagesPerView } from '../../Image/ImagesPerView';
import { IMAGES } from '../../../constants/images';
import { ReadableDate } from '../../Time/ReadableDate';
import { ReadableDuration } from '../../Time/ReadableDuration';
import { Button } from '../../Button/Button';
import styles from '../../../styles/components/Common/List/Podcasts/Episodes/ListEpisodeRow.module.scss';

interface Props {
  queueResource: DTOQueueResource;
  removeFromQueue?: () => void;
  isEditModeQueue: boolean;
  onPlayAndRemove?: () => void;
}

export const ListQueueResourceRow: React.FC<Props> = ({
  queueResource,
  removeFromQueue,
  isEditModeQueue,
  onPlayAndRemove,
}) => {
  const tFeatures = useTranslations('features');
  const { activeQueue } = useQueues();
  const item = queueResource.item;
  const clip = queueResource.clip;
  const item_soundbite = queueResource.item_soundbite;
  const add_by_rss_hash_id = queueResource.add_by_rss_hash_id;
  const is_add_by_rss_redacted = queueResource.is_add_by_rss_redacted === true;

  if (add_by_rss_hash_id) {
    const resourceData = queueResource.add_by_rss_resource_data;
    const addByRSSTitle = is_add_by_rss_redacted
      ? tFeatures('add_by_rss.private_item_placeholder')
      : (resourceData?.title ?? 'Add-by-RSS');

    // Extract image URL (item image takes priority over channel image)
    const imageUrl = !is_add_by_rss_redacted
      ? resourceData?.item_images?.[0]?.url ||
        resourceData?.channel_images?.[0]?.url ||
        (resourceData?.channel_image_url as string | undefined)
      : undefined;

    // Extract other metadata
    const channelTitle = !is_add_by_rss_redacted
      ? (resourceData?.channel_title as string | undefined)
      : undefined;
    const pubDate = !is_add_by_rss_redacted
      ? (resourceData?.pub_date as string | undefined)
      : undefined;
    const duration = !is_add_by_rss_redacted
      ? (resourceData?.duration as number | undefined)
      : undefined;
    const mediumId = resourceData?.medium_id as number | undefined;
    const isMusic = mediumId === MediumEnum.Music;

    const removeFromQueueOnClick = async () => {
      if (!activeQueue?.id_text) return;
      await apiRequestService.reqQueueResourceItemAddByRSSDelete(
        activeQueue.id_text,
        add_by_rss_hash_id
      );
      removeFromQueue?.();
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
        : [];

    // Render music track style (compact row with play-on-click)
    if (isMusic) {
      return (
        <div className={styles.trackRow}>
          {isEditModeQueue && (
            <div className={styles.editingButtons}>
              <FaGripLines />
            </div>
          )}
          <Button variant="unstyled" className={styles.trackClickable} onClick={onPlayAndRemove}>
            <ImagesPerView
              src={imageUrl}
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
                  <h3 className={styles.trackTitle}>{addByRSSTitle}</h3>
                  {channelTitle && <div className={styles.trackArtist}>{channelTitle}</div>}
                </div>
              </div>
            </div>
          </Button>
          <MoreButton moreButtonMenuItems={moreButtonMenuItems} />
        </div>
      );
    }

    // Render episode style (full row with date, duration)
    return (
      <div className={styles.row}>
        {isEditModeQueue && (
          <div className={styles.editingButtons}>
            <FaGripLines />
          </div>
        )}
        <ImagesPerView
          src={imageUrl}
          alt={addByRSSTitle}
          widthDesktop={IMAGES.LIST.EPISODES.DESKTOP.SIZE}
          heightDesktop={IMAGES.LIST.EPISODES.DESKTOP.SIZE}
          widthMobile={IMAGES.LIST.EPISODES.MOBILE.SIZE}
          heightMobile={IMAGES.LIST.EPISODES.MOBILE.SIZE}
          classNameDesktop={styles.image}
          classNameMobile={styles.imageMobile}
          onClick={onPlayAndRemove}
        />
        <div className={styles.content}>
          <button type="button" className={styles.clickableTopSection} onClick={onPlayAndRemove}>
            <div className={styles.topSection}>
              <h3>{addByRSSTitle}</h3>
              {channelTitle && <div className={styles.channelTitle}>{channelTitle}</div>}
            </div>
          </button>
          <div className={styles.bottomSection}>
            <div className={styles.bottomSectionStart}>
              <div className={styles.timeSection}>
                {pubDate && <ReadableDate date={pubDate} />}
                {pubDate && duration ? ' • ' : null}
                {duration && (
                  <ReadableDuration durationStr={duration.toString()} positionStr={null} />
                )}
              </div>
            </div>
            <div className={styles.bottomSectionEnd}>
              <MoreButton moreButtonMenuItems={moreButtonMenuItems} />
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
          removeFromQueue={removeFromQueue}
          playlist_id_text={null}
          onPlayAndRemove={onPlayAndRemove}
        />
      );
    }
  }

  return null;
};
