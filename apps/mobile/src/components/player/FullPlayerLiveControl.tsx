import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useLivePlaybackDisplay } from '../../playback/livePlaybackStore';
import { usePlaybackSession } from '../../playback/PlaybackProvider';
import { useTheme } from '../../theme/useTheme';

/**
 * The Live control in a livestream's progress band. It is red at the live edge.
 * Pressing it goes to the live moment and plays.
 */
export function FullPlayerLiveControl() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const { isAtLiveEdge } = useLivePlaybackDisplay();
  const { goToLive } = usePlaybackSession();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        label: {
          fontSize: 14,
          fontWeight: '700',
          lineHeight: 18,
          textTransform: 'uppercase',
        },
        labelAtEdge: {
          color: tokens.text.danger,
        },
        labelBehind: {
          color: tokens.text.tertiary,
        },
        pressed: {
          opacity: 0.6,
        },
      }),
    [tokens]
  );

  return (
    <Pressable
      accessibilityLabel={t('media_player.go_to_live')}
      accessibilityRole="button"
      hitSlop={tokens.spacing.md}
      onPress={() => {
        void goToLive();
      }}
      style={({ pressed }) => (pressed ? styles.pressed : null)}
      testID="full-player-live-control"
    >
      <Text style={[styles.label, isAtLiveEdge ? styles.labelAtEdge : styles.labelBehind]}>
        {t('media.livestream.live')}
      </Text>
    </Pressable>
  );
}
