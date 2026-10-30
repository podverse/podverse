'use client';

import classNames from 'classnames';
import { useTranslations } from 'next-intl';
import React, { useEffect, useRef, useState } from 'react';

import { formatHHMMSS } from '@podverse/helpers';

import { useLiveMediaSnapshot } from '../../../hooks/useLiveMediaSnapshot';
import { usePlayerTransport } from '../../../hooks/usePlayerTransport';
import { liveMediaStore } from '../../../lib/livePlayback/liveMediaStore';

import styles from '../../../styles/components/MediaPlayer/Sliders/MediaPlayerProgress.module.scss';

type LiveMediaPlayerProgressProps = {
  includeMobileTime?: boolean;
  layoutVariant: 'default' | 'edge';
};

function fractionFromClientX(clientX: number, bar: HTMLDivElement): number | null {
  const rect = bar.getBoundingClientRect();
  if (rect.width === 0) {
    return null;
  }
  const ratio = (clientX - rect.left) / rect.width;
  return Math.min(Math.max(ratio, 0), 1);
}

type LiveControlButtonProps = {
  atLiveEdge: boolean;
  visibleLabel: string;
  accessibleName: string;
  onGoToLive: () => void;
};

function LiveControlButton({
  atLiveEdge,
  visibleLabel,
  accessibleName,
  onGoToLive,
}: LiveControlButtonProps) {
  return (
    <button
      type="button"
      className={classNames(styles.liveControl, atLiveEdge && styles.liveControlAtEdge)}
      aria-label={accessibleName}
      onClick={onGoToLive}
      data-testid="media-player-live-control"
      data-at-live-edge={atLiveEdge ? 'true' : 'false'}
    >
      {visibleLabel}
    </button>
  );
}

function BehindLiveReadout({
  label,
  screenReaderText,
}: {
  label: string | null;
  screenReaderText: string;
}) {
  if (label === null) {
    return null;
  }
  return (
    <>
      <span aria-hidden="true" data-testid="media-player-live-behind">
        {label}
      </span>
      <span className={styles.visuallyHidden}>{screenReaderText}</span>
    </>
  );
}

export const LiveMediaPlayerProgress: React.FC<LiveMediaPlayerProgressProps> = ({
  includeMobileTime,
  layoutVariant,
}) => {
  const { display } = useLiveMediaSnapshot();
  const { goToLive } = usePlayerTransport();
  const tMedia = useTranslations('media');
  const tMediaPlayer = useTranslations('media_player');
  const barRef = useRef<HTMLDivElement>(null);
  const [dragFraction, setDragFraction] = useState<number | null>(null);
  const dragFractionRef = useRef<number | null>(null);
  const removeWindowListenersRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      removeWindowListenersRef.current?.();
      removeWindowListenersRef.current = null;
    };
  }, []);

  const assignDragFraction = (value: number | null) => {
    dragFractionRef.current = value;
    setDragFraction(value);
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (barRef.current === null) {
      return;
    }
    const fraction = fractionFromClientX(event.clientX, barRef.current);
    if (fraction === null) {
      return;
    }
    assignDragFraction(fraction);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (barRef.current === null) {
        return;
      }
      const next = fractionFromClientX(moveEvent.clientX, barRef.current);
      if (next === null || next === dragFractionRef.current) {
        return;
      }
      assignDragFraction(next);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      removeWindowListenersRef.current = null;
      const released = dragFractionRef.current;
      if (typeof released === 'number') {
        liveMediaStore.seekToFraction(released);
      }
      assignDragFraction(null);
    };

    removeWindowListenersRef.current?.();
    removeWindowListenersRef.current = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches.item(event.changedTouches.length - 1);
    if (touch === null || barRef.current === null) {
      return;
    }
    const fraction = fractionFromClientX(touch.clientX, barRef.current);
    if (fraction === null) {
      return;
    }
    liveMediaStore.seekToFraction(fraction);
  };

  const liveLabel = tMedia('livestream.live');
  const goToLiveName = tMediaPlayer('go_to_live');
  const behindLiveText = tMediaPlayer('behind_live', {
    time: formatHHMMSS(display.behindLiveSeconds),
  });
  const shownFraction = dragFraction ?? display.windowFraction ?? 1;
  const valueText = display.behindLiveLabel !== null ? behindLiveText : liveLabel;

  const renderLiveControl = () => (
    <LiveControlButton
      atLiveEdge={display.isAtLiveEdge}
      visibleLabel={liveLabel}
      accessibleName={goToLiveName}
      onGoToLive={goToLive}
    />
  );

  const renderBehind = () => (
    <BehindLiveReadout label={display.behindLiveLabel} screenReaderText={behindLiveText} />
  );

  // Window ArrowLeft and ArrowRight jump 10 seconds when the window can rewind.
  const scrubber = (
    <div
      className={styles.customProgressBar}
      ref={barRef}
      onMouseDown={handleMouseDown}
      onTouchEnd={handleTouchEnd}
      role="slider"
      aria-label={tMediaPlayer('seek')}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(shownFraction * 100)}
      aria-valuetext={valueText}
      tabIndex={0}
      data-testid="media-player-live-scrubber"
    >
      <div className={styles.customProgressBarInner}>
        <div className={styles.progressLevel} style={{ width: `${shownFraction * 100}%` }} />
        <div
          className={styles.progressRemaining}
          style={{ width: `${(1 - shownFraction) * 100}%` }}
        />
      </div>
    </div>
  );

  if (layoutVariant === 'edge' && !display.canRewind) {
    // The narrow bar's top edge is too small a target. The full-screen player has the
    // Live control.
    return (
      <div className={styles.liveEdgeLabel} data-testid="media-player-live-edge-label">
        <span className={styles.liveEdgeLabelText}>{liveLabel}</span>
      </div>
    );
  }

  if (layoutVariant === 'edge') {
    return (
      <div className={classNames(styles.mediaPlayerProgress, styles.mediaPlayerProgressEdge)}>
        {scrubber}
      </div>
    );
  }

  if (!display.canRewind) {
    return (
      <div className={classNames(styles.mediaPlayerProgress, styles.liveOnly)}>
        {renderLiveControl()}
      </div>
    );
  }

  return (
    <div className={styles.mediaPlayerProgress}>
      <span className={styles.mediaPlayerProgressTime}>{renderBehind()}</span>
      {scrubber}
      <span className={styles.mediaPlayerProgressDuration}>{renderLiveControl()}</span>
      {includeMobileTime ? (
        <div className={styles.mobileTimeWrapper}>
          <span className={styles.mediaPlayerProgressTimeMobile}>{renderBehind()}</span>
          <span className={styles.mediaPlayerProgressDurationMobile}>{renderLiveControl()}</span>
        </div>
      ) : null}
    </div>
  );
};
