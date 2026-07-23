import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import {
  BackHandler,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { DTOChannel, DTOItem } from '@podverse/helpers/dto';
import type { PlaybackTarget } from '@podverse/playback-core';

import { Button } from '../../components/primitives/Button';
import { getMobileConfig } from '../../config';
import { buildNowPlayingShareUrl } from '../../lib/playback/shareNowPlaying';
import { usePlayback } from '../../playback/PlaybackProvider';
import { useTheme } from '../../theme/useTheme';
import { FullPlayerSegments } from './FullPlayerSegments';
import { FullPlayerSleepTimer } from './FullPlayerSleepTimer';
import { FullPlayerSpeedControl } from './FullPlayerSpeedControl';
import { FullPlayerUpNext } from './FullPlayerUpNext';

type FullPlayerScreenProps = {
  onClose: () => void;
};

type FullPlayerPanel = 'sleep' | 'speed' | 'up-next' | null;

/** Extract the now-playing item/channel for the segments list (add-by-RSS has none). */
const segmentContentFromTarget = (
  target: PlaybackTarget
): { item: DTOItem; channel: DTOChannel } | null => {
  switch (target.kind) {
    case 'clip':
    case 'soundbite':
    case 'chapter':
    case 'item-podcast':
    case 'item-video':
    case 'item-music':
      return { channel: target.channel, item: target.item };
    case 'livestream':
      return target.item !== null ? { channel: target.channel, item: target.item } : null;
    case 'add-by-rss':
      return null;
  }
};

const clampRatio = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
};

