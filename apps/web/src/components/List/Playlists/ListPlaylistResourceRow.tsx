'use client';

import type { DTOPlaylist, DTOPlaylistResource } from '@podverse/helpers';
import { getQueueMediumIdForChannelMediumId, MediumEnum } from '@podverse/helpers';
import React from 'react';
import { useTranslations } from 'next-intl';
import ListEpisodeRow from '../Podcasts/Episodes/ListEpisodeRow';
import { ListClipRow } from '../Clips/ListClipRow';
import { ListItemSoundbiteRow } from '../ItemSoundbites/ListItemSoundbiteRow';
import { ListTrackRow } from '../Music/Albums/Tracks/ListTrackRow';
import { MoreButton } from '../../MoreButton/MoreButton';
import { FaGripLines } from 'react-icons/fa6';

import styles from '../../../styles/components/Common/List/Podcasts/Episodes/ListEpisodeRow.module.scss';

interface Props {
  playlist: DTOPlaylist;
  playlistResource: DTOPlaylistResource;
  removeFromPlaylist?: () => void;
  isEditModePlaylist: boolean;
}

export const ListPlaylistResourceRow: React.FC<Props> = ({
  playlist,
  playlistResource,
  removeFromPlaylist,
  isEditModePlaylist,
}) => {
  const tFeatures = useTranslations('features');
  const item = playlistResource.item;
  const clip = playlistResource.clip;
  const item_soundbite = playlistResource.item_soundbite;
  const add_by_rss_hash_id = playlistResource.add_by_rss_hash_id;
  const is_add_by_rss_redacted = playlistResource.is_add_by_rss_redacted === true;

  if (add_by_rss_hash_id) {
    const addByRSSTitle = is_add_by_rss_redacted
      ? tFeatures('add_by_rss.private_item_placeholder')
      : (playlistResource.add_by_rss_resource_data?.title ?? 'Add-by-RSS');
    const moreButtonMenuItems =
      isEditModePlaylist && !is_add_by_rss_redacted && removeFromPlaylist
        ? [
            {
              label: tFeatures('playlist.remove_from_playlist'),
              onClick: () => removeFromPlaylist(),
              variant: 'danger' as const,
            },
          ]
        : [];
    return (
      <div className={styles.row}>
        {isEditModePlaylist && (
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
      const queue_medium_id = getQueueMediumIdForChannelMediumId(channel.medium_id);
      if (queue_medium_id === MediumEnum.AV) {
        return (
          <ListEpisodeRow
            channel={channel}
            item={item}
            showChannelInfo
            isEditModePlaylist={isEditModePlaylist}
            removeFromPlaylist={removeFromPlaylist}
            playlist_id_text={playlist.id_text}
          />
        );
      } else if (queue_medium_id === MediumEnum.Music) {
        return (
          <ListTrackRow
            channel={channel}
            item={item}
            showChannelInfo
            isEditModePlaylist={isEditModePlaylist}
            removeFromPlaylist={removeFromPlaylist}
            playlist_id_text={playlist.id_text}
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
            isEditModePlaylist={isEditModePlaylist}
            removeFromPlaylist={removeFromPlaylist}
            playlist_id_text={playlist.id_text}
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
          isEditModePlaylist={isEditModePlaylist}
          removeFromPlaylist={removeFromPlaylist}
          playlist_id_text={playlist.id_text}
        />
      );
    }
  }

  return null;
};
