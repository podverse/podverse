import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import {
  BackHandler,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { DTOChannel, DTOItem } from '@podverse/helpers/dto';
import { clampRatio } from '@podverse/helpers/math';
import { formatClock } from '@podverse/helpers/time';
import type { PlaybackTarget } from '@podverse/playback-core';

import { PodverseVideoSurfaceView } from '../../../modules/podverse-media-engine';
import { nativePlaybackBridge } from '../../bridge/nativePlaybackBridge';
import { Button } from '../../components/primitives/Button';
import { getMobileConfig } from '../../config';
import { buildNowPlayingShareUrl, shareResolvedUrl } from '../../lib/share/shareNowPlaying';
import { usePlayback } from '../../playback/PlaybackProvider';
import { useResponsive } from '../../theme/useResponsive';
import { useTheme } from '../../theme/useTheme';
import { FullPlayerSegments } from './FullPlayerSegments';
import { FullPlayerSleepTimer } from './FullPlayerSleepTimer';
import { FullPlayerSpeedControl } from './FullPlayerSpeedControl';
import { FullPlayerUpNext } from './FullPlayerUpNext';

type FullPlayerScreenProps = {
  onClose: () => void;
  /** Navigate to the V4V placeholder screen (Track 19.6). */
  onOpenV4v: () => void;
};

type FullPlayerPanel = 'sleep' | 'speed' | 'up-next' | null;

/** Mini↔full surface reparent animation (ms). Geometry only — never reloads the engine (2.19). */
const VIDEO_SURFACE_ANIMATE_MS = 250;

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
export function FullPlayerScreen({ onClose, onOpenV4v }: FullPlayerScreenProps) {
  const { t } = useTranslation();
  const { isTablet } = useResponsive();
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

  const isV4vEnabled = getMobileConfig().isV4vEnabled;

  // Expand re-parents the single native surface to the `full` target; collapse (unmount) animates it
  // back to `mini`. Reparenting + geometry only — never `load`/`destroy`, so playback stays
  // continuous (Track 11.4 / master 2.22). The `full` target view is the `PodverseVideoSurfaceView`
  // rendered below, which registers itself with the host; this only flips which target is active.
  useEffect(() => {
    nativePlaybackBridge.animateVideoSurface('full', VIDEO_SURFACE_ANIMATE_MS);
    return () => {
      nativePlaybackBridge.animateVideoSurface('mini', VIDEO_SURFACE_ANIMATE_MS);
    };
  }, []);

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
        contentTablet: {
          alignItems: 'flex-start',
          flexDirection: 'row',
        },
        controlsColumn: {
          flex: 1,
          gap: tokens.spacing.xl,
          minWidth: 0,
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
        videoSurface: {
          alignSelf: 'center',
          aspectRatio: 1,
          maxHeight: 320,
          maxWidth: 320,
          width: '100%',
        },
        // Tablet left column: keep artwork from stretching full width of the row.
        videoSurfaceTablet: {
          alignSelf: 'flex-start',
          flexShrink: 0,
          marginRight: tokens.spacing.xl,
          maxWidth: 360,
          width: '42%',
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
    shareResolvedUrl(shareUrl);
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

      <ScrollView
        contentContainerStyle={[styles.content, isTablet ? styles.contentTablet : undefined]}
        style={styles.scroll}
        testID={isTablet ? 'full-player-two-column' : undefined}
      >
        {isPlaybackActive ? (
          <>
            {/* Style-only tablet branch — same surface node so rotation does not remount the engine. */}
            <View
              style={[styles.videoSurface, isTablet ? styles.videoSurfaceTablet : undefined]}
              testID="full-player-video-surface"
            >
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
              <PodverseVideoSurfaceView style={StyleSheet.absoluteFill} targetId="full" />
            </View>

            <View style={isTablet ? styles.controlsColumn : undefined}>
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
                    onPress={onOpenV4v}
                    size="sm"
                    testID="full-player-v4v"
                    variant="secondary"
                  />
                ) : null}
              </View>

              {openPanel === 'up-next' ? <FullPlayerUpNext /> : null}
              {openPanel === 'speed' ? <FullPlayerSpeedControl /> : null}
              {openPanel === 'sleep' ? <FullPlayerSleepTimer /> : null}

              {segmentContent !== null ? (
                <FullPlayerSegments channel={segmentContent.channel} item={segmentContent.item} />
              ) : null}
            </View>
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
