'use client';

import { getQueueForMedium } from '@podverse/helpers';
import { useAccount } from '../contexts/Account';
import { useAutoQueue } from '../contexts/AutoQueue';
import { useMediaPlayer } from '../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../contexts/MediaPlayerCurrentTime';
import { useQueues } from '../contexts/Queue';
import { apiRequestService } from '../factories/apiRequestService';
import {
  buildAddByRSSResourceData,
  getAddByRSSHashId,
} from '../utils/addByRSS/queuePlaylistHelpers';
import type { AddByRSSItemIndexItem, AddByRSSLivestreamIndexItem } from '../utils/addByRSS/types';

export function usePlayAddByRSS() {
  const {
    setMPAddByRSS,
    setMPChannel,
    setMPClip,
    setMPItem,
    setMPItemChapter,
    setMPItemChapters,
    setMPItemChapterShouldSeek,
    setMPItemSoundbite,
    setMPItemLabeledItemEnclosures,
    setMPEnclosureSelectedParams,
    setMPShouldPlay,
    setMPDuration,
  } = useMediaPlayer();
  const { setMPCurrentTime } = useMediaPlayerCurrentTime();
  const { setAutoQueueResources, setAutoQueueActiveRow } = useAutoQueue();
  const { queues } = useQueues();
  const { loggedInAccount } = useAccount();

  return async (indexItem: AddByRSSItemIndexItem | AddByRSSLivestreamIndexItem) => {
    const resourceData = buildAddByRSSResourceData(indexItem);
    const idText = indexItem.idText ?? '';

    let restorePosition = 0;
    const mediumId = indexItem.mediumId ?? null;
    const queue =
      loggedInAccount && mediumId !== null && mediumId !== undefined
        ? getQueueForMedium(queues, mediumId)
        : null;

    if (queue?.id_text) {
      try {
        const nowPlaying = await apiRequestService.reqQueueResourcesGetNowPlayingByQueueIdText(
          queue.id_text
        );
        const hash = getAddByRSSHashId(indexItem);
        if (
          nowPlaying?.add_by_rss_hash_id !== null &&
          nowPlaying?.add_by_rss_hash_id !== undefined &&
          nowPlaying.add_by_rss_hash_id === hash &&
          nowPlaying.playback_position !== null &&
          nowPlaying.playback_position !== undefined
        ) {
          const p = parseFloat(nowPlaying.playback_position);
          if (!Number.isNaN(p) && p >= 0) {
            restorePosition = p;
          }
        }
      } catch {
        // Best-effort restore; use 0
      }
    }

    setAutoQueueResources({});
    setAutoQueueActiveRow(0);

    setMPAddByRSS({ idText, resourceData });
    setMPChannel(null);
    setMPClip(null);
    setMPItem(null);
    setMPItemChapter(null);
    setMPItemChapters(null);
    setMPItemChapterShouldSeek(false);
    setMPItemSoundbite(null);
    setMPItemLabeledItemEnclosures([]);
    setMPEnclosureSelectedParams({
      type: 'default',
      enclosureRowSelected: null,
      sourceRowSelected: null,
    });

    const duration = typeof resourceData.duration === 'number' ? resourceData.duration : 0;
    setMPDuration(duration);
    setMPCurrentTime(restorePosition);
    setMPShouldPlay(true);

    if (queue?.id_text) {
      apiRequestService
        .reqQueueResourceItemAddByRSSAddNowPlaying(queue.id_text, {
          add_by_rss_resource_data: resourceData,
          playback_position: String(restorePosition),
        })
        .catch(() => {
          // Fire-and-forget; queue sync is best-effort
        });
    }
  };
}
