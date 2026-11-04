'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { FaEllipsis } from 'react-icons/fa6';

import type { PlaybackSpeedValue } from '@podverse/helpers';
import { getPlaybackTranslationKey, PLAYBACK_SPEED_VALUES } from '@podverse/helpers';
import type { DropdownMenuPanelItem } from '@podverse/ui';
import { DropdownMenuPanel, useDropdownKeyboardNavigation } from '@podverse/ui';

import { usePlayerTransport } from '../../../hooks/usePlayerTransport';
import { useRemotePlayerDisplay } from '../../../hooks/useRemotePlayerDisplay';
import {
  getSleepTimerMinutes,
  setSleepTimerMinutes,
  subscribeSleepTimer,
} from '../sleepTimerState';
import { usePlayerShareAction } from './usePlayerShareAction';

import styles from '../../../styles/components/MediaPlayer/Buttons/SettingsButton.module.scss';

type MenuPage = 'root' | 'sleep' | 'speed';

export const SettingsButton = () => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const { playbackSpeed, setPlaybackSpeed } = usePlayerTransport();
  const remote = useRemotePlayerDisplay();
  const { canShare, openShare } = usePlayerShareAction();
  const tMedia = useTranslations('media');
  const tFeatures = useTranslations('features');
  const tMediaPlayer = useTranslations('media_player');
  const showRateAndSleep = remote === null || remote.controls.canSetRate;
  const sleepMinutes = useSyncExternalStore(
    subscribeSleepTimer,
    getSleepTimerMinutes,
    getSleepTimerMinutes
  );
  const [menuPage, setMenuPage] = useState<MenuPage>('root');
  const selectItemRef = useRef<(idx: number) => void>(() => {});

  const sleepValueLabel =
    sleepMinutes === 15
      ? tMediaPlayer('sleep_timer.minutes_15')
      : sleepMinutes === 30
        ? tMediaPlayer('sleep_timer.minutes_30')
        : sleepMinutes === 60
          ? tMediaPlayer('sleep_timer.minutes_60')
          : tMediaPlayer('sleep_timer.off');

  const rootItemCount = (showRateAndSleep ? 2 : 0) + (canShare ? 1 : 0);
  const itemCount =
    menuPage === 'sleep' ? 4 : menuPage === 'speed' ? PLAYBACK_SPEED_VALUES.length : rootItemCount;

  const { open, setOpen, focusedIndex, setFocusedIndex, handleButtonKeyDown, handleMenuKeyDown } =
    useDropdownKeyboardNavigation({
      itemCount,
      onItemSelect: (idx) => {
        selectItemRef.current(idx);
      },
      onClose: () => setOpen(false),
      closeOnItemSelect: false,
      buttonRef,
      menuRef,
    });

  const setOpenRef = useRef(setOpen);
  const setFocusedIndexRef = useRef(setFocusedIndex);
  setOpenRef.current = setOpen;
  setFocusedIndexRef.current = setFocusedIndex;

  const closeMenu = () => {
    setOpenRef.current(false);
  };

  const selectSleepMinutes = (minutes: number | null) => {
    setSleepTimerMinutes(minutes);
    closeMenu();
  };

  const selectSpeed = (rate: PlaybackSpeedValue) => {
    setPlaybackSpeed(rate);
    closeMenu();
  };

  const rootItems: DropdownMenuPanelItem[] = [
    ...(showRateAndSleep
      ? [
          {
            dismissOnSelect: false,
            label: tMediaPlayer('playback_speed.playback_speed_with_value', {
              speed: tMediaPlayer(
                `playback_speed.speeds.${getPlaybackTranslationKey(playbackSpeed)}`
              ),
            }),
            onClick: () => {
              setMenuPage('speed');
              setFocusedIndexRef.current(0);
            },
          },
          {
            dismissOnSelect: false,
            label: tMediaPlayer('sleep_timer.sleep_timer_with_value', { value: sleepValueLabel }),
            onClick: () => {
              setMenuPage('sleep');
              setFocusedIndexRef.current(0);
            },
          },
        ]
      : []),
    ...(canShare
      ? [
          {
            label: tFeatures('share'),
            onClick: () => {
              openShare();
              closeMenu();
            },
          },
        ]
      : []),
  ];

  const sleepItems: DropdownMenuPanelItem[] = [
    {
      label: tMediaPlayer('sleep_timer.off'),
      onClick: () => {
        selectSleepMinutes(null);
      },
    },
    {
      label: tMediaPlayer('sleep_timer.minutes_15'),
      onClick: () => {
        selectSleepMinutes(15);
      },
    },
    {
      label: tMediaPlayer('sleep_timer.minutes_30'),
      onClick: () => {
        selectSleepMinutes(30);
      },
    },
    {
      label: tMediaPlayer('sleep_timer.minutes_60'),
      onClick: () => {
        selectSleepMinutes(60);
      },
    },
  ];

  const speedItems: DropdownMenuPanelItem[] = PLAYBACK_SPEED_VALUES.map((rate) => ({
    label: tMediaPlayer(`playback_speed.speeds.${getPlaybackTranslationKey(rate)}`),
    onClick: () => {
      selectSpeed(rate);
    },
  }));

  const menuItems =
    menuPage === 'sleep' ? sleepItems : menuPage === 'speed' ? speedItems : rootItems;
  selectItemRef.current = (idx) => {
    menuItems[idx]?.onClick();
  };

  useEffect(() => {
    if (!open) {
      setMenuPage('root');
    }
  }, [open]);

  if (rootItemCount === 0) {
    return null;
  }

  return (
    <div className={styles.settingsDropdownWrapper}>
      <button
        ref={buttonRef}
        className={styles.settingsButton}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={tMedia('more_options')}
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
        verticalPosition="above"
      />
    </div>
  );
};
