'use client';

import type { MouseEvent } from 'react';
import { useCallback } from 'react';

import { useMediaPlayer } from '../contexts/MediaPlayer';
import { shouldFloatingVideoPortalClickTogglePlay } from '../utils/mediaPlayer/floatingVideoPortalClick';

type UseFloatingVideoPortalClickOptions = {
  consumeClickAfterDrag?: () => boolean;
};

export function useFloatingVideoPortalClick(options?: UseFloatingVideoPortalClickOptions) {
  const { mpIsPlaying, setMPIsPlaying } = useMediaPlayer();
  const consumeClickAfterDrag = options?.consumeClickAfterDrag;

  const handlePortalClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (consumeClickAfterDrag?.()) {
        return;
      }
      if (!shouldFloatingVideoPortalClickTogglePlay(event.target)) {
        return;
      }
      setMPIsPlaying(!mpIsPlaying);
    },
    [consumeClickAfterDrag, mpIsPlaying, setMPIsPlaying]
  );

  return { handlePortalClick };
}
