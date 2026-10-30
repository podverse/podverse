import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LayoutChangeEvent } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { PLAYBACK_COMMAND_TTL_MS } from '@podverse/helpers/accountPlaybackStream';
import type { DTOClip, DTOItemChapter, DTOItemSoundbite } from '@podverse/helpers/dto';
import { clampRatio } from '@podverse/helpers/math';
import { formatHHMMSS } from '@podverse/helpers/time';
import {
  getChapterAtPercent,
  getChapterBoundaryRatios,
} from '@podverse/playback-core/chapterProgressMarkers';
import {
  clampLiveSeekSeconds,
  isRewindableLiveWindow,
  resolveLivePlaybackDisplay,
} from '@podverse/playback-core/livePlayback';

import { useReduceMotion } from '../../hooks/useReduceMotion';
import {
  getCrossDevicePlaybackPositionSeconds,
  subscribeCrossDevicePlaybackPositionClock,
} from '../../playback/crossDevice/crossDevicePlaybackStore';
import {
  useCrossDevicePlaybackView,
  useRemotePlaybackPositionSeconds,
} from '../../playback/crossDevice/useCrossDevicePlayerDisplay';
import {
  getLivePlaybackDisplay,
  getLivePlaybackWindow,
  subscribeLivePlaybackDisplay,
  useLivePlaybackDisplay,
  useLivePlaybackWindow,
} from '../../playback/livePlaybackStore';
import {
  getPlaybackProgressRatio,
  subscribePlaybackProgress,
} from '../../playback/playbackProgressStore';
import {
  usePlaybackDuration,
  usePlaybackPositionClock,
  usePlaybackSession,
} from '../../playback/PlaybackProvider';
import {
  setPlaybackScrubPreviewSeconds,
  usePlaybackScrubPreview,
} from '../../playback/playbackScrubPreviewStore';
import { useActiveNowPlayingChapter } from '../../playback/useNowPlayingChapters';
import { FULL_PLAYER_PROGRESS_BLOCK_HEIGHT } from '../../screens/player/fullPlayerLayout';
import { useTheme } from '../../theme/useTheme';
import { FullPlayerLiveControl } from './FullPlayerLiveControl';

const LONG_PRESS_MS = 500;
const CHAPTER_TOOLTIP_AUTO_DISMISS_MS = 5000;
const TRACK_HEIGHT = 6;
const TRACK_HIT_HEIGHT = 44;
const THUMB_SIZE = 12;
/** Chapter boundary width. Each mark is this wide and as tall as the track. */
const CHAPTER_MARKER_WIDTH = 1;
const SEGMENT_BAND_HEIGHT = 32;
const SEGMENT_PULSE_HALF_MS = 2000;
/**
 * Horizontal travel before a drag takes over the scrubber. Shorter swipes and any vertical
 * movement past {@link PAN_FAIL_OFFSET_Y} belong to the player scroll view.
 */
const PAN_ACTIVE_OFFSET_X = 24;
const PAN_FAIL_OFFSET_Y = 16;

/**
 * The thumb, chapter markers, and segment pulse use one palette on every theme so the playhead and
 * chapter boundaries read the same on light and dark. The played fill keeps the theme accent.
 */
const THUMB_COLOR = '#ffffff';
const CHAPTER_MARKER_COLOR = '#ffc107';
const SEGMENT_PULSE_COLORS = ['rgba(116, 168, 220, 0.6)', 'rgba(255, 193, 7, 0.6)'];

type HighlightBounds = {
  endRatio: number | null;
  startRatio: number | null;
};

type FullPlayerScrubberProps = {
  chapters: DTOItemChapter[];
};

type FullPlayerScrubberLive = {
  /** Rendered in the duration slot. */
  liveControl: ReactNode;
};

type FullPlayerScrubberSource = {
  durationSeconds: number;
  /** Whole-second playhead for the clock labels. */
  clockSeconds: number;
  getRatio: () => number;
  subscribeRatio: (listener: () => void) => () => void;
  seekTo: (seconds: number) => void;
  clip: DTOClip | null;
  soundbite: DTOItemSoundbite | null;
  /**
   * A livestream's window. `durationSeconds` is then the window's length and the clocks are
   * seconds into it; the left clock shows the behind-live time and the right slot the Live control.
   */
  live: FullPlayerScrubberLive | null;
};

type RemotePendingSeek = {
  seconds: number;
  baseRevision: number | null;
  atMs: number;
};

