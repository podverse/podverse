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

/**
 * React Native lays out `ActivityIndicator` size `small` at 20×20. Labeled buttons scale that
 * indicator into the label line and center it over the resting face. See **button-stable-bounds**.
 */
const ACTIVITY_INDICATOR_SMALL_SIZE = 20;

const metricNumber = (value: number | undefined, fallback: number): number =>
  typeof value === 'number' ? value : fallback;

/** Label type for each size. `sm` is a step under `typography.label`; `lg` / `xl` use subheading. */
const labelMetrics = (size: ButtonSize): { fontSize: number; lineHeight: number } => {
  if (size === 'sm') {
    return { fontSize: 12, lineHeight: 16 };
  }
  if (size === 'lg' || size === 'xl') {
    return {
      fontSize: metricNumber(typography.subheading.fontSize, 16),
      lineHeight: metricNumber(typography.subheading.lineHeight, 22),
    };
  }
  return {
    fontSize: metricNumber(typography.label.fontSize, 13),
    lineHeight: metricNumber(typography.label.lineHeight, 18),
  };
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
    hiddenFace: {
      opacity: 0,
    },
    icon: {
      marginRight: tokens.spacing.sm,
    },
    pressed: {
      opacity: 0.7,
    },
    spinnerHost: {
      alignItems: 'center',
      bottom: 0,
      justifyContent: 'center',
      left: 0,
      overflow: 'hidden',
      position: 'absolute',
      right: 0,
      top: 0,
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
 *
 * `loading` does not change the button's size. The label and icon stay in the layout (hidden) and
 * the spinner is centered over that face, scaled into the content slot. See **button-stable-bounds**.
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
  const metrics = labelMetrics(size);
  const iconOnlySize =
    size === 'sm'
      ? LIST_ROW_ACTION_SIZE
      : size === 'md'
        ? 40
        : size === 'lg'
          ? 48
          : PLAYER_TRANSPORT_CIRCLE_SIZE;
  const contentSlot = iconOnly ? iconOnlySize : metrics.lineHeight;
  const spinnerScale = Math.min(1, contentSlot / ACTIVITY_INDICATOR_SMALL_SIZE);

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
          ...(isLarge ? typography.subheading : typography.label),
          color: palette.color,
          fontSize: metrics.fontSize,
          lineHeight: metrics.lineHeight,
        },
        spinner: {
          transform: [{ scale: spinnerScale }],
        },
      }),
    [
      fullWidth,
      iconOnly,
      iconOnlySize,
      isLarge,
      isOutline,
      metrics.fontSize,
      metrics.lineHeight,
      palette.backgroundColor,
      palette.color,
      size,
      spinnerScale,
      tokens,
    ]
  );

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
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
      {icon !== undefined ? (
        <View style={[iconOnly ? undefined : styles.icon, loading ? styles.hiddenFace : null]}>
          {icon}
        </View>
      ) : null}
      {!iconOnly ? (
        <Text style={[variantStyles.label, loading ? styles.hiddenFace : null]}>{label}</Text>
      ) : null}
      {loading ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={styles.spinnerHost}
        >
          <ActivityIndicator color={palette.color} size="small" style={variantStyles.spinner} />
        </View>
      ) : null}
    </Pressable>
  );
});
