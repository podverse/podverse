import { memo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { typography } from '../../theme/typography';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';

export type BadgeTone = 'accent' | 'danger' | 'neutral' | 'muted';

/** `sm` is the compact overlay and inline chip; `md` matches list duration type beside Play. */
export type BadgeSize = 'sm' | 'md';

export type BadgeProps = {
  label: string;
  /**
   * `accent` fills to draw the eye; `danger` is the live-status glow (translucent danger fill,
   * danger border, bold label); `neutral` outlines to sit quietly beside content; `muted` is a
   * solid gray fill with contrasting label — for counts overlaid on artwork (e.g. Home grid
   * downloads).
   */
  tone?: BadgeTone;
  size?: BadgeSize;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const badgeChrome = ({ tokens }: Pick<ThemedStylesTheme, 'tokens'>) => ({
  alignSelf: 'flex-start' as const,
  borderRadius: tokens.radii.round,
  borderWidth: 1,
  paddingHorizontal: tokens.spacing.sm,
  paddingVertical: 2,
});

const labelChrome = {
  fontSize: 11,
  fontWeight: '600' as const,
};

const createSmSizeStyles = (_theme: ThemedStylesTheme) => ({
  badge: {},
  label: {},
});

const createMdSizeStyles = ({ tokens }: ThemedStylesTheme) => ({
  badge: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
  },
  label: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
});

const createAccentStyles = (theme: ThemedStylesTheme) => ({
  badge: badgeChrome(theme),
  label: labelChrome,
  tone: {
    backgroundColor: theme.tokens.text.accent,
    borderColor: theme.tokens.text.accent,
  },
  toneLabel: {
    color: theme.tokens.background.primary,
  },
});

const createDangerStyles = (theme: ThemedStylesTheme) => ({
  badge: badgeChrome(theme),
  label: labelChrome,
  tone: {
    backgroundColor: theme.tokens.button.opaqueDangerBg,
    borderColor: theme.tokens.button.opaqueDangerBorder,
    borderWidth: 1.5,
    paddingHorizontal: theme.tokens.spacing.base,
  },
  toneLabel: {
    color: theme.tokens.button.dangerColor,
    fontWeight: '700' as const,
  },
});

const createMutedStyles = (theme: ThemedStylesTheme) => ({
  badge: badgeChrome(theme),
  label: labelChrome,
  tone: {
    backgroundColor: theme.tokens.border.tertiary,
    borderColor: theme.tokens.border.tertiary,
  },
  toneLabel: {
    color: theme.tokens.text.primary,
  },
});

const createNeutralStyles = ({ styles: themeStyles, tokens }: ThemedStylesTheme) => ({
  badge: badgeChrome({ tokens }),
  label: labelChrome,
  tone: {
    backgroundColor: themeStyles.buttonSecondary.backgroundColor,
    borderColor: themeStyles.border.borderColor,
  },
  toneLabel: {
    color: themeStyles.buttonSecondary.color,
  },
});

/**
 * A small rounded pill of text.
 *
 * Presentational and deliberately unlabelled for assistive tech: a badge is a fragment of a
 * sentence about the thing it sits on, so its row composes it into one `accessibilityLabel` rather
 * than leaving a screen reader to announce the pill on its own. Callers that want it read
 * separately wrap it and say so there. The test id sits on an overlay the screen reader skips, so
 * UI tests can still find the pill.
 */
export const Badge = memo(function Badge({
  label,
  size = 'sm',
  style,
  testID,
  tone = 'neutral',
}: BadgeProps) {
  const styles = useThemedStyles(
    tone === 'accent'
      ? createAccentStyles
      : tone === 'danger'
        ? createDangerStyles
        : tone === 'muted'
          ? createMutedStyles
          : createNeutralStyles
  );
  const sizeStyles = useThemedStyles(size === 'md' ? createMdSizeStyles : createSmSizeStyles);

  return (
    <View style={[styles.badge, styles.tone, sizeStyles.badge, style]}>
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[styles.label, styles.toneLabel, sizeStyles.label]}
      >
        {label}
      </Text>
      {testID !== undefined ? (
        <View
          accessibilityLabel={label}
          accessible={false}
          collapsable={false}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          testID={testID}
        />
      ) : null}
    </View>
  );
});
