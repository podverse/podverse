'use client';

import { useTranslations } from 'next-intl';
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import { useRef, useState } from 'react';
import { FaVolumeHigh, FaVolumeXmark } from 'react-icons/fa6';

import { useMediaPlayer } from '../../contexts/MediaPlayer';

import styles from '../../styles/components/embed/EmbedResponsiveMuteControl.module.scss';

export function EmbedResponsiveMuteControl() {
  const { mpVolume, setMPVolume, mpIsMuted, setMPIsMuted } = useMediaPlayer();
  const tFeatures = useTranslations('features');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const setVolumeFromClientY = (clientY: number) => {
    if (barRef.current === null) {
      return;
    }
    const rect = barRef.current.getBoundingClientRect();
    const fromBottom = rect.bottom - clientY;
    const percent = Math.min(Math.max(fromBottom / rect.height, 0), 1);
    setMPIsMuted(false);
    setMPVolume(Number(percent.toFixed(2)));
  };

  const handleBarMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    isDragging.current = true;
    setVolumeFromClientY(event.clientY);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (isDragging.current) {
        setVolumeFromClientY(moveEvent.clientY);
      }
    };
    const handleMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleBarKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowUp') {
      setMPIsMuted(false);
      setMPVolume(Math.min(1, Number((mpVolume + 0.05).toFixed(2))));
      event.preventDefault();
    }
    if (event.key === 'ArrowDown') {
      setMPIsMuted(false);
      setMPVolume(Math.max(0, Number((mpVolume - 0.05).toFixed(2))));
      event.preventDefault();
    }
  };

  const levelPercent = mpIsMuted ? 0 : Math.round(mpVolume * 100);

  return (
    <div
      className={styles.container}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsPopoverOpen(false);
        }
      }}
      onFocus={() => setIsPopoverOpen(true)}
      onMouseEnter={() => setIsPopoverOpen(true)}
      onMouseLeave={() => setIsPopoverOpen(false)}
    >
      <button
        className={styles.muteToggle}
        aria-label={mpIsMuted ? tFeatures('embed_responsive_unmute') : tFeatures('embed_responsive_mute')}
        data-testid="embed-responsive-mute-toggle"
        onClick={() => setMPIsMuted(!mpIsMuted)}
        type="button"
      >
        {mpIsMuted ? <FaVolumeXmark aria-hidden /> : <FaVolumeHigh aria-hidden />}
      </button>
      {isPopoverOpen ? (
        <div className={styles.popover} data-testid="embed-responsive-volume-popover">
          <div
            className={styles.verticalBar}
            ref={barRef}
            aria-orientation="vertical"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={levelPercent}
            aria-valuetext={mpIsMuted ? 'Muted' : `${levelPercent}%`}
            onClick={(event) => setVolumeFromClientY(event.clientY)}
            onKeyDown={handleBarKeyDown}
            onMouseDown={handleBarMouseDown}
            role="slider"
            tabIndex={0}
          >
            <div className={styles.verticalBarLevel} style={{ height: `${levelPercent}%` }} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
