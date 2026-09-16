import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { MoreMenuSection } from '../../components/primitives/MoreMenu';
import { MoreMenu } from '../../components/primitives/MoreMenu';
import { usePlaybackSession } from '../../playback/PlaybackProvider';

/**
 * Playback speed control. Wired to the engine via `usePlaybackSession().setRate`, which calls
 * `NativePlaybackBridge.setRate` — no reload. Reflects the current rate from context (`playbackRate`)
 * and persists for the session (provider state). Rates and their labels mirror the web speed menu
 * (`media_player.playback_speed.speeds.*`).
 */
const SPEED_OPTIONS: { rate: number; labelKey: string }[] = [
  { labelKey: 'media_player.playback_speed.speeds.0-5', rate: 0.5 },
  { labelKey: 'media_player.playback_speed.speeds.0-75', rate: 0.75 },
  { labelKey: 'media_player.playback_speed.speeds.1-0', rate: 1 },
  { labelKey: 'media_player.playback_speed.speeds.1-25', rate: 1.25 },
  { labelKey: 'media_player.playback_speed.speeds.1-5', rate: 1.5 },
  { labelKey: 'media_player.playback_speed.speeds.1-75', rate: 1.75 },
  { labelKey: 'media_player.playback_speed.speeds.2-0', rate: 2 },
];

type FullPlayerSpeedControlProps = {
  onCancel: () => void;
  visible: boolean;
};

export function FullPlayerSpeedControl({ onCancel, visible }: FullPlayerSpeedControlProps) {
  const { t } = useTranslation();
  const { playbackRate, setRate } = usePlaybackSession();

  const sections = useMemo<MoreMenuSection[]>(
    () => [
      {
        items: SPEED_OPTIONS.map((option) => ({
          key: `${option.rate}`,
          label: t(option.labelKey),
          onPress: () => {
            setRate(option.rate);
          },
          selected: option.rate === playbackRate,
          testID: `full-player-speed-option-${option.rate}`,
        })),
        key: 'speed-options',
      },
    ],
    [playbackRate, setRate, t]
  );

  return (
    <MoreMenu
      cancelLabel={t('misc.cancel')}
      onCancel={onCancel}
      sections={sections}
      testID="full-player-speed-sheet"
      visible={visible}
    />
  );
}
