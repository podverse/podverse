import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';
import { MobileScreenContainer } from '../screen/MobileScreenContainer';

export type OptionListItem<T extends string> = {
  value: T;
  label: string;
  testID?: string;
};

export type OptionListScreenProps<T extends string> = {
  testID: string;
  options: readonly OptionListItem<T>[];
  value: T;
  onSelect: (value: T) => void;
};

/**
 * Full-screen option list for settings with **4+** choices (iOS Settings style). Selected row
 * shows a checkmark. Screen title comes from the native stack header; labels are passed already
 * localized by the caller.
 */
export function OptionListScreen<T extends string>({
  testID,
  options,
  value,
  onSelect,
}: OptionListScreenProps<T>) {
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        checkmark: {
          color: themeStyles.buttonPrimary.backgroundColor,
          fontSize: 18,
          fontWeight: '700',
          marginLeft: tokens.spacing.md,
        },
        list: {
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          overflow: 'hidden',
        },
        optionLabel: {
          color: themeStyles.textPrimary.color,
          flex: 1,
          fontSize: 16,
        },
        optionLabelSelected: {
          fontWeight: '700',
        },
        optionRow: {
          alignItems: 'center',
          borderTopColor: themeStyles.border.borderColor,
          borderTopWidth: 1,
          flexDirection: 'row',
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.md,
        },
        optionRowFirst: {
          borderTopWidth: 0,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <MobileScreenContainer testID={testID}>
      <View style={styles.list}>
        {options.map((option, index) => {
          const isSelected = option.value === value;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={option.value}
              onPress={() => {
                onSelect(option.value);
              }}
              style={[styles.optionRow, index === 0 ? styles.optionRowFirst : null]}
              testID={option.testID}
            >
              <Text style={[styles.optionLabel, isSelected ? styles.optionLabelSelected : null]}>
                {option.label}
              </Text>
              {isSelected ? <Text style={styles.checkmark}>✓</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </MobileScreenContainer>
  );
}
