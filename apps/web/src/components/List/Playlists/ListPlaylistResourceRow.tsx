'use client';

import type { DTOPlaylist, DTOPlaylistResource } from '@podverse/helpers';
import {
  getQueueForMedium,
  getQueueMediumIdForChannelMediumId,
  MediumEnum,
} from '@podverse/helpers';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import React from 'react';
import { FaGripLines } from 'react-icons/fa6';

import { Button } from '../../Button/Button';
import { ImagesPerView } from '../../Image/ImagesPerView';
import { ListClipRow } from '../Clips/ListClipRow';
import { ListItemSoundbiteRow } from '../ItemSoundbites/ListItemSoundbiteRow';
import ListEpisodeRow from '../Podcasts/Episodes/ListEpisodeRow';
import type { MoreButtonMenuItem } from '../../MoreButton/MoreButton';
import { MoreButton } from '../../MoreButton/MoreButton';
import { ListTrackRow } from '../Music/Albums/Tracks/ListTrackRow';
import { ReadableDate } from '../../Time/ReadableDate';
import { ReadableDuration } from '../../Time/ReadableDuration';
import { showToastPromise, showToastPromiseWithLoading } from '../../Toast/Toast';

import { IMAGES } from '../../../constants/images';
import { useAccount } from '../../../contexts/Account';
import { useModals } from '../../../contexts/Modals';
import { useQueues } from '../../../contexts/Queue';
import { apiRequestService } from '../../../factories/apiRequestService';
import { getAddByRSSItemPath } from '../../../utils/addByRSS/itemPath';
import { loadAddByRSSIndexItemFromResourceData } from '../../../utils/addByRSS/playFromQueueResource';
import { downloadAddByRSSMediaWithModal } from '../../../utils/downloadModal/downloadAddByRSSMediaWithModal';
import { downloadAndSaveFile } from '../../../utils/fileDownloader';

import styles from '../../../styles/components/Common/List/Podcasts/Episodes/ListEpisodeRow.module.scss';

interface Props {
  playlist: DTOPlaylist;
  playlistResource: DTOPlaylistResource;
  removeFromPlaylist?: () => void;
  isEditModePlaylist: boolean;
  onPlay?: () => void;
}

