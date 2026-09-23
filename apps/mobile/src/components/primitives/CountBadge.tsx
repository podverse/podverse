import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';

/** Edge length of a one-digit badge, so `minWidth === height` and `borderRadius` make a circle. */
const BADGE_SIZE = 20;

const createStyles = ({ tokens }: ThemedStylesTheme) =>
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
      paddingHorizontal: 0,
    },
    badgeStretch: {
      paddingHorizontal: tokens.spacing.xs,
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
  });

export type CountBadgeTone = 'accent' | 'muted';

export type CountBadgeProps = {
  count: number;
  /**
   * `accent` is the default list-row / tab count. `muted` is the gray overlay on artwork
   * (downloaded count) so it does not compete with the unseen indicator on the same tile.
   */
  tone?: CountBadgeTone;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Circular numeric badge that widens horizontally when the count needs more than one digit.
 * Hidden at zero. Decorative on its own — the parent row or tile folds the count into its
 * accessibility label. Unseen presence uses `UnseenIndicator`, not this chip.
 */
export function CountBadge({ count, style, testID, tone = 'accent' }: CountBadgeProps) {
  const styles = useThemedStyles(createStyles);
  const face = String(count);
  const stretches = count >= 10;

  if (count <= 0) {
    return null;
  }

  const toneStyle = tone === 'muted' ? styles.muted : styles.accent;
  const toneLabelStyle = tone === 'muted' ? styles.mutedLabel : styles.accentLabel;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[styles.badge, stretches ? styles.badgeStretch : null, toneStyle, style]}
      testID={testID}
    >
      <Text style={[styles.label, toneLabelStyle]}>{face}</Text>
    </View>
  );
}
