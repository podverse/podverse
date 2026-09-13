import { useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';

/** Edge length of a one-digit badge, so `minWidth === height` and `borderRadius` make a circle. */
const BADGE_SIZE = 20;

export type CountBadgeTone = 'accent' | 'muted';

export type CountBadgeProps = {
  count: number;
  /**
   * When the stored count is a ceiling (Home unseen cap), the face shows `{count}+` and the
   * badge widens the same way a two-digit number does.
   */
  isCapped?: boolean;
  /**
   * `accent` is the default list-row / tab count. `muted` is the gray overlay on artwork
   * (downloaded count) so it does not compete with an accent unseen badge on the same tile.
   */
  tone?: CountBadgeTone;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Circular numeric badge that widens horizontally when the count needs more than one digit.
 * Hidden at zero. Decorative on its own — the parent row or tile folds the count into its
 * accessibility label.
 */
export function CountBadge({
  count,
  isCapped = false,
  style,
  testID,
  tone = 'accent',
}: CountBadgeProps) {
  const { tokens } = useTheme();
  const face = isCapped ? `${count}+` : String(count);
  const stretches = isCapped || count >= 10;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        accent: {
          backgroundColor: tokens.text.accent,
        },
        accentLabel: {
          color: tokens.background.primary,
        },
        badge: {
          alignItems: 'center',
          borderRadius: BADGE_SIZE / 2,
          height: BADGE_SIZE,
          justifyContent: 'center',
          minWidth: BADGE_SIZE,
          paddingHorizontal: stretches ? tokens.spacing.xs : 0,
        },
        label: {
          fontSize: 11,
          fontWeight: '700',
          includeFontPadding: false,
          lineHeight: 14,
          textAlign: 'center',
        },
        muted: {
          backgroundColor: tokens.border.tertiary,
        },
        mutedLabel: {
          color: tokens.text.primary,
        },
      }),
    [stretches, tokens]
  );

  if (count <= 0) {
    return null;
  }

  const toneStyle = tone === 'muted' ? styles.muted : styles.accent;
  const toneLabelStyle = tone === 'muted' ? styles.mutedLabel : styles.accentLabel;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[styles.badge, toneStyle, style]}
      testID={testID}
    >
      <Text style={[styles.label, toneLabelStyle]}>{face}</Text>
    </View>
  );
}
