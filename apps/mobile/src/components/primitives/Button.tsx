import { useMemo } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

export type ButtonVariant = 'primary' | 'secondary';
export type ButtonSize = 'sm' | 'md';

export type ButtonProps = {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  testID?: string;
};

/**
 * Themed pressable button. Copy is passed in (`label`) — never hardcoded here — so the caller owns
 * i18n. Colors come from the active theme's button tokens; the pill radius / spacing come from the
 * token scale (no hardcoded hex).
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const { styles: themeStyles, tokens } = useTheme();

  const palette = variant === 'primary' ? themeStyles.buttonPrimary : themeStyles.buttonSecondary;
  const isDisabled = disabled || loading;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          alignItems: 'center',
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          backgroundColor: palette.backgroundColor,
          borderRadius: tokens.radii.round,
          flexDirection: 'row',
          justifyContent: 'center',
          paddingHorizontal: size === 'sm' ? tokens.spacing.md : tokens.spacing.xl,
          paddingVertical: size === 'sm' ? tokens.spacing.sm : tokens.spacing.md,
        },
        disabled: {
          opacity: 0.5,
        },
        label: {
          ...typography.label,
          ...(size === 'sm' ? { fontSize: 12, lineHeight: 16 } : null),
          color: palette.color,
        },
        spinner: {
          marginRight: tokens.spacing.sm,
        },
      }),
    [fullWidth, palette.backgroundColor, palette.color, size, tokens]
  );

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={[styles.container, isDisabled ? styles.disabled : null]}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={palette.color} size="small" style={styles.spinner} />
      ) : null}
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}
