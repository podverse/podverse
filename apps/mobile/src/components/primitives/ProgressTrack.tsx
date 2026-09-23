import { memo, useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { clampRatio } from '@podverse/helpers/math';

import { useTheme } from '../../theme/useTheme';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';

export type ProgressTrackProps = {
  /** Fraction filled, 0–1. Out-of-range values are clamped. */
  ratio: number;
  height?: number;
  /**
   * Square ends so the track can sit as an edge (mini-player top border). Rounded is the
   * default for standalone bars and scrubbers.
   */
  flush?: boolean;
  /** Colored used portion. Zero-width when `ratio` is 0, so it is not Maestro-visible. */
  fillTestID?: string;
  style?: StyleProp<ViewStyle>;
  /** The track itself — present whenever this bar is mounted, including at 0 fill. */
  testID?: string;
};

const createStyles = ({ styles: themeStyles, tokens }: ThemedStylesTheme) =>
  StyleSheet.create({
    fill: {
      backgroundColor: tokens.text.accent,
    },
    track: {
      backgroundColor: themeStyles.border.borderColor,
      flexDirection: 'row',
      overflow: 'hidden',
    },
  });

/**
 * Determinate progress bar: a rounded track with a proportional fill.
 *
 * Presentational only, and deliberately carries no accessibility role — its meaning comes from
 * whatever contains it. The same visual is a seek control in the full player, decoration inside the
 * mini player's button, and a progressbar in the sync bar. The caller owns role, name, and value.
 */
export const ProgressTrack = memo(function ProgressTrack({
  fillTestID,
  flush = false,
  height = 2,
  ratio,
  style,
  testID,
}: ProgressTrackProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles(createStyles);
  const fillRatio = clampRatio(ratio);
  const trackLayout = useMemo(
    () => ({
      borderRadius: flush ? 0 : tokens.radii.round,
      height,
    }),
    [flush, height, tokens.radii.round]
  );

  return (
    <View style={[styles.track, trackLayout, style]} testID={testID}>
      <View style={[styles.fill, { flex: fillRatio }]} testID={fillTestID} />
      <View style={{ flex: 1 - fillRatio }} />
    </View>
  );
});
