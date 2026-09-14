import { Text } from 'react-native';

import { isMobileE2eFromEnv } from '../config/env';
import { usePlayback } from './PlaybackProvider';

/**
 * E2E-only playback status markers in tab chrome. The mini player has no distinct playing/paused
 * testID, so auto-queue and load-state flows read these while staying on product screens. Skip-next
 * lives on the More E2E Playback screen with the other harness controls.
 */
export function PlaybackE2eStatus() {
  const { activeTarget, isPlaying, nowPlaying } = usePlayback();

  if (!isMobileE2eFromEnv() || activeTarget === null) {
    return null;
  }

  return (
    <>
      <Text accessibilityLabel="playback-active-e2e" testID="playback-active-e2e">
        {isPlaying ? 'playing' : 'paused'}
      </Text>
      <Text testID="playback-now-playing-title-e2e">{nowPlaying?.title ?? ''}</Text>
    </>
  );
}
