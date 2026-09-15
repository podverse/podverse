import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { GestureResponderEvent } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { breakpoints } from '@podverse/design-tokens';
import { clampRatio } from '@podverse/helpers/math';

import { PodverseVideoSurfaceView } from '../../../modules/podverse-media-engine';
import { stopPropagation } from '../../lib/gesture/stopPropagation';
import { usePlayback } from '../../playback/PlaybackProvider';
import { listRowArtworkGap } from '../../theme/screenLayout';
import { useResponsive } from '../../theme/useResponsive';
import { useTheme } from '../../theme/useTheme';
import { CoverImage } from '../primitives/CoverImage';
import { ProgressTrack } from '../primitives/ProgressTrack';
import { PlayerTransportButton } from './PlayerTransportButton';

type MiniPlayerProps = {
  onExpand: () => void;
};

const PROGRESS_EDGE_HEIGHT = 2;

/**
 * Mini player fixed above the tab bar. Binds to the playback orchestrator via
 * `usePlayback()`: shows the current now-playing audio artwork/title, toggles the native bridge
 * (play/pause / loading / retry), reflects position as the top edge of this bar, and expands to
 * the full player route. Hidden entirely when nothing is now-playing (no `activeTarget`). It
 * renders inside the phone tab bar column above `BottomTabBar`, so the tab bar below still owns
 * the safe-area bottom inset and tab labels stay uncovered.
 *
 * The mini and full player share one engine and one native `VideoSurfaceHost` — never mount a
 * second `Video`/engine on expand. See media-engine README § "Player UI single-surface ownership".
 */
export function MiniPlayer({ onExpand }: MiniPlayerProps) {
  const { t } = useTranslation();
  const { isTablet } = useResponsive();
  const { styles: themeStyles, tokens } = useTheme();
  const {
    activeTarget,
    durationSeconds,
    nowPlaying,
    pause,
    positionSeconds,
    resume,
    retryPlayback,
    transportState,
  } = usePlayback();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        artwork: {
          height: 40,
          width: 40,
        },
        container: {
          backgroundColor: tokens.background.secondary,
          overflow: 'hidden',
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.sm,
        },
        // Tablet: cap width at `lg` and center so controls are not edge-stretched.
        containerTablet: {
          alignSelf: 'center',
          maxWidth: breakpoints.lg,
          width: '100%',
        },
        progressEdge: {
          left: 0,
          position: 'absolute',
          right: 0,
          top: 0,
        },
        row: {
          alignItems: 'center',
          flexDirection: 'row',
          gap: listRowArtworkGap(tokens.spacing),
        },
        subtitle: {
          color: themeStyles.textSecondary.color,
          fontSize: 12,
        },
        textColumn: {
          flex: 1,
          minWidth: 0,
        },
        title: {
          color: themeStyles.textPrimary.color,
          fontSize: 14,
          fontWeight: '600',
        },
        videoSurface: {
          height: 40,
          width: 40,
        },
      }),
    [themeStyles, tokens]
  );

  if (activeTarget === null || nowPlaying === null) {
    return null;
  }

  const progressRatio = durationSeconds > 0 ? clampRatio(positionSeconds / durationSeconds) : 0;

  const handlePlay = (event: GestureResponderEvent) => {
    stopPropagation(event);
    void resume();
  };

  const handlePause = (event: GestureResponderEvent) => {
    stopPropagation(event);
    pause();
  };

  const handleRetry = (event: GestureResponderEvent) => {
    stopPropagation(event);
    void retryPlayback();
  };

  return (
    <Pressable
      accessibilityLabel={t('media_player.show_fullscreen_media_player')}
      accessibilityRole="button"
      onPress={onExpand}
      style={[styles.container, isTablet ? styles.containerTablet : undefined]}
      testID="mini-player"
    >
      <ProgressTrack
        fillTestID="mini-player-progress"
        flush
        height={PROGRESS_EDGE_HEIGHT}
        ratio={progressRatio}
        style={styles.progressEdge}
      />
      <View style={styles.row}>
        <View style={styles.videoSurface} testID="mini-player-video-surface">
          <CoverImage
            accessibilityLabel={t('media_player.media_player_image')}
            opensViewer={false}
            style={styles.artwork}
            uri={nowPlaying.imageUrl}
          />
          {/* Single shared native surface; hidden for audio-only so the artwork shows. */}
          <PodverseVideoSurfaceView style={StyleSheet.absoluteFill} targetId="mini" />
        </View>
        <View style={styles.textColumn}>
          <Text numberOfLines={1} style={styles.title} testID="mini-player-title">
            {nowPlaying.title}
          </Text>
          {nowPlaying.channelTitle !== null ? (
            <Text numberOfLines={1} style={styles.subtitle}>
              {nowPlaying.channelTitle}
            </Text>
          ) : null}
        </View>
        <PlayerTransportButton
          onPause={handlePause}
          onPlay={handlePlay}
          onRetry={handleRetry}
          state={transportState}
          testID="mini-player-play-pause"
        />
      </View>
    </Pressable>
  );
}
