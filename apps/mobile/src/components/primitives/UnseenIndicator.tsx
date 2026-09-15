import { useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';

/** Edge length of the presence dot. Smaller than `CountBadge` so it cannot be read as a count. */
export const UNSEEN_INDICATOR_SIZE = 10;

export type UnseenIndicatorProps = {
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Accent circle that marks a subscription with new unseen episodes.
 *
 * Decorative on its own — the parent row or tile folds the presence into its accessibility
 * label. There is no count on the face; downloaded counts use `CountBadge`.
 */
export function UnseenIndicator({ style, testID }: UnseenIndicatorProps) {
  const { tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        indicator: {
          backgroundColor: tokens.text.accent,
          borderRadius: UNSEEN_INDICATOR_SIZE / 2,
          height: UNSEEN_INDICATOR_SIZE,
          width: UNSEEN_INDICATOR_SIZE,
        },
      }),
    [tokens]
  );

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[styles.indicator, style]}
      testID={testID}
    />
  );
}