const EMPTY_CHAPTERS: DTOItemChapter[] = [];

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
 * Full-player scrubber track. Duration, clocks, fill, and seek come from `source`.
 * `FullPlayerScrubber` is this phone's playback. `FullPlayerRemoteScrubber` is another device's.
 * `FullPlayerLiveProgress` is this phone's livestream band.
 *
 * The track is a thin bar with a thumb on the playhead, a line at each chapter boundary, a pulsing
 * band behind the current chapter or clip, and a long-press chapter tooltip. The hit target is
 * 44pt. A tap seeks where it lands. A drag takes over only after clear horizontal travel, so a
 * vertical swipe that starts on the bar still scrolls the player. While dragging, the left clock
 * and chapter chrome follow the pending seek so they match the fill. The seek is sent when the
 * finger lifts. Clocks and fill subscribe through the source so the parent screen does not
 * re-render on every tick.
 *
 * Gesture objects are memoized and the worklet-to-JS preview hop only fires when the whole-second
 * label would change — rebuilding a Gesture mid-drag re-attaches the recognizer and floods JS.
 * Seek and tooltip callbacks read the duration from a ref for the same reason, since a livestream's
 * window grows while it plays.
 */
function FullPlayerScrubberTrack({
  chapters,
  source,
}: {
  chapters: DTOItemChapter[];
  source: FullPlayerScrubberSource;
}) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { durationSeconds, clockSeconds, getRatio, subscribeRatio, seekTo, clip, soundbite } =
    source;
  const activeChapter = useActiveNowPlayingChapter(chapters);
  const reduceMotion = useReduceMotion();

  const [trackWidth, setTrackWidth] = useState(0);
  const [tooltipTitle, setTooltipTitle] = useState<string | null>(null);
  const [tooltipPercent, setTooltipPercent] = useState(0);
  const scrubPreviewSeconds = usePlaybackScrubPreview();
  const ignoreTapRef = useRef(false);
  const chapterTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isScrubbing = useSharedValue(false);
  const scrubRatio = useSharedValue(0);
  const trackWidthShared = useSharedValue(0);
  const durationShared = useSharedValue(durationSeconds);
  const durationSecondsRef = useRef(durationSeconds);
  const lastPreviewSecondShared = useSharedValue(-1);
  const liveRatioShared = useSharedValue(getRatio());
  const segmentPulse = useSharedValue(0);

  useEffect(() => {
    trackWidthShared.value = trackWidth;
  }, [trackWidth, trackWidthShared]);

  useEffect(() => {
    durationShared.value = durationSeconds;
    durationSecondsRef.current = durationSeconds;
  }, [durationSeconds, durationShared]);

  useEffect(() => {
    if (!isScrubbing.value) {
      liveRatioShared.value = getRatio();
    }
    return subscribeRatio(() => {
      if (isScrubbing.value) {
        return;
      }
      liveRatioShared.value = getRatio();
    });
  }, [getRatio, isScrubbing, liveRatioShared, subscribeRatio]);

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
        ? getChapterBoundaryRatios(chapters, durationSeconds).filter(
            (ratio) => ratio > 0 && ratio < 1
          )
        : [],
    [chapters, durationSeconds]
  );
  const hasSegmentBand = highlight.startRatio !== null && highlight.endRatio !== null;

  useEffect(() => {
    cancelAnimation(segmentPulse);
    segmentPulse.value = 0;
    if (!hasSegmentBand || reduceMotion) {
      return;
    }
    segmentPulse.value = withRepeat(
      withTiming(1, { duration: SEGMENT_PULSE_HALF_MS, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    return () => {
      cancelAnimation(segmentPulse);
    };
  }, [hasSegmentBand, reduceMotion, segmentPulse]);

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
      const chapter = getChapterAtPercent(percent, chapters, durationSecondsRef.current);
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
    [chapters, clearChapterTooltipTimer]
  );

  const commitSeek = useCallback(
    (ratio: number) => {
      const duration = durationSecondsRef.current;
      if (duration <= 0) {
        return;
      }
      seekTo(clampRatio(ratio) * duration);
    },
    [seekTo]
  );

  const updateScrubPreviewSeconds = useCallback((seconds: number) => {
    setPlaybackScrubPreviewSeconds(seconds);
  }, []);

  const clearScrubPreview = useCallback(() => {
    lastPreviewSecondShared.value = -1;
    setPlaybackScrubPreviewSeconds(null);
  }, [lastPreviewSecondShared]);

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

  const gesturesEnabled = durationSeconds > 0 && trackWidth > 0;
  const longPressEnabled = gesturesEnabled && chapters.length > 0;

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(gesturesEnabled)
        .activeOffsetX([-PAN_ACTIVE_OFFSET_X, PAN_ACTIVE_OFFSET_X])
        .failOffsetY([-PAN_FAIL_OFFSET_Y, PAN_FAIL_OFFSET_Y])
        .onBegin(() => {
          'worklet';
          // Every touch on the track begins here, tap and long press included, so a chapter name left
          // over from an earlier press clears the moment the listener touches the scrubber again.
          runOnJS(hideChapterTooltip)();
        })
        .onStart((event) => {
          'worklet';
          const width = trackWidthShared.value;
          const duration = durationShared.value;
          if (width <= 0 || duration <= 0) {
            return;
          }
          const next = Math.min(1, Math.max(0, event.x / width));
          isScrubbing.value = true;
          scrubRatio.value = next;
          const nextSecond = Math.floor(next * duration);
          lastPreviewSecondShared.value = nextSecond;
          runOnJS(updateScrubPreviewSeconds)(nextSecond);
        })
        .onUpdate((event) => {
          'worklet';
          if (!isScrubbing.value) {
            return;
          }
          const width = trackWidthShared.value;
          const duration = durationShared.value;
          if (width <= 0 || duration <= 0) {
            return;
          }
          const next = Math.min(1, Math.max(0, event.x / width));
          scrubRatio.value = next;
          const nextSecond = Math.floor(next * duration);
          if (nextSecond === lastPreviewSecondShared.value) {
            return;
          }
          lastPreviewSecondShared.value = nextSecond;
          runOnJS(updateScrubPreviewSeconds)(nextSecond);
        })
        .onEnd(() => {
          'worklet';
          if (!isScrubbing.value) {
            return;
          }
          const next = scrubRatio.value;
          isScrubbing.value = false;
          liveRatioShared.value = next;
          runOnJS(commitSeek)(next);
        })
        .onFinalize(() => {
          'worklet';
          isScrubbing.value = false;
          runOnJS(clearScrubPreview)();
        }),
    [
      clearScrubPreview,
      commitSeek,
      durationShared,
      gesturesEnabled,
      hideChapterTooltip,
      isScrubbing,
      lastPreviewSecondShared,
      liveRatioShared,
      scrubRatio,
      trackWidthShared,
      updateScrubPreviewSeconds,
    ]
  );

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .enabled(gesturesEnabled)
        .onEnd((event) => {
          'worklet';
          const width = trackWidthShared.value;
          if (width <= 0) {
            return;
          }
          const ratio = Math.min(1, Math.max(0, event.x / width));
          runOnJS(handleTapSeek)(ratio);
        }),
    [gesturesEnabled, handleTapSeek, trackWidthShared]
  );

  const longPress = useMemo(
    () =>
      Gesture.LongPress()
        .enabled(longPressEnabled)
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
        }),
    [longPressEnabled, markIgnoreTap, showChapterTooltip, trackWidthShared]
  );

  const composed = useMemo(
    () => Gesture.Race(pan, Gesture.Exclusive(longPress, tap)),
    [longPress, pan, tap]
  );

  const fillStyle = useAnimatedStyle(() => {
    const ratio = isScrubbing.value ? scrubRatio.value : liveRatioShared.value;
    return {
      width: trackWidthShared.value * ratio,
    };
  });

  const thumbStyle = useAnimatedStyle(() => {
    const ratio = isScrubbing.value ? scrubRatio.value : liveRatioShared.value;
    return {
      transform: [{ translateX: trackWidthShared.value * ratio - THUMB_SIZE / 2 }],
    };
  });

  const segmentBandStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(segmentPulse.value, [0, 1], SEGMENT_PULSE_COLORS),
    };
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        block: {
          height: FULL_PLAYER_PROGRESS_BLOCK_HEIGHT,
          justifyContent: 'center',
          position: 'relative',
        },
        chapterMarker: {
          backgroundColor: CHAPTER_MARKER_COLOR,
          height: TRACK_HEIGHT,
          marginLeft: -CHAPTER_MARKER_WIDTH / 2,
          position: 'absolute',
          top: (TRACK_HIT_HEIGHT - TRACK_HEIGHT) / 2,
          width: CHAPTER_MARKER_WIDTH,
        },
        segmentBand: {
          height: SEGMENT_BAND_HEIGHT,
          position: 'absolute',
          top: (TRACK_HIT_HEIGHT - SEGMENT_BAND_HEIGHT) / 2,
        },
        thumb: {
          backgroundColor: THUMB_COLOR,
          borderRadius: THUMB_SIZE / 2,
          height: THUMB_SIZE,
          left: 0,
          position: 'absolute',
          top: (TRACK_HIT_HEIGHT - THUMB_SIZE) / 2,
          width: THUMB_SIZE,
        },
        timeRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: tokens.spacing.sm,
        },
        timeText: {
          color: tokens.text.link,
          fontSize: 14,
          lineHeight: 18,
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
          height: TRACK_HIT_HEIGHT,
          justifyContent: 'center',
          width: '100%',
        },
      }),
    [themeStyles, tokens]
  );

  const displayPositionSeconds = scrubPreviewSeconds ?? clockSeconds;
  const displayPosition = formatHHMMSS(Math.max(0, displayPositionSeconds));
  const displayDuration = formatHHMMSS(Math.max(0, durationSeconds));
  const live = source.live;
  const liveTime =
    live === null
      ? null
      : resolveLivePlaybackDisplay({
          positionSeconds: displayPositionSeconds,
          window: { startSeconds: 0, liveEdgeSeconds: durationSeconds },
        });
  const behindLiveText =
    liveTime === null || liveTime.behindLiveLabel === null
      ? null
      : t('media_player.behind_live', { time: formatHHMMSS(liveTime.behindLiveSeconds) });

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
            now: Math.round(scrubPreviewSeconds ?? clockSeconds),
            text:
              live !== null
                ? (behindLiveText ?? t('media.livestream.live'))
                : t('media_player.position_of_duration', {
                    duration: displayDuration,
                    position: displayPosition,
                  }),
          }}
          onLayout={handleTrackLayout}
          style={styles.trackHit}
          testID="full-player-scrubber"
        >
          {highlight.startRatio !== null && highlight.endRatio !== null ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.segmentBand,
                segmentBandStyle,
                {
                  left: `${highlight.startRatio * 100}%`,
                  width: `${Math.max(0, highlight.endRatio - highlight.startRatio) * 100}%`,
                },
              ]}
              testID="full-player-scrubber-highlight"
            />
          ) : null}
          <View style={styles.track}>
            <Animated.View
              style={[styles.trackFill, fillStyle]}
              testID="full-player-scrubber-fill"
            />
          </View>
          {markers.map((ratio) => (
            <View
              key={ratio}
              pointerEvents="none"
              style={[styles.chapterMarker, { left: `${ratio * 100}%` }]}
              testID="full-player-chapter-marker"
            />
          ))}
          <Animated.View
            pointerEvents="none"
            style={[styles.thumb, thumbStyle]}
            testID="full-player-scrubber-thumb"
          />
        </View>
      </GestureDetector>
      <View style={styles.timeRow}>
        {live === null ? (
          <>
            <Text style={styles.timeText} testID="full-player-position">
              {displayPosition}
            </Text>
            <Text style={styles.timeText} testID="full-player-duration">
              {displayDuration}
            </Text>
          </>
        ) : (
          <>
            {behindLiveText !== null && liveTime !== null ? (
              <Text
                accessibilityLabel={behindLiveText}
                style={styles.timeText}
                testID="full-player-live-behind"
              >
                {liveTime.behindLiveLabel}
              </Text>
            ) : (
              <View />
            )}
            {live.liveControl}
          </>
        )}
      </View>
    </View>
  );
}

