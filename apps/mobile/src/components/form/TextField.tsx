import { Ionicons } from '@expo/vector-icons';
import { NavigationContext } from '@react-navigation/native';
import type { MutableRefObject, ReactNode, RefCallback } from 'react';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { StyleProp, TextInputInstance, TextInputProps, ViewStyle } from 'react-native';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { LIST_ROW_ACTION_SIZE } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';

/**
 * Ref shapes a caller can hand a painted field. Narrower than React's `Ref`, which admits
 * `RefObject` — that one declares `current` read-only, so this component could not fill it in.
 * Declare a holder as `useRef<TextInputInstance | null>(null)`.
 */
export type TextFieldRef =
  RefCallback<TextInputInstance> | MutableRefObject<TextInputInstance | null> | null;

const COMPACT_INPUT_MIN_HEIGHT = 28;
const MULTILINE_INPUT_MIN_HEIGHT = 80;
/** Extends the compact glyph box out to the 44pt row-action target. The pill stays compact. */
const CLEAR_CONTROL_HIT_SLOP = Math.max(0, (LIST_ROW_ACTION_SIZE - COMPACT_INPUT_MIN_HEIGHT) / 2);

export type TextFieldProps = {
  accessibilityLabel: string;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoCorrect?: boolean;
  /**
   * Platform autofill name. Omitted fields stay `off`, so a saved username cannot land in a box
   * that did not ask for one. Pass this together with `textContentType`.
   */
  autoComplete?: TextInputProps['autoComplete'];
  /**
   * Already-localized accessible name for the clear control. When this is omitted or empty, the
   * control is not rendered. Form fields omit it.
   */
  clearAccessibilityLabel?: string;
  /** Maestro id for the clear control. Set it when `clearAccessibilityLabel` is set. */
  clearTestID?: string;
  /** When false, the field stays visible and keeps its value but does not accept edits. */
  editable?: boolean;
  /**
   * Inset caption inside the pill, matching web `TextInput` `eyebrow`. Omit on search and list
   * filters. When set, the pill is taller and the caption stays after the placeholder clears.
   */
  eyebrow?: string;
  inputRef?: TextFieldRef;
  /** Danger border and eyebrow, including while the field is focused. */
  invalid?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  /** Decorative. A tap on it focuses the field. */
  leading?: ReactNode;
  maxLength?: number;
  multiline?: boolean;
  onBlur?: () => void;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  onSubmitEditing?: () => void;
  /**
   * What Return does after `onSubmitEditing`. Omitted fields keep the platform default, which
   * blurs a single-line field. `submit` runs the handler and leaves the keyboard up.
   */
  submitBehavior?: TextInputProps['submitBehavior'];
  placeholder: string;
  placeholderTextColor?: string;
  returnKeyType?: TextInputProps['returnKeyType'];
  secureTextEntry?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** iOS autofill name. Omitted fields stay `none`. Pass this together with `autoComplete`. */
  textContentType?: TextInputProps['textContentType'];
  value: string;
};

function bindInputRef(ref: TextFieldRef | undefined, node: TextInputInstance | null): void {
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
 * filters omit it and stay compact. A leading icon is decoration; a tap on it focuses the field.
 * When the clear label is set and the value is non-empty, an X at the right edge clears the value
 * and leaves the field focused. Do not add padding on the `TextInput` — keep inset on this chrome.
 * Leaving a navigator screen blurs the field so a tab switch does not keep a caret or focus ring.
 * Hosts outside a navigator (the login overlay) skip that listener; unmount still drops focus.
 * Autofill stays off unless the caller names the field.
 */
export function TextField({
  accessibilityLabel,
  autoCapitalize,
  autoComplete,
  autoCorrect,
  clearAccessibilityLabel,
  clearTestID,
  editable = true,
  eyebrow,
  inputRef,
  invalid = false,
  keyboardType,
  leading,
  maxLength,
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
  submitBehavior,
  testID,
  textContentType,
  value,
}: TextFieldProps) {
  const { styles: themeStyles, tokens } = useTheme();
  const navigation = useContext(NavigationContext);
  const localRef = useRef<TextInputInstance | null>(null);
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
          color: invalid ? tokens.text.danger : tokens.text.link,
          fontSize: 14,
          fontWeight: '700',
          marginBottom: tokens.spacing.sm,
        },
        field: {
          alignItems: hasEyebrow ? 'flex-start' : 'stretch',
          backgroundColor: tokens.background.tertiary,
          borderColor: invalid ? tokens.text.danger : 'transparent',
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
          width: '100%',
        },
        leading: {
          alignItems: 'center',
          alignSelf: 'center',
          height: COMPACT_INPUT_MIN_HEIGHT,
          justifyContent: 'center',
          marginRight: tokens.spacing.md,
          width: COMPACT_INPUT_MIN_HEIGHT,
        },
        pressed: {
          opacity: 0.7,
        },
        trailing: {
          alignItems: 'center',
          alignSelf: 'center',
          height: COMPACT_INPUT_MIN_HEIGHT,
          justifyContent: 'center',
          marginLeft: tokens.spacing.md,
          width: COMPACT_INPUT_MIN_HEIGHT,
          zIndex: 1,
        },
      }),
    [hasEyebrow, invalid, multiline, themeStyles, tokens]
  );

  const setInputRef = useCallback(
    (node: TextInputInstance | null) => {
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
    <View style={[styles.field, isFocused && !invalid ? styles.fieldFocused : null, style]}>
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
          autoComplete={autoComplete ?? 'off'}
          autoCorrect={autoCorrect}
          editable={editable}
          importantForAutofill={autoComplete === undefined || autoComplete === 'off' ? 'no' : 'yes'}
          keyboardType={keyboardType}
          maxLength={maxLength}
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
          submitBehavior={submitBehavior}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor ?? themeStyles.textSecondary.color}
          ref={setInputRef}
          returnKeyType={returnKeyType}
          secureTextEntry={secureTextEntry}
          style={styles.input}
          testID={testID}
          textContentType={textContentType ?? 'none'}
          value={value}
        />
      </View>
      {clearAccessibilityLabel !== undefined &&
      clearAccessibilityLabel !== '' &&
      value.length > 0 &&
      editable ? (
        <Pressable
          accessibilityLabel={clearAccessibilityLabel}
          accessibilityRole="button"
          hitSlop={CLEAR_CONTROL_HIT_SLOP}
          onPress={() => {
            onChangeText('');
            localRef.current?.focus();
            requestAnimationFrame(() => {
              localRef.current?.focus();
            });
          }}
          style={({ pressed }) => [styles.trailing, pressed ? styles.pressed : null]}
          testID={clearTestID}
        >
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            pointerEvents="none"
          >
            <Ionicons color={themeStyles.textSecondary.color} name="close" size={18} />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}
