import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { useTheme } from '../../theme/useTheme';

type MobileScreenContainerProps = {
  children: ReactNode;
  heading: string;
  testID: string;
};

export function MobileScreenContainer({ children, heading, testID }: MobileScreenContainerProps) {
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: {
          padding: tokens.spacing.lg,
          paddingBottom: tokens.spacing['2xl'],
        },
        heading: {
          color: themeStyles.textPrimary.color,
          fontSize: 28,
          fontWeight: '700',
          marginBottom: tokens.spacing.md,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: themeStyles.screen.backgroundColor }}
      testID={testID}
    >
      <Text style={styles.heading}>{heading}</Text>
      {children}
    </ScrollView>
  );
}
