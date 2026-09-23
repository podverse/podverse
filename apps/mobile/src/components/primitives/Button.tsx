import type { ReactNode } from 'react';
import { memo, useMemo } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { LIST_ROW_ACTION_SIZE, PLAYER_TRANSPORT_CIRCLE_SIZE } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';

export type ButtonVariant = 'outline' | 'primary' | 'secondary' | 'danger' | 'play' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export type ButtonProps = {
  /** Optional leading icon rendered with the button label. */
  icon?: ReactNode;
  /** Renders only the icon while retaining the label as the accessible name. */
  iconOnly?: boolean;
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  /** Hold gesture (default 500ms). Pressable cancels the press when this fires. */
  onLongPress?: (event: GestureResponderEvent) => void;
  /** Milliseconds before `onLongPress` fires. Defaults to 500 to match web track buttons. */
  delayLongPress?: number;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  testID?: string;
};

const createStyles = ({ tokens }: ThemedStylesTheme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      borderRadius: tokens.radii.round,
      flexDirection: 'row',
      justifyContent: 'center',
    },
    disabled: {
      opacity: 0.5,
    },
    icon: {
      marginRight: tokens.spacing.sm,
    },
    pressed: {
      opacity: 0.7,
    },
  });

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
 *
 * Sizes `sm`–`lg` cover rows, forms, and detail chrome. `xl` is for the player's play circle
 * (`PLAYER_TRANSPORT_CIRCLE_SIZE`) — the one control sized to be hit without looking.
 */
export const Button = memo(function Button({
  icon,
  iconOnly = false,
  label,
  onPress,
  onLongPress,
  delayLongPress = 500,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const { styles: themeStyles, tokens } = useTheme();
  const styles = useThemedStyles(createStyles);

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
  const isLarge = size === 'lg' || size === 'xl';
  const iconOnlySize =
    size === 'sm'
      ? LIST_ROW_ACTION_SIZE
      : size === 'md'
        ? 40
        : size === 'lg'
          ? 48
          : PLAYER_TRANSPORT_CIRCLE_SIZE;

  const variantStyles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          backgroundColor: palette.backgroundColor,
          borderColor: isOutline ? tokens.button.outlineColor : undefined,
          borderWidth: isOutline ? 1 : 0,
          minHeight: iconOnly ? iconOnlySize : undefined,
          minWidth: iconOnly ? iconOnlySize : undefined,
          paddingHorizontal: iconOnly
            ? 0
            : size === 'sm'
              ? tokens.spacing.md
              : isLarge
                ? tokens.spacing['2xl']
                : tokens.spacing.xl,
          paddingVertical: iconOnly
            ? 0
            : size === 'sm'
              ? tokens.spacing.sm
              : isLarge
                ? tokens.spacing.base
                : tokens.spacing.md,
        },
        label: {
          ...typography.label,
          ...(size === 'sm'
            ? { fontSize: 12, lineHeight: 16 }
            : isLarge
              ? typography.subheading
              : null),
          color: palette.color,
        },
        spinner: {
          marginRight: iconOnly ? 0 : tokens.spacing.sm,
        },
      }),
    [
      fullWidth,
      iconOnly,
      iconOnlySize,
      isLarge,
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
      delayLongPress={delayLongPress}
      disabled={isDisabled}
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        variantStyles.container,
        isDisabled ? styles.disabled : null,
        !isDisabled && pressed ? styles.pressed : null,
      ]}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={palette.color} size="small" style={variantStyles.spinner} />
      ) : null}
      {!loading && icon !== undefined ? (
        <View style={iconOnly ? undefined : styles.icon}>{icon}</View>
      ) : null}
      {!iconOnly ? <Text style={variantStyles.label}>{label}</Text> : null}
    </Pressable>
  );
});
