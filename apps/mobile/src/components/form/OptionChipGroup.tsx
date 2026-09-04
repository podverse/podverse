import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';

export type OptionChipOption<T extends string> = {
  value: T;
  label: string;
  testID?: string;
};

export type OptionChipGroupProps<T extends string> = {
  options: readonly OptionChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
};

/**
 * Segmented chip / pill group for settings with **2–3** choices (see
 * **mobile-settings-option-density**). Labels are passed already localized by the caller.
 */
export function OptionChipGroup<T extends string>({
  options,
  value,
  onChange,
  testID,
}: OptionChipGroupProps<T>) {
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        optionButton: {
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.round,
          borderWidth: 1,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
        },
        optionButtonActive: {
          backgroundColor: themeStyles.buttonPrimary.backgroundColor,
          borderColor: themeStyles.buttonPrimary.backgroundColor,
        },
        optionButtonText: {
          color: themeStyles.textPrimary.color,
          fontSize: 14,
          fontWeight: '600',
        },
        optionButtonTextActive: {
          color: themeStyles.buttonPrimary.color,
        },
        row: {
          alignItems: 'center',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: tokens.spacing.sm,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <View style={styles.row} testID={testID}>
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <Pressable
            accessibilityLabel={option.label}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            key={option.value}
            onPress={() => {
              onChange(option.value);
            }}
            style={[styles.optionButton, isActive ? styles.optionButtonActive : null]}
            testID={option.testID}
          >
            <Text
              style={[styles.optionButtonText, isActive ? styles.optionButtonTextActive : null]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
