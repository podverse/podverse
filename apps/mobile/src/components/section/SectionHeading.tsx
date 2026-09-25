import type { ReactNode } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { StyleSheet, Text } from 'react-native';

import { typography } from '../../theme/typography';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';

export type SectionHeadingProps = {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  testID?: string;
};

const createStyles = ({ tokens }: ThemedStylesTheme) =>
  StyleSheet.create({
    heading: {
      ...typography.heading,
      color: tokens.text.accent,
    },
  });

/**
 * In-content section label (People, Settings groups, Downloads library sections, hub menus).
 * Accent text so the label reads as structure against primary body copy.
 */
export function SectionHeading({ children, style, testID }: SectionHeadingProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <Text accessibilityRole="header" style={[styles.heading, style]} testID={testID}>
      {children}
    </Text>
  );
}
