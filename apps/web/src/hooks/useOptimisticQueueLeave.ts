'use client';

import { useEffect, useRef } from 'react';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import type { DTOQueueResource } from '@podverse/helpers/dto';
import {
  parsePlaybackSeconds,
  playbackTargetFromStandardLoad,
  playbackTargetLivestream,
} from '@podverse/playback-core';

import { useAutoQueue } from '../contexts/AutoQueue';
import { useQueues } from '../contexts/Queue';
import { getApiRequestService } from '../factories/apiRequestService';
import {
  bindOptimisticQueueLeave,
  type OptimisticQueueLeaveBindings,
} from '../lib/queue/optimisticQueueLeave';
import { checkIsLiveItem } from '../utils/mediaPlayer/mediaPlayerItemEnclosureType';
import { useMediaPlayerResourceUpdate } from './useMediaPlayerResourceUpdate';

const channelFromItem = (item: DTOItem): DTOChannel | null => item.channel ?? null;

const canStartFromRow = (resource: DTOQueueResource): boolean => {
  if (channelFromItem(resource.item) === null) {
    return false;
  }
  if (resource.clip !== undefined || resource.item_soundbite !== undefined) {
    return true;
  }
  return resource.item.item_enclosures.length > 0;
};

/**
 * Keeps the shared skip session pointed at the queue on screen and starts the
 * row the session settled on. A row that already has its channel plays immediately.
 */
export function useOptimisticQueueLeave(): void {
  const { activeQueue, activeQueueUpcomingResources, setActiveQueueUpcomingResources } =
    useQueues();
  const { autoQueueConfig } = useAutoQueue();
  const mediaPlayerResourceUpdate = useMediaPlayerResourceUpdate();
  const resourcesRef = useRef(activeQueueUpcomingResources);
  resourcesRef.current = activeQueueUpcomingResources;
  const queueIdRef = useRef(activeQueue?.id_text ?? null);
  queueIdRef.current = activeQueue?.id_text ?? null;
  const setResourcesRef = useRef(setActiveQueueUpcomingResources);
  setResourcesRef.current = setActiveQueueUpcomingResources;
  const updateRef = useRef(mediaPlayerResourceUpdate);
  updateRef.current = mediaPlayerResourceUpdate;
  const autoQueueRef = useRef(autoQueueConfig);
  autoQueueRef.current = autoQueueConfig;

  useEffect(() => {
    const loadResource: OptimisticQueueLeaveBindings['loadResource'] = async (
      resource,
      shouldPlay
    ) => {
      let item = resource.item;
      let channel = channelFromItem(item);
      if (!canStartFromRow(resource)) {
        const api = getApiRequestService();
        const freshItem = await api.reqItemGetByIdOrIdText(item.id_text);
        if (freshItem) {
          item = freshItem;
        }
        channel = channelFromItem(item);
        if (channel === null) {
          channel = await api.reqChannelGetByIdOrIdText(item.channel_id);
        }
      }
      if (channel === null) {
        return;
      }
      const live =
        checkIsLiveItem(item) &&
        resource.clip === undefined &&
        resource.item_soundbite === undefined;
      const config = autoQueueRef.current;
      updateRef.current({
        target: live
          ? playbackTargetLivestream(channel, item)
          : playbackTargetFromStandardLoad({
              channel,
              clip: resource.clip ?? null,
              item,
              itemChapter: null,
              itemSoundbite: resource.item_soundbite ?? null,
              musicIntent: 'fresh_transition',
            }),
        explicitPlaybackSeconds: live
          ? undefined
          : parsePlaybackSeconds(resource.playback_position),
        itemChapterShouldSeek: false,
        enclosureSelectedParams: 'use-active-item-or-default',
        skipMoveNowPlayingToHistory: true,
        skipNowPlayingWrite: true,
        shouldPlay,
        isPlaying: shouldPlay,
        newAutoQueueConfig: {
          playlist_id_text: config.playlist_id_text,
          disabled: false,
          random: config.random,
          repeat: config.repeat,
          nextPage: config.nextPage || 1,
          shuffleHash: config.shuffleHash,
        },
        autoQueueShouldClear: true,
      });
    };

    bindOptimisticQueueLeave({
      getQueueId: () => queueIdRef.current,
      getResources: () => resourcesRef.current,
      setResources: (resources) => {
        setResourcesRef.current(resources);
      },
      loadResource,
    });
  }, []);
}
