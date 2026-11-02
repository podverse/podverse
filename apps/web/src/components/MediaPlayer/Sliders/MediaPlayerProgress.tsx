'use client';

import classNames from 'classnames';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { DTOClip, DTOItemChapter } from '@podverse/helpers';
import { formatHHMMSS } from '@podverse/helpers';
import {
  getChapterAtPercent,
  getChapterBoundaryRatios,
} from '@podverse/playback-core/chapterProgressMarkers';

import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { useMediaPlayerControls } from '../../../contexts/MediaPlayerControls';
import { useMediaPlayerCurrentTime } from '../../../contexts/MediaPlayerCurrentTime';
import { useRemotePlayerDisplay } from '../../../hooks/useRemotePlayerDisplay';
import { isPlayerResourceLive } from '../../../lib/crossDevicePlayback/playbackResource';
import {
  isSeekDisplayHoldLanded,
  SEEK_DISPLAY_HOLD_MAX_MS,
} from '../../../lib/playback/seekDisplayHold';
import { ChapterProgressTooltip } from './ChapterProgressTooltip';
import { LiveMediaPlayerProgress } from './LiveMediaPlayerProgress';
import { RemoteMediaPlayerProgress } from './RemoteMediaPlayerProgress';

import styles from '../../../styles/components/MediaPlayer/Sliders/MediaPlayerProgress.module.scss';

const LONG_PRESS_MS = 500;
const TOOLTIP_AUTO_DISMISS_MS = 2000;

type MediaPlayerProgressProps = {
  isClipForm?: boolean;
  overrideHighlightStartTime?: number | null;
  overrideHighlightEndTime?: number | null;
  includeMobileTime?: boolean;
  layoutVariant?: 'default' | 'embed' | 'edge';
  showChapterMarkers?: boolean;
  showChapterHoverTooltip?: boolean;
};

/**
 * Local file progress. A drag updates the fill and clocks only; one seek runs when the pointer
 * is released, matching the remote bar and the mobile scrubber.
 */
