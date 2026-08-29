'use client';

import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import { FaGear } from 'react-icons/fa6';

import { getNextPlaybackSpeed, getPlaybackTranslationKey } from '@podverse/helpers';
import { DropdownMenuPanel, useDropdownKeyboardNavigation } from '@podverse/ui';

import { useMediaPlayer } from '../../../contexts/MediaPlayer';

import styles from '../../../styles/components/MediaPlayer/Buttons/SettingsButton.module.scss';

export const SettingsButton = () => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const { mpPlaybackSpeed, setMPPlaybackSpeed } = useMediaPlayer();
  const tMediaPlayer = useTranslations('media_player');

  const playbackSpeedOnClick = () => {
    setMPPlaybackSpeed(getNextPlaybackSpeed(mpPlaybackSpeed));
  };

  const menuItems = [
    {
      label: tMediaPlayer('playback_speed.playback_speed_with_value', {
        speed: tMediaPlayer(`playback_speed.speeds.${getPlaybackTranslationKey(mpPlaybackSpeed)}`),
      }),
      onClick: playbackSpeedOnClick,
    },
  ];

  const { open, setOpen, focusedIndex, setFocusedIndex, handleButtonKeyDown, handleMenuKeyDown } =
    useDropdownKeyboardNavigation({
      itemCount: menuItems.length,
      onItemSelect: (idx) => menuItems[idx]?.onClick(),
      onClose: () => setOpen(false),
      buttonRef,
      menuRef,
    });

  return (
    <div className={styles.settingsDropdownWrapper}>
      <button
        ref={buttonRef}
        className={styles.settingsButton}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={tMediaPlayer('player_settings')}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleButtonKeyDown}
        type="button"
      >
        <FaGear aria-hidden />
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
