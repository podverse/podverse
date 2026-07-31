import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { GestureResponderEvent } from 'react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { clampRatio } from '@podverse/helpers/math';

import { PodverseVideoSurfaceView } from '../../../modules/podverse-media-engine';
import { stopPropagation } from '../../lib/gesture/stopPropagation';
import { usePlayback } from '../../playback/PlaybackProvider';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../primitives/Button';

type MiniPlayerProps = {
  onExpand: () => void;
};

/**
 * Mini player fixed above the tab bar (Track 11.1–11.2). Binds to the Track 10 orchestrator via
 * `usePlayback()`: shows the current now-playing audio artwork/title, toggles the native bridge
 * (play/pause), reflects position as a thin progress bar, and expands to the full player route.
 * Hidden entirely when nothing is now-playing (no `activeTarget`). It renders inside the phone tab
 * bar column above `BottomTabBar`, so the tab bar below still owns the safe-area bottom inset and
 * tab labels stay uncovered.
 *
 * Anti-pattern (Track 11.18): the mini and full player share one engine and (when video lands) one
 * native `VideoSurfaceHost` — never mount a second `Video`/engine on expand. See media-engine
 * README § "Player UI single-surface ownership".
 */
export function MiniPlayer({ onExpand }: MiniPlayerProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { activeTarget, durationSeconds, isPlaying, nowPlaying, pause, positionSeconds, resume } =
    usePlayback();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        artwork: {
          backgroundColor: tokens.background.secondary,
          borderRadius: tokens.radii.sm,
          height: 40,
          width: 40,
        },
        artworkFallback: {
          backgroundColor: tokens.background.tertiary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.sm,
          borderWidth: 1,
          height: 40,
          width: 40,
        },
        container: {
          backgroundColor: tokens.background.secondary,
          borderTopColor: themeStyles.border.borderColor,
          borderTopWidth: 1,
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.sm,
        },
        progressFill: {
          backgroundColor: tokens.text.accent,
        },
        progressTrack: {
          backgroundColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.round,
          flexDirection: 'row',
          height: 2,
          marginBottom: tokens.spacing.sm,
          overflow: 'hidden',
        },
        row: {
          alignItems: 'center',
          flexDirection: 'row',
          gap: tokens.spacing.md,
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

  const handleToggle = (event: GestureResponderEvent) => {
    stopPropagation(event);
    if (isPlaying) {
      pause();
    } else {
      void resume();
    }
  };

  return (
    <Pressable
      accessibilityLabel={t('media_player.show_fullscreen_media_player')}
      accessibilityRole="button"
      onPress={onExpand}
      style={styles.container}
      testID="mini-player"
    >
      <View style={styles.progressTrack}>
        <View
          style={[styles.progressFill, { flex: progressRatio }]}
          testID="mini-player-progress"
        />
        <View style={{ flex: 1 - progressRatio }} />
      </View>
      <View style={styles.row}>
        <View style={styles.videoSurface} testID="mini-player-video-surface">
          {nowPlaying.imageUrl !== null ? (
            <Image
              accessibilityLabel={t('media_player.media_player_image')}
              source={{ uri: nowPlaying.imageUrl }}
              style={styles.artwork}
            />
          ) : (
            <View style={styles.artworkFallback} />
          )}
          {/* Single shared native surface; hidden for audio-only so the artwork shows (2.23). */}
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
        <Button
          label={isPlaying ? t('media_player.pause') : t('media_player.play')}
          onPress={handleToggle}
          size="sm"
          testID="mini-player-play-pause"
          variant="primary"
        />
      </View>
    </Pressable>
  );
}
