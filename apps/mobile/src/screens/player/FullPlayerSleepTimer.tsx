import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/primitives/Button';
import { usePlayback } from '../../playback/PlaybackProvider';
import { useTheme } from '../../theme/useTheme';

/**
 * Optional sleep timer (Track 11.12). Minimal, session-only: choosing a duration schedules a single
 * `pause()` after N minutes; "Off" cancels. It never auto-plays and does nothing until the user
 * picks a duration, so idle playback is not regressed. Full parity (fade-out, end-of-episode) can
 * follow — this is intentionally a lightweight stub.
 */
const SLEEP_OPTIONS: { minutes: number; labelKey: string }[] = [
  { labelKey: 'media_player.sleep_timer.minutes_15', minutes: 15 },
  { labelKey: 'media_player.sleep_timer.minutes_30', minutes: 30 },
  { labelKey: 'media_player.sleep_timer.minutes_60', minutes: 60 },
];

export function FullPlayerSleepTimer() {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { pause } = usePlayback();

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
    <View testID="full-player-sleep-timer-control">
      <Text style={styles.heading}>{t('media_player.sleep_timer.sleep_timer')}</Text>
      <View style={styles.options}>
        <Button
          label={t('media_player.sleep_timer.off')}
          onPress={() => {
            setSelectedMinutes(null);
          }}
          size="sm"
          testID="full-player-sleep-option-off"
          variant={selectedMinutes === null ? 'primary' : 'secondary'}
        />
        {SLEEP_OPTIONS.map((option) => (
          <Button
            key={option.labelKey}
            label={t(option.labelKey)}
            onPress={() => {
              setSelectedMinutes(option.minutes);
            }}
            size="sm"
            testID={`full-player-sleep-option-${option.minutes}`}
            variant={selectedMinutes === option.minutes ? 'primary' : 'secondary'}
          />
        ))}
      </View>
    </View>
  );
}
