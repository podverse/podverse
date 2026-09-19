import { NavigationContext } from '@react-navigation/native';
import type { MutableRefObject, ReactNode, RefCallback } from 'react';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { StyleProp, TextInputProps, ViewStyle } from 'react-native';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';

/**
 * Ref shapes a caller can hand a painted field. Narrower than React's `Ref`, which admits
 * `RefObject` — that one declares `current` read-only, so this component could not fill it in.
 * Declare a holder as `useRef<TextInput | null>(null)`.
 */
export type TextFieldRef = RefCallback<TextInput> | MutableRefObject<TextInput | null> | null;

const COMPACT_INPUT_MIN_HEIGHT = 28;
const MULTILINE_INPUT_MIN_HEIGHT = 80;

export type TextFieldProps = {
  accessibilityLabel: string;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoCorrect?: boolean;
  /**
   * Inset caption inside the pill, matching web `TextInput` `eyebrow`. Omit on search and list
   * filters. When set, the pill is taller and the caption stays after the placeholder clears.
   */
  eyebrow?: string;
  inputRef?: TextFieldRef;
  keyboardType?: TextInputProps['keyboardType'];
  /** Decorative. Taps land on the field and focus the input. */
  leading?: ReactNode;
  multiline?: boolean;
  onBlur?: () => void;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  onSubmitEditing?: () => void;
  placeholder: string;
  placeholderTextColor?: string;
  returnKeyType?: TextInputProps['returnKeyType'];
  secureTextEntry?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  value: string;
};

function bindInputRef(ref: TextFieldRef | undefined, node: TextInput | null): void {
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
 * Painted text field whose visible chrome is the hit target: tertiary fill, no resting outline, a
 * 2px inset focus ring. Optional `eyebrow` is the web-style inset caption (forms). Search and list
 * filters omit it and stay compact. A leading icon is decoration; it does not submit or steal
 * focus. Do not add padding on the `TextInput` — keep inset on this chrome. Leaving a navigator
 * screen blurs the field so a tab switch does not keep a caret or focus ring. Hosts outside a
 * navigator (the login overlay) skip that listener; unmount still drops focus.
 */
export function TextField({
  accessibilityLabel,
  autoCapitalize,
  autoCorrect,
  eyebrow,
  inputRef,
  keyboardType,
  leading,
  multiline = false,
  onBlur,
  onChangeText,
  onFocus,
  onSubmitEditing,
  placeholder,
  placeholderTextColor,
  returnKeyType,
  secureTextEntry,
  style,
  testID,
  value,
}: TextFieldProps) {
  const { styles: themeStyles, tokens } = useTheme();
  const navigation = useContext(NavigationContext);
  const localRef = useRef<TextInput | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const hasEyebrow = eyebrow !== undefined && eyebrow !== '';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        column: {
          flex: 1,
          minWidth: 0,
        },
        eyebrow: {
          color: tokens.text.link,
          fontSize: 14,
          fontWeight: '700',
          marginBottom: tokens.spacing.sm,
        },
        field: {
          alignItems: hasEyebrow ? 'flex-start' : 'stretch',
          backgroundColor: tokens.background.tertiary,
          borderColor: 'transparent',
          borderRadius: tokens.radii.md,
          borderWidth: 2,
          flexDirection: 'row',
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: hasEyebrow ? tokens.spacing.md : tokens.spacing.sm,
        },
        fieldFocused: {
          borderColor: tokens.border.primary,
        },
        input: {
          alignSelf: 'stretch',
          color: themeStyles.textPrimary.color,
          flexGrow: multiline ? 1 : 0,
          fontSize: 16,
          minHeight: multiline ? MULTILINE_INPUT_MIN_HEIGHT : COMPACT_INPUT_MIN_HEIGHT,
          padding: 0,
          textAlignVertical: multiline ? 'top' : 'center',
        },
        leading: {
          alignItems: 'center',
          alignSelf: 'center',
          height: COMPACT_INPUT_MIN_HEIGHT,
          justifyContent: 'center',
          marginRight: tokens.spacing.md,
          width: COMPACT_INPUT_MIN_HEIGHT,
        },
      }),
    [hasEyebrow, multiline, themeStyles, tokens]
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

  useEffect(() => {
    if (navigation === undefined) {
      return;
    }

    return navigation.addListener('blur', () => {
      localRef.current?.blur();
      Keyboard.dismiss();
    });
  }, [navigation]);

  return (
    <View style={[styles.field, isFocused ? styles.fieldFocused : null, style]}>
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
      <View pointerEvents="box-none" style={styles.column}>
        {hasEyebrow ? (
          <View accessibilityElementsHidden importantForAccessibility="no" pointerEvents="none">
            <Text style={styles.eyebrow}>{eyebrow}</Text>
          </View>
        ) : null}
        <TextInput
          accessibilityLabel={accessibilityLabel}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          keyboardType={keyboardType}
          multiline={multiline}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          onChangeText={onChangeText}
          onFocus={() => {
            setIsFocused(true);
            onFocus?.();
          }}
          onSubmitEditing={onSubmitEditing}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor ?? themeStyles.textSecondary.color}
          ref={setInputRef}
          returnKeyType={returnKeyType}
          secureTextEntry={secureTextEntry}
          style={styles.input}
          testID={testID}
          value={value}
        />
      </View>
    </View>
  );
}
