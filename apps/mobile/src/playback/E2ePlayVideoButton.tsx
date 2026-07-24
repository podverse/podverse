import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { isMobileE2eFromEnv } from '../config/env';
import { E2E_VIDEO_ITEM_ID_TEXT } from '../lib/e2e/e2eSeedConstants';
import { useTheme } from '../theme/useTheme';
import { usePlayback } from './PlaybackProvider';

/**
 * E2E-only affordance (master step 2.33 / detail 112): start playback of the seeded video-medium
 * item through the real orchestrator so it becomes an `item-video` active target — the mini player
 * renders and the native `VideoSurfaceHost` shows. There is no video browse/search UI yet, so the
 * video-transition Maestro flow needs this deterministic entry point. Renders only when
 * `EXPO_PUBLIC_MOBILE_E2E=1`; it is never present in production builds. Precedent:
 * `AddByRssRootScreen`'s E2E-gated controls.
 */
export function E2ePlayVideoButton() {
  const { styles: themeStyles, tokens } = useTheme();
  const { playItemById } = usePlayback();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          backgroundColor: themeStyles.buttonPrimary.backgroundColor,
          borderRadius: tokens.radii.md,
          marginBottom: tokens.spacing.md,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
        },
        label: {
          color: themeStyles.buttonPrimary.color,
          fontSize: 14,
          fontWeight: '600',
          textAlign: 'center',
        },
      }),
    [themeStyles, tokens]
  );

  if (!isMobileE2eFromEnv()) {
    return null;
  }

  return (
    <Pressable
      onPress={() => {
        void playItemById(E2E_VIDEO_ITEM_ID_TEXT);
      }}
      style={styles.button}
      testID="e2e-play-video-item"
    >
      <Text style={styles.label}>Play E2E video</Text>
    </Pressable>
  );
}
