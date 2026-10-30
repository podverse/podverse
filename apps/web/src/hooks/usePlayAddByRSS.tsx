'use client';

import type { EnclosureSelectedParams } from '@podverse/helpers';
import {
  buildLabeledItemEnclosuresFromAddByRSSBundle,
  getQueueForMedium,
  MediumEnum,
  resolvePreferredMediaTypeEnclosureSelectedParams,
} from '@podverse/helpers';
import type { AddByRSSItemIndexItem, AddByRSSLivestreamIndexItem } from '@podverse/parser-mapping';
import { buildAddByRSSResourceData, getAddByRSSHashIds } from '@podverse/parser-mapping';

import { useAccount } from '../contexts/Account';
import { useAutoQueue } from '../contexts/AutoQueue';
import { useLocalSettings } from '../contexts/LocalSettings';
import { useMediaPlayer } from '../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../contexts/MediaPlayerCurrentTime';
import { useQueues } from '../contexts/Queue';
import { getApiRequestService } from '../factories/apiRequestService';
import { crossDevicePlaybackStore } from '../lib/crossDevicePlayback/crossDevicePlaybackStore';
import { isPlayerResourceLive } from '../lib/crossDevicePlayback/playbackResource';
import { resolveRemotePickCommand } from '../lib/crossDevicePlayback/remotePlaybackRouting';
import { sendPlaybackCommand } from '../lib/crossDevicePlayback/sendPlaybackCommand';
import { addByRSSPlaybackIdentity, writePlaybackHandoffLocalState } from './playbackHandoffState';
import { useQueueResourcesLoadActive } from './useQueueResourcesLoadActive';

