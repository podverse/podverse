import { useCallback, useState } from 'react';

import type { QueueMutationKind, QueueMutationMediaType } from '../../hooks/useQueueMutations';
import { useQueueMutations } from '../../hooks/useQueueMutations';
import { playbackTargetRowMediaId } from '../../lib/playback/buildPlaybackTarget';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import { useAccessTier } from '../../membership/useAccessTier';
import { usePlayback } from '../../playback/PlaybackProvider';
import type { HomeMediaType } from '../../prefs/preferredMediaType';
import type { HomeFeedRowData } from './homeFeedData';

type RowActionNoticeKey =
  | 'features.queue.added_to_queue'
  | 'features.queue.add_error'
  | 'features.history.marked_as_played'
  | 'features.history.mark_as_played_error';

const PLAYABLE_MEDIA_TYPES: HomeMediaType[] = ['episodes', 'clips', 'tracks'];

export const isPlayableHomeMediaType = (mediaType: HomeMediaType): boolean => {
  return PLAYABLE_MEDIA_TYPES.some((playableMediaType) => playableMediaType === mediaType);
};

/**
 * Resolve a row into a queue-mutation / play target. Content rows (Home / detail lists) carry the
 * resource `id_text` directly; playlist rows are prefixed (`item-` / `clip-`). Collection rows that
 * are not an "add new item" target (`queue-` / `history-` now-playing/upcoming rows, and
 * `soundbite-` playlist rows) return `null` because they do not represent direct content targets.
 */
const resolveRowTarget = (
  row: HomeFeedRowData,
  mediaType: QueueMutationMediaType
): { idText: string; kind: QueueMutationKind } | null => {
  const id = row.id;
  if (id.startsWith('queue-') || id.startsWith('history-') || id.startsWith('soundbite-')) {
    return null;
  }
  if (id.startsWith('clip-')) {
    return { idText: id.slice('clip-'.length), kind: 'clip' };
  }
  if (id.startsWith('item-')) {
    return { idText: id.slice('item-'.length), kind: 'item' };
  }
  return { idText: id, kind: mediaType === 'clips' ? 'clip' : 'item' };
};

export type QueueActionPosition = 'next' | 'last';

/**
 * Home/detail row actions. `runPlayAction` starts real audio playback through the playback
 * orchestrator (episodes/tracks → item, clips → bounded clip); `runQueueAction` performs a real
 * add-to-queue via `useQueueMutations`, honoring the requested `position` (`next` inserts after
 * now-playing, `last` appends), and `runMarkAsPlayedAction` records the row as played. Rows whose id
 * is not a direct content target (`queue-` / `history-` / `soundbite-`) are skipped.
 *
 * Every action reports through one notice channel, so a row shows the outcome of the last thing
 * asked of it rather than competing messages.
 *
 * Queue and history live on the account, so both are checked against `queue_history_sync` before the
 * request rather than only reacting to a server 403 — signed out there is no request to get a 403
 * from, and a lapsed member needs the renewal prompt rather than a failure notice.
 */
export function useHomeRowPlayback() {
  const [actionNoticeKey, setActionNoticeKey] = useState<RowActionNoticeKey | null>(null);
  const { addToQueueLast, addToQueueNext, markAsPlayed } = useQueueMutations();
  const { handleGateError, openGate } = useMembershipGate();
  const { evaluateFeature, isTierKnown } = useAccessTier();
  const {
    activeTarget,
    isPlaying,
    noticeKey: playbackNoticeKeyFromEngine,
    pause,
    playClipById,
    playItemById,
    resume,
  } = usePlayback();

  /**
   * Open the gate when the account-backed queue and history are out of reach, and report whether the
   * caller should stop. While the tier is unknown the request runs and the server decides.
   */
  const didOpenQueueHistoryGate = useCallback((): boolean => {
    if (!isTierKnown) {
      return false;
    }
    const access = evaluateFeature('queue_history_sync');
    if (access.allowed) {
      return false;
    }
    openGate(access.reason);
    return true;
  }, [evaluateFeature, isTierKnown, openGate]);

  const runPlayAction = useCallback(
    (row: HomeFeedRowData, mediaType: HomeMediaType) => {
      if (!isPlayableHomeMediaType(mediaType)) {
        return;
      }
      if (mediaType !== 'episodes' && mediaType !== 'tracks' && mediaType !== 'clips') {
        return;
      }

      const target = resolveRowTarget(row, mediaType);
      if (target === null) {
        return;
      }

      void (async () => {
        const activeMediaId = activeTarget !== null ? playbackTargetRowMediaId(activeTarget) : null;
        if (activeMediaId !== null && activeMediaId === target.idText) {
          if (isPlaying) {
            pause();
          } else {
            await resume();
          }
          return;
        }

        if (target.kind === 'clip') {
          await playClipById(target.idText);
        } else {
          await playItemById(target.idText);
        }
      })();
    },
    [activeTarget, isPlaying, pause, playClipById, playItemById, resume]
  );

  const runQueueAction = useCallback(
    (row: HomeFeedRowData, mediaType: HomeMediaType, position: QueueActionPosition = 'last') => {
      if (mediaType !== 'episodes' && mediaType !== 'tracks' && mediaType !== 'clips') {
        return;
      }

      const target = resolveRowTarget(row, mediaType);
      if (target === null) {
        return;
      }

      if (didOpenQueueHistoryGate()) {
        return;
      }

      void (async () => {
        try {
          const added = await (position === 'next'
            ? addToQueueNext(target.idText, target.kind, mediaType)
            : addToQueueLast(target.idText, target.kind, mediaType));
          setActionNoticeKey(added ? 'features.queue.added_to_queue' : 'features.queue.add_error');
        } catch (error) {
          if (handleGateError(error)) {
            return;
          }
          setActionNoticeKey('features.queue.add_error');
        }
      })();
    },
    [addToQueueLast, addToQueueNext, didOpenQueueHistoryGate, handleGateError]
  );

  const runMarkAsPlayedAction = useCallback(
    (row: HomeFeedRowData, mediaType: HomeMediaType) => {
      if (mediaType !== 'episodes' && mediaType !== 'tracks' && mediaType !== 'clips') {
        return;
      }

      const target = resolveRowTarget(row, mediaType);
      if (target === null) {
        return;
      }

      if (didOpenQueueHistoryGate()) {
        return;
      }

      void (async () => {
        try {
          const marked = await markAsPlayed(target.idText, target.kind, mediaType);
          setActionNoticeKey(
            marked ? 'features.history.marked_as_played' : 'features.history.mark_as_played_error'
          );
        } catch (error) {
          if (handleGateError(error)) {
            return;
          }
          setActionNoticeKey('features.history.mark_as_played_error');
        }
      })();
    },
    [didOpenQueueHistoryGate, handleGateError, markAsPlayed]
  );

  return {
    playbackNoticeKey: actionNoticeKey ?? playbackNoticeKeyFromEngine,
    runMarkAsPlayedAction,
    runPlayAction,
    runQueueAction,
  };
}
