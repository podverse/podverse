import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LayoutChangeEvent } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import type { DTOClip, DTOItemChapter, DTOItemSoundbite } from '@podverse/helpers/dto';
import { clampRatio } from '@podverse/helpers/math';
import { formatHHMMSS } from '@podverse/helpers/time';
import {
  getChapterAtPercent,
  getChapterBoundaryRatios,
} from '@podverse/playback-core/chapterProgressMarkers';

import {
  usePlaybackPositionClock,
  usePlaybackProgress,
  usePlaybackSession,
} from '../../playback/PlaybackProvider';
import {
  setPlaybackScrubPreviewSeconds,
  usePlaybackScrubPreview,
} from '../../playback/playbackScrubPreviewStore';
import { useActiveNowPlayingChapter } from '../../playback/useNowPlayingChapters';
import { FULL_PLAYER_PROGRESS_BLOCK_HEIGHT } from '../../screens/player/fullPlayerLayout';
import { useTheme } from '../../theme/useTheme';

const LONG_PRESS_MS = 500;
const CHAPTER_TOOLTIP_AUTO_DISMISS_MS = 5000;
const TRACK_HEIGHT = 6;
const TRACK_HIT_HEIGHT = 44;
const MARKER_WIDTH = 2;

type HighlightBounds = {
  endRatio: number | null;
  startRatio: number | null;
};

type FullPlayerScrubberProps = {
  chapters: DTOItemChapter[];
};

const parseSeconds = (value: string | number | null | undefined): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveHighlightBounds = ({
  activeChapter,
  clip,
  durationSeconds,
  soundbite,
}: {
  activeChapter: DTOItemChapter | null;
  clip: DTOClip | null;
  durationSeconds: number;
  soundbite: DTOItemSoundbite | null;
}): HighlightBounds => {
  if (durationSeconds <= 0) {
    return { endRatio: null, startRatio: null };
  }

  let startSec: number | null = null;
  let endSec: number | null = null;

  if (soundbite !== null) {
    startSec = parseSeconds(soundbite.start_time);
    const duration = parseSeconds(soundbite.duration);
    if (startSec !== null && duration !== null) {
      endSec = startSec + duration;
    }
  } else if (activeChapter !== null) {
    startSec = parseSeconds(activeChapter.start_time);
    endSec = parseSeconds(activeChapter.end_time ?? null);
  } else if (clip !== null) {
    startSec = parseSeconds(clip.start_time);
    endSec = parseSeconds(clip.end_time ?? null);
  }

  if (startSec === null) {
    return { endRatio: null, startRatio: null };
  }

  const startRatio = clampRatio(startSec / durationSeconds);
  const endRatio =
    endSec === null ? null : clampRatio(Math.max(startSec, endSec) / durationSeconds);
  return { endRatio, startRatio };
};

/**
 * Full-player scrubber: drag/tap seek on the line (no thumb), chapter markers, active-segment
 * highlight, and a long-press chapter tooltip. The visible track is thin; the hit target is 44pt.
 * While dragging, the left clock and chapter chrome follow the pending seek so they match the
 * fill. The engine playhead stays put until the finger lifts. Clocks and fill subscribe to the
 * progress store so the parent screen does not re-render on every tick.
 */
