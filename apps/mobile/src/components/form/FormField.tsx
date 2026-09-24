import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';

export type FormFieldProps = {
  children: ReactNode;
  /** Names the field. Must not repeat an option inside the control. */
  label: string;
  testID?: string;
};

const createStyles = ({ styles: themeStyles, tokens }: ThemedStylesTheme) =>
  StyleSheet.create({
    field: {
      gap: tokens.spacing.md,
    },
    label: {
      color: themeStyles.textPrimary.color,
      fontSize: 15,
      fontWeight: '600',
    },
  });

/**
 * Field label above a control (chips or a locked value). The gap is part of the field so the
 * label does not sit on the control text.
 */
export function FormField({ children, label, testID }: FormFieldProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.field} testID={testID}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}
