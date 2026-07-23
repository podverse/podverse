import { useCallback } from 'react';

import { usePlayback } from '../../playback/PlaybackProvider';

type ClipPlaybackBounds = {
  clipId: string;
  endTime: string | null;
  itemId: string | null;
  startTime: string;
};

/**
 * Clip detail bounded play. Delegates to the playback orchestrator's `playClipById`, which resolves
 * the clip's `PlaybackTarget` and applies the playback-core bounded decision (`pauseAt` at clip
 * end). The passed start/end bounds are informational; the authoritative bounds come from the clip
 * DTO resolved server-side.
 */
export function useClipPlayback() {
  const { noticeKey, playClipById } = usePlayback();

  const runBoundedClipPlay = useCallback(
    (bounds: ClipPlaybackBounds) => {
      void playClipById(bounds.clipId);
    },
    [playClipById]
  );

  return {
    playbackNoticeKey: noticeKey,
    runBoundedClipPlay,
  };
}
