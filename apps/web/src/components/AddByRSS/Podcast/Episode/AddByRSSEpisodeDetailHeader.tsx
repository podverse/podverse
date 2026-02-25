'use client';

import { getQueueForMedium } from '@podverse/helpers';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import React from 'react';

import { CommonItemHeader } from '../../../Common/Item/CommonItemHeader';
import { AddByRSSItemHeaderPlaySection } from '../../Item/AddByRSSItemHeaderPlaySection';
import styles from '../../../../styles/components/Common/Media/Podcast/Episode/EpisodeHeader.module.scss';
import { getAddByRSSItemPath } from '../../../../utils/addByRSS/itemPath';
import {
  buildAddByRSSResourceData,
  getAddByRSSHashId,
} from '../../../../utils/addByRSS/queuePlaylistHelpers';
import type { AddByRSSItemIndexItem } from '../../../../utils/addByRSS/types';
import { useAccount } from '../../../../contexts/Account';
import { useMediaPlayer } from '../../../../contexts/MediaPlayer';
import { useModals } from '../../../../contexts/Modals';
import { useQueues } from '../../../../contexts/Queue';
import { getApiRequestService } from '../../../../factories/apiRequestService';
import { usePlayAddByRSS } from '../../../../hooks/usePlayAddByRSS';
import { showToastPromise, showToastPromiseWithLoading } from '../../../Toast/Toast';
import { downloadAndSaveFile } from '../../../../utils/fileDownloader';
import { downloadAddByRSSMediaWithModal } from '../../../../utils/downloadModal/downloadAddByRSSMediaWithModal';

const alertPlaceholder = (label: string) => () => {
  window.alert(`Add by RSS: ${label}`);
};

type AddByRSSEpisodeDetailHeaderProps = {
  itemIdText: string;
  title: string;
  indexItem?: AddByRSSItemIndexItem | null;
};

export const AddByRSSEpisodeDetailHeader: React.FC<AddByRSSEpisodeDetailHeaderProps> = ({
  itemIdText,
  title,
  indexItem,
}) => {
  const tMediaPlayer = useTranslations('media_player');
  const tFeatures = useTranslations('features');
  const tInstructions = useTranslations('instructions');
  const { loggedInAccount } = useAccount();
  const { setModalPlaylistAddTo, setModalLoginRequired, setModalSourceSelector } = useModals();
  const { queues } = useQueues();
  const { mpAddByRSS, mpIsPlaying, setMPIsPlaying } = useMediaPlayer();
  const playAddByRSS = usePlayAddByRSS();
  const apiRequestService = getApiRequestService();

  const itemImageUrl = indexItem?.bundle?.images?.[0]?.url ?? null;

  const titleNode = (
    <Link href={getAddByRSSItemPath(itemIdText)}>
      <h2 className={styles.episodeTitle}>{title || 'Untitled'}</h2>
    </Link>
  );

  const queue =
    indexItem?.mediumId !== null && indexItem?.mediumId !== undefined
      ? getQueueForMedium(queues, indexItem.mediumId)
      : null;

  const ensureLoggedIn = (action: () => void, messageKey: string) => () => {
    if (!loggedInAccount) {
      setModalLoginRequired({ title: null, message: tInstructions(messageKey) });
      return;
    }
    action();
  };

  const addToQueueNext = () => {
    if (!queue || !indexItem) return;
    const add_by_rss_resource_data = buildAddByRSSResourceData(indexItem);
    showToastPromise(
      apiRequestService.reqQueueResourceItemAddByRSSAddNext(queue.id_text, {
        add_by_rss_resource_data,
      }),
      {
        success: tFeatures('queue.added_to_queue'),
        error: tFeatures('queue.add_error'),
      }
    );
  };

  const addToQueueLast = () => {
    if (!queue || !indexItem) return;
    const add_by_rss_resource_data = buildAddByRSSResourceData(indexItem);
    showToastPromise(
      apiRequestService.reqQueueResourceItemAddByRSSAddLast(queue.id_text, {
        add_by_rss_resource_data,
      }),
      {
        success: tFeatures('queue.added_to_queue'),
        error: tFeatures('queue.add_error'),
      }
    );
  };

  const addToPlaylist = () => {
    if (!indexItem) return;
    setModalPlaylistAddTo({
      channel: null,
      item: null,
      clip: null,
      item_soundbite: null,
      addByRSSResourceData: buildAddByRSSResourceData(indexItem),
      addByRSSHashId: getAddByRSSHashId(indexItem),
    });
  };

  const markAsPlayed = () => {
    if (!queue || !indexItem) return;
    const add_by_rss_resource_data = buildAddByRSSResourceData(indexItem);
    showToastPromise(
      apiRequestService.reqQueueResourceItemAddByRSSAddHistory(queue.id_text, {
        add_by_rss_resource_data,
        completed: true,
      }),
      {
        success: tFeatures('history.marked_as_played'),
        error: tFeatures('history.mark_as_played_error'),
      }
    );
  };

  const onPlay = () => {
    if (indexItem !== null && indexItem !== undefined && mpAddByRSS?.idText === indexItem.idText) {
      setMPIsPlaying(!mpIsPlaying);
    } else if (indexItem) {
      playAddByRSS(indexItem);
    } else {
      alertPlaceholder(tMediaPlayer('play'))();
    }
  };

  const downloadEpisode = () => {
    if (indexItem) {
      downloadAddByRSSMediaWithModal({
        indexItem,
        setModalSourceSelector,
        showToastPromiseWithLoading,
        downloadAndSaveFile,
        tFeatures,
        variant: 'episode',
      });
    } else {
      alertPlaceholder(tFeatures('download.download_episode'))();
    }
  };

  const moreButtonMenuItems = [
    {
      label: tMediaPlayer('play'),
      onClick: onPlay,
    },
    {
      label: tFeatures('queue.queue_next'),
      onClick: indexItem
        ? ensureLoggedIn(addToQueueNext, 'login_to_add_to_queue')
        : alertPlaceholder(tFeatures('queue.queue_next')),
    },
    {
      label: tFeatures('queue.queue_last'),
      onClick: indexItem
        ? ensureLoggedIn(addToQueueLast, 'login_to_add_to_queue')
        : alertPlaceholder(tFeatures('queue.queue_last')),
    },
    {
      label: tFeatures('playlist.add_to_playlist'),
      onClick: indexItem
        ? ensureLoggedIn(addToPlaylist, 'login_to_add_to_playlist')
        : alertPlaceholder(tFeatures('playlist.add_to_playlist')),
    },
    {
      label: tFeatures('history.mark_as_played'),
      onClick: indexItem
        ? ensureLoggedIn(markAsPlayed, 'login_to_mark_as_played')
        : alertPlaceholder(tFeatures('history.mark_as_played')),
    },
    {
      label: tFeatures('download.download_episode'),
      onClick: downloadEpisode,
    },
  ];

  const tMedia = useTranslations('media');

  return (
    <CommonItemHeader
      titleNode={titleNode}
      playSectionNode={
        <AddByRSSItemHeaderPlaySection
          onPlay={onPlay}
          addByRSSIdText={indexItem?.idText ?? undefined}
          moreButtonMenuItems={moreButtonMenuItems}
        />
      }
      imageUrl={itemImageUrl}
      imageAlt={title || tMedia('podcast.episode_image')}
    />
  );
};
