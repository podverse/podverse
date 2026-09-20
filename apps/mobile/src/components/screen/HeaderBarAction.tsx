import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '../../theme/useTheme';

export type HeaderBarActionProps = {
  accessibilityLabel: string;
  disabled?: boolean;
  icon?: ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
  iconSize?: number;
  label?: string;
  onPress: () => void;
  testID: string;
};

/**
 * Title-bar control for the trailing (or leading) header slot. Pass an icon, a localized label,
 * or both. Screens and the image viewer share this so top-right actions stay one control.
 * Glyph and label use `tokens.text.primary` (same as the title), never accent/link blue.
 * A press dims to the same 0.7 opacity `Button` uses so the tap is visible.
 */
export function HeaderBarAction({
  accessibilityLabel,
  disabled = false,
  icon,
  iconColor,
  iconSize = 22,
  label,
  onPress,
  testID,
}: HeaderBarActionProps) {
  const { tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 44,
          minWidth: 44,
          paddingHorizontal: tokens.spacing.sm,
        },
        buttonDisabled: {
          opacity: 0.4,
        },
        buttonPressed: {
          opacity: 0.7,
        },
        label: {
          color: tokens.text.primary,
          fontSize: 16,
          fontWeight: '700',
        },
      }),
    [tokens]
  );

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        disabled ? styles.buttonDisabled : null,
        !disabled && pressed ? styles.buttonPressed : null,
      ]}
      testID={testID}
    >
      {icon !== undefined ? (
        <Ionicons color={iconColor ?? tokens.text.primary} name={icon} size={iconSize} />
      ) : null}
      {label !== undefined ? <Text style={styles.label}>{label}</Text> : null}
    </Pressable>
  );
}
