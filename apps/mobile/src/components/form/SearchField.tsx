import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../theme/useTheme';
import type { TextFieldRef } from './TextField';
import { TextField } from './TextField';

export type SearchFieldProps = {
  accessibilityLabel: string;
  onChangeText: (value: string) => void;
  onSubmit?: () => void;
  placeholder: string;
  testID?: string;
  value: string;
  inputRef?: TextFieldRef;
};

/**
 * Directory search on top of `TextField`: same filled pill, plus a leading magnifying-glass and a
 * search return key, matching web `SearchInput`. The whole pill focuses, including the glass.
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
  const { styles: themeStyles } = useTheme();

  return (
    <TextField
      accessibilityLabel={accessibilityLabel}
      autoCapitalize="none"
      autoCorrect={false}
      inputRef={inputRef}
      leading={<Ionicons color={themeStyles.textSecondary.color} name="search" size={18} />}
      onChangeText={onChangeText}
      onSubmitEditing={onSubmit}
      placeholder={placeholder}
      returnKeyType="search"
      testID={testID}
      value={value}
    />
  );
}
