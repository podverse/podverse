import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { MoreMenuSection } from '../../components/primitives/MoreMenu';
import { MoreMenu } from '../../components/primitives/MoreMenu';
import { usePlaybackSession } from '../../playback/PlaybackProvider';

/**
 * Optional sleep timer. It is session-only: choosing a duration schedules a single `pause()` after
 * N minutes; "Off" cancels. It never auto-plays and does nothing until the user picks a duration,
 * so idle playback is not affected. The timer intentionally has no fade-out or end-of-episode mode.
 */
const SLEEP_OPTIONS: { minutes: number; labelKey: string }[] = [
  { labelKey: 'media_player.sleep_timer.minutes_15', minutes: 15 },
  { labelKey: 'media_player.sleep_timer.minutes_30', minutes: 30 },
  { labelKey: 'media_player.sleep_timer.minutes_60', minutes: 60 },
];

type FullPlayerSleepTimerProps = {
  onCancel: () => void;
  visible: boolean;
};

export function FullPlayerSleepTimer({ onCancel, visible }: FullPlayerSleepTimerProps) {
  const { t } = useTranslation();
  const { pause } = usePlaybackSession();

  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);

  useEffect(() => {
    if (selectedMinutes === null) {
      return;
    }
    const timeoutId = setTimeout(
      () => {
        pause();
        setSelectedMinutes(null);
      },
      selectedMinutes * 60 * 1000
    );
    return () => {
      clearTimeout(timeoutId);
    };
  }, [pause, selectedMinutes]);

  const sections = useMemo<MoreMenuSection[]>(
    () => [
      {
        items: [
          {
            key: 'off',
            label: t('media_player.sleep_timer.off'),
            onPress: () => {
              setSelectedMinutes(null);
            },
            selected: selectedMinutes === null,
            testID: 'full-player-sleep-option-off',
          },
          ...SLEEP_OPTIONS.map((option) => ({
            key: `${option.minutes}`,
            label: t(option.labelKey),
            onPress: () => {
              setSelectedMinutes(option.minutes);
            },
            selected: selectedMinutes === option.minutes,
            testID: `full-player-sleep-option-${option.minutes}`,
          })),
        ],
        key: 'sleep-options',
      },
    ],
    [selectedMinutes, t]
  );

  return (
    <MoreMenu
      cancelLabel={t('misc.cancel')}
      onCancel={onCancel}
      sections={sections}
      testID="full-player-sleep-sheet"
      visible={visible}
    />
  );
}
