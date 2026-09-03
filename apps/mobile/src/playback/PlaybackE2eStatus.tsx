import { Pressable, Text } from 'react-native';

import { isMobileE2eFromEnv } from '../config/env';
import { usePlayback } from './PlaybackProvider';

/**
 * E2E-only playback status surface. The mini player reflects now-playing state and a play/pause
 * toggle, but it deliberately has no "skip to next" affordance and its playing/paused
 * state is not exposed as a distinct testID. Auto-queue-advance and load-state E2E still need a
 * truthful, title-agnostic signal plus a way to invoke `advance()` without waiting for a natural
 * `ended` event (fixtures exceed the Maestro timeout ladder). This component exposes live
 * `usePlayback()` state (target active, title, playing/paused, and a skip control) for those flows.
 * It renders only when `EXPO_PUBLIC_MOBILE_E2E=1` (`isMobileE2eFromEnv`) and an orchestrator target
 * is active, so it never affects production UI. Fold the skip trigger into the full player once
 * the full player's up-next control owns that interaction.
 */
export function PlaybackE2eStatus() {
  const { activeTarget, isPlaying, nowPlaying, skipToNext } = usePlayback();

  if (!isMobileE2eFromEnv() || activeTarget === null) {
    return null;
  }

  return (
    <>
      <Text accessibilityLabel="playback-active-e2e" testID="playback-active-e2e">
        {isPlaying ? 'playing' : 'paused'}
      </Text>
      <Text testID="playback-now-playing-title-e2e">{nowPlaying?.title ?? ''}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void skipToNext();
        }}
        testID="playback-skip-next-e2e"
      >
        <Text>skip-next</Text>
      </Pressable>
    </>
  );
}
