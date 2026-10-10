import type { TextStyle, ViewStyle } from 'react-native';

import type { ThemeTokens } from '@podverse/design-tokens';

import { typography } from '../../theme/typography';

export type ChipChrome = {
  chip: ViewStyle;
  label: TextStyle;
};

/**
 * Label for section, filter, sort, and settings chips. Body size with the semibold control
 * weight.
 */
export const chipLabelTypography: TextStyle = {
  fontSize: typography.body.fontSize,
  fontWeight: typography.label.fontWeight,
  lineHeight: typography.body.lineHeight,
};

/** Chevron beside a menu-select chip label. */
export const CHIP_CARET_SIZE = 16;

/** Padding shared by every chip face so the hit target matches the label. */
export const chipFacePadding = (
  spacing: ThemeTokens['spacing']
): Pick<ViewStyle, 'paddingHorizontal' | 'paddingVertical'> => ({
  paddingHorizontal: spacing.base,
  paddingVertical: spacing.md,
});

/**
 * Chrome for controls that narrow a list (range, category) rather than choose which list to show.
 * Shape stays square-radiused in both states so the control does not morph. Idle uses the quiet
 * fill of an unselected pill; active matches the sort chip (accent outline and label).
 */
export const filterChipChrome = (
  tokens: ThemeTokens,
  idle: { borderColor: string; textColor: string },
  active: boolean
): ChipChrome => {
  const chip: ViewStyle = {
    borderRadius: tokens.radii.md,
  };

  if (active) {
    return {
      chip: {
        ...chip,
        backgroundColor: tokens.background.tertiary,
        borderColor: tokens.text.accent,
      },
      label: {
        color: tokens.text.accent,
      },
    };
  }

  return {
    chip: {
      ...chip,
      backgroundColor: tokens.background.secondary,
      borderColor: idle.borderColor,
    },
    label: {
      color: idle.textColor,
    },
  };
};
