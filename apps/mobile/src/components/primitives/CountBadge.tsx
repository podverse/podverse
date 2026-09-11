import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';

const BADGE_SIZE = 20;

export type CountBadgeProps = {
  count: number;
  testID?: string;
};

/**
 * Circular numeric badge that widens into an oval when the count needs more than one digit.
 * Hidden at zero. Decorative on its own — the parent row or tab folds the count into its
 * accessibility label.
 */
export function CountBadge({ count, testID }: CountBadgeProps) {
  const { tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        badge: {
          alignItems: 'center',
          backgroundColor: tokens.text.accent,
          borderRadius: BADGE_SIZE / 2,
          height: BADGE_SIZE,
          justifyContent: 'center',
          minWidth: BADGE_SIZE,
          paddingHorizontal: count >= 10 ? tokens.spacing.sm : 0,
        },
        label: {
          color: tokens.background.primary,
          fontSize: 11,
          fontWeight: '700',
          lineHeight: 14,
        },
      }),
    [count, tokens]
  );

  if (count <= 0) {
    return null;
  }

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={styles.badge}
      testID={testID}
    >
      <Text style={styles.label}>{String(count)}</Text>
    </View>
  );
}