export const LocalMediaPlayerProgress: React.FC<MediaPlayerProgressProps> = ({
  isClipForm,
  overrideHighlightStartTime,
  overrideHighlightEndTime,
  includeMobileTime,
  layoutVariant = 'default',
  showChapterMarkers = true,
  showChapterHoverTooltip,
}) => {
  const { mpClip, mpItemSoundbite, mpItemChapter, mpItemChapters, mpDuration } = useMediaPlayer();
  const { seek } = useMediaPlayerControls();
  const { mpCurrentTime, setMPCurrentTime } = useMediaPlayerCurrentTime();
  const barRef = useRef<HTMLDivElement>(null);
  const [dragSeconds, setDragSeconds] = useState<number | null>(null);
  const dragSecondsRef = useRef<number | null>(null);
  const [heldSeconds, setHeldSeconds] = useState<number | null>(null);
  const heldSecondsRef = useRef<number | null>(null);
  const removeWindowListenersRef = useRef<(() => void) | null>(null);
  const holdClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [tooltipChapter, setTooltipChapter] = useState<DTOItemChapter | null>(null);
  const [tooltipPercent, setTooltipPercent] = useState(0);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchClientXRef = useRef<number | null>(null);
  const tooltipDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chapters = Array.isArray(mpItemChapters) ? mpItemChapters : [];
  const effectiveShowChapterMarkers = showChapterMarkers && !isClipForm;
  const chapterBoundaryRatios =
    effectiveShowChapterMarkers && mpDuration > 0 && chapters.length > 0
      ? getChapterBoundaryRatios(chapters, mpDuration)
      : [];

  // The embed player does not show the chapter info tooltip on progress-bar hover.
  const enableChapterHoverTooltip =
    !isClipForm && (showChapterHoverTooltip ?? layoutVariant !== 'embed');

  const { highlightStartPosition, highlightEndPosition } = getHighlightPositions({
    mpDuration,
    isClipForm,
    overrideHighlightStartTime,
    overrideHighlightEndTime,
    mpClip,
    mpItemSoundbite,
    mpItemChapter,
  });

  const durationRef = useRef(mpDuration);
  durationRef.current = mpDuration;

  const clearHold = useCallback(() => {
    if (holdClearTimerRef.current !== null) {
      clearTimeout(holdClearTimerRef.current);
      holdClearTimerRef.current = null;
    }
    heldSecondsRef.current = null;
    setHeldSeconds(null);
  }, []);

  const assignDragSeconds = (value: number | null) => {
    dragSecondsRef.current = value;
    setDragSeconds(value);
  };

  const armSeekHold = useCallback((seconds: number) => {
    if (holdClearTimerRef.current !== null) {
      clearTimeout(holdClearTimerRef.current);
    }
    heldSecondsRef.current = seconds;
    setHeldSeconds(seconds);
    holdClearTimerRef.current = setTimeout(() => {
      holdClearTimerRef.current = null;
      heldSecondsRef.current = null;
      setHeldSeconds(null);
    }, SEEK_DISPLAY_HOLD_MAX_MS);
  }, []);

  useEffect(() => {
    return () => {
      removeWindowListenersRef.current?.();
      removeWindowListenersRef.current = null;
      if (holdClearTimerRef.current !== null) {
        clearTimeout(holdClearTimerRef.current);
        holdClearTimerRef.current = null;
      }
      if (longPressTimerRef.current !== null) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      if (tooltipDismissTimerRef.current !== null) {
        clearTimeout(tooltipDismissTimerRef.current);
        tooltipDismissTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const held = heldSecondsRef.current;
    if (held === null) {
      return;
    }
    if (isSeekDisplayHoldLanded({ positionSeconds: mpCurrentTime, seekSeconds: held })) {
      clearHold();
    }
  }, [mpCurrentTime, clearHold]);

  const getPercentFromClientX = useCallback(
    (clientX: number): number | null => {
      if (!barRef.current || mpDuration === 0) {
        return null;
      }
      const x = clientX - barRef.current.getBoundingClientRect().left;
      return Math.min(Math.max(x / barRef.current.getBoundingClientRect().width, 0), 1);
    },
    [mpDuration]
  );

  const secondsFromClientX = useCallback((clientX: number): number | null => {
    const currentDuration = durationRef.current;
    if (barRef.current === null || currentDuration === 0) {
      return null;
    }
    const x = clientX - barRef.current.getBoundingClientRect().left;
    const percent = Math.min(Math.max(x / barRef.current.getBoundingClientRect().width, 0), 1);
    return Math.round(percent * currentDuration);
  }, []);

  const showTooltipForPercent = useCallback(
    (percent: number, autoDismiss: boolean = false) => {
      const chapter = getChapterAtPercent(percent, chapters, mpDuration);
      if (chapter) {
        setTooltipChapter(chapter);
        setTooltipPercent(percent);
        if (tooltipDismissTimerRef.current) {
          clearTimeout(tooltipDismissTimerRef.current);
          tooltipDismissTimerRef.current = null;
        }
        if (autoDismiss) {
          tooltipDismissTimerRef.current = setTimeout(() => {
            setTooltipChapter(null);
            tooltipDismissTimerRef.current = null;
          }, TOOLTIP_AUTO_DISMISS_MS);
        }
      }
    },
    [chapters, mpDuration]
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const seconds = secondsFromClientX(e.clientX);
    if (seconds === null) {
      return;
    }
    assignDragSeconds(seconds);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const next = secondsFromClientX(moveEvent.clientX);
      if (next === null || next === dragSecondsRef.current) {
        return;
      }
      assignDragSeconds(next);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      removeWindowListenersRef.current = null;
      const released = dragSecondsRef.current;
      if (typeof released === 'number' && durationRef.current > 0) {
        seek(released);
        setMPCurrentTime(released);
        armSeekHold(released);
      }
      assignDragSeconds(null);
    };

    removeWindowListenersRef.current?.();
    removeWindowListenersRef.current = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableChapterHoverTooltip) {
      return;
    }
    if (dragSecondsRef.current !== null) {
      return;
    }
    const percent = getPercentFromClientX(e.clientX);
    if (percent !== null) {
      showTooltipForPercent(percent, false);
    }
  };

  const handleBarMouseLeave = () => {
    if (tooltipDismissTimerRef.current) {
      clearTimeout(tooltipDismissTimerRef.current);
      tooltipDismissTimerRef.current = null;
    }
    setTooltipChapter(null);
  };

  const handleBarTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setTooltipChapter(null);
    const touch = e.targetTouches[0];
    if (touch) {
      touchClientXRef.current = touch.clientX;
      longPressTimerRef.current = setTimeout(() => {
        longPressTimerRef.current = null;
        if (touchClientXRef.current !== null) {
          const percent = getPercentFromClientX(touchClientXRef.current);
          if (percent !== null) {
            showTooltipForPercent(percent, true);
          }
        }
      }, LONG_PRESS_MS);
    }
  };

  const handleBarTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchClientXRef.current = null;
  };

  const handleBarTouchCancel = () => {
    handleBarTouchEnd();
  };

  const shown = Math.min(
    dragSeconds ?? heldSeconds ?? mpCurrentTime,
    mpDuration > 0 ? mpDuration : Number.POSITIVE_INFINITY
  );
  const progress = mpDuration > 0 ? shown / mpDuration : 0;
  const showClock = layoutVariant === 'default';

  return (
    <div
      className={classNames(
        styles.mediaPlayerProgress,
        layoutVariant === 'embed' && styles.mediaPlayerProgressEmbed,
        layoutVariant === 'edge' && styles.mediaPlayerProgressEdge
      )}
    >
      {showClock ? (
        <span className={styles.mediaPlayerProgressTime} data-testid="media-player-current-time">
          {formatHHMMSS(shown)}
        </span>
      ) : null}
      <div
        className={styles.customProgressBar}
        ref={barRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleBarMouseMove}
        onMouseLeave={handleBarMouseLeave}
        onTouchStart={handleBarTouchStart}
        onTouchEnd={handleBarTouchEnd}
        onTouchCancel={handleBarTouchCancel}
        role="slider"
        aria-valuenow={shown}
        aria-valuemin={0}
        aria-valuemax={mpDuration}
        aria-valuetext={`${formatHHMMSS(shown)} of ${formatHHMMSS(mpDuration)}`}
        tabIndex={0}
        data-testid="media-player-local-progress"
      >
        <div className={styles.customProgressBarInner}>
          <div className={styles.progressLevel} style={{ width: `${progress * 100}%` }} />
          <div className={styles.progressRemaining} style={{ width: `${(1 - progress) * 100}%` }} />
          {highlightStartPosition !== null && highlightEndPosition !== null && (
            <div
              className={styles.highlightedSection}
              style={{
                left: `${highlightStartPosition * 100}%`,
                width: `${Math.min(highlightEndPosition - highlightStartPosition, 1 - highlightStartPosition) * 100}%`,
              }}
            />
          )}
          {chapterBoundaryRatios.map((ratio) => (
            <div
              key={ratio}
              className={styles.chapterMarker}
              style={{ left: `${ratio * 100}%` }}
              aria-hidden
            />
          ))}
        </div>
      </div>
      {tooltipChapter ? (
        <ChapterProgressTooltip
          visible
          title={tooltipChapter.title ?? ''}
          barRect={barRef.current?.getBoundingClientRect() ?? null}
          percent={tooltipPercent}
        />
      ) : null}
      {showClock ? (
        <span className={styles.mediaPlayerProgressDuration} data-testid="media-player-duration">
          {formatHHMMSS(mpDuration)}
        </span>
      ) : null}
      {includeMobileTime && (
        <div className={styles.mobileTimeWrapper}>
          <span className={styles.mediaPlayerProgressTimeMobile}>{formatHHMMSS(shown)}</span>
          <span className={styles.mediaPlayerProgressDurationMobile}>
            {formatHHMMSS(mpDuration)}
          </span>
        </div>
      )}
    </div>
  );
};

