import { useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';

export type ListFilterFieldProps = {
  /** Already-localized label for the control that empties the term. */
  clearLabel: string;
  /** Already-localized. Doubles as the accessible name, so a placeholder is not the label. */
  label: string;
  onChangeTerm: (term: string) => void;
  /** Already-localized. Defaults to `label`. */
  placeholder?: string;
  /**
   * Spacing from chips / header above is the caller's business (`marginTop`). Spacing to the first
   * list or grid content below must use **`listFilterFieldBottomMargin`** from `screenLayout` so
   * list (row top padding) and grid (no top padding) land on the same `listFilterContentGap` seam.
   */
  style?: StyleProp<ViewStyle>;
  /** Input is `${testID}-input`, clear control is `${testID}-clear`. */
  testID: string;
  term: string;
};

/**
 * Free-text filter over a list already on screen.
 *
 * Narrows what is rendered rather than requesting anything, so it stays responsive with no debounce
 * and belongs above the list it filters. The clear control appears only once there is a term to
 * clear, keeping an empty field from carrying a control that would do nothing.
 */
export function ListFilterField({
  clearLabel,
  label,
  onChangeTerm,
  placeholder,
  style,
  term,
  testID,
}: ListFilterFieldProps) {
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        clear: {
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.round,
          borderWidth: 1,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
        },
        clearLabel: {
          color: themeStyles.textPrimary.color,
          fontSize: 13,
          fontWeight: '600',
        },
        input: {
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          color: themeStyles.textPrimary.color,
          flex: 1,
          fontSize: 16,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
        },
        row: {
          alignItems: 'center',
          flexDirection: 'row',
          gap: tokens.spacing.sm,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <View style={[styles.row, style]}>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeTerm}
        placeholder={placeholder ?? label}
        placeholderTextColor={themeStyles.textSecondary.color}
        style={styles.input}
        testID={`${testID}-input`}
        value={term}
      />
      {term.length > 0 ? (
        <Pressable
          accessibilityLabel={clearLabel}
          accessibilityRole="button"
          onPress={() => {
            onChangeTerm('');
          }}
          style={styles.clear}
          testID={`${testID}-clear`}
        >
          <Text style={styles.clearLabel}>{clearLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
