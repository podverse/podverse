import { useCallback, useRef, useEffect } from 'react';
import type { DTOQueueResource } from '@podverse/helpers';
import { getQueueMediumIdForChannelMediumId, MediumEnum } from '@podverse/helpers';
import { useAccount } from '../contexts/Account';
import { useQueues } from '../contexts/Queue';
import { apiRequestService } from '../factories/apiRequestService';
import { autoQueueIncrementActiveRow, useAutoQueue } from '../contexts/AutoQueue';

/*
  NOTE: If you want useQueueResourcesLoadActive to load the next item
  from the queue or auto-queue, and to skip the current "now playing item",
  you must call moveNowPlayingToHistory before calling this hook's returned function.
  (example: TrackNextButton, TrackNextButtonMobile, and MediaPlayerControllerAV)
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
   * @param medium_id - Optional medium ID to determine which queue to check.
   *                    When provided, uses getQueueMediumIdForChannelMediumId to map to the correct queue.
   *                    Falls back to AV queue if not provided or no match found.
   */
  return useCallback(async (medium_id?: number) => {
    const loggedInAccount = loggedInAccountRef.current;
    const autoQueueConfig = autoQueueConfigRef.current;
    const autoQueueActiveRow = autoQueueActiveRowRef.current;
    const autoQueueResources = autoQueueResourcesRef.current;

    if (!loggedInAccount) {
      setQueues([]);
      return 0;
    }

    const queueData = await apiRequestService.reqQueueGetAllForAccountPrivate();
    setQueues(queueData);

    let activeQueue;

    // If medium_id is provided, use it to find the correct queue first
    if (medium_id !== undefined) {
      const queueMediumId = getQueueMediumIdForChannelMediumId(medium_id);
      if (queueMediumId !== null) {
        activeQueue = queueData.find((queue) => queue.medium_id === queueMediumId);
      }
    }

    // Fallback: is_active_queue
    if (!activeQueue) {
      activeQueue = queueData.find((queue) => queue.is_active_queue);
    }

    // If still no active queue, check all queues for a now-playing item
    // This handles edge cases where is_active_queue wasn't set properly
    let nowPlayingResource = null;
    if (!activeQueue) {
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
    if (!activeQueue) {
      activeQueue = queueData.find((queue) => queue.medium_id === MediumEnum.AV);
    }

    if (activeQueue) {
      setActiveQueue(activeQueue);

      const combinedQueueResources: DTOQueueResource[] = [];

      // Use already-fetched nowPlayingResource if available, otherwise fetch it
      if (!nowPlayingResource) {
        nowPlayingResource = await apiRequestService.reqQueueResourcesGetNowPlayingByQueueIdText(
          activeQueue.id_text
        );
      }

      const upcomingQueueResources =
        await apiRequestService.reqQueueResourcesGetAllUpcomingByQueueIdText(activeQueue.id_text);

      if (nowPlayingResource) {
        combinedQueueResources.push(nowPlayingResource, ...upcomingQueueResources);
      } else if (upcomingQueueResources.length > 0) {
        combinedQueueResources.push(...upcomingQueueResources);
      }

      setActiveQueueUpcomingResources(combinedQueueResources);

      if (combinedQueueResources.length === 0) {
        const nextAutoQueueActiveRow = autoQueueIncrementActiveRow(autoQueueActiveRow);
        if (autoQueueResources[nextAutoQueueActiveRow]) {
          setAutoQueueActiveRow(nextAutoQueueActiveRow);
        } else if (autoQueueConfig.repeat) {
          setAutoQueueActiveRow(0);
        }
      }

      return combinedQueueResources.length;
    }

    return 0;
  }, []);
}
