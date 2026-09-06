import { useFocusEffect } from '@react-navigation/native';
import type { ReactNode, Ref } from 'react';
import { useCallback, useMemo, useRef } from 'react';
import type { StyleProp, TextInputProps, ViewStyle } from 'react-native';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';

export type TextFieldProps = {
  accessibilityLabel: string;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoCorrect?: boolean;
  inputRef?: Ref<TextInput>;
  /** Decorative. Taps land on the field and focus the input. */
  leading?: ReactNode;
  onBlur?: () => void;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  onSubmitEditing?: () => void;
  placeholder: string;
  placeholderTextColor?: string;
  returnKeyType?: TextInputProps['returnKeyType'];
  style?: StyleProp<ViewStyle>;
  testID?: string;
  value: string;
};

function bindInputRef(ref: Ref<TextInput> | undefined, node: TextInput | null): void {
  if (typeof ref === 'function') {
    ref(node);
    return;
  }

  if (ref === null || ref === undefined) {
    return;
  }

  ref.current = node;
}

/**
 * Painted text field whose visible chrome is the hit target. A leading icon is decoration; it
 * does not submit or steal focus. Do not add padding on the `TextInput` — keep inset on `style`.
 * Leaving the host screen blurs the field so a tab switch does not keep a caret or focus ring.
 */
export function TextField({
  accessibilityLabel,
  autoCapitalize,
  autoCorrect,
  inputRef,
  leading,
  onBlur,
  onChangeText,
  onFocus,
  onSubmitEditing,
  placeholder,
  placeholderTextColor,
  returnKeyType,
  style,
  testID,
  value,
}: TextFieldProps) {
  const { styles: themeStyles, tokens } = useTheme();
  const localRef = useRef<TextInput | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        field: {
          alignItems: 'stretch',
          flexDirection: 'row',
        },
        input: {
          alignSelf: 'stretch',
          color: themeStyles.textPrimary.color,
          flex: 1,
          fontSize: 16,
          padding: 0,
          textAlignVertical: 'center',
        },
        leading: {
          alignItems: 'center',
          alignSelf: 'center',
          height: 28,
          justifyContent: 'center',
          marginRight: tokens.spacing.md,
          width: 28,
        },
      }),
    [themeStyles, tokens]
  );

  const setInputRef = useCallback(
    (node: TextInput | null) => {
      localRef.current = node;
      bindInputRef(inputRef, node);
    },
    [inputRef]
  );

  const focusInput = useCallback(() => {
    localRef.current?.focus();
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        localRef.current?.blur();
        Keyboard.dismiss();
      };
    }, [])
  );

  return (
    <View style={[styles.field, style]}>
      <Pressable
        accessibilityElementsHidden
        accessible={false}
        importantForAccessibility="no"
        onPress={focusInput}
        style={StyleSheet.absoluteFill}
      />
      {leading !== undefined ? (
        <View pointerEvents="none" style={styles.leading}>
          {leading}
        </View>
      ) : null}
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        onBlur={onBlur}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onSubmitEditing={onSubmitEditing}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        ref={setInputRef}
        returnKeyType={returnKeyType}
        style={styles.input}
        testID={testID}
        value={value}
      />
    </View>
  );
}