export const ListPlaylistResourceRow: React.FC<Props> = ({
  playlist,
  playlistResource,
  removeFromPlaylist,
  isEditModePlaylist,
  onPlay,
}) => {
  const tFeatures = useTranslations('features');
  const tMedia = useTranslations('media');
  const tMediaPlayer = useTranslations('media_player');
  const tInstructions = useTranslations('instructions');
  const { loggedInAccount } = useAccount();
  const { setModalPlaylistAddTo, setModalLoginRequired, setModalSourceSelector } = useModals();
  const { queues } = useQueues();
  const router = useRouter();
  const item = playlistResource.item;
  const clip = playlistResource.clip;
  const item_soundbite = playlistResource.item_soundbite;
  const add_by_rss_hash_id = playlistResource.add_by_rss_hash_id;
  const is_add_by_rss_redacted = playlistResource.is_add_by_rss_redacted === true;

  if (add_by_rss_hash_id) {
    const resourceData = playlistResource.add_by_rss_resource_data;
    const addByRSSTitle = is_add_by_rss_redacted
      ? tFeatures('add_by_rss.private_item_placeholder')
      : (resourceData?.title ?? 'Add-by-RSS');

    const imageUrl = !is_add_by_rss_redacted
      ? resourceData?.item_images?.[0]?.url ||
        resourceData?.channel_images?.[0]?.url ||
        (typeof resourceData?.channel_image_url === 'string'
          ? resourceData.channel_image_url
          : undefined)
      : undefined;
    const channelTitle = !is_add_by_rss_redacted
      ? typeof resourceData?.channel_title === 'string'
        ? resourceData.channel_title
        : undefined
      : undefined;
    const pubDate = !is_add_by_rss_redacted
      ? typeof resourceData?.pub_date === 'string'
        ? resourceData.pub_date
        : resourceData?.pub_date instanceof Date
          ? resourceData.pub_date.toISOString()
          : undefined
      : undefined;
    const duration = !is_add_by_rss_redacted
      ? typeof resourceData?.duration === 'number'
        ? resourceData.duration
        : typeof resourceData?.duration === 'string'
          ? Number.parseFloat(resourceData.duration)
          : undefined
      : undefined;
    const mediumId =
      typeof resourceData?.medium_id === 'number' ? resourceData.medium_id : undefined;
    const isMusic = mediumId === MediumEnum.Music;

    const queue =
      loggedInAccount && mediumId !== null && mediumId !== undefined
        ? getQueueForMedium(queues, mediumId)
        : null;

    const ensureLoggedIn = (action: () => void, messageKey: string) => () => {
      if (!loggedInAccount) {
        setModalLoginRequired({ title: null, message: tInstructions(messageKey) });
        return;
      }
      action();
    };

    const removeFromPlaylistOnClick = async () => {
      await apiRequestService.reqPlaylistResourceItemAddByRSSDelete(
        playlist.id_text,
        add_by_rss_hash_id
      );
      removeFromPlaylist?.();
    };

    const addToQueueNext = () => {
      if (!queue || !resourceData) return;
      showToastPromise(
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
      showToastPromise(
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
        addByRSSHashId: add_by_rss_hash_id ?? null,
      });
    };

    const markAsPlayed = () => {
      if (!queue || !resourceData) return;
      showToastPromise(
        apiRequestService.reqQueueResourceItemAddByRSSAddHistory(queue.id_text, {
          add_by_rss_resource_data: resourceData,
          completed: true,
        }),
        {
          success: tFeatures('history.marked_as_played'),
          error: tFeatures('history.mark_as_played_error'),
        }
      );
    };

    const downloadItem = async () => {
      if (!resourceData) return;
      const indexItem = await loadAddByRSSIndexItemFromResourceData(resourceData);
      if (!indexItem || typeof indexItem !== 'object' || !('bundle' in indexItem)) {
        return;
      }
      downloadAddByRSSMediaWithModal({
        indexItem,
        setModalSourceSelector,
        showToastPromiseWithLoading,
        downloadAndSaveFile,
        tFeatures,
        variant: isMusic ? 'track' : 'episode',
      });
    };

    const goToTrackPage = () => {
      const idText =
        typeof resourceData?.id_text === 'string' && resourceData.id_text.trim() !== ''
          ? resourceData.id_text.trim()
          : null;
      if (!idText) return;
      router.push(getAddByRSSItemPath(idText, 'tracks'));
    };

    const moreButtonMenuItems: MoreButtonMenuItem[] = isEditModePlaylist
      ? [
          {
            label: tFeatures('playlist.remove_from_playlist'),
            onClick: () => {
              void removeFromPlaylistOnClick();
            },
            variant: 'danger',
          },
        ]
      : [];
    if (!isEditModePlaylist && !is_add_by_rss_redacted) {
      moreButtonMenuItems.push(
        {
          label: tMediaPlayer('play'),
          onClick: onPlay ?? (() => {}),
        },
        ...(isMusic
          ? [
              {
                label: tMedia('music.track_go_to'),
                onClick: goToTrackPage,
              },
            ]
          : []),
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
        {
          label: isMusic
            ? tFeatures('download.download_track')
            : tFeatures('download.download_episode'),
          onClick: downloadItem,
        }
      );
    }

    if (isMusic) {
      return (
        <div className={styles.trackRow}>
          {isEditModePlaylist && (
            <div className={styles.editingButtons}>
              <FaGripLines />
            </div>
          )}
          <Button variant="unstyled" className={styles.trackClickable} onClick={onPlay}>
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

    return (
      <div className={styles.row}>
        {isEditModePlaylist && (
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
          onClick={onPlay}
        />
        <div className={styles.content}>
          <button type="button" className={styles.clickableTopSection} onClick={onPlay}>
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
                {duration !== undefined && !Number.isNaN(duration) && duration !== null ? (
                  <ReadableDuration durationStr={duration.toString()} positionStr={null} />
                ) : null}
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
