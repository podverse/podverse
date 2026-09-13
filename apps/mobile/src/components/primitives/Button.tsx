import type { ReactNode } from 'react';
import { useMemo } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { LIST_ROW_ACTION_SIZE } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

export type ButtonVariant = 'outline' | 'primary' | 'secondary' | 'danger' | 'play' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  /** Optional leading icon rendered with the button label. */
  icon?: ReactNode;
  /** Renders only the icon while retaining the label as the accessible name. */
  iconOnly?: boolean;
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
 * i18n. Colors come from the active theme's button / accent tokens; the pill radius / spacing come
 * from the token scale (no hardcoded hex). Press dims opacity so every variant gives the same
 * tactile cue.
 *
 * - `outline` — quiet bordered control (Subscribe): accent border and label on a transparent fill.
 * - `play` — media-row Play circle: accent border, semi-transparent accent fill (`opaqueBg`), and a
 *   light/dark-friendly glyph color. Matches the legacy TimeRemainingWidget play chrome.
 * - `ghost` — bare icon (More): no border or fill; accent glyph. Matches legacy MoreButton.
 */
export function Button({
  icon,
  iconOnly = false,
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

  const palette =
    variant === 'primary'
      ? themeStyles.buttonPrimary
      : variant === 'secondary'
        ? themeStyles.buttonSecondary
        : variant === 'danger'
          ? themeStyles.buttonDanger
          : variant === 'play'
            ? {
                backgroundColor: tokens.button.opaqueBg,
                color: tokens.button.secondaryColor,
              }
            : variant === 'ghost'
              ? {
                  backgroundColor: 'transparent',
                  color: tokens.button.secondaryColor,
                }
              : {
                  backgroundColor: 'transparent',
                  color: tokens.text.accent,
                };
  const isDisabled = disabled || loading;
  const isOutline = variant === 'outline' || variant === 'play';
  const iconOnlySize = size === 'sm' ? LIST_ROW_ACTION_SIZE : size === 'lg' ? 48 : 40;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          alignItems: 'center',
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          backgroundColor: palette.backgroundColor,
          borderColor: isOutline ? tokens.button.outlineColor : undefined,
          borderRadius: tokens.radii.round,
          borderWidth: isOutline ? 1 : 0,
          flexDirection: 'row',
          justifyContent: 'center',
          minHeight: iconOnly ? iconOnlySize : undefined,
          minWidth: iconOnly ? iconOnlySize : undefined,
          paddingHorizontal: iconOnly
            ? 0
            : size === 'sm'
              ? tokens.spacing.md
              : size === 'lg'
                ? tokens.spacing['2xl']
                : tokens.spacing.xl,
          paddingVertical: iconOnly
            ? 0
            : size === 'sm'
              ? tokens.spacing.sm
              : size === 'lg'
                ? tokens.spacing.base
                : tokens.spacing.md,
        },
        disabled: {
          opacity: 0.5,
        },
        pressed: {
          opacity: 0.7,
        },
        label: {
          ...typography.label,
          ...(size === 'sm'
            ? { fontSize: 12, lineHeight: 16 }
            : size === 'lg'
              ? typography.subheading
              : null),
          color: palette.color,
        },
        icon: {
          marginRight: tokens.spacing.sm,
        },
        spinner: {
          marginRight: tokens.spacing.sm,
        },
      }),
    [
      fullWidth,
      iconOnly,
      iconOnlySize,
      isOutline,
      palette.backgroundColor,
      palette.color,
      size,
      tokens,
    ]
  );

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        isDisabled ? styles.disabled : null,
        !isDisabled && pressed ? styles.pressed : null,
      ]}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={palette.color} size="small" style={styles.spinner} />
      ) : null}
      {!loading && icon !== undefined ? (
        <View style={iconOnly ? undefined : styles.icon}>{icon}</View>
      ) : null}
      {!iconOnly ? <Text style={styles.label}>{label}</Text> : null}
    </Pressable>
  );
}
