import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import type { Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';

export type SearchFieldProps = {
  accessibilityLabel: string;
  onChangeText: (value: string) => void;
  onSubmit?: () => void;
  placeholder: string;
  searchIconAccessibilityLabel: string;
  testID?: string;
  value: string;
  inputRef?: Ref<TextInput>;
};

/**
 * Filled search field with a leading magnifying-glass, matching web `SearchInput`: tertiary
 * surface, no resting outline, inset focus ring.
 */
export function SearchField({
  accessibilityLabel,
  inputRef,
  onChangeText,
  onSubmit,
  placeholder,
  searchIconAccessibilityLabel,
  testID,
  value,
}: SearchFieldProps) {
  const { styles: themeStyles, tokens } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        field: {
          alignItems: 'center',
          backgroundColor: tokens.background.tertiary,
          borderColor: 'transparent',
          borderRadius: tokens.radii.md,
          borderWidth: 2,
          flexDirection: 'row',
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
        },
        fieldFocused: {
          borderColor: tokens.border.primary,
        },
        iconButton: {
          alignItems: 'center',
          height: 28,
          justifyContent: 'center',
          marginRight: tokens.spacing.md,
          width: 28,
        },
        input: {
          color: themeStyles.textPrimary.color,
          flex: 1,
          fontSize: 16,
          padding: 0,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <View style={[styles.field, isFocused ? styles.fieldFocused : null]}>
      <Pressable
        accessibilityLabel={searchIconAccessibilityLabel}
        accessibilityRole="button"
        onPress={onSubmit}
        style={styles.iconButton}
      >
        <Ionicons color={themeStyles.textSecondary.color} name="search" size={18} />
      </Pressable>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoCapitalize="none"
        autoCorrect={false}
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
        ref={inputRef}
        returnKeyType="search"
        style={styles.input}
        testID={testID}
        value={value}
      />
    </View>
  );
}
