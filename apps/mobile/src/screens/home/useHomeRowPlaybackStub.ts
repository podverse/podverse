import { useCallback, useState } from 'react';

import type { HomeMediaType } from '../../prefs/preferredMediaType';
import type { HomeFeedRowData } from './homeFeedData';

type PlaybackNoticeKey = 'features.queue.queue_next' | 'media_player.play';

const PLAYABLE_MEDIA_TYPES: HomeMediaType[] = ['episodes', 'clips', 'tracks'];

export const isPlayableHomeMediaType = (mediaType: HomeMediaType): boolean => {
  return PLAYABLE_MEDIA_TYPES.some((playableMediaType) => playableMediaType === mediaType);
};

export function useHomeRowPlaybackStub() {
  const [playbackNoticeKey, setPlaybackNoticeKey] = useState<PlaybackNoticeKey | null>(null);

  const runPlayAction = useCallback((_row: HomeFeedRowData, mediaType: HomeMediaType) => {
    if (!isPlayableHomeMediaType(mediaType)) {
      return;
    }

    setPlaybackNoticeKey('media_player.play');
  }, []);

  const runQueueAction = useCallback((_row: HomeFeedRowData, mediaType: HomeMediaType) => {
    if (!isPlayableHomeMediaType(mediaType)) {
      return;
    }

    setPlaybackNoticeKey('features.queue.queue_next');
  }, []);

  return {
    playbackNoticeKey,
    runPlayAction,
    runQueueAction,
  };
}