export const MediaPlayerProgress: React.FC<MediaPlayerProgressProps> = (props) => {
  const remote = useRemotePlayerDisplay();
  const { mpItem, mpAddByRSS } = useMediaPlayer();
  if (remote !== null && !props.isClipForm && props.layoutVariant !== 'embed') {
    return (
      <RemoteMediaPlayerProgress
        remote={remote}
        includeMobileTime={props.includeMobileTime}
        layoutVariant={props.layoutVariant === 'edge' ? 'edge' : 'default'}
      />
    );
  }
  if (
    !props.isClipForm &&
    props.layoutVariant !== 'embed' &&
    isPlayerResourceLive({ mpItem, mpAddByRSS })
  ) {
    return (
      <LiveMediaPlayerProgress
        includeMobileTime={props.includeMobileTime}
        layoutVariant={props.layoutVariant === 'edge' ? 'edge' : 'default'}
      />
    );
  }
  return <LocalMediaPlayerProgress {...props} />;
};

function getHighlightPositions({
  mpDuration,
  isClipForm,
  overrideHighlightStartTime,
  overrideHighlightEndTime,
  mpClip,
  mpItemSoundbite,
  mpItemChapter,
}: {
  mpDuration?: number;
  isClipForm?: boolean;
  overrideHighlightStartTime?: number | null;
  overrideHighlightEndTime?: number | null;
  mpClip?: DTOClip | null;
  mpItemSoundbite?: { start_time: string | number; duration: string | number } | null;
  mpItemChapter?: { start_time: string | number; end_time?: string | number | null } | null;
}) {
  let highlightStartPosition = null;
  let highlightEndPosition = null;
  if (mpDuration) {
    if (isClipForm) {
      if (overrideHighlightStartTime || overrideHighlightStartTime === 0) {
        highlightStartPosition = overrideHighlightStartTime / mpDuration;
      }
      if (overrideHighlightEndTime) {
        highlightEndPosition = overrideHighlightEndTime / mpDuration;
      }
    } else if (mpItemSoundbite) {
      const soundbiteStart = Number(mpItemSoundbite.start_time);
      const soundbiteDuration = Number(mpItemSoundbite.duration);
      if (!isNaN(soundbiteStart)) {
        highlightStartPosition = soundbiteStart / mpDuration;
      }
      if (!isNaN(soundbiteStart) && !isNaN(soundbiteDuration)) {
        highlightEndPosition = (soundbiteStart + soundbiteDuration) / mpDuration;
      }
    } else if (mpItemChapter) {
      const chapterStart = Number(mpItemChapter.start_time);
      const chapterEnd = mpItemChapter.end_time !== null ? Number(mpItemChapter.end_time) : null;
      if (!isNaN(chapterStart)) {
        highlightStartPosition = chapterStart / mpDuration;
      }
      if (chapterEnd !== null && !isNaN(chapterEnd)) {
        highlightEndPosition = chapterEnd / mpDuration;
      }
    } else {
      const clipStartTime = Number(mpClip?.start_time);
      const clipEndTime = Number(mpClip?.end_time);
      if (clipStartTime || clipStartTime === 0) {
        highlightStartPosition = clipStartTime / mpDuration;
      }
      if (clipEndTime) {
        highlightEndPosition = clipEndTime / mpDuration;
      }
    }
  }
  // Clamp to [0, 1] so highlight never extends beyond progress bar width
  if (highlightStartPosition !== null) {
    highlightStartPosition = Math.max(0, Math.min(1, highlightStartPosition));
  }
  if (highlightEndPosition !== null) {
    highlightEndPosition = Math.max(0, Math.min(1, highlightEndPosition));
    if (highlightStartPosition !== null && highlightEndPosition <= highlightStartPosition) {
      highlightEndPosition = highlightStartPosition;
    }
  }
  return { highlightStartPosition, highlightEndPosition };
}
