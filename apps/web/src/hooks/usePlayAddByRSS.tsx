'use client';

import {
  buildLabeledItemEnclosuresFromAddByRSSBundle,
  getDefaultEnclosureSelectedParams,
  getQueueForMedium,
} from '@podverse/helpers';
import type { AddByRSSItemIndexItem, AddByRSSLivestreamIndexItem } from '@podverse/parser-mapping';
import { buildAddByRSSResourceData, getAddByRSSHashId } from '@podverse/parser-mapping';

import { useAccount } from '../contexts/Account';
import { useAutoQueue } from '../contexts/AutoQueue';
import { useMediaPlayer } from '../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../contexts/MediaPlayerCurrentTime';
import { useQueues } from '../contexts/Queue';
import { getApiRequestService } from '../factories/apiRequestService';

export function usePlayAddByRSS() {
  const {
    applyPlaybackLoad,
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
    const apiRequestService = getApiRequestService();
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

    const bundleEnclosures =
      'bundle' in indexItem && indexItem.bundle?.enclosures?.length
        ? indexItem.bundle.enclosures
        : undefined;
    if (bundleEnclosures && bundleEnclosures.length > 0) {
      const labeled = buildLabeledItemEnclosuresFromAddByRSSBundle(bundleEnclosures);
      setMPItemLabeledItemEnclosures(labeled);
      setMPEnclosureSelectedParams(getDefaultEnclosureSelectedParams(labeled));
    } else {
      setMPItemLabeledItemEnclosures([]);
      setMPEnclosureSelectedParams({
        type: 'default',
        enclosureRowSelected: null,
        sourceRowSelected: null,
      });
    }

    const duration = typeof resourceData.duration === 'number' ? resourceData.duration : 0;
    setMPDuration(duration);

    const hasProvidedPosition =
      typeof playbackPosition === 'number' &&
      !Number.isNaN(playbackPosition) &&
      playbackPosition >= 0;

    const syncPlaybackPolicy = (positionSeconds: number, durationSeconds: number) => {
      const decision = applyPlaybackLoad({
        target: { kind: 'add-by-rss', resourceData },
        explicitPlaybackSeconds: positionSeconds,
        mediaFileDurationHintSeconds: durationSeconds > 0 ? durationSeconds : undefined,
      });
      setMPCurrentTime(decision.initialSeekSeconds);
    };

    if (hasProvidedPosition) {
      syncPlaybackPolicy(playbackPosition, duration);
    } else {
      syncPlaybackPolicy(0, duration);
    }
    setMPShouldPlay(true);

    // Resolve position when not provided (fetch from API) and sync to queue API.
    if (queue?.id_text) {
      (async () => {
        let resolvedPosition = typeof playbackPosition === 'number' ? playbackPosition : 0;

        if (typeof playbackPosition !== 'number') {
          const hash = getAddByRSSHashId(indexItem);
          try {
            const nowPlaying = await apiRequestService.reqQueueResourcesGetNowPlayingByQueueIdText(
              queue.id_text
            );
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
            } else {
              // Now-playing is a different item (e.g. skip next); look in upcoming then history.
              const upcoming = await apiRequestService.reqQueueResourcesGetAllUpcomingByQueueIdText(
                queue.id_text
              );
              const fromUpcoming = upcoming?.find(
                (r) => r.add_by_rss_hash_id !== null && r.add_by_rss_hash_id === hash
              );
              if (
                fromUpcoming?.playback_position !== null &&
                fromUpcoming?.playback_position !== undefined
              ) {
                const p = parseFloat(String(fromUpcoming.playback_position));
                if (!Number.isNaN(p) && p >= 0) {
                  resolvedPosition = p;
                }
              } else {
                const history =
                  await apiRequestService.reqQueueResourcesGetHistoryByQueueIdTextPaginated(
                    queue.id_text,
                    1
                  );
                const fromHistory = history?.data?.find(
                  (r) => r.add_by_rss_hash_id !== null && r.add_by_rss_hash_id === hash
                );
                if (
                  fromHistory?.playback_position !== null &&
                  fromHistory?.playback_position !== undefined
                ) {
                  const p = parseFloat(String(fromHistory.playback_position));
                  if (!Number.isNaN(p) && p >= 0) {
                    resolvedPosition = p;
                  }
                }
              }
            }
          } catch {
            // Best-effort restore; keep 0
          }
        }

        const durationSeconds = getDurationSecondsFromBundle(resourceData.bundle) ?? 0;

        // Only update seek state when we resolved position in this async (was not provided).
        if (typeof playbackPosition !== 'number') {
          syncPlaybackPolicy(resolvedPosition, durationSeconds);
        }

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
