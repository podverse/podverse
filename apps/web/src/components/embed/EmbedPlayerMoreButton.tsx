'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { FaEllipsis } from 'react-icons/fa6';

import type { PlaybackSpeedValue } from '@podverse/helpers';
import { getPlaybackTranslationKey, PLAYBACK_SPEED_VALUES } from '@podverse/helpers';
import type { DropdownMenuPanelItem } from '@podverse/ui';
import { DropdownMenuPanel, useDropdownKeyboardNavigation } from '@podverse/ui';

import { useMediaPlayer } from '../../contexts/MediaPlayer';

import styles from '../../styles/components/embed/EmbedPlayerMoreButton.module.scss';

type MenuPage = 'root' | 'speed';

export function EmbedPlayerMoreButton() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const { mpPlaybackSpeed, setMPPlaybackSpeed } = useMediaPlayer();
  const tMediaPlayer = useTranslations('media_player');
  const tMedia = useTranslations('media');
  const [menuPage, setMenuPage] = useState<MenuPage>('root');
  const selectItemRef = useRef<(idx: number) => void>(() => {});

  const itemCount = menuPage === 'speed' ? PLAYBACK_SPEED_VALUES.length : 1;

  const { open, setOpen, focusedIndex, setFocusedIndex, handleButtonKeyDown, handleMenuKeyDown } =
    useDropdownKeyboardNavigation({
      itemCount,
      onItemSelect: (idx) => {
        selectItemRef.current(idx);
      },
      onClose: () => setOpen(false),
      buttonRef,
      menuRef,
      closeOnItemSelect: false,
    });

  const setOpenRef = useRef(setOpen);
  const setFocusedIndexRef = useRef(setFocusedIndex);
  setOpenRef.current = setOpen;
  setFocusedIndexRef.current = setFocusedIndex;

  const closeMenu = () => {
    setOpenRef.current(false);
  };

  const selectSpeed = (rate: PlaybackSpeedValue) => {
    setMPPlaybackSpeed(rate);
    closeMenu();
  };

  const rootItems: DropdownMenuPanelItem[] = [
    {
      dismissOnSelect: false,
      label: tMediaPlayer('playback_speed.playback_speed_with_value', {
        speed: tMediaPlayer(`playback_speed.speeds.${getPlaybackTranslationKey(mpPlaybackSpeed)}`),
      }),
      onClick: () => {
        setMenuPage('speed');
        setFocusedIndexRef.current(0);
      },
    },
  ];

  const speedItems: DropdownMenuPanelItem[] = PLAYBACK_SPEED_VALUES.map((rate) => ({
    label: tMediaPlayer(`playback_speed.speeds.${getPlaybackTranslationKey(rate)}`),
    onClick: () => {
      selectSpeed(rate);
    },
  }));

  const menuItems = menuPage === 'speed' ? speedItems : rootItems;
  selectItemRef.current = (idx) => {
    menuItems[idx]?.onClick();
  };

  useEffect(() => {
    if (!open) {
      setMenuPage('root');
    }
  }, [open]);

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
