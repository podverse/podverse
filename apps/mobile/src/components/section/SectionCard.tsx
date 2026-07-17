import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';

type SectionCardProps = {
  children: ReactNode;
  heading?: string;
  testID?: string;
};

export function SectionCard({ children, heading, testID }: SectionCardProps) {
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          marginTop: tokens.spacing.md,
          padding: tokens.spacing.lg,
        },
        heading: {
          color: themeStyles.textPrimary.color,
          fontSize: 20,
          fontWeight: '700',
          marginBottom: tokens.spacing.sm,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <View style={styles.card} testID={testID}>
      {heading ? <Text style={styles.heading}>{heading}</Text> : null}
      {children}
    </View>
  );
}
