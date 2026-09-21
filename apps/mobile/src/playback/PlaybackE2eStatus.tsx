import { useSyncExternalStore } from 'react';
import { Text } from 'react-native';

import { isMobileE2eFromEnv } from '../config/env';
import { usePlaybackSession } from './PlaybackProvider';
import {
  getPlaybackSourceMarker,
  subscribePlaybackSourceMarker,
} from './playbackSourceMarker';

/**
 * E2E-only playback status markers in tab chrome. The mini player has no distinct playing/paused
 * testID, so auto-queue and load-state flows read these while staying on product screens. Skip-next
 * and complete live on the More E2E Playback screen with the other harness controls.
 * `playback-source-e2e` is `remote` while streaming and `local` after a completed download of that
 * file is what the engine is playing.
 */
export function PlaybackE2eStatus() {
  const { activeTarget, isPlaying, nowPlaying } = usePlaybackSession();
  const source = useSyncExternalStore(subscribePlaybackSourceMarker, getPlaybackSourceMarker);

  if (!isMobileE2eFromEnv() || activeTarget === null) {
    return null;
  }

  return (
    <>
      <Text testID="playback-active-e2e">{isPlaying ? 'playing' : 'paused'}</Text>
      <Text testID="playback-now-playing-title-e2e">{nowPlaying?.title ?? ''}</Text>
      {source !== null ? <Text testID="playback-source-e2e">{source}</Text> : null}
    </>
  );
}
