import { useCallback, useMemo } from 'react';

import { MediumEnum } from '@podverse/helpers/medium';
import { getQueueForMedium } from '@podverse/helpers/queue';

import { useAuth } from '../auth/AuthProvider';
import { useQueues } from '../contexts/QueuesProvider';
import type { MobileAuthRequestContext, MoveNowPlayingToHistoryTarget } from '../data';
import { queueRepository } from '../data';
import { createInFlightGuard } from '../lib/rateLimit/createInFlightGuard';
import { useQueueResourcesLoadActive } from './useQueueResourcesLoadActive';

export type QueueMutationMediaType = 'episodes' | 'tracks' | 'clips';
export type QueueMutationKind = 'item' | 'clip';

const mediumIdForMutation = (
  kind: QueueMutationKind,
  mediaType: QueueMutationMediaType
): number => {
  // Clips always live in the AV queue; tracks map to the Music queue, everything else to AV.
  if (kind === 'clip') {
    return MediumEnum.Podcast;
  }
  return mediaType === 'tracks' ? MediumEnum.Music : MediumEnum.Podcast;
};

/**
 * Queue mutation hook (add next/last, mark played state, move now-playing to history). Resolves the
 * target queue by medium via `getQueueForMedium` from the store, delegates the write to
 * `queueRepository` (which force-refreshes SQLite + projects the native cache), then refreshes the
 * store through the load-active hook. Screens call this — never `req*` directly. Anonymous callers
 * are no-ops because server-backed queues require authentication.
 *
 * Add and mark-as-played are keyed in-flight so a double-tap cannot fire parallel writes.
 */
export function useQueueMutations() {
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { activeQueue, queues } = useQueues();
  const loadActive = useQueueResourcesLoadActive();
  const guard = useMemo(() => createInFlightGuard(), []);

  const buildContext = useCallback(
    (): MobileAuthRequestContext => ({ accessToken, clearSession, refreshToken, setTokens }),
    [accessToken, clearSession, refreshToken, setTokens]
  );

  const addToQueue = useCallback(
    async (
      position: 'next' | 'last',
      idText: string,
      kind: QueueMutationKind,
      mediaType: QueueMutationMediaType
    ): Promise<boolean> => {
      if (status !== 'authenticated') {
        return false;
      }

      const result = await guard.run(`add:${position}:${idText}`, async () => {
        const mediumId = mediumIdForMutation(kind, mediaType);
        const queue = getQueueForMedium(queues, mediumId);
        if (queue === null) {
          return false;
        }

        const context = buildContext();
        if (kind === 'clip') {
          await (position === 'next'
            ? queueRepository.addClipNext(context, queue.id_text, idText)
            : queueRepository.addClipLast(context, queue.id_text, idText));
        } else {
          await (position === 'next'
            ? queueRepository.addItemNext(context, queue.id_text, idText)
            : queueRepository.addItemLast(context, queue.id_text, idText));
        }

        await loadActive(mediumId);
        return true;
      });
      return result === false ? false : result;
    },
    [buildContext, guard, loadActive, queues, status]
  );

  const addToQueueNext = useCallback(
    (idText: string, kind: QueueMutationKind, mediaType: QueueMutationMediaType) =>
      addToQueue('next', idText, kind, mediaType),
    [addToQueue]
  );

  const addToQueueLast = useCallback(
    (idText: string, kind: QueueMutationKind, mediaType: QueueMutationMediaType) =>
      addToQueue('last', idText, kind, mediaType),
    [addToQueue]
  );

  const markAsPlayed = useCallback(
    async (
      idText: string,
      kind: QueueMutationKind,
      mediaType: QueueMutationMediaType,
      completed = true
    ): Promise<boolean> => {
      if (status !== 'authenticated') {
        return false;
      }

      const result = await guard.run(`mark:${idText}`, async () => {
        const mediumId = mediumIdForMutation(kind, mediaType);
        const queue = getQueueForMedium(queues, mediumId);
        if (queue === null) {
          return false;
        }

        await queueRepository.markAsPlayed(buildContext(), queue.id_text, {
          completed,
          idText,
          kind,
        });
        await loadActive(mediumId);
        return true;
      });
      return result === false ? false : result;
    },
    [buildContext, guard, loadActive, queues, status]
  );

  const moveNowPlayingToHistory = useCallback(
    async (target: MoveNowPlayingToHistoryTarget): Promise<boolean> => {
      if (status !== 'authenticated' || activeQueue === null) {
        return false;
      }

      await queueRepository.moveNowPlayingToHistory(buildContext(), activeQueue.id_text, target);
      await loadActive(activeQueue.medium_id);
      return true;
    },
    [activeQueue, buildContext, loadActive, status]
  );

  return {
    addToQueueLast,
    addToQueueNext,
    markAsPlayed,
    moveNowPlayingToHistory,
  };
}
