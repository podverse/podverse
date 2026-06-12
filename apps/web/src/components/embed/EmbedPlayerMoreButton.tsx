'use client';

import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import { FaEllipsis } from 'react-icons/fa6';

import { getNextPlaybackSpeed, getPlaybackTranslationKey } from '@podverse/helpers';
import { DropdownMenuPanel, useDropdownKeyboardNavigation } from '@podverse/ui';

import { useMediaPlayer } from '../../contexts/MediaPlayer';

import styles from '../../styles/components/embed/EmbedPlayerMoreButton.module.scss';

export function EmbedPlayerMoreButton() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const { mpPlaybackSpeed, setMPPlaybackSpeed } = useMediaPlayer();
  const tMediaPlayer = useTranslations('media_player');
  const tMedia = useTranslations('media');

  const playbackSpeedOnClick = () => {
    setMPPlaybackSpeed(getNextPlaybackSpeed(mpPlaybackSpeed));
  };

  const menuItems = [
    {
      label: tMediaPlayer('playback_speed.playback_speed_with_value', {
        speed: tMediaPlayer(`playback_speed.speeds.${getPlaybackTranslationKey(mpPlaybackSpeed)}`),
      }),
      onClick: playbackSpeedOnClick,
      dismissOnSelect: false,
    },
  ];

  const { open, setOpen, focusedIndex, setFocusedIndex, handleButtonKeyDown, handleMenuKeyDown } =
    useDropdownKeyboardNavigation({
      itemCount: menuItems.length,
      onItemSelect: (idx) => menuItems[idx]?.onClick(),
      onClose: () => setOpen(false),
      buttonRef,
      menuRef,
      closeOnItemSelect: false,
    });

  return (
    <div className={styles.moreDropdownWrapper}>
      <button
        ref={buttonRef}
        className={styles.moreButton}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={tMedia('more_options')}
        data-testid="embed-player-more-button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleButtonKeyDown}
        type="button"
      >
        <FaEllipsis aria-hidden />
      </button>
      <DropdownMenuPanel
        menuItems={menuItems}
        open={open}
        menuRef={menuRef}
        focusedIndex={focusedIndex}
        setFocusedIndex={setFocusedIndex}
        handleMenuKeyDown={handleMenuKeyDown}
        setOpen={setOpen}
        position="right"
        verticalPosition="above"
      />
    </div>
  );
}
