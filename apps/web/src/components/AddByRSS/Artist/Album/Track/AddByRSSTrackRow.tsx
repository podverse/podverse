'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { EnclosureSelectedParams } from '@podverse/helpers';
import { addByRSSBundleEnclosuresToDTO, getQueueForMedium } from '@podverse/helpers';
import { stripAndDecodeHtml } from '@podverse/helpers';
import { buildAddByRSSResourceData, getAddByRSSHashId } from '@podverse/parser-mapping';

import { useAccount } from '../../../../../contexts/Account';
import type { AddByRSSListContextState } from '../../../../../contexts/AddByRSSListContext';
import { useAddByRSSListContext } from '../../../../../contexts/AddByRSSListContext';
import { useMediaPlayer } from '../../../../../contexts/MediaPlayer';
import { useModals } from '../../../../../contexts/Modals';
import { useQueues } from '../../../../../contexts/Queue';
import { getApiRequestService } from '../../../../../factories/apiRequestService';
import { usePlayAddByRSS } from '../../../../../hooks/usePlayAddByRSS';
import { getAddByRSSItemPath } from '../../../../../utils/addByRSS/itemPath';
import type {
  AddByRSSItemIndexItem,
  AddByRSSMappedFeed,
} from '../../../../../utils/addByRSS/types';
import { downloadAddByRSSMediaWithModal } from '../../../../../utils/downloadModal/downloadAddByRSSMediaWithModal';
import { downloadAndSaveFile } from '../../../../../utils/fileDownloader';
import { CommonTrackRow } from '../../../../Common/Artist/Album/Track/CommonTrackRow';
import { ItemRowMoreActions } from '../../../../Media/ItemRowMoreActions';
import { showToastPromise, showToastPromiseWithLoading } from '../../../../Toast/Toast';

const alertPlaceholder = (label: string) => () => {
  window.alert(`Add by RSS: ${label}`);
};

type AddByRSSTrackRowProps = {
  itemIdText: string;
  channelTitle: string;
  channelImageUrl?: string;
  bundle: AddByRSSMappedFeed['items'][number];
  indexItem?: AddByRSSItemIndexItem | null;
  /** When set, play will set this list context for autoplay-next from list. */
  listContext?: AddByRSSListContextState | null;
};

export const AddByRSSTrackRow: React.FC<AddByRSSTrackRowProps> = ({
  itemIdText,
  channelTitle,
  channelImageUrl,
  bundle,
  indexItem,
  listContext: listContextProp,
}) => {
  const tMedia = useTranslations('media');
  const tMediaPlayer = useTranslations('media_player');
  const tFeatures = useTranslations('features');
  const tInstructions = useTranslations('instructions');
  const { loggedInAccount } = useAccount();
  const { setModalPlaylistAddTo, setModalLoginRequired, setModalSourceSelector } = useModals();
  const { setAddByRSSListContext } = useAddByRSSListContext();
  const { mpAddByRSS, mpIsPlaying, setMPIsPlaying } = useMediaPlayer();
  const { queues } = useQueues();
  const playAddByRSS = usePlayAddByRSS();
  const apiRequestService = getApiRequestService();
  const title = bundle.item.title ?? tMedia('music.track_image');
  const description = bundle.description?.value
    ? stripAndDecodeHtml(bundle.description.value)
    : channelTitle;
  const imageUrl = bundle.images?.[0]?.url ?? channelImageUrl;
  const url = getAddByRSSItemPath(itemIdText, 'tracks');

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

  const router = useRouter();

  const isActiveItem = !!indexItem && indexItem.idText === mpAddByRSS?.idText;

  const loadItem = (enclosureSelectedParams?: EnclosureSelectedParams) => {
    if (!indexItem) {
      return;
    }
    if (listContextProp) {
      setAddByRSSListContext(listContextProp);
    }
    playAddByRSS(indexItem, undefined, enclosureSelectedParams);
  };

  const playButtonOnClick = () => {
    if (!indexItem) {
      alertPlaceholder(tMediaPlayer('play'))();
      return;
    }
    if (isActiveItem) {
      setMPIsPlaying(!mpIsPlaying);
      return;
    }
    loadItem();
  };

  const goToTrackPage = () => {
    router.push(url);
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
      onClick: playButtonOnClick,
    },
    {
      label: tMedia('music.track_go_to'),
      onClick: goToTrackPage,
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

  return (
    <CommonTrackRow
      onClick={playButtonOnClick}
      title={title}
      subtitle={description}
      imageUrl={imageUrl}
      rightMetaNode={
        <ItemRowMoreActions
          enclosures={bundle.enclosures ? addByRSSBundleEnclosuresToDTO(bundle.enclosures) : []}
          itemTitle={title}
          ariaLabel={tMedia('more_options')}
          moreButtonMenuItems={moreButtonMenuItems}
          onLoadInPlayerWithSource={isActiveItem ? undefined : (params) => loadItem(params)}
        />
      }
    />
  );
};
