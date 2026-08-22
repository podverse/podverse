'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { EnclosureSelectedParams } from '@podverse/helpers';
import { addByRSSBundleEnclosuresToDTO, getQueueForMedium } from '@podverse/helpers';
import { buildAddByRSSResourceData, getAddByRSSHashId } from '@podverse/parser-mapping';

import { IMAGES } from '../../../../../constants/images';
import { useAccount } from '../../../../../contexts/Account';
import { useMediaPlayer } from '../../../../../contexts/MediaPlayer';
import { useModals } from '../../../../../contexts/Modals';
import { useQueues } from '../../../../../contexts/Queue';
import { getApiRequestService } from '../../../../../factories/apiRequestService';
import { usePlayAddByRSS } from '../../../../../hooks/usePlayAddByRSS';
import { useQueueAddWithGate } from '../../../../../hooks/useQueueAddWithGate';
import { getAddByRSSItemPath } from '../../../../../utils/addByRSS/itemPath';
import type { AddByRSSItemIndexItem } from '../../../../../utils/addByRSS/types';
import { downloadAddByRSSMediaWithModal } from '../../../../../utils/downloadModal/downloadAddByRSSMediaWithModal';
import { downloadAndSaveFile } from '../../../../../utils/fileDownloader';
import { itemHeaderSquareArtworkCandidates } from '../../../../../utils/image/itemHeaderArtworkCandidates';
import { CommonItemHeader } from '../../../../Common/Item/CommonItemHeader';
import { showToastPromise, showToastPromiseWithLoading } from '../../../../Toast/Toast';
import { AddByRSSItemHeaderPlaySection } from '../../../Item/AddByRSSItemHeaderPlaySection';

import styles from '../../../../../styles/components/Common/Media/Podcast/Episode/EpisodeHeader.module.scss';

const alertPlaceholder = (label: string) => () => {
  window.alert(`Add by RSS: ${label}`);
};

type AddByRSSTrackDetailHeaderProps = {
  itemIdText: string;
  title: string;
  indexItem?: AddByRSSItemIndexItem | null;
};

export const AddByRSSTrackDetailHeader: React.FC<AddByRSSTrackDetailHeaderProps> = ({
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
  const { runQueueAdd } = useQueueAddWithGate();

  const imageCandidates =
    indexItem?.bundle?.images !== undefined && indexItem.bundle.images.length > 0
      ? itemHeaderSquareArtworkCandidates(
          indexItem.bundle.images,
          IMAGES.HEADER.DESKTOP.SQUARE.SIZE_FIND_TARGET,
          'greater'
        )
      : [];

  const titleNode = (
    <Link className={styles.episodeTitleLink} href={getAddByRSSItemPath(itemIdText, 'tracks')}>
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
    void runQueueAdd(
      () =>
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
    void runQueueAdd(
      () =>
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

  const isActiveItem =
    indexItem !== null && indexItem !== undefined && mpAddByRSS?.idText === indexItem.idText;

  const loadItem = (enclosureSelectedParams?: EnclosureSelectedParams) => {
    if (indexItem) {
      playAddByRSS(indexItem, undefined, enclosureSelectedParams);
    }
  };

  const onPlay = () => {
    if (isActiveItem) {
      setMPIsPlaying(!mpIsPlaying);
    } else if (indexItem) {
      loadItem();
    } else {
      alertPlaceholder(tMediaPlayer('play'))();
    }
  };

  const downloadTrack = () => {
    if (indexItem) {
      downloadAddByRSSMediaWithModal({
        indexItem,
        setModalSourceSelector,
        showToastPromiseWithLoading,
        downloadAndSaveFile,
        tFeatures,
        variant: 'track',
      });
    } else {
      alertPlaceholder(tFeatures('download.download_track'))();
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
      label: tFeatures('download.download_track'),
      onClick: downloadTrack,
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
          enclosures={
            indexItem?.bundle?.enclosures
              ? addByRSSBundleEnclosuresToDTO(indexItem.bundle.enclosures)
              : []
          }
          itemTitle={title}
          onLoadInPlayerWithSource={isActiveItem ? undefined : (params) => loadItem(params)}
        />
      }
      imageCandidates={imageCandidates}
      imageAlt={title || tMedia('music.track_image')}
    />
  );
};
