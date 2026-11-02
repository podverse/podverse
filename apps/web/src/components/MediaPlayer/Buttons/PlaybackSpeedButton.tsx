'use client';

import { useTranslations } from 'next-intl';
import { useRef } from 'react';

import {
  getPlaybackTranslationKey,
  PLAYBACK_SPEED_VALUES,
} from '@podverse/helpers';
import type { PlaybackSpeedValue } from '@podverse/helpers';
import type { DropdownMenuPanelItem } from '@podverse/ui';
import { DropdownMenuPanel, useDropdownKeyboardNavigation } from '@podverse/ui';

import { usePlayerTransport } from '../../../hooks/usePlayerTransport';

import styles from '../../../styles/components/MediaPlayer/Buttons/PlaybackSpeedButton.module.scss';

export const PlaybackSpeedButton = () => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const tMediaPlayer = useTranslations('media_player');
  const { playbackSpeed, setPlaybackSpeed } = usePlayerTransport();
  const selectItemRef = useRef<(idx: number) => void>(() => {});

  const speedLabel = tMediaPlayer(
    `playback_speed.speeds.${getPlaybackTranslationKey(playbackSpeed)}`
  );

  const { open, setOpen, focusedIndex, setFocusedIndex, handleButtonKeyDown, handleMenuKeyDown } =
    useDropdownKeyboardNavigation({
      itemCount: PLAYBACK_SPEED_VALUES.length,
      onItemSelect: (idx) => {
        selectItemRef.current(idx);
      },
      onClose: () => setOpen(false),
      closeOnItemSelect: false,
      buttonRef,
      menuRef,
    });

  const selectSpeed = (rate: PlaybackSpeedValue) => {
    setPlaybackSpeed(rate);
    setOpen(false);
  };

  const menuItems: DropdownMenuPanelItem[] = PLAYBACK_SPEED_VALUES.map((rate) => ({
    label: tMediaPlayer(`playback_speed.speeds.${getPlaybackTranslationKey(rate)}`),
    onClick: () => {
      selectSpeed(rate);
    },
  }));
  selectItemRef.current = (idx) => {
    menuItems[idx]?.onClick();
  };

  return (
    <div className={styles.playbackSpeedDropdownWrapper}>
      <button
        ref={buttonRef}
        className={styles.playbackSpeedButton}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={tMediaPlayer('playback_speed.playback_speed_with_value', { speed: speedLabel })}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleButtonKeyDown}
        type="button"
      >
        {speedLabel}
      </button>
      <DropdownMenuPanel
        menuItems={menuItems}
        open={open}
        menuRef={menuRef}
        focusedIndex={focusedIndex}
        setFocusedIndex={setFocusedIndex}
        handleMenuKeyDown={handleMenuKeyDown}
        setOpen={setOpen}
        verticalPosition="above"
      />
    </div>
  );
};
