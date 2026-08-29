import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';

export type SettingsOptionNavRowProps = {
  title: string;
  description: string;
  valueLabel: string;
  onPress: () => void;
  testID: string;
};

/**
 * Settings entry for a **4+** option picker: label + description, with the current value and
 * chevron stacked **below** (not trailing/right) so long copy is not squeezed. Navigates to an
 * `OptionListScreen`. See **mobile-settings-option-density**.
 */
export function SettingsOptionNavRow({
  title,
  description,
  valueLabel,
  onPress,
  testID,
}: SettingsOptionNavRowProps) {
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        description: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.xs,
        },
        row: {
          paddingVertical: tokens.spacing.xs,
        },
        title: {
          color: themeStyles.textPrimary.color,
          fontSize: 16,
          fontWeight: '700',
        },
        value: {
          color: themeStyles.textSecondary.color,
          fontSize: 15,
        },
        valueWrap: {
          alignItems: 'center',
          flexDirection: 'row',
          gap: tokens.spacing.xs,
          marginTop: tokens.spacing.md,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row} testID={testID}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.valueWrap}>
        <Text style={styles.value}>{valueLabel}</Text>
        <Text style={styles.value}>›</Text>
      </View>
    </Pressable>
  );
}
