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
import styles from '../../../styles/components/Common/List/Podcasts/Episodes/ListEpisodeRow.module.scss';

interface Props {
  queueResource: DTOQueueResource;
  removeFromQueue?: () => void;
  isEditModeQueue: boolean;
}

export const ListQueueResourceRow: React.FC<Props> = ({
  queueResource,
  removeFromQueue,
  isEditModeQueue,
}) => {
  const tFeatures = useTranslations('features');
  const { activeQueue } = useQueues();
  const item = queueResource.item;
  const clip = queueResource.clip;
  const item_soundbite = queueResource.item_soundbite;
  const add_by_rss_hash_id = queueResource.add_by_rss_hash_id;

  if (add_by_rss_hash_id) {
    const addByRSSTitle = queueResource.add_by_rss_resource_data?.title ?? 'Add-by-RSS';
    const removeFromQueueOnClick = async () => {
      if (!activeQueue?.id_text) return;
      await apiRequestService.reqQueueResourceItemAddByRSSDelete(
        activeQueue.id_text,
        add_by_rss_hash_id
      );
      removeFromQueue?.();
    };
    const moreButtonMenuItems = isEditModeQueue
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
    return (
      <div className={styles.row}>
        {isEditModeQueue && (
          <div className={styles.editingButtons}>
            <FaGripLines />
          </div>
        )}
        <div className={styles.content}>
          <div className={styles.topSection}>
            <h3>{addByRSSTitle}</h3>
          </div>
          <div className={styles.bottomSection}>
            <div className={styles.bottomSectionStart} />
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
        />
      );
    }
  }

  return null;
};
