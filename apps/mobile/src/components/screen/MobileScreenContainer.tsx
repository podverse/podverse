import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { screenBodyInsets } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';

type MobileScreenContainerProps = {
  children: ReactNode;
  /** Omit on pushed stack screens — the native nav title is the heading (iOS Settings style). */
  heading?: string;
  scrollEnabled?: boolean;
  testID: string;
};

export function MobileScreenContainer({
  children,
  heading,
  scrollEnabled = true,
  testID,
}: MobileScreenContainerProps) {
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: {
          ...screenBodyInsets(tokens.spacing),
          flexGrow: 1,
          paddingBottom: tokens.spacing['2xl'],
        },
        heading: {
          color: themeStyles.textPrimary.color,
          fontSize: 28,
          fontWeight: '700',
          marginBottom: tokens.spacing.lg,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      scrollEnabled={scrollEnabled}
      style={{ backgroundColor: themeStyles.screen.backgroundColor, flex: 1 }}
      testID={testID}
    >
      {heading !== undefined ? <Text style={styles.heading}>{heading}</Text> : null}
      {children}
    </ScrollView>
  );
}
