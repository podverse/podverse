import { useCallback, useEffect, useRef } from 'react';

import type { DTOQueue, DTOQueueResource } from '@podverse/helpers/dto';
import { MediumEnum } from '@podverse/helpers/medium';
import { getQueueForMedium } from '@podverse/helpers/queue';
import { combineQueueNowPlayingAndUpcoming } from '@podverse/playback-core';

import { useAuth } from '../auth/AuthProvider';
import { useQueues } from '../contexts/QueuesProvider';
import type { MobileAuthRequestContext } from '../data';
import { queueRepository } from '../data';

export type QueueResourcesLoadActiveResult = {
  activeQueue: DTOQueue | null;
  /** now-playing + upcoming combined (now-playing first), mirroring web semantics. */
  upcomingResources: DTOQueueResource[];
  /** The resource callers may synchronously translate into a PlaybackLoadRequest. */
  activeResource: DTOQueueResource | null;
};

const emptyLoadActiveResult: QueueResourcesLoadActiveResult = {
  activeQueue: null,
  activeResource: null,
  upcomingResources: [],
};

/**
 * RN queue resource loader (audio-first, queue-only). Composes the queue store setters +
 * `queueRepository` — screens must never call `req*` directly. Auto-queue fallback uses the same
 * queue policy as the web implementation.
 *
 * The returned callback is stable (refs hold auth/session inputs) so orchestrator/player consumers
 * can depend on it without re-subscribing. Concurrent calls (e.g. rapid medium switches) only let
 * the most recent call write to the store; stale in-flight responses are ignored.
 */
export function useQueueResourcesLoadActive() {
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { setQueues, setActiveQueue, setActiveQueueUpcomingResources } = useQueues();

  const authRef = useRef({ accessToken, clearSession, refreshToken, setTokens, status });
  const requestIdRef = useRef(0);

  useEffect(() => {
    authRef.current = { accessToken, clearSession, refreshToken, setTokens, status };
  }, [accessToken, clearSession, refreshToken, setTokens, status]);

  /**
   * Load active queue resources.
   * @param medium_id - Optional channel medium ID. Podcast/Video map to the AV queue via
   *                    `getQueueForMedium`; falls back to `is_active_queue`, then a now-playing
   *                    scan, then the AV queue.
   */
  return useCallback(
    async (medium_id?: number): Promise<QueueResourcesLoadActiveResult> => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      const isCurrent = () => requestIdRef.current === requestId;

      const { accessToken, clearSession, refreshToken, setTokens, status } = authRef.current;
      if (status !== 'authenticated') {
        if (isCurrent()) {
          setQueues([]);
          setActiveQueue(null);
          setActiveQueueUpcomingResources([]);
        }
        return emptyLoadActiveResult;
      }

      const context: MobileAuthRequestContext = {
        accessToken,
        clearSession,
        refreshToken,
        setTokens,
      };

      const queues = await queueRepository.getQueues(context);
      if (isCurrent()) {
        setQueues(queues);
      }

      let activeQueue: DTOQueue | null = null;
      if (medium_id !== undefined) {
        activeQueue = getQueueForMedium(queues, medium_id);
      }

      if (activeQueue === null) {
        activeQueue = queues.find((queue) => queue.is_active_queue) ?? null;
      }

      // Edge case: `is_active_queue` unset — find the queue that actually has a now-playing item.
      let nowPlayingResource: DTOQueueResource | null = null;
      if (activeQueue === null) {
        for (const queue of queues) {
          const nowPlaying = await queueRepository.getNowPlaying(context, queue.id_text);
          if (nowPlaying !== null) {
            activeQueue = queue;
            nowPlayingResource = nowPlaying;
            break;
          }
        }
      }

      if (activeQueue === null) {
        activeQueue = queues.find((queue) => queue.medium_id === MediumEnum.AV) ?? null;
      }

      if (activeQueue === null) {
        if (isCurrent()) {
          setActiveQueue(null);
          setActiveQueueUpcomingResources([]);
        }
        return emptyLoadActiveResult;
      }

      if (nowPlayingResource === null) {
        nowPlayingResource = await queueRepository.getNowPlaying(context, activeQueue.id_text);
      }
      const upcoming = await queueRepository.getUpcoming(context, activeQueue.id_text);
      const combined = combineQueueNowPlayingAndUpcoming(nowPlayingResource, upcoming);

      if (isCurrent()) {
        setActiveQueue(activeQueue);
        setActiveQueueUpcomingResources(combined);
      }

      return {
        activeQueue,
        activeResource: combined[0] ?? null,
        upcomingResources: combined,
      };
    },
    [setActiveQueue, setActiveQueueUpcomingResources, setQueues]
  );
}
