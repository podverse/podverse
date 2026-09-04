import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

export type HelperNoteProps = {
  /** Already localized. */
  message: string;
  testID?: string;
};

/**
 * In-page explainer that is not part of the content it sits next to. Tertiary fill, leading info
 * icon, caption type — so a directory note does not read as a podcast description.
 */
export function HelperNote({ message, testID }: HelperNoteProps) {
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        message: {
          ...typography.caption,
          color: themeStyles.textSecondary.color,
          flex: 1,
        },
        note: {
          alignItems: 'flex-start',
          backgroundColor: tokens.background.tertiary,
          borderRadius: tokens.radii.md,
          flexDirection: 'row',
          gap: tokens.spacing.md,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.base,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <View accessibilityRole="text" style={styles.note} testID={testID}>
      <Ionicons
        color={themeStyles.textSecondary.color}
        name="information-circle-outline"
        size={18}
      />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}
