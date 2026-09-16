import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  FULL_PLAYER_UTILITY_ICON_SIZE,
  FULL_PLAYER_UTILITY_ROW_HEIGHT,
} from '../../screens/player/fullPlayerLayout';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../primitives/Button';

type FullPlayerUtilityRowProps = {
  onOpenMore: () => void;
  onOpenSleepTimer: () => void;
  onOpenSpeed: () => void;
  playbackRate: number;
};

const formatRate = (rate: number): string => {
  if (rate % 1 === 0) {
    return `${Math.round(rate)}x`;
  }
  return `${rate.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}x`;
};

/**
 * Sleep timer, playback speed, and More in equal-width slots: the three sit on one centerline and
 * the rate reads as plain text, so it never competes with the transport circle above it.
 */
export function FullPlayerUtilityRow({
  onOpenMore,
  onOpenSleepTimer,
  onOpenSpeed,
  playbackRate,
}: FullPlayerUtilityRowProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const iconColor = tokens.button.secondaryColor;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          alignItems: 'center',
          flexDirection: 'row',
          height: FULL_PLAYER_UTILITY_ROW_HEIGHT,
          width: '100%',
        },
        slot: {
          alignItems: 'center',
          flex: 1,
          flexDirection: 'row',
          justifyContent: 'center',
        },
      }),
    []
  );

  const rateLabel = formatRate(playbackRate);

  return (
    <View style={styles.row} testID="full-player-utility-row">
      <View style={styles.slot}>
        <Button
          accessibilityLabel={t('media_player.sleep_timer.sleep_timer')}
          icon={
            <Ionicons color={iconColor} name="moon-outline" size={FULL_PLAYER_UTILITY_ICON_SIZE} />
          }
          iconOnly
          label={t('media_player.sleep_timer.sleep_timer')}
          onPress={onOpenSleepTimer}
          size="lg"
          testID="full-player-sleep-timer"
          variant="ghost"
        />
      </View>
      <View style={styles.slot}>
        <Button
          accessibilityLabel={t('media_player.playback_speed.playback_speed_with_value', {
            speed: rateLabel,
          })}
          label={rateLabel}
          onPress={onOpenSpeed}
          size="lg"
          testID="full-player-speed"
          variant="ghost"
        />
      </View>
      <View style={styles.slot}>
        <Button
          accessibilityLabel={t('media.more_options')}
          icon={
            <Ionicons
              color={iconColor}
              name="ellipsis-horizontal"
              size={FULL_PLAYER_UTILITY_ICON_SIZE}
            />
          }
          iconOnly
          label={t('media.more_options')}
          onPress={onOpenMore}
          size="lg"
          testID="full-player-more"
          variant="ghost"
        />
      </View>
    </View>
  );
}
