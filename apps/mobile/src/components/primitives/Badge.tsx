import { useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';

export type BadgeTone = 'accent' | 'neutral' | 'muted';

export type BadgeProps = {
  label: string;
  /**
   * `accent` fills to draw the eye; `neutral` outlines to sit quietly beside content; `muted` is a
   * solid gray fill with contrasting label — for counts overlaid on artwork (e.g. Home grid
   * downloads).
   */
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A small rounded pill of text.
 *
 * Presentational and deliberately unlabelled for assistive tech: a badge is a fragment of a
 * sentence about the thing it sits on, so its row composes it into one `accessibilityLabel` rather
 * than leaving a screen reader to announce "3" on its own. Callers that want it read separately
 * wrap it and say so there.
 */
export function Badge({ label, style, testID, tone = 'neutral' }: BadgeProps) {
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        accent: {
          backgroundColor: tokens.text.accent,
          borderColor: tokens.text.accent,
        },
        accentLabel: {
          color: tokens.background.primary,
        },
        badge: {
          alignSelf: 'flex-start',
          borderRadius: tokens.radii.round,
          borderWidth: 1,
          paddingHorizontal: tokens.spacing.sm,
          paddingVertical: 2,
        },
        label: {
          fontSize: 11,
          fontWeight: '600',
        },
        muted: {
          // Gray chip for counts overlaid on artwork (primary theme: #444 + white label).
          backgroundColor: tokens.border.tertiary,
          borderColor: tokens.border.tertiary,
        },
        mutedLabel: {
          color: tokens.text.primary,
        },
        neutral: {
          backgroundColor: themeStyles.buttonSecondary.backgroundColor,
          borderColor: themeStyles.border.borderColor,
        },
        neutralLabel: {
          color: themeStyles.buttonSecondary.color,
        },
      }),
    [themeStyles, tokens]
  );

  const toneStyle =
    tone === 'accent' ? styles.accent : tone === 'muted' ? styles.muted : styles.neutral;
  const toneLabelStyle =
    tone === 'accent'
      ? styles.accentLabel
      : tone === 'muted'
        ? styles.mutedLabel
        : styles.neutralLabel;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[styles.badge, toneStyle, style]}
      testID={testID}
    >
      <Text style={[styles.label, toneLabelStyle]}>{label}</Text>
    </View>
  );
}