/** This phone's full-player scrubber. */
export function FullPlayerScrubber({ chapters }: FullPlayerScrubberProps) {
  const { activeTarget, seekTo } = usePlaybackSession();
  const durationSeconds = usePlaybackDuration();
  const clockSeconds = usePlaybackPositionClock();
  const clip = activeTarget?.kind === 'clip' ? activeTarget.clip : null;
  const soundbite = activeTarget?.kind === 'soundbite' ? activeTarget.soundbite : null;
  const source = useMemo(
    (): FullPlayerScrubberSource => ({
      durationSeconds,
      clockSeconds,
      getRatio: getPlaybackProgressRatio,
      subscribeRatio: subscribePlaybackProgress,
      seekTo,
      clip,
      soundbite,
      live: null,
    }),
    [clip, clockSeconds, durationSeconds, seekTo, soundbite]
  );

  return <FullPlayerScrubberTrack chapters={chapters} source={source} />;
}

const getLiveWindowRatio = (): number => getLivePlaybackDisplay().windowFraction ?? 1;

/** A livestream's rewindable window on this phone. The Live control sits in the duration slot. */
function FullPlayerLiveScrubber() {
  const { seekTo } = usePlaybackSession();
  const display = useLivePlaybackDisplay();
  const liveWindow = useLivePlaybackWindow();
  const windowSeconds =
    liveWindow === null ? 0 : liveWindow.liveEdgeSeconds - liveWindow.startSeconds;
  const clockSeconds = Math.floor((display.windowFraction ?? 1) * windowSeconds);
  const seekIntoWindow = useCallback(
    (secondsIntoWindow: number) => {
      const current = getLivePlaybackWindow();
      if (!isRewindableLiveWindow(current)) {
        return;
      }
      seekTo(clampLiveSeekSeconds(current, current.startSeconds + secondsIntoWindow));
    },
    [seekTo]
  );
  const live = useMemo(
    (): FullPlayerScrubberLive => ({ liveControl: <FullPlayerLiveControl /> }),
    []
  );
  const source = useMemo(
    (): FullPlayerScrubberSource => ({
      durationSeconds: windowSeconds,
      clockSeconds,
      getRatio: getLiveWindowRatio,
      subscribeRatio: subscribeLivePlaybackDisplay,
      seekTo: seekIntoWindow,
      clip: null,
      soundbite: null,
      live,
    }),
    [clockSeconds, live, seekIntoWindow, windowSeconds]
  );

  return <FullPlayerScrubberTrack chapters={EMPTY_CHAPTERS} source={source} />;
}

