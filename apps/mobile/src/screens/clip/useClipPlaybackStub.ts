import { useCallback, useState } from 'react';

type ClipPlaybackBounds = {
  clipId: string;
  endTime: string | null;
  itemId: string | null;
  startTime: string;
};

export function useClipPlaybackStub() {
  const [playbackNoticeKey, setPlaybackNoticeKey] = useState<string | null>(null);
  const [playbackBounds, setPlaybackBounds] = useState<ClipPlaybackBounds | null>(null);

  const runBoundedClipPlay = useCallback((bounds: ClipPlaybackBounds) => {
    // Track 9.7 contract: pass clip start/end bounds into playback hook.
    setPlaybackBounds(bounds);
    setPlaybackNoticeKey('media_player.play');
  }, []);

  return {
    playbackBounds,
    playbackNoticeKey,
    runBoundedClipPlay,
  };
}
