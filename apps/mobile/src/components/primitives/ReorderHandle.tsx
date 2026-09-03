import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';

const HANDLE_SIZE = 44;

export type ReorderHandleProps = {
  testID?: string;
};

/**
 * Visual drag grip. The parent owns the pan gesture and accessibility; this view is decorative.
 */
export function ReorderHandle({ testID }: ReorderHandleProps) {
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        handle: {
          alignItems: 'center',
          height: HANDLE_SIZE,
          justifyContent: 'center',
          width: HANDLE_SIZE,
        },
      }),
    []
  );

  return (
    <View accessible={false} importantForAccessibility="no" style={styles.handle} testID={testID}>
      <Ionicons
        color={themeStyles.textSecondary.color}
        name="reorder-three"
        size={tokens.spacing.xl}
      />
    </View>
  );
}