const formatClock = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '00:00';
  }
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const remaining = whole % 60;
  return `${minutes.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
};

/**
 * Full player screen (audio-first, Track 11.5). Renders the shared now-playing state from
 * `usePlayback()` — the same provider the mini player uses — so expanding never remounts a second
 * engine (Track 11.4 contract). Provides large artwork, a tap-to-seek scrubber that seeks through
 * the native bridge (`seekTo`), play/pause, skip-to-next, toggleable up-next (11.9), playback speed
 * (11.11) and sleep-timer (11.12) panels, an OS share action (11.13), a config-gated V4V entry stub
 * (11.14), and an inline chapters/soundbites segment list (11.10) that self-hides when the item has
 * none. Video surface + collapse animation are deferred to 11.6–11.7.
 *
 * Anti-pattern (Track 11.18): never mount a second `Video`/engine when opening the full player. When
 * video lands, the single native `VideoSurfaceHost` is re-parented (bridge attach) from the `mini`
 * to the `full` target — see media-engine README § "Player UI single-surface ownership".
 */
export function FullPlayerScreen({ onClose }: FullPlayerScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const {
    activeTarget,
    durationSeconds,
    isPlaying,
    nowPlaying,
    pause,
    positionSeconds,
    resume,
    seekTo,
    skipToNext,
  } = usePlayback();

  const [scrubberWidth, setScrubberWidth] = useState(0);
  const [openPanel, setOpenPanel] = useState<FullPlayerPanel>(null);
  const [isV4vNoticeVisible, setIsV4vNoticeVisible] = useState(false);

  const isV4vEnabled = getMobileConfig().isV4vEnabled;

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [onClose]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        artwork: {
          alignSelf: 'center',
          aspectRatio: 1,
          backgroundColor: tokens.background.secondary,
          borderRadius: tokens.radii.md,
          maxHeight: 320,
          maxWidth: 320,
          width: '100%',
        },
        artworkFallback: {
          alignSelf: 'center',
          aspectRatio: 1,
          backgroundColor: tokens.background.tertiary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          maxHeight: 320,
          maxWidth: 320,
          width: '100%',
        },
        content: {
          gap: tokens.spacing.xl,
          paddingBottom: tokens.spacing['2xl'],
          paddingHorizontal: tokens.spacing['2xl'],
        },
        controlsRow: {
          alignItems: 'center',
          flexDirection: 'row',
          gap: tokens.spacing.md,
          justifyContent: 'center',
        },
        entriesRow: {
          flexDirection: 'row',
          gap: tokens.spacing.md,
          justifyContent: 'center',
        },
        header: {
          alignItems: 'flex-start',
          paddingBottom: tokens.spacing.md,
          paddingHorizontal: tokens.spacing['2xl'],
          paddingTop: tokens.spacing['2xl'],
        },
        root: {
          flex: 1,
        },
        scroll: {
          flex: 1,
        },
        scrubberFill: {
          backgroundColor: tokens.text.accent,
        },
        scrubberTrack: {
          backgroundColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.round,
          flexDirection: 'row',
          height: 6,
          overflow: 'hidden',
        },
        subtitle: {
          color: themeStyles.textSecondary.color,
          fontSize: 15,
          textAlign: 'center',
        },
        timeRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: tokens.spacing.sm,
        },
        timeText: {
          color: themeStyles.textSecondary.color,
          fontSize: 12,
        },
        title: {
          color: themeStyles.textPrimary.color,
          fontSize: 22,
          fontWeight: '700',
          textAlign: 'center',
        },
      }),
    [themeStyles, tokens]
  );

  const isPlaybackActive = activeTarget !== null && nowPlaying !== null;
  const progressRatio = durationSeconds > 0 ? clampRatio(positionSeconds / durationSeconds) : 0;
  const segmentContent = activeTarget !== null ? segmentContentFromTarget(activeTarget) : null;
  const shareUrl = activeTarget !== null ? buildNowPlayingShareUrl(activeTarget) : null;

  const togglePanel = (panel: Exclude<FullPlayerPanel, null>) => {
    setOpenPanel((current) => (current === panel ? null : panel));
  };

  const handleShare = () => {
    if (shareUrl === null) {
      return;
    }
    void Share.share({ message: shareUrl, url: shareUrl }).catch(() => {
      // Share dismissal / unavailable share sheet is a safe no-op.
    });
  };

  const handleScrubberLayout = (event: LayoutChangeEvent) => {
    setScrubberWidth(event.nativeEvent.layout.width);
  };

  const handleScrubberSeek = (event: GestureResponderEvent) => {
    if (scrubberWidth <= 0 || durationSeconds <= 0) {
      return;
    }
    const ratio = clampRatio(event.nativeEvent.locationX / scrubberWidth);
    seekTo(ratio * durationSeconds);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      pause();
    } else {
      void resume();
    }
  };

  return (
    <View
      style={[styles.root, { backgroundColor: themeStyles.screen.backgroundColor }]}
      testID="full-player-screen"
    >
      <View style={styles.header}>
        <Button
          label={t('misc.close')}
          onPress={onClose}
          size="sm"
          testID="full-player-close"
          variant="secondary"
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} style={styles.scroll}>
        {isPlaybackActive ? (
          <>
            {nowPlaying.imageUrl !== null ? (
              <Image
                accessibilityLabel={t('media_player.media_player_image')}
                source={{ uri: nowPlaying.imageUrl }}
                style={styles.artwork}
              />
            ) : (
              <View style={styles.artworkFallback} />
            )}

            <View>
              <Text style={styles.title} testID="full-player-title">
                {nowPlaying.title}
              </Text>
              {nowPlaying.channelTitle !== null ? (
                <Text style={styles.subtitle}>{nowPlaying.channelTitle}</Text>
              ) : null}
            </View>

            <View>
              <Pressable
                accessibilityLabel={t('media_player.seek')}
                accessibilityRole="adjustable"
                onLayout={handleScrubberLayout}
                onPress={handleScrubberSeek}
                testID="full-player-scrubber"
              >
                <View style={styles.scrubberTrack}>
                  <View
                    style={[styles.scrubberFill, { flex: progressRatio }]}
                    testID="full-player-scrubber-fill"
                  />
                  <View style={{ flex: 1 - progressRatio }} />
                </View>
              </Pressable>
              <View style={styles.timeRow}>
                <Text style={styles.timeText} testID="full-player-position">
                  {formatClock(positionSeconds)}
                </Text>
                <Text style={styles.timeText}>{formatClock(durationSeconds)}</Text>
              </View>
            </View>

            <View style={styles.controlsRow}>
              <Button
                label={isPlaying ? t('media_player.pause') : t('media_player.play')}
                onPress={handleTogglePlay}
                testID="full-player-play-pause"
                variant="primary"
              />
              <Button
                label={t('media_player.skip_to_next')}
                onPress={() => {
                  void skipToNext();
                }}
                testID="full-player-skip-next"
                variant="secondary"
              />
            </View>

            <View style={styles.entriesRow}>
              <Button
                label={t('media_player.up_next')}
                onPress={() => {
                  togglePanel('up-next');
                }}
                testID="full-player-up-next"
                variant={openPanel === 'up-next' ? 'primary' : 'secondary'}
              />
              <Button
                label={t('media_player.playback_speed.playback_speed')}
                onPress={() => {
                  togglePanel('speed');
                }}
                testID="full-player-speed"
                variant={openPanel === 'speed' ? 'primary' : 'secondary'}
              />
            </View>

            <View style={styles.entriesRow}>
              <Button
                label={t('media_player.sleep_timer.sleep_timer')}
                onPress={() => {
                  togglePanel('sleep');
                }}
                size="sm"
                testID="full-player-sleep-timer"
                variant={openPanel === 'sleep' ? 'primary' : 'secondary'}
              />
              <Button
                disabled={shareUrl === null}
                label={t('media_player.share')}
                onPress={handleShare}
                size="sm"
                testID="full-player-share"
                variant="secondary"
              />
              {isV4vEnabled ? (
                <Button
                  label={t('media_player.value_for_value')}
                  onPress={() => {
                    setIsV4vNoticeVisible((current) => !current);
                  }}
                  size="sm"
                  testID="full-player-v4v"
                  variant={isV4vNoticeVisible ? 'primary' : 'secondary'}
                />
              ) : null}
            </View>

            {openPanel === 'up-next' ? <FullPlayerUpNext /> : null}
            {openPanel === 'speed' ? <FullPlayerSpeedControl /> : null}
            {openPanel === 'sleep' ? <FullPlayerSleepTimer /> : null}
            {isV4vEnabled && isV4vNoticeVisible ? (
              <Text style={styles.subtitle} testID="full-player-v4v-notice">
                {t('media_player.coming_soon')}
              </Text>
            ) : null}

            {segmentContent !== null ? (
              <FullPlayerSegments channel={segmentContent.channel} item={segmentContent.item} />
            ) : null}
          </>
        ) : (
          <Text style={styles.title} testID="full-player-idle">
            {t('media_player.fullscreen_media_player')}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
