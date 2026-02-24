'use client';

import type { DTOClip, DTOItemChapter } from '@podverse/helpers';
import { formatHHMMSS } from '@podverse/helpers';
import React, { useRef, useState, useCallback } from 'react';
import { EVENTS } from '../../../constants/events';
import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../../../contexts/MediaPlayerCurrentTime';
import { ChapterProgressTooltip } from './ChapterProgressTooltip';
import styles from '../../../styles/components/MediaPlayer/Sliders/MediaPlayerProgress.module.scss';

const LONG_PRESS_MS = 500;
const TOOLTIP_AUTO_DISMISS_MS = 2000;

type MediaPlayerProgressProps = {
  isClipForm?: boolean;
  overrideHighlightStartTime?: number | null;
  overrideHighlightEndTime?: number | null;
  includeMobileTime?: boolean;
};

export const MediaPlayerProgress: React.FC<MediaPlayerProgressProps> = ({
  isClipForm,
  overrideHighlightStartTime,
  overrideHighlightEndTime,
  includeMobileTime,
}) => {
  const { mpClip, mpItemSoundbite, mpItemChapter, mpItemChapters, mpDuration } = useMediaPlayer();
  const { mpCurrentTime } = useMediaPlayerCurrentTime();
  const barRef = useRef<HTMLDivElement>(null);
  const progress = mpDuration > 0 ? mpCurrentTime / mpDuration : 0;

  const [tooltipChapter, setTooltipChapter] = useState<DTOItemChapter | null>(null);
  const [tooltipPercent, setTooltipPercent] = useState(0);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchClientXRef = useRef<number | null>(null);
  const tooltipDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ignoreNextClickRef = useRef(false);

  const chapters = Array.isArray(mpItemChapters) ? mpItemChapters : [];
  const chapterBoundaryRatios =
    mpDuration > 0 && chapters.length > 0 ? getChapterBoundaryRatios(chapters, mpDuration) : [];

  const { highlightStartPosition, highlightEndPosition } = getHighlightPositions({
    mpDuration,
    isClipForm,
    overrideHighlightStartTime,
    overrideHighlightEndTime,
    mpClip,
    mpItemSoundbite,
    mpItemChapter,
  });

  const getPercentFromClientX = useCallback(
    (clientX: number): number | null => {
      if (!barRef.current || mpDuration === 0) {
        return null;
      }
      const rect = barRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      return Math.min(Math.max(x / rect.width, 0), 1);
    },
    [mpDuration]
  );

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

  const setProgressFromEvent = (e: MouseEvent | React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current || mpDuration === 0) {
      return;
    }
    const rect = barRef.current.getBoundingClientRect();
    const x = (e instanceof MouseEvent ? e.clientX : e.nativeEvent.clientX) - rect.left;
    const percent = Math.min(Math.max(x / rect.width, 0), 1);
    const newTime = Math.round(percent * mpDuration);
    window.dispatchEvent(new CustomEvent(EVENTS.MEDIA_PLAYER.SEEK, { detail: { time: newTime } }));
  };

  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (ignoreNextClickRef.current) {
      ignoreNextClickRef.current = false;
      return;
    }
    setProgressFromEvent(e);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setProgressFromEvent(e);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      setProgressFromEvent(moveEvent);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
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
        const clientX = touchClientXRef.current;
        if (clientX !== null) {
          const percent = getPercentFromClientX(clientX);
          if (percent !== null) {
            showTooltipForPercent(percent, true);
            ignoreNextClickRef.current = true;
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

  return (
    <div className={styles.mediaPlayerProgress}>
      <span className={styles.mediaPlayerProgressTime}>{formatHHMMSS(mpCurrentTime)}</span>
      <div
        className={styles.customProgressBar}
        ref={barRef}
        onClick={handleBarClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleBarMouseMove}
        onMouseLeave={handleBarMouseLeave}
        onTouchStart={handleBarTouchStart}
        onTouchEnd={handleBarTouchEnd}
        onTouchCancel={handleBarTouchCancel}
        role="slider"
        aria-valuenow={mpCurrentTime}
        aria-valuemin={0}
        aria-valuemax={mpDuration}
        aria-valuetext={`${formatHHMMSS(mpCurrentTime)} of ${formatHHMMSS(mpDuration)}`}
        tabIndex={0}
      >
        <div className={styles.customProgressBarInner}>
          <div className={styles.progressLevel} style={{ width: `${progress * 100}%` }} />
          <div className={styles.progressRemaining} style={{ width: `${(1 - progress) * 100}%` }} />
        </div>
        {chapterBoundaryRatios.map((ratio) => (
          <div
            key={ratio}
            className={styles.chapterMarker}
            style={{ left: `${ratio * 100}%` }}
            aria-hidden
          />
        ))}
        {highlightStartPosition !== null && highlightEndPosition !== null && (
          <div
            className={styles.highlightedSection}
            style={{
              left: `${highlightStartPosition * 100}%`,
              width: `${Math.min(highlightEndPosition - highlightStartPosition, 1 - highlightStartPosition) * 100}%`,
            }}
          />
        )}
      </div>
      {tooltipChapter && (
        <ChapterProgressTooltip
          visible
          title={tooltipChapter.title ?? ''}
          barRect={barRef.current?.getBoundingClientRect() ?? null}
          percent={tooltipPercent}
        />
      )}
      <span className={styles.mediaPlayerProgressDuration}>{formatHHMMSS(mpDuration)}</span>
      {includeMobileTime && (
        <div className={styles.mobileTimeWrapper}>
          <span className={styles.mediaPlayerProgressTimeMobile}>
            {formatHHMMSS(mpCurrentTime)}
          </span>
          <span className={styles.mediaPlayerProgressDurationMobile}>
            {formatHHMMSS(mpDuration)}
          </span>
        </div>
      )}
    </div>
  );
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

/**
 * Unique chapter boundary ratios in (0, 1) for drawing vertical markers.
 * No marker at 0 or 1.
 */
function getChapterBoundaryRatios(chapters: DTOItemChapter[], duration: number): number[] {
  if (duration <= 0) {
    return [];
  }
  const set = new Set<number>();
  for (const ch of chapters) {
    const startSec = Number(ch.start_time);
    const endSec = ch.end_time !== null && ch.end_time !== undefined ? Number(ch.end_time) : null;
    const startRatio = Math.max(0, Math.min(1, startSec / duration));
    const endRatio =
      endSec !== null && !isNaN(endSec) ? Math.max(0, Math.min(1, endSec / duration)) : 1;
    if (startRatio > 0 && startRatio < 1) {
      set.add(startRatio);
    }
    if (endRatio > 0 && endRatio < 1) {
      set.add(endRatio);
    }
  }
  return [...set].sort((a, b) => a - b);
}

/**
 * Chapter that contains the given position (0–1), or null.
 * Clamps chapter start/end to [0, duration]; missing end_time uses next chapter start or duration.
 */
function getChapterAtPercent(
  percent: number,
  chapters: DTOItemChapter[],
  duration: number
): DTOItemChapter | null {
  if (duration <= 0 || chapters.length === 0) {
    return null;
  }
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    if (ch === undefined) continue;
    const startSec = Number(ch.start_time);
    let endSec: number;
    if (ch.end_time !== null && ch.end_time !== undefined && !isNaN(Number(ch.end_time))) {
      endSec = Number(ch.end_time);
    } else if (i < chapters.length - 1) {
      const nextCh = chapters[i + 1];
      endSec = nextCh !== undefined ? Number(nextCh.start_time) : duration;
    } else {
      endSec = duration;
    }
    const startRatio = Math.max(0, Math.min(1, startSec / duration));
    const endRatio = Math.max(0, Math.min(1, endSec / duration));
    if (percent >= startRatio && percent < endRatio) {
      return ch;
    }
  }
  return null;
}
