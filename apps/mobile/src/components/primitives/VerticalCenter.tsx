import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';

export type VerticalCenterProps = {
  children: ReactNode;
  testID?: string;
};

/**
 * Fills its parent and centers children on both axes.
 *
 * The parent controls the available height, so this stays between surrounding navigation or list
 * controls without screen-specific positioning. Use as a FlatList `ListEmptyComponent` only inside
 * `FillList`, which locks scroll for this fill state.
 */
export function VerticalCenter({ children, testID }: VerticalCenterProps) {
  const { tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          alignItems: 'center',
          flex: 1,
          justifyContent: 'center',
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.lg,
        },
      }),
    [tokens]
  );

  return (
    <View style={styles.container} testID={testID}>
      {children}
    </View>
  );
}
