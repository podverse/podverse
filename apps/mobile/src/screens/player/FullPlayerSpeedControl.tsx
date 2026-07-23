import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/primitives/Button';
import { usePlayback } from '../../playback/PlaybackProvider';
import { useTheme } from '../../theme/useTheme';

/**
 * Playback speed control (Track 11.11). Wired to the engine via `usePlayback().setRate`, which calls
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

export function FullPlayerSpeedControl() {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { playbackRate, setRate } = usePlayback();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        heading: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          fontWeight: '600',
          marginBottom: tokens.spacing.sm,
        },
        options: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: tokens.spacing.sm,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <View testID="full-player-speed-control">
      <Text style={styles.heading}>{t('media_player.playback_speed.playback_speed')}</Text>
      <View style={styles.options}>
        {SPEED_OPTIONS.map((option) => (
          <Button
            key={option.labelKey}
            label={t(option.labelKey)}
            onPress={() => {
              setRate(option.rate);
            }}
            size="sm"
            testID={`full-player-speed-option-${option.rate}`}
            variant={option.rate === playbackRate ? 'primary' : 'secondary'}
          />
        ))}
      </View>
    </View>
  );
}
