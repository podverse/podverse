import { Ionicons } from '@expo/vector-icons';
import type { Ref } from 'react';
import { useMemo, useState } from 'react';
import type { TextInput } from 'react-native';
import { StyleSheet } from 'react-native';

import { useTheme } from '../../theme/useTheme';
import { TextField } from './TextField';

export type SearchFieldProps = {
  accessibilityLabel: string;
  onChangeText: (value: string) => void;
  onSubmit?: () => void;
  placeholder: string;
  testID?: string;
  value: string;
  inputRef?: Ref<TextInput>;
};

/**
 * Filled search field with a leading magnifying-glass, matching web `SearchInput`: tertiary
 * surface, no resting outline, inset focus ring. The whole pill focuses, including the glass.
 */
export function SearchField({
  accessibilityLabel,
  inputRef,
  onChangeText,
  onSubmit,
  placeholder,
  testID,
  value,
}: SearchFieldProps) {
  const { styles: themeStyles, tokens } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        field: {
          backgroundColor: tokens.background.tertiary,
          borderColor: 'transparent',
          borderRadius: tokens.radii.md,
          borderWidth: 2,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
        },
        fieldFocused: {
          borderColor: tokens.border.primary,
        },
      }),
    [tokens]
  );

  return (
    <TextField
      accessibilityLabel={accessibilityLabel}
      autoCapitalize="none"
      autoCorrect={false}
      inputRef={inputRef}
      leading={<Ionicons color={themeStyles.textSecondary.color} name="search" size={18} />}
      onBlur={() => {
        setIsFocused(false);
      }}
      onChangeText={onChangeText}
      onFocus={() => {
        setIsFocused(true);
      }}
      onSubmitEditing={onSubmit}
      placeholder={placeholder}
      placeholderTextColor={themeStyles.textSecondary.color}
      returnKeyType="search"
      style={[styles.field, isFocused ? styles.fieldFocused : null]}
      testID={testID}
      value={value}
    />
  );
}
