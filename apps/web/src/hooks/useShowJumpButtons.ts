'use client';

import { useMediaPlayer } from '../contexts/MediaPlayer';
import { isPlayerResourceLive } from '../lib/crossDevicePlayback/playbackResource';
import { useLiveMediaSnapshot } from './useLiveMediaSnapshot';
import { useRemotePlayerDisplay } from './useRemotePlayerDisplay';

/** Skip buttons show for non-live media, a remote that can skip, or a rewindable live window. */
export function useShowJumpButtons(): boolean {
  const remote = useRemotePlayerDisplay();
  const { mpItem, mpAddByRSS } = useMediaPlayer();
  const live = useLiveMediaSnapshot();
  if (remote !== null) {
    return remote.controls.canSkip;
  }
  if (!isPlayerResourceLive({ mpItem, mpAddByRSS })) {
    return true;
  }
  return live.display.canRewind;
}