export type PlayAddByRSSOptions = {
  /** False for empty-player queue hydration, which must not stamp `last_played_at`. */
  recordNowPlaying?: boolean;
  /** False loads paused. Omitted keeps the gesture path, which starts playback. */
  shouldPlay?: boolean;
};

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
    playbackLoadGenerationRef,
  } = useMediaPlayer();
  const { setMPCurrentTime } = useMediaPlayerCurrentTime();
  const { setAutoQueueResources, setAutoQueueActiveRow } = useAutoQueue();
  const { queues } = useQueues();
  const queueResourcesLoadActive = useQueueResourcesLoadActive();
  const { loggedInAccount } = useAccount();
  const { preferredMediaType } = useLocalSettings();

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
    playbackPosition?: number,
    enclosureSelectedParamsOverride?: EnclosureSelectedParams,
    options?: PlayAddByRSSOptions
  ) => {
    const resourceData = buildAddByRSSResourceData(indexItem);
    if (crossDevicePlaybackStore.getSnapshot().role === 'remote') {
      const hashId = addByRSSPlaybackIdentity(resourceData);
      if (hashId !== null) {
        const loadsPaused = options?.shouldPlay === false || options?.recordNowPlaying === false;
        const command = resolveRemotePickCommand({
          pickedRef: { kind: 'add_by_rss', add_by_rss_hash_id: hashId },
          addByRSSResourceData: resourceData,
          startSeconds: playbackPosition ?? null,
          loadsPaused,
          remoteState: crossDevicePlaybackStore.getSnapshot().displayState,
        });
        if (command !== null) {
          void sendPlaybackCommand(command);
        }
      }
      return;
    }

    const apiRequestService = getApiRequestService();
    const idText = indexItem.idText ?? '';
    const isLive = isPlayerResourceLive({ mpItem: null, mpAddByRSS: { idText, resourceData } });
    const startPosition = isLive ? 0 : playbackPosition;

    // Feeds without a medium tag are podcasts.
    const mediumId = indexItem.mediumId ?? MediumEnum.Podcast;
    const queue = loggedInAccount ? getQueueForMedium(queues, mediumId) : null;
    const recordNowPlaying = options?.recordNowPlaying !== false;
    const lastPlayedAtIso = new Date().toISOString();

    // Set state immediately so the media player effect runs while the user gesture is still
    // valid. Browsers require a recent user gesture to allow media.play(); awaiting the API
    // before setState delays the effect and causes play() to be blocked (NotAllowedError).
    setAutoQueueResources({});
    setAutoQueueActiveRow(0);

    setMPAddByRSS({ idText, resourceData });
    writePlaybackHandoffLocalState({
      itemIdText: addByRSSPlaybackIdentity(resourceData),
      itemTitle: resourceData.title ?? null,
      lastPlayedAt: recordNowPlaying ? lastPlayedAtIso : null,
    });
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
      setMPEnclosureSelectedParams(
        enclosureSelectedParamsOverride ??
          resolvePreferredMediaTypeEnclosureSelectedParams(labeled, preferredMediaType)
      );
    } else {
      setMPItemLabeledItemEnclosures([]);
      setMPEnclosureSelectedParams({
        type: 'default',
        enclosureRowSelected: null,
        sourceRowSelected: null,
      });
    }

    const resourceDuration = typeof resourceData.duration === 'number' ? resourceData.duration : 0;
    const duration = isLive ? 0 : resourceDuration;
    setMPDuration(duration);

    const hasProvidedPosition =
      typeof startPosition === 'number' && !Number.isNaN(startPosition) && startPosition >= 0;

    const syncPlaybackPolicy = (positionSeconds: number, durationSeconds: number) => {
      const decision = applyPlaybackLoad({
        target: { kind: 'add-by-rss', resourceData },
        explicitPlaybackSeconds: positionSeconds,
        mediaFileDurationHintSeconds: durationSeconds > 0 ? durationSeconds : undefined,
      });
      setMPCurrentTime(decision.initialSeekSeconds);
    };

    if (hasProvidedPosition && typeof startPosition === 'number') {
      syncPlaybackPolicy(startPosition, duration);
    } else {
      syncPlaybackPolicy(0, duration);
    }
    setMPShouldPlay(options?.shouldPlay !== false);

    // Resolve position when not provided (fetch from API) and sync to queue API.
    if (queue?.id_text) {
      const queueIdText = queue.id_text;
      // Any later playback load means the user moved on; this item stops writing to the queue.
      let ownLoadGeneration = playbackLoadGenerationRef.current;
      const isSuperseded = () => playbackLoadGenerationRef.current !== ownLoadGeneration;
      (async () => {
        let resolvedPosition = typeof startPosition === 'number' ? startPosition : 0;

        if (typeof startPosition !== 'number') {
          const hashIds = getAddByRSSHashIds(indexItem);
          const isThisItem = (hashId: string | null | undefined): boolean =>
            typeof hashId === 'string' && hashIds.includes(hashId);
          try {
            const nowPlaying = await apiRequestService.reqQueueResourcesGetNowPlayingByQueueIdText(
              queue.id_text
            );
            if (
              isThisItem(nowPlaying?.add_by_rss_hash_id) &&
              nowPlaying?.playback_position !== null &&
              nowPlaying?.playback_position !== undefined
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
              const fromUpcoming = upcoming?.find((r) => isThisItem(r.add_by_rss_hash_id));
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
                const fromHistory = history?.data?.find((r) => isThisItem(r.add_by_rss_hash_id));
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

        if (isSuperseded()) {
          return;
        }

        const durationSeconds = getDurationSecondsFromBundle(resourceData.bundle) ?? 0;

        // Only update seek state when we resolved position in this async (was not provided).
        if (typeof startPosition !== 'number') {
          syncPlaybackPolicy(resolvedPosition, durationSeconds);
          ownLoadGeneration = playbackLoadGenerationRef.current;
        }

        if (!recordNowPlaying) {
          return;
        }

        try {
          await apiRequestService.reqQueueResourceItemAddByRSSAddNowPlaying(queueIdText, {
            add_by_rss_resource_data: resourceData,
            playback_position: String(resolvedPosition),
            last_played_at: lastPlayedAtIso,
            playback_event_kind: 'play',
          });
        } catch (error) {
          console.error('Failed to record Add by RSS now playing', error);
          return;
        }

        // The refreshed queue head is this item, so the queue head effect keeps it in place.
        if (isSuperseded()) {
          return;
        }
        try {
          await queueResourcesLoadActive(undefined, { queueIdText });
        } catch (error) {
          console.error('Failed to refresh the queue after Add by RSS now playing', error);
        }
      })();
    }
  };
}
