import { useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { clampRatio } from '@podverse/helpers/math';

import { useTheme } from '../../theme/useTheme';

export type ProgressTrackProps = {
  /** Fraction filled, 0–1. Out-of-range values are clamped. */
  ratio: number;
  height?: number;
  /** Colored used portion. Zero-width when `ratio` is 0, so it is not Maestro-visible. */
  fillTestID?: string;
  style?: StyleProp<ViewStyle>;
  /** The track itself — present whenever this bar is mounted, including at 0 fill. */
  testID?: string;
};

/**
 * Determinate progress bar: a rounded track with a proportional fill.
 *
 * Presentational only, and deliberately carries no accessibility role — its meaning comes from
 * whatever contains it. The same visual is a seek control in the full player, decoration inside the
 * mini player's button, and a progressbar in the sync bar. The caller owns role, name, and value.
 */
export function ProgressTrack({
  fillTestID,
  height = 2,
  ratio,
  style,
  testID,
}: ProgressTrackProps) {
  const { styles: themeStyles, tokens } = useTheme();
  const fillRatio = clampRatio(ratio);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        fill: {
          backgroundColor: tokens.text.accent,
        },
        track: {
          backgroundColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.round,
          flexDirection: 'row',
          height,
          overflow: 'hidden',
        },
      }),
    [height, themeStyles, tokens]
  );

  return (
    <View style={[styles.track, style]} testID={testID}>
      <View style={[styles.fill, { flex: fillRatio }]} testID={fillTestID} />
      <View style={{ flex: 1 - fillRatio }} />
    </View>
  );
}