/**
 * A livestream's progress band on this phone: the window scrubber when the stream can rewind,
 * else the Live control alone, centered at the same height.
 */
export function FullPlayerLiveProgress({ canRewind }: { canRewind: boolean }) {
  const styles = useMemo(
    () =>
      StyleSheet.create({
        liveOnlyBand: {
          alignItems: 'center',
          height: FULL_PLAYER_PROGRESS_BLOCK_HEIGHT,
          justifyContent: 'center',
          width: '100%',
        },
      }),
    []
  );
  if (canRewind) {
    return <FullPlayerLiveScrubber />;
  }
  return (
    <View style={styles.liveOnlyBand} testID="full-player-live-progress-block">
      <FullPlayerLiveControl />
    </View>
  );
}

/**
 * Another device's scrubber. `durationSeconds` is that device's shared duration. The bar has no
 * chapter marks or clip range. A released seek holds that position until a newer shared state
 * arrives or `PLAYBACK_COMMAND_TTL_MS` passes.
 */
export function FullPlayerRemoteScrubber({ durationSeconds }: { durationSeconds: number | null }) {
  const duration = durationSeconds !== null && durationSeconds > 0 ? durationSeconds : 0;
  const { seekTo } = usePlaybackSession();
  const remoteClock = useRemotePlaybackPositionSeconds();
  const [pendingSeek, setPendingSeek] = useState<RemotePendingSeek | null>(null);
  const revision = useCrossDevicePlaybackView().state?.revision ?? null;
  const revisionRef = useRef(revision);

  useEffect(() => {
    revisionRef.current = revision;
  }, [revision]);

  useEffect(() => {
    if (pendingSeek !== null && revision !== pendingSeek.baseRevision) {
      setPendingSeek(null);
    }
  }, [pendingSeek, revision]);

  useEffect(() => {
    if (pendingSeek === null) {
      return;
    }
    const timeoutId = setTimeout(() => {
      setPendingSeek(null);
    }, PLAYBACK_COMMAND_TTL_MS);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [pendingSeek]);

  // Release reads the shared-state revision at that moment. The callback identity stays put so
  // the scrubber gesture is not rebuilt mid-drag.
  const seek = useCallback(
    (seconds: number) => {
      setPendingSeek({
        seconds,
        baseRevision: revisionRef.current,
        atMs: Date.now(),
      });
      seekTo(seconds);
    },
    [seekTo]
  );

  const getRatio = useCallback(() => {
    const position = pendingSeek?.seconds ?? getCrossDevicePlaybackPositionSeconds(Date.now());
    return duration > 0 && position !== null ? clampRatio(position / duration) : 0;
  }, [duration, pendingSeek]);

  const clockSeconds = Math.floor(pendingSeek?.seconds ?? remoteClock ?? 0);
  const source = useMemo(
    (): FullPlayerScrubberSource => ({
      durationSeconds: duration,
      clockSeconds,
      getRatio,
      subscribeRatio: subscribeCrossDevicePlaybackPositionClock,
      seekTo: seek,
      clip: null,
      soundbite: null,
      live: null,
    }),
    [clockSeconds, duration, getRatio, seek]
  );

  return <FullPlayerScrubberTrack chapters={EMPTY_CHAPTERS} source={source} />;
}
