import type { ReactNode } from 'react';
import { useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';

export type CardProps = {
  children: ReactNode;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Themed surface container (background + hairline border + rounded corners) from theme tokens.
 * Generic layout primitive with no copy of its own; compose headings/content via `children`.
 */
export function Card({ children, padded = true, style, testID }: CardProps) {
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          padding: padded ? tokens.spacing.lg : 0,
        },
      }),
    [padded, themeStyles, tokens]
  );

  return (
    <View style={[styles.card, style]} testID={testID}>
      {children}
    </View>
  );
}
