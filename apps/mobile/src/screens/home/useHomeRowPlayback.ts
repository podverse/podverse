import { useCallback, useState } from 'react';

import type { QueueMutationKind, QueueMutationMediaType } from '../../hooks/useQueueMutations';
import { useQueueMutations } from '../../hooks/useQueueMutations';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import { usePlayback } from '../../playback/PlaybackProvider';
import type { HomeMediaType } from '../../prefs/preferredMediaType';
import type { HomeFeedRowData } from './homeFeedData';

type QueueNoticeKey = 'features.queue.added_to_queue' | 'features.queue.add_error';

const PLAYABLE_MEDIA_TYPES: HomeMediaType[] = ['episodes', 'clips', 'tracks'];

export const isPlayableHomeMediaType = (mediaType: HomeMediaType): boolean => {
  return PLAYABLE_MEDIA_TYPES.some((playableMediaType) => playableMediaType === mediaType);
};

/**
 * Resolve a row into a queue-mutation / play target. Content rows (Home / detail lists) carry the
 * resource `id_text` directly; playlist rows are prefixed (`item-` / `clip-`). Collection rows that
 * are not an "add new item" target (`queue-` / `history-` now-playing/upcoming rows, and
 * `soundbite-` playlist rows) return `null` — their remove/reorder + queue-resource play land with
 * Track 9c media-row actions / Track 11 player UI.
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
 * now-playing, `last` appends) — Track 9c.3 exposes both as distinct, correctly-keyed actions.
 * Rows whose id is not a direct content target (`queue-` / `history-` / `soundbite-`) are skipped
 * until Track 11 wires queue-resource play.
 */
export function useHomeRowPlayback() {
  const [queueNoticeKey, setQueueNoticeKey] = useState<QueueNoticeKey | null>(null);
  const { addToQueueLast, addToQueueNext } = useQueueMutations();
  const { handleGateError } = useMembershipGate();
  const { noticeKey: playbackNoticeKeyFromEngine, playClipById, playItemById } = usePlayback();

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
        if (target.kind === 'clip') {
          await playClipById(target.idText);
        } else {
          await playItemById(target.idText);
        }
      })();
    },
    [playClipById, playItemById]
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

      void (async () => {
        try {
          const added = await (position === 'next'
            ? addToQueueNext(target.idText, target.kind, mediaType)
            : addToQueueLast(target.idText, target.kind, mediaType));
          setQueueNoticeKey(added ? 'features.queue.added_to_queue' : 'features.queue.add_error');
        } catch (error) {
          if (handleGateError(error)) {
            return;
          }
          setQueueNoticeKey('features.queue.add_error');
        }
      })();
    },
    [addToQueueLast, addToQueueNext, handleGateError]
  );

  return {
    playbackNoticeKey: queueNoticeKey ?? playbackNoticeKeyFromEngine,
    runPlayAction,
    runQueueAction,
  };
}
