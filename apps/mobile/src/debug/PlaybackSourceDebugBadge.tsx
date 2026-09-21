/**
 * Temporary diagnostic overlay for stream-to-download handoff. Shows whether the engine URL is a
 * remote stream or a downloaded file. Remove this once that switch is confirmed by hand.
 */

import { useMemo, useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HEADER_BAR_HEIGHT } from '../components/screen/HeaderBar';
import {
  getPlaybackSourceMarker,
  subscribePlaybackSourceMarker,
} from '../playback/playbackSourceMarker';
import { typography } from '../theme/typography';
import { useTheme } from '../theme/useTheme';

type PlaybackSourceDebugBadgeProps = {
  placement: 'full-player' | 'mini-player';
};

export function PlaybackSourceDebugBadge({ placement }: PlaybackSourceDebugBadgeProps) {
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const source = useSyncExternalStore(subscribePlaybackSourceMarker, getPlaybackSourceMarker);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        download: {
          backgroundColor: tokens.button.successBg,
        },
        downloadLabel: {
          color: tokens.button.successColor,
        },
        fullPlayer: {
          left: 0,
          pointerEvents: 'none',
          position: 'absolute',
          right: 0,
          top: insets.top + HEADER_BAR_HEIGHT + tokens.spacing.sm,
          zIndex: 20,
        },
        label: {
          ...typography.label,
          fontWeight: '700',
        },
        miniPlayer: {
          bottom: '100%',
          left: 0,
          marginBottom: tokens.spacing.xs,
          pointerEvents: 'none',
          position: 'absolute',
          right: 0,
          zIndex: 20,
        },
        pill: {
          alignSelf: 'center',
          borderRadius: tokens.radii.sm,
          paddingHorizontal: tokens.spacing.base,
          paddingVertical: tokens.spacing.xs,
        },
        stream: {
          backgroundColor: tokens.button.warningBg,
        },
        streamLabel: {
          color: tokens.button.warningColor,
        },
      }),
    [insets.top, tokens]
  );

  if (source === null) {
    return null;
  }

  const isDownload = source === 'local';

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={placement === 'full-player' ? styles.fullPlayer : styles.miniPlayer}
      testID="playback-source-debug"
    >
      <View style={[styles.pill, isDownload ? styles.download : styles.stream]}>
        <Text
          style={[styles.label, isDownload ? styles.downloadLabel : styles.streamLabel]}
          testID="playback-source-debug-label"
        >
          {isDownload ? 'Playing download' : 'Playing stream'}
        </Text>
      </View>
    </View>
  );
}