export function FullPlayerScrubber({ chapters }: FullPlayerScrubberProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { activeTarget, seekTo } = usePlaybackSession();
  const { durationSeconds, positionSeconds } = usePlaybackProgress();
  const clockSeconds = usePlaybackPositionClock();
  const activeChapter = useActiveNowPlayingChapter(chapters);

  const [trackWidth, setTrackWidth] = useState(0);
  const [tooltipTitle, setTooltipTitle] = useState<string | null>(null);
  const [tooltipPercent, setTooltipPercent] = useState(0);
  const scrubPreviewSeconds = usePlaybackScrubPreview();
  const ignoreTapRef = useRef(false);
  const chapterTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isScrubbing = useSharedValue(false);
  const scrubRatio = useSharedValue(0);
  const trackWidthShared = useSharedValue(0);
  const liveRatio = durationSeconds > 0 ? clampRatio(positionSeconds / durationSeconds) : 0;
  const liveRatioShared = useSharedValue(liveRatio);

  useEffect(() => {
    trackWidthShared.value = trackWidth;
  }, [trackWidth, trackWidthShared]);

  useEffect(() => {
    if (isScrubbing.value) {
      return;
    }
    liveRatioShared.value = liveRatio;
  }, [isScrubbing, liveRatio, liveRatioShared]);

  const clip = activeTarget?.kind === 'clip' ? activeTarget.clip : null;
  const soundbite = activeTarget?.kind === 'soundbite' ? activeTarget.soundbite : null;
  const highlight = useMemo(
    () =>
      resolveHighlightBounds({
        activeChapter,
        clip,
        durationSeconds,
        soundbite,
      }),
    [activeChapter, clip, durationSeconds, soundbite]
  );
  const markers = useMemo(
    () =>
      durationSeconds > 0 && chapters.length > 0
        ? getChapterBoundaryRatios(chapters, durationSeconds)
        : [],
    [chapters, durationSeconds]
  );

  const clearChapterTooltipTimer = useCallback(() => {
    if (chapterTooltipTimerRef.current !== null) {
      clearTimeout(chapterTooltipTimerRef.current);
      chapterTooltipTimerRef.current = null;
    }
  }, []);

  const hideChapterTooltip = useCallback(() => {
    clearChapterTooltipTimer();
    setTooltipTitle(null);
  }, [clearChapterTooltipTimer]);

  /**
   * The chapter name clears on the next touch of the scrubber, when the episode's chapters change,
   * or after a few seconds on its own. It names the chapter under the press, not the playhead.
   */
  useEffect(() => {
    hideChapterTooltip();
  }, [chapters, hideChapterTooltip]);

  useEffect(() => {
    return () => {
      clearChapterTooltipTimer();
      setPlaybackScrubPreviewSeconds(null);
    };
  }, [clearChapterTooltipTimer]);

  const showChapterTooltip = useCallback(
    (percent: number) => {
      clearChapterTooltipTimer();
      const chapter = getChapterAtPercent(percent, chapters, durationSeconds);
      const title = chapter?.title;
      if (typeof title !== 'string' || title.length === 0) {
        setTooltipTitle(null);
        return;
      }
      setTooltipPercent(percent);
      setTooltipTitle(title);
      chapterTooltipTimerRef.current = setTimeout(() => {
        chapterTooltipTimerRef.current = null;
        setTooltipTitle(null);
      }, CHAPTER_TOOLTIP_AUTO_DISMISS_MS);
    },
    [chapters, clearChapterTooltipTimer, durationSeconds]
  );

  const commitSeek = useCallback(
    (ratio: number) => {
      if (durationSeconds <= 0) {
        return;
      }
      seekTo(clampRatio(ratio) * durationSeconds);
    },
    [durationSeconds, seekTo]
  );

  const updateScrubPreview = useCallback(
    (ratio: number) => {
      if (durationSeconds <= 0) {
        return;
      }
      setPlaybackScrubPreviewSeconds(clampRatio(ratio) * durationSeconds);
    },
    [durationSeconds]
  );

  const clearScrubPreview = useCallback(() => {
    setPlaybackScrubPreviewSeconds(null);
  }, []);

  const markIgnoreTap = useCallback(() => {
    ignoreTapRef.current = true;
  }, []);

  const consumeIgnoreTap = useCallback((): boolean => {
    if (!ignoreTapRef.current) {
      return false;
    }
    ignoreTapRef.current = false;
    return true;
  }, []);

  const handleTapSeek = useCallback(
    (ratio: number) => {
      if (consumeIgnoreTap()) {
        return;
      }
      commitSeek(ratio);
    },
    [commitSeek, consumeIgnoreTap]
  );

  const handleTrackLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const pan = Gesture.Pan()
    .enabled(durationSeconds > 0 && trackWidth > 0)
    .onBegin((event) => {
      'worklet';
      const width = trackWidthShared.value;
      if (width <= 0) {
        return;
      }
      const next = Math.min(1, Math.max(0, event.x / width));
      isScrubbing.value = true;
      scrubRatio.value = next;
      runOnJS(updateScrubPreview)(next);
      // Every touch on the track begins here, tap and long press included, so a chapter name left
      // over from an earlier press clears the moment the listener touches the scrubber again.
      runOnJS(hideChapterTooltip)();
    })
    .onUpdate((event) => {
      'worklet';
      const width = trackWidthShared.value;
      if (width <= 0) {
        return;
      }
      const next = Math.min(1, Math.max(0, event.x / width));
      scrubRatio.value = next;
      runOnJS(updateScrubPreview)(next);
    })
    .onEnd(() => {
      'worklet';
      const next = scrubRatio.value;
      isScrubbing.value = false;
      liveRatioShared.value = next;
      runOnJS(commitSeek)(next);
    })
    .onFinalize(() => {
      'worklet';
      isScrubbing.value = false;
      runOnJS(clearScrubPreview)();
    });

  const tap = Gesture.Tap()
    .enabled(durationSeconds > 0 && trackWidth > 0)
    .onEnd((event) => {
      'worklet';
      const width = trackWidthShared.value;
      if (width <= 0) {
        return;
      }
      const ratio = Math.min(1, Math.max(0, event.x / width));
      runOnJS(handleTapSeek)(ratio);
    });

  const longPress = Gesture.LongPress()
    .enabled(durationSeconds > 0 && trackWidth > 0 && chapters.length > 0)
    .minDuration(LONG_PRESS_MS)
    .onStart((event) => {
      'worklet';
      const width = trackWidthShared.value;
      if (width <= 0) {
        return;
      }
      const ratio = Math.min(1, Math.max(0, event.x / width));
      runOnJS(markIgnoreTap)();
      runOnJS(showChapterTooltip)(ratio);
    });

  const composed = Gesture.Race(pan, Gesture.Exclusive(longPress, tap));

  const fillStyle = useAnimatedStyle(() => {
    const ratio = isScrubbing.value ? scrubRatio.value : liveRatioShared.value;
    return {
      width: trackWidthShared.value * ratio,
    };
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        block: {
          justifyContent: 'center',
          minHeight: FULL_PLAYER_PROGRESS_BLOCK_HEIGHT,
          position: 'relative',
        },
        highlight: {
          backgroundColor: tokens.text.accent,
          bottom: 0,
          opacity: 0.28,
          position: 'absolute',
          top: 0,
        },
        marker: {
          backgroundColor: themeStyles.textPrimary.color,
          bottom: 0,
          opacity: 0.55,
          position: 'absolute',
          top: 0,
          width: MARKER_WIDTH,
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
        tooltip: {
          backgroundColor: tokens.background.tertiary,
          borderRadius: tokens.radii.sm,
          bottom: FULL_PLAYER_PROGRESS_BLOCK_HEIGHT - 4,
          maxWidth: '80%',
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
          position: 'absolute',
          zIndex: 2,
        },
        tooltipText: {
          color: themeStyles.textPrimary.color,
          fontSize: 13,
          fontWeight: '600',
        },
        track: {
          backgroundColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.round,
          height: TRACK_HEIGHT,
          overflow: 'hidden',
          width: '100%',
        },
        trackFill: {
          backgroundColor: tokens.text.accent,
          height: '100%',
        },
        trackHit: {
          justifyContent: 'center',
          minHeight: TRACK_HIT_HEIGHT,
          width: '100%',
        },
      }),
    [themeStyles, tokens]
  );

  const displayPositionSeconds = scrubPreviewSeconds ?? clockSeconds;
  const displayPosition = formatHHMMSS(Math.max(0, displayPositionSeconds));
  const displayDuration = formatHHMMSS(Math.max(0, durationSeconds));

  return (
    <View style={styles.block} testID="full-player-progress-block">
      {tooltipTitle !== null ? (
        <View
          pointerEvents="none"
          style={[
            styles.tooltip,
            {
              left: Math.max(
                0,
                Math.min(
                  trackWidth > 0 ? tooltipPercent * trackWidth - 40 : 0,
                  Math.max(0, trackWidth - 120)
                )
              ),
            },
          ]}
          testID="full-player-chapter-tooltip"
        >
          <Text
            accessibilityLabel={t('media_player.chapter_tooltip', { title: tooltipTitle })}
            numberOfLines={2}
            style={styles.tooltipText}
          >
            {tooltipTitle}
          </Text>
        </View>
      ) : null}
      <GestureDetector gesture={composed}>
        <View
          accessibilityLabel={t('media_player.seek')}
          accessibilityRole="adjustable"
          accessibilityValue={{
            max: Math.round(durationSeconds),
            min: 0,
            now: Math.round(scrubPreviewSeconds ?? positionSeconds),
            text: t('media_player.position_of_duration', {
              duration: displayDuration,
              position: displayPosition,
            }),
          }}
          onLayout={handleTrackLayout}
          style={styles.trackHit}
          testID="full-player-scrubber"
        >
          <View style={styles.track}>
            <Animated.View
              style={[styles.trackFill, fillStyle]}
              testID="full-player-scrubber-fill"
            />
            {highlight.startRatio !== null && highlight.endRatio !== null ? (
              <View
                pointerEvents="none"
                style={[
                  styles.highlight,
                  {
                    left: `${highlight.startRatio * 100}%`,
                    width: `${Math.max(0, highlight.endRatio - highlight.startRatio) * 100}%`,
                  },
                ]}
                testID="full-player-scrubber-highlight"
              />
            ) : null}
            {markers.map((ratio) => (
              <View
                key={ratio}
                pointerEvents="none"
                style={[styles.marker, { left: `${ratio * 100}%` }]}
                testID="full-player-chapter-marker"
              />
            ))}
          </View>
        </View>
      </GestureDetector>
      <View style={styles.timeRow}>
        <Text style={styles.timeText} testID="full-player-position">
          {displayPosition}
        </Text>
        <Text style={styles.timeText} testID="full-player-duration">
          {displayDuration}
        </Text>
      </View>
    </View>
  );
}
