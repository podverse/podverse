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

  const getDurationSecondsFromBundle = (bundle: unknown): number | null => {
    if (!bundle || typeof bundle !== 'object') {
      return null;
    }
    if (!('about' in bundle)) {
      return null;
    }
    const about = (bundle as { about?: unknown }).about;
    if (!about || typeof about !== 'object') {
      return null;
    }
    if (!('duration' in about)) {
      return null;
    }
    const duration = (about as { duration?: unknown }).duration;
    if (typeof duration === 'number') {
      return duration;
    }
    if (typeof duration === 'string') {
      const parsed = parseFloat(duration);
      return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
  };

  return (
    indexItem: AddByRSSItemIndexItem | AddByRSSLivestreamIndexItem,
    playbackPosition?: number
  ) => {
    const resourceData = buildAddByRSSResourceData(indexItem);
    const idText = indexItem.idText ?? '';

    const mediumId = indexItem.mediumId ?? null;
    const queue =
      loggedInAccount && mediumId !== null && mediumId !== undefined
        ? getQueueForMedium(queues, mediumId)
        : null;

    // Set state immediately so the media player effect runs while the user gesture is still
    // valid. Browsers require a recent user gesture to allow media.play(); awaiting the API
    // before setState delays the effect and causes play() to be blocked (NotAllowedError).
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
    setMPCurrentTime(0);
    setMPShouldPlay(true);

    // Restore position and sync to API after state is set so playback can start without delay.
    if (queue?.id_text) {
      (async () => {
        // Use provided position if available, otherwise fetch from API
        let resolvedPosition = typeof playbackPosition === 'number' ? playbackPosition : 0;

        if (typeof playbackPosition !== 'number') {
          // Only fetch if position wasn't provided
          try {
            const nowPlaying = await apiRequestService.reqQueueResourcesGetNowPlayingByQueueIdText(
              queue.id_text
            );
            const hash = getAddByRSSHashId(indexItem);
            if (
              nowPlaying?.add_by_rss_hash_id !== null &&
              nowPlaying?.add_by_rss_hash_id !== undefined &&
              nowPlaying.add_by_rss_hash_id === hash &&
              nowPlaying.playback_position !== null
            ) {
              const p = parseFloat(String(nowPlaying.playback_position));
              if (!Number.isNaN(p) && p >= 0) {
                resolvedPosition = p;
              }
            }
          } catch {
            // Best-effort restore; keep 0
          }
        }

        const durationSeconds = getDurationSecondsFromBundle(resourceData.bundle);
        if (
          typeof durationSeconds === 'number' &&
          durationSeconds > 0 &&
          resolvedPosition >= durationSeconds - 5
        ) {
          resolvedPosition = 0;
        }

        setMPCurrentTime(resolvedPosition);

        apiRequestService
          .reqQueueResourceItemAddByRSSAddNowPlaying(queue.id_text, {
            add_by_rss_resource_data: resourceData,
            playback_position: String(resolvedPosition),
          })
          .catch(() => {
            // Fire-and-forget; queue sync is best-effort
          });
      })();
    }
  };
}
