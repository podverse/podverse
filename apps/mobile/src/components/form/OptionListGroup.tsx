import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LIST_ROW_ACTION_ICON_SIZE } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

export type OptionListItem<T extends string> = {
  value: T;
  label: string;
  testID?: string;
};

export type OptionListGroupProps<T extends string> = {
  options: readonly OptionListItem<T>[];
  value: T;
  onSelect: (value: T) => void;
  /** Rendered above the group when the screen holds more than one. */
  heading?: string;
  testID?: string;
};

/**
 * A bordered group of single-choice rows, the selected one marked with a checkmark.
 *
 * The checkmark carries the selection for sighted users and `accessibilityState` carries it for
 * everyone else, so a screen reader announces the current choice rather than reading a list of
 * identical-sounding rows.
 *
 * Labels arrive already localized: this renders whatever the caller passes, which is what lets one
 * component serve a settings screen and a filter screen without knowing about either.
 */
export function OptionListGroup<T extends string>({
  heading,
  onSelect,
  options,
  testID,
  value,
}: OptionListGroupProps<T>) {
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        checkmark: {
          marginLeft: tokens.spacing.md,
        },
        heading: {
          ...typography.body,
          color: themeStyles.textSecondary.color,
          marginBottom: tokens.spacing.sm,
        },
        list: {
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          overflow: 'hidden',
        },
        optionLabel: {
          ...typography.subheading,
          color: themeStyles.textPrimary.color,
          flex: 1,
          fontSize: 19,
          fontWeight: '400',
          lineHeight: 26,
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
          paddingVertical: tokens.spacing.lg,
        },
        optionRowFirst: {
          borderTopWidth: 0,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <View testID={testID}>
      {heading === undefined ? null : (
        <Text accessibilityRole="header" style={styles.heading}>
          {heading}
        </Text>
      )}
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
              {isSelected ? (
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                  style={styles.checkmark}
                >
                  <Ionicons
                    color={themeStyles.buttonPrimary.backgroundColor}
                    name="checkmark"
                    size={LIST_ROW_ACTION_ICON_SIZE}
                  />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
