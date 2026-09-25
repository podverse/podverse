import { useCallback, useEffect, useRef } from 'react';

import type { DTOQueue, DTOQueueResource } from '@podverse/helpers';
import { getQueueForMedium, MediumEnum } from '@podverse/helpers';

import { useAccount } from '../contexts/Account';
import { autoQueueIncrementActiveRow, useAutoQueue } from '../contexts/AutoQueue';
import { useQueues } from '../contexts/Queue';
import { getApiRequestService } from '../factories/apiRequestService';
import { combineQueueNowPlayingAndUpcoming } from '../lib/queue/combineQueueNowPlayingAndUpcoming';

export type QueueResourcesLoadActiveResult = {
  activeQueue: DTOQueue | null;
  /** Account queues from the same fetch used to resolve the active queue. */
  queues: DTOQueue[];
  historyMoved: number;
  upcomingResources: DTOQueueResource[];
  /** The resource callers may synchronously translate into a PlaybackLoadRequest. */
  activeResource: DTOQueueResource | null;
  upcomingManualCount: number;
  hasAutoQueueNext?: boolean;
};

/** Select one account queue by id. Skips medium mapping and the is_active fallback. */
export type LoadActiveQueueSelection = {
  queueIdText: string;
};

const emptyLoadActiveResult: QueueResourcesLoadActiveResult = {
  activeQueue: null,
  activeResource: null,
  historyMoved: 0,
  queues: [],
  upcomingManualCount: 0,
  upcomingResources: [],
};

/*
  NOTE: If you want useQueueResourcesLoadActive to load the next item
  from the queue or auto-queue, and to skip the current "now playing item",
  you must call moveNowPlayingToHistory before calling this hook's returned function.
  (example: TrackNextButton, TrackNextButtonMobile, and NonLiveMediaOrchestrator)
*/

export function useQueueResourcesLoadActive() {
  const { loggedInAccount } = useAccount();
  const { autoQueueActiveRow, setAutoQueueActiveRow, autoQueueResources, autoQueueConfig } =
    useAutoQueue();
  const { setQueues, setActiveQueue, setActiveQueueUpcomingResources } = useQueues();

  const loggedInAccountRef = useRef(loggedInAccount);
  const autoQueueActiveRowRef = useRef(autoQueueActiveRow);
  const autoQueueResourcesRef = useRef(autoQueueResources);
  const autoQueueConfigRef = useRef(autoQueueConfig);

  useEffect(() => {
    loggedInAccountRef.current = loggedInAccount;
  }, [loggedInAccount]);

  useEffect(() => {
    autoQueueActiveRowRef.current = autoQueueActiveRow;
  }, [autoQueueActiveRow]);

  useEffect(() => {
    autoQueueResourcesRef.current = autoQueueResources;
  }, [autoQueueResources]);

  useEffect(() => {
    autoQueueConfigRef.current = autoQueueConfig;
  }, [autoQueueConfig]);

  /**
   * Load active queue resources.
   * @param medium_id - Optional channel or queue medium ID. Podcast/Video map to the AV queue via
   *                    `getQueueForMedium`; falls back to `is_active_queue`, then a now-playing
   *                    scan, then the AV queue.
   * @param selection - When set, load that queue id and skip the medium and is_active fallbacks.
   *                    Podcast-medium queues are not visible through `getQueueForMedium`.
   */
  return useCallback(
    async (
      medium_id?: number,
      selection?: LoadActiveQueueSelection
    ): Promise<QueueResourcesLoadActiveResult> => {
      const apiRequestService = getApiRequestService();

      if (!loggedInAccountRef.current) {
        setQueues([]);
        return emptyLoadActiveResult;
      }

      const queueData = await apiRequestService.reqQueueGetAllForAccountPrivate();
      setQueues(queueData);

      let activeQueue: DTOQueue | null = null;

      if (selection !== undefined) {
        activeQueue = queueData.find((queue) => queue.id_text === selection.queueIdText) ?? null;
      } else if (medium_id !== undefined) {
        activeQueue = getQueueForMedium(queueData, medium_id);
      }

      // Fallback: is_active_queue. An explicit queue id must not fall through to another queue.
      if (selection === undefined && activeQueue === null) {
        activeQueue = queueData.find((queue) => queue.is_active_queue) ?? null;
      }

      // If still no active queue, check all queues for a now-playing item
      // This handles edge cases where is_active_queue wasn't set properly
      let nowPlayingResource: DTOQueueResource | null = null;
      if (selection === undefined && activeQueue === null) {
        for (const queue of queueData) {
          const nowPlaying = await apiRequestService.reqQueueResourcesGetNowPlayingByQueueIdText(
            queue.id_text
          );
          if (nowPlaying) {
            activeQueue = queue;
            nowPlayingResource = nowPlaying;
            break;
          }
        }
      }

      // Final fallback: AV queue
      if (selection === undefined && activeQueue === null) {
        activeQueue = queueData.find((queue) => queue.medium_id === MediumEnum.AV) ?? null;
      }

      if (activeQueue !== null) {
        setActiveQueue(activeQueue);

        // Use already-fetched nowPlayingResource if available, otherwise fetch it
        if (nowPlayingResource === null) {
          nowPlayingResource = await apiRequestService.reqQueueResourcesGetNowPlayingByQueueIdText(
            activeQueue.id_text
          );
        }

        const upcomingQueueResources =
          await apiRequestService.reqQueueResourcesGetAllUpcomingByQueueIdText(activeQueue.id_text);

        const combinedQueueResources = combineQueueNowPlayingAndUpcoming(
          nowPlayingResource,
          upcomingQueueResources
        );

        setActiveQueueUpcomingResources(combinedQueueResources);

        let hasAutoQueueNext = false;
        if (combinedQueueResources.length === 0 && selection === undefined) {
          const nextAutoQueueActiveRow = autoQueueIncrementActiveRow(autoQueueActiveRowRef.current);
          if (autoQueueResourcesRef.current[nextAutoQueueActiveRow]) {
            hasAutoQueueNext = true;
            setAutoQueueActiveRow(nextAutoQueueActiveRow);
          } else if (autoQueueConfigRef.current.repeat) {
            setAutoQueueActiveRow(0);
          }
        }

        return {
          activeQueue,
          activeResource: combinedQueueResources[0] ?? null,
          historyMoved: 0,
          queues: queueData,
          upcomingResources: combinedQueueResources,
          upcomingManualCount: combinedQueueResources.length,
          hasAutoQueueNext: combinedQueueResources.length === 0 ? hasAutoQueueNext : undefined,
        };
      }

      return {
        ...emptyLoadActiveResult,
        queues: queueData,
      };
    },
    []
  );
}
