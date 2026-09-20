import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { GestureResponderEvent } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { breakpoints } from '@podverse/design-tokens';

import { useActionError } from '../../feedback/ActionErrorProvider';
import { stopPropagation } from '../../lib/gesture/stopPropagation';
import { usePlaybackSession } from '../../playback/PlaybackProvider';
import { MINI_PLAYER_ARTWORK_SIZE } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useResponsive } from '../../theme/useResponsive';
import { useTheme } from '../../theme/useTheme';
import { MarqueeText } from '../primitives/MarqueeText';
import { MiniPlayerArtwork } from './MiniPlayerArtwork';
import { MiniPlayerProgress } from './MiniPlayerProgress';
import { PlayerTransportButton } from './PlayerTransportButton';

type MiniPlayerProps = {
  onExpand: () => void;
};

/**
 * Mini player fixed above the tab bar. Session chrome only — progress fill and chapter artwork live
 * in leaf components so the shell does not re-render on every playhead tick.
 */
export function MiniPlayer({ onExpand }: MiniPlayerProps) {
  const { t } = useTranslation();
  const { isTablet } = useResponsive();
  const { styles: themeStyles, tokens } = useTheme();
  const { activeTarget, lastPlaybackError, nowPlaying, pause, resume, retryPlayback, transportState } =
    usePlaybackSession();
  const { openPlaybackError } = useActionError();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: tokens.background.secondary,
          overflow: 'hidden',
        },
        containerTablet: {
          alignSelf: 'center',
          maxWidth: breakpoints.lg,
          width: '100%',
        },
        row: {
          alignItems: 'center',
          flexDirection: 'row',
          height: MINI_PLAYER_ARTWORK_SIZE,
        },
        subtitle: {
          ...typography.label,
          color: tokens.text.accent,
        },
        textColumn: {
          flex: 1,
          gap: tokens.spacing.sm,
          minWidth: 0,
          paddingHorizontal: tokens.spacing.base,
        },
        title: {
          ...typography.body,
          color: themeStyles.textPrimary.color,
        },
        transport: {
          paddingRight: tokens.spacing.base,
        },
      }),
    [themeStyles, tokens]
  );

  if (activeTarget === null || nowPlaying === null) {
    return null;
  }

  const handlePlay = (event: GestureResponderEvent) => {
    stopPropagation(event);
    void resume();
  };

  const handlePause = (event: GestureResponderEvent) => {
    stopPropagation(event);
    pause();
  };

  const handleErrorPress = (event: GestureResponderEvent) => {
    stopPropagation(event);
    openPlaybackError(lastPlaybackError, () => {
      void retryPlayback();
    });
  };

  return (
    <Pressable
      accessibilityLabel={t('media_player.show_fullscreen_media_player')}
      accessibilityRole="button"
      onPress={onExpand}
      style={[styles.container, isTablet ? styles.containerTablet : undefined]}
      testID="mini-player"
    >
      <MiniPlayerProgress />
      <View style={styles.row}>
        <MiniPlayerArtwork accessibilityLabel={t('media_player.media_player_image')} />
        <View style={styles.textColumn}>
          <MarqueeText style={styles.title} testID="mini-player-title">
            {nowPlaying.title}
          </MarqueeText>
          {nowPlaying.channelTitle !== null ? (
            <Text numberOfLines={1} style={styles.subtitle}>
              {nowPlaying.channelTitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.transport}>
          <PlayerTransportButton
            appearance="bare"
            onPause={handlePause}
            onPlay={handlePlay}
            onErrorPress={handleErrorPress}
            state={transportState}
            testID="mini-player-play-pause"
          />
        </View>
      </View>
    </Pressable>
  );
}
