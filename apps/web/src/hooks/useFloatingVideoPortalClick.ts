'use client';

import type { MouseEvent } from 'react';
import { useCallback } from 'react';

import { useMediaPlayer } from '../contexts/MediaPlayer';
import { shouldFloatingVideoPortalClickTogglePlay } from '../utils/mediaPlayer/floatingVideoPortalClick';

export function useFloatingVideoPortalClick() {
  const { mpIsPlaying, setMPIsPlaying } = useMediaPlayer();

  const handlePortalClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (!shouldFloatingVideoPortalClickTogglePlay(event.target)) {
        return;
      }
      setMPIsPlaying(!mpIsPlaying);
    },
    [mpIsPlaying, setMPIsPlaying]
  );

  return { handlePortalClick };
}
